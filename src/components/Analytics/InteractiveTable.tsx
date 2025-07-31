import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EmployeeWithDetails, EmployeeExamWithDetails, ProfessionTemplate, Section } from '../../types/database'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import './InteractiveTable.css'




interface InteractiveTableProps {
  sectionId?: string
}

interface EmployeeTableData extends EmployeeWithDetails {
  exams: EmployeeExamWithDetails[]
}

interface ExamCellData extends EmployeeExamWithDetails {
  groupCount?: number
  groupStatus?: 'overdue' | 'upcoming' | 'normal' | 'pending'
}

const InteractiveTable: React.FC<InteractiveTableProps> = ({ sectionId }) => {
  const { user } = useAuth()
  const { requestExamDateChange, requestEmployeeNameChange, requestEmployeeProfessionChange } = useNotifications()
  
  const [employees, setEmployees] = useState<EmployeeTableData[]>([])
  const [professions, setProfessions] = useState<ProfessionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for collapsed columns
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set(['section', 'profession']))
  
  // State for editing cells
  const [editingCell, setEditingCell] = useState<{
    employeeId: string
    type: 'name' | 'profession' | 'exam'
    examId?: string
  } | null>(null)
  
  // State for pending changes
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set())

  const isAdmin = user?.role === 'admin' || user?.role === 'admin_assistant'

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      await Promise.all([
        loadEmployeesWithExams(),
        loadProfessions()
      ])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadEmployeesWithExams = async () => {
    // 1. Fetch employees
    let employeesQuery = supabase
      .from('employees')
      .select(`
        *,
        sections(name),
        profession_templates(name)
      `)
      .eq('is_active', true)

    if (sectionId) {
      employeesQuery = employeesQuery.eq('section_id', sectionId)
    }

    const { data: employeesData, error: employeesError } = await employeesQuery.order('full_name')

    if (employeesError) throw employeesError
    if (!employeesData) {
      setEmployees([])
      return
    }

    const employeeIds = employeesData.map(e => e.id)

    // 2. Fetch all exams for these employees in one go
    const { data: examsData, error: examsError } = await supabase
      .from('employee_exams')
      .select(`
        *,
        exams(name, periodicity)
      `)
      .in('employee_id', employeeIds)

    if (examsError) throw examsError

    // 3. Create a map of exams for easy lookup
    const examsByEmployeeId = new Map<string, EmployeeExamWithDetails[]>()
    examsData?.forEach(exam => {
      const list = examsByEmployeeId.get(exam.employee_id) || []
      
      const examDate = exam.exam_date ? new Date(exam.exam_date) : null
      const nextExamDate = exam.next_exam_date ? new Date(exam.next_exam_date) : null
      const now = new Date()
      
      let status: 'overdue' | 'upcoming' | 'pending' | 'normal' = 'normal'
      let color_indicator: 'red' | 'yellow' | 'blue' | 'green' | 'none' = 'none'

      if (exam.pending_date) {
        status = 'pending'
        color_indicator = 'blue'
      } else if (!examDate || examDate.getFullYear() === 1900) {
        status = 'overdue'
        color_indicator = 'red'
      } else if (nextExamDate) {
        const daysDiff = Math.ceil((nextExamDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff < 0) {
          status = 'overdue'
          color_indicator = 'red'
        } else if (daysDiff <= 30) {
          status = 'upcoming'
          color_indicator = 'yellow'
        } else {
          status = 'normal'
          color_indicator = 'green'
        }
      }

      list.push({
        ...exam,
        exam_name: exam.exams?.name || '',
        status,
        color_indicator,
        periodicity: exam.exams?.periodicity || 0
      })
      examsByEmployeeId.set(exam.employee_id, list)
    })

    // 4. Combine employees with their exams
    const employeesWithExams: EmployeeTableData[] = employeesData.map(emp => ({
      ...emp,
      section_name: emp.sections?.name || '',
      profession_name: emp.profession_templates?.name || '',
      exams: examsByEmployeeId.get(emp.id) || []
    }))

    setEmployees(employeesWithExams)
  }

  const loadProfessions = async () => {
    const { data, error } = await supabase
      .from('profession_templates')
      .select('*')
      .order('name')

    if (error) {
      throw error
    }

    setProfessions(data || [])
  }

  const [expandedExamGroups, setExpandedExamGroups] = useState<Set<string>>(new Set());

  const allExams = useMemo(() => {
    const examMap = new Map<string, { name: string, periodicity: number, next_exam_date: string | null }>();
    employees.forEach(employee => {
      employee.exams.forEach(exam => {
        if (!examMap.has(exam.exam_name)) {
          examMap.set(exam.exam_name, {
            name: exam.exam_name,
            periodicity: exam.periodicity,
            next_exam_date: exam.next_exam_date
          });
        }
      });
    });
    return Array.from(examMap.values());
  }, [employees]);

  interface TableColumn {
    type: 'info' | 'group' | 'exam';
    key: string;
    name: string;
    isCollapsed?: boolean;
    nearestDate?: string | null;
    status?: 'overdue' | 'upcoming' | 'normal' | 'pending';
  }

  const tableColumns = useMemo(() => {
    const columns: TableColumn[] = [
      { type: 'info', key: 'name', name: 'ФИО' },
      { type: 'info', key: 'section', name: 'Участок', isCollapsed: collapsedColumns.has('section') },
      { type: 'info', key: 'profession', name: 'Профессия', isCollapsed: collapsedColumns.has('profession') },
    ];

    const examGroups = new Map<string, {
      name: string,
      periodicity: number,
      next_exam_date: string | null
    }[]>();
    
    allExams.forEach(exam => {
      // Извлекаем префикс до первого подчеркивания (например "ОТ" из "ОТ_а")
      const prefixMatch = exam.name.match(/^([^_]+)/);
      if (!prefixMatch) return;
      
      const groupPrefix = prefixMatch[0].substring(0, 3).toUpperCase();
      const groupKey = groupPrefix + '_';
      
      if (!examGroups.has(groupKey)) {
        examGroups.set(groupKey, []);
      }
      examGroups.get(groupKey)!.push(exam);
    });

    const sortedGroupKeys = Array.from(examGroups.keys()).sort((a, b) => {
      const aMinPeriodicity = Math.min(...(examGroups.get(a) || []).map(e => e.periodicity));
      const bMinPeriodicity = Math.min(...(examGroups.get(b) || []).map(e => e.periodicity));
      if (aMinPeriodicity !== bMinPeriodicity) return aMinPeriodicity - bMinPeriodicity;
      return a.localeCompare(b);
    });

    sortedGroupKeys.forEach(groupKey => {
      const examsInGroup = examGroups.get(groupKey)!;
      if (expandedExamGroups.has(groupKey) && examsInGroup.length > 1) {
        // Сортируем экзамены по дате сдачи (от ближайшей к самой дальней)
        examsInGroup.sort((a, b) => {
          const dateA = a.next_exam_date ? new Date(a.next_exam_date).getTime() : 0;
          const dateB = b.next_exam_date ? new Date(b.next_exam_date).getTime() : 0;
          return dateA - dateB;
        }).forEach(exam => {
          columns.push({ type: 'exam', key: exam.name, name: exam.name });
        });
      } else {
        // Для групповой ячейки определяем самый ближайший экзамен
        const nearestExam = examsInGroup.reduce((nearest, current) => {
          if (!nearest.next_exam_date) return current;
          if (!current.next_exam_date) return nearest;
          return new Date(current.next_exam_date) < new Date(nearest.next_exam_date)
            ? current
            : nearest;
        });
        
        columns.push({
          type: 'group',
          key: groupKey,
          name: groupKey,
          nearestDate: nearestExam.next_exam_date,
          status: computeGroupStatus(nearestExam.next_exam_date)
        });
      }
    });

    return columns;
  }, [allExams, collapsedColumns, expandedExamGroups]);

  const getExamDataForCell = (employee: EmployeeTableData, column: { type: 'info' | 'group' | 'exam', key: string }): ExamCellData | null => {
    if (column.type === 'info') {
      return null;
    }
    if (column.type === 'group') {
      const examsInGroup = employee.exams.filter(e => e.exam_name.substring(0, 3).toUpperCase() === column.key);
      if (examsInGroup.length === 0) return null;

      const earliestExam = examsInGroup.reduce((earliest, current) => {
        if (!earliest.next_exam_date) return current;
        if (!current.next_exam_date) return earliest;
        return new Date(current.next_exam_date) < new Date(earliest.next_exam_date) ? current : earliest;
      });

      return {
        ...earliestExam,
        groupCount: examsInGroup.length,
      };
    } else { // type === 'exam'
      const exam = employee.exams.find(e => e.exam_name === column.key);
      return exam ? { ...exam } : null;
    }
  };

  // Format name (LastName F.M.)
  const formatName = (fullName: string): string => {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length < 2) return fullName
    
    const lastName = parts[0]
    const firstName = parts[1]
    const middleName = parts[2]
    
    let formatted = lastName
    if (firstName) formatted += ` ${firstName.charAt(0)}.`
    if (middleName) formatted += `${middleName.charAt(0)}.`
    
    return formatted
  }

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString || dateString === '1900-01-01') return 'Not set'
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  // Get CSS class for status
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'overdue': return 'status-overdue'
      case 'upcoming': return 'status-upcoming'
      case 'pending': return 'status-pending'
      default: return 'status-normal'
    }
  }

  // Compute status based on next_exam_date for group cells
  const computeGroupStatus = (nextExamDate: string | null): 'overdue' | 'upcoming' | 'normal' | 'pending' => {
    if (!nextExamDate) {
      return 'overdue'; // If no date is set, consider it overdue
    }
    
    const nextDate = new Date(nextExamDate);
    const now = new Date();
    const daysDiff = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return 'overdue';
    } else if (daysDiff <= 30) {
      return 'upcoming';
    } else {
      return 'normal';
    }
  };

  

  // Toggle column collapse
  const toggleColumnCollapse = (columnKey: string) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey)
      } else {
        newSet.add(columnKey)
      }
      return newSet
    })
  }

  const toggleExamGroup = (groupKey: string) => {
    setExpandedExamGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };
  const handleCellClick = (employeeId: string, type: 'name' | 'profession' | 'exam', examId?: string) => {
    // Для ФИО просто активируем редактирование
    if (type === 'name') {
      setEditingCell({ employeeId, type, examId });
    } else if (type === 'profession' || type === 'exam') {
      setEditingCell({ employeeId, type, examId });
    }
  }

  const handleGroupClick = (groupKey: string) => {
    toggleExamGroup(groupKey);
  };

  const handleCellSave = async (employeeId: string, type: string, newValue: string, examId?: string) => {
    const changeKey = `${employeeId}-${type}-${examId || ''}`

    try {
      if (isAdmin) {
        if (type === 'name') {
          await updateEmployeeName(employeeId, newValue)
        } else if (type === 'profession') {
          await updateEmployeeProfession(employeeId, newValue)
        } else if (type === 'exam' && examId) {
          await updateExamDate(employeeId, examId, newValue)
        }
        await loadData() // Reload data after admin change
      } else {
        // For non-admins, initiate a request and set pending status
        setPendingChanges(prev => new Set(prev).add(changeKey))

        if (type === 'name') {
          await requestEmployeeNameChange(employeeId, newValue)
        } else if (type === 'profession') {
          await requestEmployeeProfessionChange(employeeId, newValue)
        } else if (type === 'exam' && examId) {
          await requestExamDateChange(employeeId, examId, newValue)
        }
      }
    } catch (error) {
      console.error('Error saving cell:', error)
      // Revert pending status on error
      setPendingChanges(prev => {
        const newSet = new Set(prev)
        newSet.delete(changeKey)
        return newSet
      })
    } finally {
      setEditingCell(null)
    }
  }

  // Update functions now also handle next_exam_date calculation
  const updateExamDate = async (employeeId: string, examId: string, newDate: string) => {
    const exam = employees.find(e => e.id === employeeId)?.exams.find(ex => ex.exam_id === examId)
    if (!exam) throw new Error('Exam not found')

    const next_exam_date = new Date(newDate)
    next_exam_date.setMonth(next_exam_date.getMonth() + exam.periodicity)

    const { error } = await supabase
      .from('employee_exams')
      .update({ 
        exam_date: newDate,
        next_exam_date: next_exam_date.toISOString().split('T')[0],
        pending_date: null, // Clear pending status
        updated_by: user?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', exam.id)
    
    if (error) throw error

    // Обновляем время последнего действия пользователя
    if (user?.id) {
      try {
        await supabase.rpc('update_user_last_action', { user_id: user.id })
        console.log('Время последнего действия обновлено после изменения даты экзамена в InteractiveTable')
      } catch (actionError) {
        console.warn('Не удалось обновить время последнего действия:', actionError)
      }
    }
  }

  const updateEmployeeName = async (employeeId: string, newName: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ full_name: newName })
      .eq('id', employeeId)
    
    if (error) throw error

    // Обновляем время последнего действия пользователя
    if (user?.id) {
      try {
        await supabase.rpc('update_user_last_action', { user_id: user.id })
        console.log('Время последнего действия обновлено после изменения имени работника')
      } catch (actionError) {
        console.warn('Не удалось обновить время последнего действия:', actionError)
      }
    }
  }

  const updateEmployeeProfession = async (employeeId: string, professionId: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ profession_template_id: professionId })
      .eq('id', employeeId)
    
    if (error) throw error

    // Обновляем время последнего действия пользователя
    if (user?.id) {
      try {
        await supabase.rpc('update_user_last_action', { user_id: user.id })
        console.log('Время последнего действия обновлено после изменения профессии работника')
      } catch (actionError) {
        console.warn('Не удалось обновить время последнего действия:', actionError)
      }
    }
  }

  // Render editable cell
  const renderEditableCell = (
    employee: EmployeeTableData, 
    type: 'name' | 'profession' | 'exam', 
    value: string,
    examId?: string
  ) => {
    const isEditing = editingCell?.employeeId === employee.id && 
                     editingCell?.type === type && 
                     editingCell?.examId === examId
    const isPending = pendingChanges.has(`${employee.id}-${type}-${examId || ''}`)

    if (isEditing) {
      return (
        <div className="cell-editor">
          {type === 'profession' ? (
            <select 
              className="cell-select"
              defaultValue={employee.profession_template_id}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellSave(employee.id, type, (e.target as HTMLSelectElement).value, examId)
                } else if (e.key === 'Escape') {
                  setEditingCell(null)
                }
              }}
              autoFocus
            >
              {professions
                .filter(p => p.section_id === employee.section_id)
                .map(profession => (
                  <option key={profession.id} value={profession.id}>
                    {profession.name}
                  </option>
                ))}
            </select>
          ) : (
            <input
              type={type === 'exam' ? 'date' : 'text'}
              className="cell-input"
              defaultValue={type === 'exam' ? value.split('.').reverse().join('-') : value}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellSave(employee.id, type, (e.target as HTMLInputElement).value, examId)
                } else if (e.key === 'Escape') {
                  setEditingCell(null)
                }
              }}
              autoFocus
            />
          )}
          <div className="cell-actions">
            <button 
              className="save-btn"
              onClick={() => {
                const input = document.querySelector('.cell-input, .cell-select') as HTMLInputElement
                handleCellSave(employee.id, type, input.value, examId)
              }}
            >
              ✓
            </button>
            <button 
              className="cancel-btn"
              onClick={() => setEditingCell(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )
    }

    return (
      <span 
        className={`cell-editable ${isPending ? 'cell-pending' : ''}`}
        onClick={() => handleCellClick(employee.id, type, examId)}
        title={isAdmin ? 'Click to edit' : 'Click to request change'}
      >
        {value}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="interactive-table-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading interactive table...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="interactive-table-container">
        <div className="error-state">
          <h3>Loading error</h3>
          <p>{error}</p>
          <button onClick={loadData} className="retry-btn">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="interactive-table-container">
      <div className="table-header">
        <h3>Interactive Employee Table</h3>
        <div className="table-controls">
          <button onClick={loadData} className="refresh-btn">
            Refresh
          </button>
        </div>
      </div>

      

      {/* Desktop table */}
      <div className="table-wrapper">
        <table className="interactive-table" style={{ position: 'relative' }}>
          <thead className="table-head-fixed">
            <tr>
              {tableColumns.map(col => {
                if (col.isCollapsed) {
                  return <th key={col.key} className={`col-${col.key}-collapsed`} onClick={() => toggleColumnCollapse(col.key)}>+</th>;
                }
                return (
                  <th 
                    key={col.key} 
                    className={`col-${col.key}`} 
                    onClick={() => {
                      if (col.type === 'info') toggleColumnCollapse(col.key);
                      if (col.type === 'group') toggleExamGroup(col.key);
                    }}
                  >
                    {col.name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => (
              <tr key={employee.id} className="table-row">
                {tableColumns.map(col => {
                  if (col.isCollapsed) {
                    return <td key={col.key} className={`col-${col.key}-collapsed`}></td>;
                  }

                  if (col.type === 'info') {
                    if (col.key === 'name') return <td key={col.key} className="col-name col-fixed">{renderEditableCell(employee, 'name', formatName(employee.full_name))}</td>;
                    if (col.key === 'section') return <td key={col.key} className="col-section">{employee.section_name}</td>;
                    if (col.key === 'profession') return <td key={col.key} className="col-profession">{renderEditableCell(employee, 'profession', employee.profession_name)}</td>;
                    return null;
                  } else {
                    const examData = getExamDataForCell(employee, col);
                    if (!examData) {
                      return <td key={col.key} className="col-exam exam-empty">—</td>;
                    }
                    const statusClass = getStatusClass(examData.status);
                    return (
                      <td key={col.key} className={`col-exam ${statusClass}`}>
                        <div className="exam-cell-content">
                          {renderEditableCell(employee, 'exam', formatDate(examData.next_exam_date), examData.exam_id)}
                          {examData.groupCount && examData.groupCount > 1 && col.type === 'group' && (
                            <span className="exam-group-count">{examData.groupCount}</span>
                          )}
                        </div>
                      </td>
                    );
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards">
        {employees.map(employee => (
          <div key={employee.id} className="employee-card">
            <div className="employee-header">
              <div className="employee-name">
                {renderEditableCell(employee, 'name', formatName(employee.full_name))}
              </div>
            </div>
            <div className="employee-info">
              <div className="info-item">
                <div className="info-label">Section</div>
                <div className="info-value">{employee.section_name}</div>
              </div>
              <div className="info-item">
                <div className="info-label">Profession</div>
                <div className="info-value">{renderEditableCell(employee, 'profession', employee.profession_name)}</div>
              </div>
            </div>
            <div className="exams-grid">
              {tableColumns.filter(col => col.type === 'exam' || col.type === 'group').map(column => {
                const examData = getExamDataForCell(employee, column);
                if (!examData) return null;
                const statusClass = getStatusClass(examData.status);
                return (
                  <div key={column.key} className={`exam-card-mobile ${statusClass}`}>
                    <div className="exam-group-title">{column.name}</div>
                    <div className="exam-date-mobile">
                      {renderEditableCell(employee, 'exam', formatDate(examData.next_exam_date), examData.exam_id)}
                    </div>
                    {examData.groupCount && examData.groupCount > 1 && column.type === 'group' && (
                      <span className="exam-group-count-mobile">{examData.groupCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Status legend */}
      <div className="status-legend">
        <div className="legend-item">
          <span className="legend-color status-overdue"></span>
          <span>Overdue / Not set</span>
        </div>
        <div className="legend-item">
          <span className="legend-color status-upcoming"></span>
          <span>One month left</span>
        </div>
        <div className="legend-item">
          <span className="legend-color status-pending"></span>
          <span>Pending approval</span>
        </div>
        <div className="legend-item">
          <span className="legend-color status-normal"></span>
          <span>Normal state</span>
        </div>
      </div>
    </div>
  )
}

export default InteractiveTable
