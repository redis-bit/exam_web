import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EmployeeWithDetails, EmployeeExamWithDetails, ProfessionTemplate } from '../../types/database'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import './InteractiveTable.css'

interface InteractiveTableProps {
  sectionId?: string
}

type FilterType = 'all' | 'empty' | 'upcoming' | 'overdue'
type SortType = 'default' | 'name' | 'profession' | 'section'

interface EmployeeTableData extends EmployeeWithDetails {
  exams: EmployeeExamWithDetails[]
}

const InteractiveTable: React.FC<InteractiveTableProps> = ({ sectionId }) => {
  const { user } = useAuth()
  const { requestExamDateChange } = useNotifications()
  
  const [employees, setEmployees] = useState<EmployeeTableData[]>([])
  const [professions, setProfessions] = useState<ProfessionTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Состояние для фильтров и сортировки
  const [filter, setFilter] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortType>('default')
  
  // Состояние для редактирования
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [editingProfession, setEditingProfession] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState<string | null>(null)
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [selectedProfessionId, setSelectedProfessionId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      await Promise.all([
        loadEmployeesWithExams(),
        loadProfessions()
      ])
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
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
        sections!inner(name),
        profession_templates!inner(name)
      `)
      .eq('is_active', true)

    if (sectionId) {
      query = query.eq('section_id', sectionId)
    }

    const { data: employeesData, error: employeesError } = await query.order('full_name')

    if (employeesError) {
      throw employeesError
    }

    console.log('Загружено сотрудников:', employeesData?.length)

    // Для каждого сотрудника загружаем его экзамены
    const employeesWithExams: EmployeeTableData[] = []

    for (const emp of employeesData || []) {
      const { data: examsData, error: examsError } = await supabase
        .from('employee_exams')
        .select(`
          *,
          exams!inner(name, periodicity)
        `)
        .eq('employee_id', emp.id)

      if (examsError) {
        console.error('Ошибка при загрузке экзаменов для сотрудника:', emp.full_name, examsError)
        continue
      }

      console.log(`Экзамены для ${emp.full_name}:`, examsData)

      // Определяем статус каждого экзамена
      const examsWithStatus: EmployeeExamWithDetails[] = (examsData || []).map(exam => {
        console.log('Обрабатываем экзамен:', exam)
        
        const examDate = new Date(exam.exam_date)
        const today = new Date()
        
        // Проверяем, что дата валидна
        if (isNaN(examDate.getTime())) {
          console.error('Неверная дата экзамена:', exam.exam_date)
          return {
            ...exam,
            exam_name: exam.exams?.name || '',
            status: 'normal' as const,
            color_indicator: 'none' as const
          }
        }
        
        // Определяем дату следующего экзамена
        let nextExamDate: Date
        if (exam.next_exam_date) {
          nextExamDate = new Date(exam.next_exam_date)
        } else {
          // Если next_exam_date нет, рассчитываем на основе exam_date + периодичность
          const periodicity = exam.exams?.periodicity || 365 // по умолчанию год
          nextExamDate = new Date(examDate)
          nextExamDate.setDate(nextExamDate.getDate() + periodicity)
        }
        
        console.log(`Дата последнего экзамена: ${exam.exam_date}, следующий экзамен: ${nextExamDate.toISOString().split('T')[0]}`)
        
        // Сбрасываем время для корректного сравнения дат
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const nextExamDateStart = new Date(nextExamDate.getFullYear(), nextExamDate.getMonth(), nextExamDate.getDate())
        
        const daysDiff = Math.ceil((nextExamDateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))
        
        console.log(`Экзамен ${exam.exams?.name}: дней до следующего экзамена=${daysDiff}`)
        
        let status: 'overdue' | 'upcoming' | 'pending' | 'normal' = 'normal'
        let color_indicator: 'red' | 'yellow' | 'blue' | 'green' | 'none' = 'none'

        if (exam.pending_date) {
          // Экзамен на согласовании
          status = 'pending'
          color_indicator = 'blue'
          console.log('-> Статус: на согласовании (синий)')
        } else if (daysDiff < 0) {
          // Экзамен просрочен
          status = 'overdue'
          color_indicator = 'red'
          console.log(`-> Статус: просрочен (красный), дней просрочки: ${Math.abs(daysDiff)}`)
        } else if (daysDiff <= 30) {
          // Экзамен подходит (до 30 дней)
          status = 'upcoming'
          color_indicator = 'yellow'
          console.log(`-> Статус: подходит (желтый), дней до экзамена: ${daysDiff}`)
        } else {
          // Экзамен в норме - без цвета
          status = 'normal'
          color_indicator = 'none'
          console.log(`-> Статус: нормальный (без цвета), дней до экзамена: ${daysDiff}`)
        }

        return {
          ...exam,
          exam_name: exam.exams?.name || '',
          status,
          color_indicator,
          // Добавляем рассчитанную дату следующего экзамена
          calculated_next_date: nextExamDate.toISOString().split('T')[0]
        }
      })

      employeesWithExams.push({
        id: emp.id,
        full_name: emp.full_name,
        profession_template_id: emp.profession_template_id,
        section_id: emp.section_id,
        is_active: emp.is_active,
        created_at: emp.created_at,
        updated_at: emp.updated_at,
        section_name: emp.sections?.name || '',
        profession_name: emp.profession_templates?.name || '',
        exams: examsWithStatus
      })
    }

    console.log('Итоговые данные сотрудников с экзаменами:', employeesWithExams)
    setEmployees(employeesWithExams)
  }

  const loadProfessions = async () => {
    const { data, error } = await supabase
      .from('profession_templates')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw error
    }

    setProfessions(data || [])
  }

  // Фильтрация и сортировка данных
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees

    // Применяем фильтр
    switch (filter) {
      case 'empty':
        filtered = employees.filter(emp => emp.exams.length === 0)
        break
      case 'upcoming':
        filtered = employees.filter(emp => 
          emp.exams.some(exam => exam.status === 'upcoming')
        )
        break
      case 'overdue':
        filtered = employees.filter(emp => 
          emp.exams.some(exam => exam.status === 'overdue')
        )
        break
      default:
        // 'all' - показываем всех
        break
    }

    // Применяем сортировку
    switch (sortBy) {
      case 'default':
        // Сначала пустые ячейки, потом просроченные, потом скоро подходящие, потом остальные
        return filtered.sort((a, b) => {
          const aEmpty = a.exams.length === 0
          const bEmpty = b.exams.length === 0
          const aOverdue = a.exams.some(exam => exam.status === 'overdue')
          const bOverdue = b.exams.some(exam => exam.status === 'overdue')
          const aUpcoming = a.exams.some(exam => exam.status === 'upcoming')
          const bUpcoming = b.exams.some(exam => exam.status === 'upcoming')

          if (aEmpty && !bEmpty) return -1
          if (!aEmpty && bEmpty) return 1
          if (aOverdue && !bOverdue) return -1
          if (!aOverdue && bOverdue) return 1
          if (aUpcoming && !bUpcoming) return -1
          if (!aUpcoming && bUpcoming) return 1
          
          return a.full_name.localeCompare(b.full_name)
        })
      case 'name':
        return filtered.sort((a, b) => a.full_name.localeCompare(b.full_name))
      case 'profession':
        return filtered.sort((a, b) => a.profession_name.localeCompare(b.profession_name))
      case 'section':
        return filtered.sort((a, b) => a.section_name.localeCompare(b.section_name))
      default:
        return filtered
    }
  }, [employees, filter, sortBy])

  // Получаем все уникальные экзамены для заголовков таблицы
  const allExams = useMemo(() => {
    const examSet = new Set<string>()
    employees.forEach(emp => {
      emp.exams.forEach(exam => {
        examSet.add(exam.exam_name)
      })
    })
    return Array.from(examSet).sort()
  }, [employees])

  const handleEmployeeNameEdit = async (employeeId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ full_name: newName })
        .eq('id', employeeId)

      if (error) {
        throw error
      }

      await loadEmployeesWithExams()
      setEditingEmployee(null)
      setNewEmployeeName('')
    } catch (err) {
      console.error('Ошибка при обновлении имени сотрудника:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при обновлении')
    }
  }

  const handleProfessionChange = async (employeeId: string, professionId: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ profession_template_id: professionId })
        .eq('id', employeeId)

      if (error) {
        throw error
      }

      await loadEmployeesWithExams()
      setEditingProfession(null)
      setSelectedProfessionId('')
    } catch (err) {
      console.error('Ошибка при обновлении профессии:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при обновлении')
    }
  }

  const handleExamDateChange = async (employeeId: string, examId: string, newDate: string) => {
    try {
      const isAdmin = user?.role === 'admin' || user?.role === 'admin_assistant'
      
      if (isAdmin) {
        // Админ может изменить дату сразу
        const { error } = await supabase
          .from('employee_exams')
          .update({ 
            exam_date: newDate,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', employeeId)
          .eq('id', examId)

        if (error) {
          throw error
        }
      } else {
        // Пользователь отправляет на согласование
        await requestExamDateChange(employeeId, examId, newDate)
      }

      await loadEmployeesWithExams()
      setShowCalendar(null)
      setSelectedDate('')
    } catch (err) {
      console.error('Ошибка при изменении даты экзамена:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при изменении даты')
    }
  }

  const getExamForEmployee = (employee: EmployeeTableData, examName: string) => {
    return employee.exams.find(exam => exam.exam_name === examName)
  }

  if (loading) {
    return <div className="loading">Загрузка данных...</div>
  }

  if (error) {
    return <div className="error">Ошибка: {error}</div>
  }

  return (
    <div className="interactive-table">
      <div className="table-controls">
        <div className="filters">
          <label>Фильтр:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as FilterType)}>
            <option value="all">Все работники</option>
            <option value="empty">Только с пустыми ячейками</option>
            <option value="upcoming">Подходящие экзамены</option>
            <option value="overdue">Просроченные экзамены</option>
          </select>
        </div>
        
        <div className="sorting">
          <label>Сортировка:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortType)}>
            <option value="default">По приоритету</option>
            <option value="name">По имени</option>
            <option value="profession">По профессии</option>
            <option value="section">По участку</option>
          </select>
        </div>

        <button onClick={loadData} className="refresh-btn">
          🔄 Обновить
        </button>
      </div>

      <div className="table-wrapper">
        <table className="employees-table">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Профессия</th>
              <th>Участок</th>
              {allExams.map(examName => (
                <th key={examName}>{examName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedEmployees.map(employee => (
              <tr key={employee.id}>
                <td 
                  className="editable-cell"
                  onClick={() => {
                    setEditingEmployee(employee.id)
                    setNewEmployeeName(employee.full_name)
                  }}
                >
                  {editingEmployee === employee.id ? (
                    <input
                      type="text"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      onBlur={() => handleEmployeeNameEdit(employee.id, newEmployeeName)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleEmployeeNameEdit(employee.id, newEmployeeName)
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    employee.full_name
                  )}
                </td>
                
                <td 
                  className="editable-cell"
                  onClick={() => {
                    setEditingProfession(employee.id)
                    setSelectedProfessionId(employee.profession_template_id)
                  }}
                >
                  {editingProfession === employee.id ? (
                    <select
                      value={selectedProfessionId}
                      onChange={(e) => setSelectedProfessionId(e.target.value)}
                      onBlur={() => handleProfessionChange(employee.id, selectedProfessionId)}
                      autoFocus
                    >
                      {professions.map(profession => (
                        <option key={profession.id} value={profession.id}>
                          {profession.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    employee.profession_name
                  )}
                </td>
                
                <td>{employee.section_name}</td>
                
                {allExams.map(examName => {
                  const exam = getExamForEmployee(employee, examName)
                  const cellKey = `${employee.id}-${examName}`
                  
                  return (
                    <td 
                      key={examName}
                      className={`exam-cell ${exam ? exam.color_indicator : 'empty'}`}
                      onClick={() => {
                        if (exam) {
                          setShowCalendar(cellKey)
                          setSelectedDate(exam.calculated_next_date || exam.exam_date.split('T')[0])
                        }
                      }}
                    >
                      {showCalendar === cellKey ? (
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          onBlur={() => {
                            if (exam && selectedDate) {
                              handleExamDateChange(employee.id, exam.id, selectedDate)
                            } else {
                              setShowCalendar(null)
                            }
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && exam && selectedDate) {
                              handleExamDateChange(employee.id, exam.id, selectedDate)
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        exam ? (
                          <div className="exam-date">
                            {exam.calculated_next_date 
                              ? new Date(exam.calculated_next_date).toLocaleDateString('ru-RU')
                              : new Date(exam.exam_date).toLocaleDateString('ru-RU')
                            }
                            {exam.pending_date && (
                              <div className="pending-indicator">
                                На согласовании
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="empty-exam">-</div>
                        )
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <h4>Обозначения:</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="color-indicator red"></span>
            Просроченные экзамены
          </div>
          <div className="legend-item">
            <span className="color-indicator yellow"></span>
            Подходящие экзамены (до 30 дней)
          </div>
          <div className="legend-item">
            <span className="color-indicator blue"></span>
            На согласовании
          </div>
          <div className="legend-item">
            <span className="color-indicator none"></span>
            Нормальные экзамены (без цвета)
          </div>
          <div className="legend-item">
            <span className="color-indicator empty"></span>
            Нет данных
          </div>
        </div>
      </div>
    </div>
  )
}

export default InteractiveTable