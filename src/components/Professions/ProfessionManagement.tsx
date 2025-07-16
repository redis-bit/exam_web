import React, { useState } from 'react'
import { ProfessionTemplateWithExams } from '../../hooks/useProfessionTemplates'
import { useAuth } from '../../hooks/useAuth'
import { useProfessionTemplates } from '../../hooks/useProfessionTemplates'
import ProfessionList from './ProfessionList'
import ProfessionForm from './ProfessionForm'
import ExamManagement from './ExamManagement'

const ProfessionManagement: React.FC = () => {
  const { user } = useAuth()
  const { professionTemplates, loading, error, fetchProfessionTemplates } = useProfessionTemplates()
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'exams'>('list')
  const [editingProfession, setEditingProfession] = useState<ProfessionTemplateWithExams | null>(null)

  // Проверяем права доступа - только администраторы могут управлять профессиями
  if (user?.role !== 'admin') {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '4px',
        color: '#856404'
      }}>
        <h3>Доступ запрещен</h3>
        <p>Только администраторы могут управлять профессиями.</p>
      </div>
    )
  }

  const handleCreate = () => {
    setEditingProfession(null)
    setCurrentView('create')
  }

  const handleEdit = (profession: ProfessionTemplateWithExams) => {
    setEditingProfession(profession)
    setCurrentView('edit')
  }

  const handleManageExams = () => {
    setCurrentView('exams')
  }

  const handleFormSuccess = () => {
    setCurrentView('list')
    setEditingProfession(null)
    fetchProfessionTemplates() // Обновляем список
  }

  const handleCancel = () => {
    setCurrentView('list')
    setEditingProfession(null)
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '4px',
        color: '#721c24'
      }}>
        <h3>Ошибка загрузки</h3>
        <p>{error}</p>
        <button 
          onClick={fetchProfessionTemplates}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      padding: '30px',
      borderRadius: '8px',
      boxShadow: 'var(--shadow)',
      color: 'var(--text-primary)'
    }}>
      {currentView === 'list' ? (
        <ProfessionList
          professions={professionTemplates}
          loading={loading}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onManageExams={handleManageExams}
          onRefresh={fetchProfessionTemplates}
        />
      ) : currentView === 'exams' ? (
        <ExamManagement onBack={handleCancel} />
      ) : (
        <ProfessionForm
          profession={editingProfession}
          onSuccess={handleFormSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

export default ProfessionManagement