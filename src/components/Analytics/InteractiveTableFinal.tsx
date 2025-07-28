import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EmployeeWithDetails, EmployeeExamWithDetails, ProfessionTemplate } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import './InteractiveTable.css';

interface InteractiveTableProps {
  sectionId?: string;
}

interface EmployeeTableData extends EmployeeWithDetails {
  exams: EmployeeExamWithDetails[];
}

interface ExamGroup {
  key: string;
  name: string;
  exams: EmployeeExamWithDetails[];
  nearestExam?: EmployeeExamWithDetails;
}

const InteractiveTableFinal: React.FC<InteractiveTableProps> = ({ sectionId }) => {
  const { user } = useAuth();
  const { requestExamDateChange, requestEmployeeNameChange, requestEmployeeProfessionChange } = useNotifications();
  
  const [employees, setEmployees] = useState<EmployeeTableData[]>([]);
  const [professions, setProfessions] = useState<ProfessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for collapsed columns
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set(['section', 'profession']));
  
  // State for expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // State for editing cells
  const [editingCell, setEditingCell] = useState<{
    employeeId: string;
    type: 'name' | 'profession' | 'exam';
    examId?: string;
  } | null>(null);
  
  // State for pending changes
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());

  const isAdmin = user?.role === 'admin' || user?.role === 'admin_assistant';

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadEmployeesWithExams(),
        loadProfessions()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadEmployeesWithExams = async () => {
    // 1. Fetch employees
    let employeesQuery = supabase
      .from('employees')
      .select(`
        *,
        sections(name),
        profession_templates(name)
      `)
      .eq('is_active', true);

    if (sectionId) {
      employeesQuery = employeesQuery.eq('section_id', sectionId);
    }

    const { data: employeesData, error: employeesError } = await employeesQuery.order('full_name');

    if (employeesError) throw employeesError;
    if (!employeesData) {
      setEmployees([]);
      return;
    }

    const employeeIds = employeesData.map(e => e.id);

    // 2. Fetch all exams for these employees in one go
    const { data: examsData, error: examsError } = await supabase
      .from('employee_exams')
      .select(`
        *,
        exams(name, periodicity)
      `)
      .in('employee_id', employeeIds);

    if (examsError) throw examsError;

    // 3. Create a map of exams for easy lookup
    const examsByEmployeeId = new Map<string, EmployeeExamWithDetails[]>();
    examsData?.forEach(exam => {
      const list = examsByEmployeeId.get(exam.employee_id) || [];
      
      const examDate = exam.exam_date ? new Date(exam.exam_date) : null;
      const nextExamDate = exam.next_exam_date ? new Date(exam.next_exam_date) : null;
      const now = new Date();
      
      let status: 'overdue' | 'upcoming' | 'pending' | 'normal' = 'normal';
      let color_indicator: 'red' | 'yellow' | 'blue' | 'green' | 'none' = 'none';

      if (exam.pending_date) {
        status = 'pending';
        color_indicator = 'blue';
      } else if (!examDate || examDate.getFullYear() === 1900) {
        status = 'overdue';
        color_indicator = 'red';
      } else if (nextExamDate) {
        const daysDiff = Math.ceil((nextExamDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 0) {
          status = 'overdue';
          color_indicator = 'red';
        } else if (daysDiff <= 30) {
          status = 'upcoming';
          color_indicator = 'yellow';
        } else {
          status = 'normal';
          color_indicator = 'green';
        }
      }

      list.push({
        ...exam,
        exam_name: exam.exams?.name || '',
        status,
        color_indicator,
        periodicity: exam.exams?.periodicity || 0
      });
      examsByEmployeeId.set(exam.employee_id, list);
    });

    // 4. Combine employees with their exams
    const employeesWithExams: EmployeeTableData[] = employeesData.map(emp => ({
      ...emp,
      section_name: emp.sections?.name || '',
      profession_name: emp.profession_templates?.name || '',
      exams: examsByEmployeeId.get(emp.id) || []
    }));

    setEmployees(employeesWithExams);
  };

  const loadProfessions = async () => {
    const { data, error } = await supabase
      .from('profession_templates')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    setProfessions(data || []);
  };


  // Format name (LastName F.M.)
  const formatName = (fullName: string): string => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return fullName;
    
    const lastName = parts[0];
    const firstName = parts[1];
    const middleName = parts[2];
    
    let formatted = lastName;
    if (firstName) formatted += ` ${firstName.charAt(0)}.`;
    if (middleName) formatted += `${middleName.charAt(0)}.`;
    
    return formatted;
  };

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString || dateString === '1900-01-01') return 'Not set';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  // Get CSS class for status
  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'overdue': return 'status-overdue';
      case 'upcoming': return 'status-upcoming';
      case 'pending': return 'status-pending';
      default: return 'status-normal';
    }
  };

  // Toggle column collapse
  const toggleColumnCollapse = (columnKey: string) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
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
    setEditingCell({ employeeId, type, examId });
  };

  const handleGroupClick = (groupKey: string) => {
    toggleGroup(groupKey);
  };

  const handleCellSave = async (employeeId: string, type: string, newValue: string, examId?: string) => {
    const changeKey = `${employeeId}-${type}-${examId || ''}`;

    try {
      if (isAdmin) {
        if (type === 'name') {
          await updateEmployeeName(employeeId, newValue);
        } else if (type === 'profession') {
          await updateEmployeeProfession(employeeId, newValue);
        } else if (type === 'exam' && examId) {
          await updateExamDate(employeeId, examId, newValue);
        }
        await loadData(); // Reload data after admin change
      } else {
        // For non-admins, initiate a request and set pending status
        setPendingChanges(prev => new Set(prev).add(changeKey));

        if (type === 'name') {
          await requestEmployeeNameChange(employeeId, newValue);
        } else if (type === 'profession') {
          await requestEmployeeProfessionChange(employeeId, newValue);
        } else if (type === 'exam' && examId) {
          await requestExamDateChange(employeeId, examId, newValue);
        }
      }
    } catch (error) {
      console.error('Error saving cell:', error);
      // Revert pending status on error
      setPendingChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(changeKey);
        return newSet;
      });
    } finally {
      setEditingCell(null);
    }
  };

  const updateExamDate = async (employeeId: string, examId: string, newDate: string) => {
    const exam = employees.find(e => e.id === employeeId)?.exams.find(ex => ex.exam_id === examId);
    if (!exam) throw new Error('Exam not found');

    const next_exam_date = new Date(newDate);
    next_exam_date.setMonth(next_exam_date.getMonth() + exam.periodicity);

    const { error } = await supabase
      .from('employee_exams')
      .update({ 
        exam_date: newDate,
        next_exam_date: next_exam_date.toISOString().split('T')[0],
        pending_date: null // Clear pending status
      })
      .eq('id', exam.id);
    
    if (error) throw error;
  };

  const updateEmployeeName = async (employeeId: string, newName: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ full_name: newName })
      .eq('id', employeeId);
    
    if (error) throw error;
  };

  const updateEmployeeProfession = async (employeeId: string, professionId: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ profession_template_id: professionId })
      .eq('id', employeeId);
    
    if (error) throw error;
  };

  // Render editable cell
  const renderEditableCell = (
    employee: EmployeeTableData, 
    type: 'name' | 'profession' | 'exam', 
    value: string,
    examId?: string
  ) => {
    const isEditing = editingCell?.employeeId === employee.id && 
                     editingCell?.type === type && 
                     editingCell?.examId === examId;
    const isPending = pendingChanges.has(`${employee.id}-${type}-${examId || ''}`);

    if (isEditing) {
      return (
        <div className="cell-editor">
          {type === 'profession' ? (
            <select 
              className="cell-select"
              defaultValue={employee.profession_template_id}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCellSave(employee.id, type, (e.target as HTMLSelectElement).value, examId);
                } else if (e.key === 'Escape') {
                  setEditingCell(null);
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
                  handleCellSave(employee.id, type, (e.target as HTMLInputElement).value, examId);
                } else if (e.key === 'Escape') {
                  setEditingCell(null);
                }
              }}
              autoFocus
            />
          )}
          <div className="cell-actions">
            <button 
              className="save-btn"
              onClick={() => {
                const input = document.querySelector('.cell-input, .cell-select') as HTMLInputElement;
                handleCellSave(employee.id, type, input.value, examId);
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
      );
    }

    return (
      <span 
        className={`cell-editable ${isPending ? 'cell-pending' : ''}`}
        onClick={() => handleCellClick(employee.id, type, examId)}
        title={isAdmin ? 'Click to edit' : 'Click to request change'}
      >
        {value}
      </span>
    );
  };
  
  // Prepare exam groups for all employees
  const allExamGroups = useMemo(() => {
    // Собираем все уникальные экзамены
    const allExams = new Map<string, EmployeeExamWithDetails>();
    
    employees.forEach(employee => {
      employee.exams.forEach(exam => {
        if (!allExams.has(exam.exam_id)) {
          allExams.set(exam.exam_id, exam);
        }
      });
    });
    
    // Группируем экзамены по первым двум буквам
    const groupMap = new Map<string, ExamGroup>();
    
    Array.from(allExams.values()).forEach(exam => {
      const prefix = exam.exam_name.substring(0, 2).toUpperCase();
      
      // Проверяем, есть ли другие экзамены с таким же префиксом
      const samePrefix = Array.from(allExams.values()).filter(e => 
        e.exam_name.substring(0, 2).toUpperCase() === prefix
      );
      
      // Группируем только если есть больше одного экзамена с одинаковым префиксом
      if (samePrefix.length > 1) {
        if (!groupMap.has(prefix)) {
          groupMap.set(prefix, {
            key: prefix,
            name: prefix,
            exams: [],
            nearestExam: undefined
          });
        }
        
        // Добавляем экзамен в группу только если его там еще нет
        if (!groupMap.get(prefix)!.exams.some(e => e.exam_id === exam.exam_id)) {
          groupMap.get(prefix)!.exams.push(exam);
        }
      } else {
        // Если экзамен единственный с таким префиксом, создаем отдельную "группу"
        groupMap.set(exam.exam_id, {
          key: exam.exam_id,
          name: exam.exam_name,
          exams: [exam],
          nearestExam: exam
        });
      }
    });
    
    // Сортируем экзамены в каждой группе по дате и находим ближайший
    Array.from(groupMap.values()).forEach(group => {
      if (group.exams.length > 1) {
        group.exams.sort((a, b) => {
          const aDate = a.next_exam_date ? new Date(a.next_exam_date).getTime() : Infinity;
          const bDate = b.next_exam_date ? new Date(b.next_exam_date).getTime() : Infinity;
          return aDate - bDate;
        });
        
        // Находим ближайший экзамен (самый ранний)
        group.nearestExam = group.exams[0];
      }
    });
    
    // Сортируем группы по алфавиту
    const sortedGroups = Array.from(groupMap.values()).sort((a: ExamGroup, b: ExamGroup) => {
      return a.name.localeCompare(b.name);
    });
    
    return sortedGroups;
  }, [employees]);
  
  if (loading) {
    return (
      <div className="interactive-table-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading interactive table...</p>
        </div>
      </div>
    );
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
    );
  }

  return (
    <div className="interactive-table-container">
      <div className="table-wrapper">
        <table className="interactive-table" style={{ position: 'relative' }}>
          <thead className="table-head-fixed">
            <tr>
              <th className="col-fixed">ФИО</th>
              {!collapsedColumns.has('section') && <th>Участок</th>}
              {!collapsedColumns.has('profession') && <th>Профессия</th>}
              
              {allExamGroups.map(group => (
                expandedGroups.has(group.key) ? (
                  group.exams.map(exam => (
                    <th key={exam.exam_id}>{exam.exam_name}</th>
                  ))
                ) : (
                  <th 
                    key={group.key} 
                    className={`${group.exams.length > 1 ? 'group-header' : ''} ${expandedGroups.has(group.key) ? 'expanded' : ''}`}
                    onClick={() => group.exams.length > 1 ? handleGroupClick(group.key) : undefined}
                    style={{ cursor: group.exams.length > 1 ? 'pointer' : 'default' }}
                  >
                    {group.name}
                    {group.exams.length > 1 && (
                      <span className="group-indicator">
                        {expandedGroups.has(group.key) ? ' ▲' : ' ▼'}
                      </span>
                    )}
                  </th>
                )
              ))}
            </tr>
          </thead>
          
          <tbody>
            {employees.map(employee => (
              <tr key={employee.id} className="table-row">
                <td className="col-fixed">
                  {renderEditableCell(employee, 'name', formatName(employee.full_name))}
                </td>
                
                {!collapsedColumns.has('section') && (
                  <td>{employee.section_name}</td>
                )}
                
                {!collapsedColumns.has('profession') && (
                  <td>
                    {renderEditableCell(employee, 'profession', employee.profession_name)}
                  </td>
                )}
                
                {allExamGroups.map(group => {
                  if (expandedGroups.has(group.key)) {
                    return group.exams.map(exam => {
                      const examData = employee.exams.find(e => e.exam_id === exam.exam_id);
                      return (
                        <td 
                          key={`${employee.id}-${exam.exam_id}`} 
                          className={`col-exam ${examData ? getStatusClass(examData.status) : ''}`}
                        >
                          {examData ? renderEditableCell(
                            employee, 
                            'exam', 
                            formatDate(examData.next_exam_date),
                            examData.id
                          ) : '-'}
                        </td>
                      );
                    });
                  } else {
                    if (group.exams.length === 1) {
                      // Для одиночного экзамена
                      const exam = group.exams[0];
                      const examData = employee.exams.find(e => e.exam_id === exam.exam_id);
                      return (
                        <td 
                          key={`${employee.id}-${group.key}`} 
                          className={`col-exam ${examData ? getStatusClass(examData.status) : ''}`}
                        >
                          {examData ? renderEditableCell(
                            employee, 
                            'exam', 
                            formatDate(examData.next_exam_date),
                            examData.id
                          ) : '-'}
                        </td>
                      );
                    } else {
                      // Для групповой ячейки находим экзамены этого сотрудника в группе
                      const employeeExamsInGroup = employee.exams.filter(e =>
                        group.exams.some(groupExam => groupExam.exam_id === e.exam_id)
                      );
                      
                      // Находим ближайший экзамен среди экзаменов этого сотрудника в группе
                      const nearestExam = employeeExamsInGroup.reduce((nearest, current) => {
                        if (!nearest) return current;
                        if (!nearest.next_exam_date) return current;
                        if (!current.next_exam_date) return nearest;
                        return new Date(current.next_exam_date) < new Date(nearest.next_exam_date) ? current : nearest;
                      }, employeeExamsInGroup[0]);
                      
                      const examData = nearestExam || null;
                      
                      return (
                        <td
                          key={`${employee.id}-${group.key}`}
                          className={`col-group ${examData ? getStatusClass(examData.status) : ''} ${group.exams.length > 1 ? 'grouped-cell' : ''}`}
                          onClick={() => group.exams.length > 1 ? handleGroupClick(group.key) : undefined}
                          style={{ cursor: group.exams.length > 1 ? 'pointer' : 'default' }}
                        >
                          {examData ? (
                            <>
                              {renderEditableCell(
                                employee, 
                                'exam', 
                                formatDate(examData.next_exam_date),
                                examData.id
                              )}
                              {employeeExamsInGroup.length > 1 && (
                                <div className="group-count-badge">{employeeExamsInGroup.length}</div>
                              )}
                            </>
                          ) : '-'}
                        </td>
                      );
                    }
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InteractiveTableFinal;