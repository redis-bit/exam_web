import React, { useState, useEffect } from 'react'
import { ProfessionTemplateWithExams, useProfessionTemplates } from '../../hooks/useProfessionTemplates'
import { useSections } from '../../hooks/useSections'
import { useExams } from '../../hooks/useExams'

interface ProfessionFormProps {
  profession: ProfessionTemplateWithExams | null // null для создания, объект для редактирования
  onSuccess: () => void
  onCancel: () => void
}

const ProfessionForm: React.FC<ProfessionFormProps> = ({
  profession,
  onSuccess,
  onCancel
}) => {
  const { createProfessionTemplate, updateProfessionTemplate } = useProfessionTemplates()
  const { sections } = useSections()
  const { exams } = useExams()
  
  const [formData, setFormData] = useState({
    name: '',
    section_id: '',
    exam_ids: [] as string[],
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!profession

  useEffect(() => {
    if (profession) {
      setFormData({
        name: profession.name,
        section_id: profession.section_id,
        exam_ids: profession.exams?.map(exam => exam.id) || [],
        is_active: profession.is_active
      })
    }
  }, [profession])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Название профессии обязательно для заполнения')
      return
    }

    if (!formData.section_id) {
      setError('Необходимо выбрать участок')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isEditing) {
        // Обновление существующей профессии
        await updateProfessionTemplate(profession.id, {
          name: formData.name.trim(),
          section_id: formData.section_id,
          is_active: formData.is_active,
          exam_ids: formData.exam_ids
        })

        alert('Профессия успешно обновлена')
      } else {
        // Создание новой профессии
        await createProfessionTemplate({
          name: formData.name.trim(),
          section_id: formData.section_id,
          exam_ids: formData.exam_ids
        })

        alert('Профессия успешно создана')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Ошибка при сохранении профессии:', error)
      
      // Обработка специфичных ошибок
      if (error.code === '23505') {
        setError('Профессия с таким названием уже существует в данном участке')
      } else {
        setError(error.message || 'Произошла ошибка при сохранении')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Очищаем ошибку при изменении данных
    if (error) {
      setError(null)
    }
  }

  const handleExamToggle = (examId: string) => {
    setFormData(prev => ({
      ...prev,
      exam_ids: prev.exam_ids.includes(examId)
        ? prev.exam_ids.filter(id => id !== examId)
        : [...prev.exam_ids, examId]
    }))
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h2 style={{ color: 'var(--text-primary)' }}>
          {isEditing ? 'Редактирование профессии' : 'Создание новой профессии'}
        </h2>
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

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="name"
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: 'var(--text-primary)'
            }}
          >
            Название профессии *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Введите название профессии"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--input-border)',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="section_id"
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: 'var(--text-primary)'
            }}
          >
            Участок *
          </label>
          <select
            id="section_id"
            name="section_id"
            value={formData.section_id}
            onChange={handleInputChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--input-border)',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">Выберите участок</option>
            {sections.map(section => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '12px', 
            fontWeight: '500',
            color: 'var(--text-primary)'
          }}>
            Экзамены для данной профессии
          </label>
          <div style={{
            border: '1px solid var(--input-border)',
            borderRadius: '4px',
            padding: '15px',
            backgroundColor: 'var(--input-bg)',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {exams.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                Нет доступных экзаменов. Создайте экзамены в разделе "Управление экзаменами".
              </p>
            ) : (
              exams.map(exam => (
                <label 
                  key={exam.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.exam_ids.includes(exam.id)}
                    onChange={() => handleExamToggle(exam.id)}
                    style={{ marginRight: '10px' }}
                  />
                  <span style={{ flex: 1 }}>
                    {exam.name}
                    <small style={{ 
                      marginLeft: '8px', 
                      color: 'var(--text-muted)',
                      fontSize: '12px'
                    }}>
                      (каждые {Math.round(exam.periodicity / 30)} мес.)
                    </small>
                  </span>
                </label>
              ))
            )}
          </div>
          <small style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Выберите экзамены, которые должны сдавать работники данной профессии
          </small>
        </div>

        {isEditing && (
          <div style={{ marginBottom: '30px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer',
              fontWeight: '500',
              color: 'var(--text-primary)'
            }}>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                style={{ marginRight: '8px' }}
              />
              Профессия активна
            </label>
            <small style={{ color: 'var(--text-muted)', fontSize: '14px', marginLeft: '24px' }}>
              Неактивные профессии скрыты из основных списков
            </small>
          </div>
        )}

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
            {loading ? 'Сохранение...' : (isEditing ? 'Обновить профессию' : 'Создать профессию')}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
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
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '4px',
          border: '1px solid var(--border-color)'
        }}>
          <h4 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>Информация о профессии</h4>
          <p style={{ color: 'var(--text-secondary)' }}><strong>ID:</strong> {profession.id}</p>
          <p style={{ color: 'var(--text-secondary)' }}><strong>Дата создания:</strong> {new Date(profession.created_at).toLocaleString('ru-RU')}</p>
          {profession.updated_at && (
            <p style={{ color: 'var(--text-secondary)' }}><strong>Последнее обновление:</strong> {new Date(profession.updated_at).toLocaleString('ru-RU')}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default ProfessionForm