import React, { useState, useEffect } from 'react'
import { EmployeeWithDetails } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import EmployeeForm from './EmployeeForm'
import './EmployeeList.css'

import ExamManagement from './ExamManagement'
import AddExamModal from './AddExamModal'

interface EmployeeListProps {
  employees: EmployeeWithDetails[]
  loading: boolean
  onEdit: (employee: EmployeeWithDetails) => void
  onDelete: (id: string) => void
  onRefresh: () => void
}

const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  loading,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const { canEditEmployee, canViewAllSections } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedProfession, setSelectedProfession] = useState('')
  const [selectedEmployeeForExams, setSelectedEmployeeForExams] = useState<EmployeeWithDetails | null>(null)
  const [showAddExam, setShowAddExam] = useState<EmployeeWithDetails | null>(null)

  // Dynamically import mobile styles
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        import('./EmployeeList.mobile.css')
      }
    }
    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])


  // Фильтрация работников
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSection = !selectedSection || employee.section_name === selectedSection
    const matchesProfession = !selectedProfession || employee.profession_name === selectedProfession
    
    return matchesSearch && matchesSection && matchesProfession
  })

  // Получаем уникальные участки и профессии для фильтров
  const uniqueSections = Array.from(new Set(employees.map(emp => emp.section_name)))
  const uniqueProfessions = Array.from(new Set(employees.map(emp => emp.profession_name)))

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Загрузка работников...</div>
      </div>
    )
  }

  return (
    <div className="employee-list-container">
      <div className="employee-list-header">
        <h2>Управление работниками</h2>
        <button 
          onClick={onRefresh}
          className="btn btn-secondary"
        >
          Обновить
        </button>
      </div>

      {/* Фильтры */}
      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="search">Поиск по имени:</label>
          <input
            id="search"
            type="text"
            placeholder="Введите имя работника..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        {canViewAllSections() && (
          <div className="filter-group">
            <label htmlFor="section-filter">Участок:</label>
            <select
              id="section-filter"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="filter-select"
            >
              <option value="">Все участки</option>
              {uniqueSections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label htmlFor="profession-filter">Профессия:</label>
          <select
            id="profession-filter"
            value={selectedProfession}
            onChange={(e) => setSelectedProfession(e.target.value)}
            className="filter-select"
          >
            <option value="">Все профессии</option>
            {uniqueProfessions.map(profession => (
              <option key={profession} value={profession}>{profession}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Статистика */}
      <div className="stats-container" style={{ 
        backgroundColor: 'var(--bg-tertiary)', 
        color: 'var(--text-primary)',
        border: '1px solid var(--border-color)'
      }}>
        <div className="stat-item">
          <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>Всего работников:</span>
          <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{employees.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>Отображается:</span>
          <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{filteredEmployees.length}</span>
        </div>
      </div>

      {/* Таблица работников */}
      <div className="table-container">
        <table className="employees-table" style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)'
        }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <th style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>ФИО</th>
              <th style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>Профессия</th>
              {canViewAllSections() && <th style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>Участок</th>}
              <th style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>Дата создания</th>
              <th style={{ color: 'var(--text-primary)', borderBottom: '2px solid var(--border-color)' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={canViewAllSections() ? 5 : 4} className="no-data" style={{ color: 'var(--text-secondary)' }}>
                  {employees.length === 0 ? 'Нет работников' : 'Нет работников, соответствующих фильтрам'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map(employee => (
                <tr key={employee.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td data-label="ФИО" className="employee-name" style={{ color: 'var(--text-primary)' }}><span>{employee.full_name}</span></td>
                  <td data-label="Профессия" style={{ color: 'var(--text-secondary)' }}><span>{employee.profession_name}</span></td>
                  {canViewAllSections() && <td data-label="Участок" style={{ color: 'var(--text-secondary)' }}><span>{employee.section_name}</span></td>}
                  <td data-label="Дата создания" style={{ color: 'var(--text-secondary)' }}><span>{new Date(employee.created_at).toLocaleDateString('ru-RU')}</span></td>
                  <td data-label="Действия" className="actions-cell">
                    <div className="actions-wrapper">
                      {canEditEmployee(employee.section_id) && (
                        <>
                          <button
                            onClick={() => setSelectedEmployeeForExams(employee)}
                            className="btn btn-sm btn-info"
                            title="Управление экзаменами"
                          >
                            Экзамены
                          </button>
                          <button
                            onClick={() => setShowAddExam(employee)}
                            className="btn btn-sm btn-success"
                            title="Добавить экзамен"
                          >
                            + Экзамен
                          </button>
                          <button
                            onClick={() => onEdit(employee)}
                            className="btn btn-sm btn-primary"
                            title="Редактировать"
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Вы уверены, что хотите удалить работника "${employee.full_name}"?`)) {
                                onDelete(employee.id)
                              }
                            }}
                            className="btn btn-sm btn-danger"
                            title="Удалить"
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Модальное окно управления экзаменами */}
      {selectedEmployeeForExams && (
        <ExamManagement
          employee={selectedEmployeeForExams}
          onClose={() => setSelectedEmployeeForExams(null)}
          onUpdate={onRefresh}
        />
      )}

      {/* Модальное окно добавления экзамена */}
      {showAddExam && (
        <AddExamModal
          employeeId={showAddExam.id}
          employeeName={showAddExam.full_name}
          onClose={() => setShowAddExam(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  )
}

export default EmployeeList
