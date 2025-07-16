import React, { useState, useEffect } from 'react'
import { Section } from '../../types/database'
import { supabase } from '../../lib/supabase'

interface SectionFormProps {
  section: Section | null // null для создания, объект для редактирования
  onSuccess: () => void
  onCancel: () => void
}

const SectionForm: React.FC<SectionFormProps> = ({
  section,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!section

  useEffect(() => {
    if (section) {
      setFormData({
        name: section.name,
        is_active: section.is_active
      })
    }
  }, [section])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Название участка обязательно для заполнения')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isEditing) {
        // Обновление существующего участка
        const { error: updateError } = await supabase
          .from('sections')
          .update({
            name: formData.name.trim(),
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', section.id)

        if (updateError) {
          throw updateError
        }

        alert('Участок успешно обновлен')
      } else {
        // Создание нового участка
        const { error: insertError } = await supabase
          .from('sections')
          .insert([{
            name: formData.name.trim(),
            is_active: formData.is_active
          }])

        if (insertError) {
          throw insertError
        }

        alert('Участок успешно создан')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Ошибка при сохранении участка:', error)
      
      // Обработка специфичных ошибок
      if (error.code === '23505') {
        setError('Участок с таким названием уже существует')
      } else {
        setError(error.message || 'Произошла ошибка при сохранении')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Очищаем ошибку при изменении данных
    if (error) {
      setError(null)
    }
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h2>{isEditing ? 'Редактирование участка' : 'Создание нового участка'}</h2>
        <button 
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Назад к списку
        </button>
      </div>

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: '500px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="name"
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#495057'
            }}
          >
            Название участка *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Введите название участка"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          <small style={{ color: '#6c757d', fontSize: '14px' }}>
            Название должно быть уникальным
          </small>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: '500',
            color: '#495057'
          }}>
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
              style={{ marginRight: '8px' }}
            />
            Участок активен
          </label>
          <small style={{ color: '#6c757d', fontSize: '14px', marginLeft: '24px' }}>
            Неактивные участки скрыты из основных списков
          </small>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '16px'
            }}
          >
            {loading ? 'Сохранение...' : (isEditing ? 'Обновить участок' : 'Создать участок')}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#6c757d',
              border: '1px solid #6c757d',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '16px'
            }}
          >
            Отмена
          </button>
        </div>
      </form>

      {isEditing && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ marginBottom: '10px' }}>Информация об участке</h4>
          <p><strong>ID:</strong> {section.id}</p>
          <p><strong>Дата создания:</strong> {new Date(section.created_at).toLocaleString('ru-RU')}</p>
          {section.updated_at && (
            <p><strong>Последнее обновление:</strong> {new Date(section.updated_at).toLocaleString('ru-RU')}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default SectionForm