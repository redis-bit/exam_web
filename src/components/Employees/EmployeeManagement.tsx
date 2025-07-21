import React, { useState } from 'react'
import { useEmployees } from '../../hooks/useEmployees'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import { EmployeeWithDetails, CreateEmployeeData, UpdateEmployeeData } from '../../types/database'
import EmployeeList from './EmployeeList'
import EmployeeForm from './EmployeeForm'

const EmployeeManagement: React.FC = () => {
  const { user, canViewAllSections } = useAuth()
  const { requestEmployeeCreation } = useNotifications()
  
  // Если пользователь - начальник участка, показываем только его участок
  const sectionId = canViewAllSections() ? undefined : user?.section_id || undefined
  
  const {
    employees,
    loading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee
  } = useEmployees(sectionId)

  const [showForm, setShowForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithDetails | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const handleAddEmployee = () => {
    setEditingEmployee(null)
    setShowForm(true)
  }

  const handleEditEmployee = (employee: EmployeeWithDetails) => {
    setEditingEmployee(employee)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingEmployee(null)
  }

  const handleSubmitForm = async (data: CreateEmployeeData | UpdateEmployeeData) => {
    try {
      setFormLoading(true)
      
      if (editingEmployee) {
        // Редактирование существующего работника - всегда напрямую
        await updateEmployee(editingEmployee.id, data as UpdateEmployeeData)
        alert('Работник успешно обновлен')
      } else {
        // Создание нового работника
        const isAdmin = user && ['admin', 'admin_assistant'].includes(user.role)
        const createData = data as CreateEmployeeData
        
        if (isAdmin) {
          // Администратор создает напрямую
          await createEmployee(createData)
          alert('Работник успешно создан')
        } else {
          // Обычный пользователь отправляет запрос на подтверждение
          const result = await requestEmployeeCreation(
            createData.full_name,
            createData.profession_template_id,
            createData.section_id
          )
          
          if (result?.success) {
            alert('Запрос на создание работника отправлен администратору на рассмотрение')
          } else {
            if (result?.error?.includes('не настроена')) {
              alert('Система подтверждений не настроена. Обратитесь к администратору.\n\nДля настройки выполните SQL скрипт database/05_notifications_and_approvals.sql в Supabase.')
            } else {
              throw new Error(result?.error || 'Ошибка при отправке запроса')
            }
          }
        }
      }
      
      handleCloseForm()
    } catch (err) {
      console.error('Ошибка при сохранении работника:', err)
      alert('Ошибка при сохранении работника. Попробуйте еще раз.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    try {
      await deleteEmployee(id)
    } catch (err) {
      console.error('Ошибка при удалении работника:', err)
      alert('Ошибка при удалении работника. Попробуйте еще раз.')
    }
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ 
          color: '#dc3545', 
          backgroundColor: '#f8d7da', 
          padding: '15px', 
          borderRadius: '4px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Ошибка загрузки данных:</strong>
          <p>{error}</p>
          <button 
            onClick={fetchEmployees}
            className="btn btn-primary"
            style={{ marginTop: '10px' }}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ 
        padding: '0 20px',
        marginBottom: '20px'
      }}>
        {!canViewAllSections() && user?.section_id && (
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 15px 0', fontSize: '14px' }}>
            Отображаются работники вашего участка
          </p>
        )}
        
        {/* Кнопка добавить работника на всю ширину */}
        <button
          onClick={handleAddEmployee}
          className="btn btn-primary"
          style={{ 
            width: '100%',
            padding: '16px 24px',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '10px'
          }}
        >
          + Добавить работника
        </button>
        
        {/* Кнопка обновить на всю ширину */}
        <button
          onClick={fetchEmployees}
          className="btn btn-secondary"
          style={{ 
            width: '100%',
            padding: '12px 24px',
            fontSize: '14px'
          }}
        >
          🔄 Обновить
        </button>
      </div>

      <EmployeeList
        employees={employees}
        loading={loading}
        onEdit={handleEditEmployee}
        onDelete={handleDeleteEmployee}
        onRefresh={fetchEmployees}
      />

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={handleSubmitForm}
          onCancel={handleCloseForm}
          loading={formLoading}
        />
      )}
    </div>
  )
}

export default EmployeeManagement