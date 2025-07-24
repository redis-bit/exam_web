import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EmployeeWithDetails, EmployeeExamWithDetails, ProfessionTemplate, Section } from '../../types/database'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import './InteractiveTable.css'
import './InteractiveTableEnhanced.css'

// Временный компонент для диагностики
const TestDataCheck: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const testResults = [];

    try {
      // Test 1: Check employees
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true);
      
      testResults.push({
        test: 'Active Employees',
        success: !empError,
        count: employees?.length || 0,
        error: empError?.message,
        data: employees?.slice(0, 2)
      });

      // Test 2: Check employee_exams
      const { data: exams, error: examError } = await supabase
        .from('employee_exams')
        .select('*');
      
      testResults.push({
        test: 'Employee Exams',
        success: !examError,
        count: exams?.length || 0,
        error: examError?.message,
        data: exams?.slice(0, 2)
      });

      // Test 3: Check exams table
      const { data: examTypes, error: examTypesError } = await supabase
        .from('exams')
        .select('*');
      
      testResults.push({
        test: 'Exam Types',
        success: !examTypesError,
        count: examTypes?.length || 0,
        error: examTypesError?.message,
        data: examTypes?.slice(0, 5)
      });

      // Test 4: Check if active employees have exams
      if (employees && employees.length > 0) {
        const { data: activeEmployeeExams, error: activeExamError } = await supabase
          .from('employee_exams')
          .select(`
            *,
            exams(name, periodicity)
          `)
          .in('employee_id', employees.map(e => e.id));
        
        testResults.push({
          test: 'Active Employee Exams',
          success: !activeExamError,
          count: activeEmployeeExams?.length || 0,
          error: activeExamError?.message,
          data: activeEmployeeExams?.slice(0, 3)
        });
      }

    } catch (error) {
      testResults.push({
        test: 'General Error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div style={{ padding: '20px', background: '#1a202c', color: '#f7fafc', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>Database Test Results</h3>
      <button 
        onClick={runTests} 
        disabled={loading}
        style={{ 
          background: '#667eea', 
          color: 'white', 
          border: 'none', 
          padding: '8px 16px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Testing...' : 'Run Tests'}
      </button>

      {results.map((result, index) => (
        <div key={index} style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          background: result.success ? '#2d5a2d' : '#5a2d2d',
          borderRadius: '6px'
        }}>
          <h4>{result.test}: {result.success ? '✅' : '❌'}</h4>
          <p>Count: {result.count}</p>
          {result.error && <p style={{ color: '#ff6b6b' }}>Error: {result.error}</p>}
          {result.data && (
            <details>
              <summary>Sample Data</summary>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
};

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
  const { requestExamDateChange } = useNotifications()
  
  const [employees, setEmployees] = useState<EmployeeTableData[]>([])
  const [professions, setProfessions] = useState<ProfessionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for display mode (normal/expanded) - individual for each employee
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
  
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
    let query = supabase
      .from('employees')
      .select(`
        *,
        sections(name),
        profession_templates(name)
      `)
      .eq('is_active', true)

    if (sectionId) {
      query = query.eq('section_id', sectionId)
    }

    const { data: employeesData, error: employeesError } = await query.order('full_name')

    if (employeesError) {
      throw employeesError
    }

    const employeesWithExams: EmployeeTableData[] = []

    for (const emp of employeesData || []) {
      const { data: examsData, error: examsError } = await supabase
        .from('employee_exams')
        .select(`
          *,
          exams(name, periodicity)
        `)
        .eq('employee_id', emp.id)

      if (examsError) {
        console.error('Error loading exams for employee:', emp.full_name, examsError)
        // Добавляем сотрудника даже без экзаменов для отладки
        employeesWithExams.push({
          ...emp,
          section_name: emp.sections?.name || '',
          profession_name: emp.profession_templates?.name || '',
          exams: []
        })
        continue
      }

      console.log(`Exams for ${emp.full_name}:`, examsData?.length || 0)
      console.log('Raw exam data:', examsData)
      console.log('Exam names found:', examsData?.map(e => e.exams?.name))

      const examsWithStatus: EmployeeExamWithDetails[] = (examsData || []).map(exam => {
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

        return {
          ...exam,
          exam_name: exam.exams?.name || '',
          status,
          color_indicator,
          periodicity: exam.exams?.periodicity || 0
        }
      })

      employeesWithExams.push({
        ...emp,
        section_name: emp.sections?.name || '',
        profession_name: emp.profession_templates?.name || '',
        exams: examsWithStatus
      })
    }

    console.log('Final employees with exams:', employeesWithExams.length)
    if (employeesWithExams.length > 0) {
      console.log('Sample employee data:', employeesWithExams[0])
      console.log('Sample exams:', employeesWithExams[0].exams)
      console.log('Sample exam names:', employeesWithExams[0].exams.map(e => e.exam_name))
      
      // Проверим группировку
      const allExamNames = employeesWithExams[0].exams.map(e => e.exam_name)
      console.log('All exam names for grouping:', allExamNames)
      
      const groups = new Set<string>()
      allExamNames.forEach(name => {
        if (name.startsWith('ОТ_') || name === 'ОТ') {
          groups.add('ОТ')
        } else if (name.startsWith('ПБ_') || name === 'ПБ') {
          groups.add('ПБ')
        } else if (name.startsWith('ГО_') || name === 'ГО') {
          groups.add('ГО')
        } else if (name.startsWith('Эб') || name === 'ЭБ' || name === 'Эб') {
          groups.add('ЭБ')
        } else if (name.startsWith('ПТЭ') || name.startsWith('ПТМ')) {
          groups.add('ПТЭ')
        } else if (name.startsWith('Выс_') || name.startsWith('Вы')) {
          groups.add('ВЫС')
        } else {
          groups.add(name)
        }
      })
      console.log('Groups detected:', Array.from(groups))
    }
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

  // Get table structure for exams - каждый экзамен отдельный столбец
  const getTableStructure = useMemo(() => {
    const allExams = new Set<string>()
    
    employees.forEach(employee => {
      employee.exams.forEach(exam => {
        const examName = exam.exam_name || ''
        if (examName) {
          allExams.add(examName)
        }
      })
    })
    
    // Сортируем экзамены по группам, затем по названию
    const examList = Array.from(allExams).sort((a, b) => {
      // Функция для определения приоритета группы
      const getGroupPriority = (name: string) => {
        if (name.startsWith('ОТ_') || name === 'ОТ') return 1
        if (name.startsWith('ПБ_') || name === 'ПБ') return 2
        if (name.startsWith('ГО_') || name === 'ГО') return 3
        if (name.startsWith('Эб') || name === 'ЭБ') return 4
        if (name.startsWith('ПТЭ') || name.startsWith('ПТМ')) return 5
        if (name.startsWith('Выс_') || name.startsWith('Вы')) return 6
        if (name.startsWith('ГР_') || name === 'ГР') return 7
        if (name.startsWith('АТ_') || name === 'АТ') return 8
        if (name.startsWith('РБ_') || name === 'РБ') return 9
        return 10 // Остальные экзамены
      }
      
      const priorityA = getGroupPriority(a)
      const priorityB = getGroupPriority(b)
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      
      // Если в одной группе, сортируем по названию
      return a.localeCompare(b)
    })
    
    console.log('All unique exams found:', examList)
    return examList
  }, [employees])

  // Get exam data for specific exam (not grouped)
  const getExamDataForCell = (employee: EmployeeTableData, examName: string): ExamCellData | null => {
    // Find exact exam match
    const exam = employee.exams.find(e => e.exam_name === examName)
    
    if (!exam) return null
    
    return exam as ExamCellData
  }

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

  // Toggle employee expansion mode
  const toggleEmployeeExpansion = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId)
      } else {
        newSet.add(employeeId)
      }
      return newSet
    })
  }

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

  // Handle cell click
  const handleCellClick = (employeeId: string, type: 'name' | 'profession' | 'exam', examId?: string) => {
    // Start editing cell (убираем переключение режимов для ФИО)
    setEditingCell({ employeeId, type, examId })
  }

  // Handle cell edit save
  const handleCellSave = async (employeeId: string, type: string, newValue: string, examId?: string) => {
    try {
      if (isAdmin) {
        // Admin can change directly
        if (type === 'name') {
          await updateEmployeeName(employeeId, newValue)
        } else if (type === 'profession') {
          await updateEmployeeProfession(employeeId, newValue)
        } else if (type === 'exam' && examId) {
          await updateExamDate(employeeId, examId, newValue)
        }
        await loadData() // Reload data
      } else {
        // User needs approval
        const changeKey = `${employeeId}-${type}-${examId || ''}`
        setPendingChanges(prev => {
          const newSet = new Set(prev)
          newSet.add(changeKey)
          return newSet
        })
        
        if (type === 'exam' && examId) {
          await requestExamDateChange(employeeId, examId, newValue)
        }
        // TODO: Add other approval requests for name and profession changes
      }
    } catch (error) {
      console.error('Error saving cell:', error)
    } finally {
      setEditingCell(null)
    }
  }

  // Update functions
  const updateEmployeeName = async (employeeId: string, newName: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ full_name: newName })
      .eq('id', employeeId)
    
    if (error) throw error
  }

  const updateEmployeeProfession = async (employeeId: string, professionId: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ profession_template_id: professionId })
      .eq('id', employeeId)
    
    if (error) throw error
  }

  const updateExamDate = async (employeeId: string, examId: string, newDate: string) => {
    const { error } = await supabase
      .from('employee_exams')
      .update({ 
        exam_date: newDate,
        next_exam_date: newDate // TODO: Calculate based on periodicity
      })
      .eq('employee_id', employeeId)
      .eq('exam_id', examId)
    
    if (error) throw error
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

      {/* Временная диагностика */}
      <TestDataCheck />

      {/* Debug info */}
      <div style={{ marginBottom: '20px', padding: '10px', background: '#2d3748', borderRadius: '8px', fontSize: '12px' }}>
        <div>Employees loaded: {employees.length}</div>
        <div>Table structure: {getTableStructure.join(', ')}</div>
        {employees.length > 0 && (
          <div>
            <div>Example exams for first employee ({employees[0].full_name}): {employees[0].exams.map(e => e.exam_name).join(', ')}</div>
            <div>Total exams: {employees[0].exams.length}</div>
            {employees[0].exams.length === 0 && (
              <div style={{ color: '#ff6b6b' }}>⚠️ No exams found for this employee!</div>
            )}
          </div>
        )}
        {employees.length === 0 && (
          <div style={{ color: '#ff6b6b' }}>⚠️ No employees loaded!</div>
        )}
      </div>

      {/* Desktop table */}
      <div className="table-wrapper">
        <table className="interactive-table">
          <thead className="table-head-fixed">
            <tr>
              <th className="col-name col-fixed">
                <div className="column-header">
                  <span>Name</span>
                </div>
              </th>
              
              {!collapsedColumns.has('section') && (
                <th className="col-section">
                  <div className="column-header">
                    <span>Section</span>
                    <button 
                      className="collapse-btn"
                      onClick={() => toggleColumnCollapse('section')}
                      title="Collapse column"
                    >
                      -
                    </button>
                  </div>
                </th>
              )}
              {collapsedColumns.has('section') && (
                <th className="col-section-collapsed">
                  <button 
                    className="expand-btn"
                    onClick={() => toggleColumnCollapse('section')}
                    title="Expand Section column"
                  >
                    S+
                  </button>
                </th>
              )}
              
              {!collapsedColumns.has('profession') && (
                <th className="col-profession">
                  <div className="column-header">
                    <span>Profession</span>
                    <button 
                      className="collapse-btn"
                      onClick={() => toggleColumnCollapse('profession')}
                      title="Collapse column"
                    >
                      -
                    </button>
                  </div>
                </th>
              )}
              {collapsedColumns.has('profession') && (
                <th className="col-profession-collapsed">
                  <button 
                    className="expand-btn"
                    onClick={() => toggleColumnCollapse('profession')}
                    title="Expand Profession column"
                  >
                    P+
                  </button>
                </th>
              )}
              
              {getTableStructure.map(examName => (
                <th key={examName} className="col-exam">
                  {examName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(employee => {
              return (
                <tr key={employee.id} className="table-row">
                  {/* Name */}
                  <td className="col-name col-fixed">
                    <div className="name-cell">
                      {renderEditableCell(employee, 'name', formatName(employee.full_name))}
                    </div>
                  </td>

                  {/* Section */}
                  {!collapsedColumns.has('section') && (
                    <td className="col-section">
                      {employee.section_name}
                    </td>
                  )}
                  {collapsedColumns.has('section') && (
                    <td className="col-section-collapsed">
                      <div className="collapsed-indicator">S</div>
                    </td>
                  )}

                  {/* Profession */}
                  {!collapsedColumns.has('profession') && (
                    <td className="col-profession">
                      {renderEditableCell(employee, 'profession', employee.profession_name)}
                    </td>
                  )}
                  {collapsedColumns.has('profession') && (
                    <td className="col-profession-collapsed">
                      <div className="collapsed-indicator">P</div>
                    </td>
                  )}

                  {/* Exams */}
                  {getTableStructure.map(examName => {
                    const examData = getExamDataForCell(employee, examName)
                    
                    // If no data for this column
                    if (!examData) {
                      return <td key={examName} className="col-exam exam-empty">—</td>
                    }

                    const statusClass = getStatusClass(examData.status)
                    
                    return (
                      <td 
                        key={examName} 
                        className={`col-exam ${statusClass}`}
                      >
                        {renderEditableCell(employee, 'exam', formatDate(examData.next_exam_date), examData.exam_id)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mobile-cards">
        {employees.map(employee => {
          return (
            <div key={employee.id} className="employee-card">
              <div className="employee-header">
                <div className="employee-name">
                  {formatName(employee.full_name)}
                </div>
              </div>
              
              <div className="employee-info">
                <div className="info-item">
                  <div className="info-label">Section</div>
                  <div className="info-value">{employee.section_name}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Profession</div>
                  <div className="info-value">{employee.profession_name}</div>
                </div>
              </div>
              
              <div className="exams-grid">
                {getTableStructure.map(examName => {
                  const examData = getExamDataForCell(employee, examName)
                  
                  if (!examData) return null
                  
                  const statusClass = getStatusClass(examData.status)
                  
                  return (
                    <div key={examName} className={`exam-card-mobile ${statusClass}`}>
                      <div className="exam-group-title">{examName}</div>
                      <div className="exam-date-mobile">
                        {renderEditableCell(employee, 'exam', formatDate(examData.next_exam_date), examData.exam_id)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
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