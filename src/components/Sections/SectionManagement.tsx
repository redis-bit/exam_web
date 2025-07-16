import React, { useState } from 'react'
import { Section } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import { useSections } from '../../hooks/useSections'
import SectionList from './SectionList'
import SectionForm from './SectionForm'

const SectionManagement: React.FC = () => {
  const { user } = useAuth()
  const { sections, loading, error, fetchSections } = useSections()
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list')
  const [editingSection, setEditingSection] = useState<Section | null>(null)

  // Проверяем права доступа - только администраторы могут управлять участками
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
        <p>Только администраторы могут управлять участками.</p>
      </div>
    )
  }

  const handleCreate = () => {
    setEditingSection(null)
    setCurrentView('create')
  }

  const handleEdit = (section: Section) => {
    setEditingSection(section)
    setCurrentView('edit')
  }

  const handleFormSuccess = () => {
    setCurrentView('list')
    setEditingSection(null)
    fetchSections() // Обновляем список
  }

  const handleCancel = () => {
    setCurrentView('list')
    setEditingSection(null)
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
          onClick={fetchSections}
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
        <SectionList
          sections={sections}
          loading={loading}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onRefresh={fetchSections}
        />
      ) : (
        <SectionForm
          section={editingSection}
          onSuccess={handleFormSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

export default SectionManagement