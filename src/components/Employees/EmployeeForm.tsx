import React, { useState, useEffect } from 'react'
import { EmployeeWithDetails, CreateEmployeeData, UpdateEmployeeData } from '../../types/database'
import { useSections } from '../../hooks/useSections'
import { useProfessions } from '../../hooks/useProfessions'
import { useAuth } from '../../hooks/useAuth'
import './EmployeeForm.css'

interface EmployeeFormProps {
  employee?: EmployeeWithDetails | null
  onSubmit: (data: CreateEmployeeData | UpdateEmployeeData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({
  employee,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const { canViewAllSections, user } = useAuth()
  const { sections } = useSections()
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const { professions } = useProfessions(selectedSectionId || undefined)

  const [formData, setFormData] = useState({
    full_name: '',
    profession_template_id: '',
    section_id: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Инициализация формы
  useEffect(() => {
    if (employee) {
      // Режим редактирования
      setFormData({
        full_name: employee.full_name,
        profession_template_id: employee.profession_template_id,
        section_id: employee.section_id
      })
      setSelectedSectionId(employee.section_id)
    } else {
      // Режим создания
      const defaultSectionId = canViewAllSections() ? '' : (user?.section_id || '')
      setFormData({
        full_name: '',
        profession_template_id: '',
        section_id: defaultSectionId
      })
      setSelectedSectionId(defaultSectionId)
    }
  }, [employee, canViewAllSections, user])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'ФИО обязательно для заполнения'
    }

    if (!formData.section_id) {
      newErrors.section_id = 'Участок обязателен для выбора'
    }

    if (!formData.profession_template_id) {
      newErrors.profession_template_id = 'Профессия обязательна для выбора'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (err) {
      console.error('Ошибка при сохранении работника:', err)
    }
  }

  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId)
    setFormData(prev => ({
      ...prev,
      section_id: sectionId,
      profession_template_id: '' // Сбрасываем профессию при смене участка
    }))
  }

  return (
    <div className="employee-form-overlay">
      <div className="employee-form-container">
        <div className="employee-form-header">
          <h3>{employee ? 'Редактирование работника' : 'Добавление работника'}</h3>
          <button 
            onClick={onCancel}
            className="close-button"
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="employee-form">
          <div className="form-group">
            <label htmlFor="full_name" className="form-label">
              ФИО работника *
            </label>
            <input
              id="full_name"
              type="text"
              className={`form-input ${errors.full_name ? 'error' : ''}`}
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Введите полное имя работника"
              disabled={loading}
            />
            {errors.full_name && (
              <span className="error-message">{errors.full_name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="section_id" className="form-label">
              Участок *
            </label>
            <select
              id="section_id"
              className={`form-input ${errors.section_id ? 'error' : ''}`}
              value={formData.section_id}
              onChange={(e) => handleSectionChange(e.target.value)}
              disabled={loading || !canViewAllSections()}
            >
              <option value="">Выберите участок</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
            {errors.section_id && (
              <span className="error-message">{errors.section_id}</span>
            )}
            {!canViewAllSections() && (
              <span className="form-hint">
                Вы можете добавлять работников только в свой участок
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="profession_template_id" className="form-label">
              Профессия *
            </label>
            <select
              id="profession_template_id"
              className={`form-input ${errors.profession_template_id ? 'error' : ''}`}
              value={formData.profession_template_id}
              onChange={(e) => setFormData(prev => ({ ...prev, profession_template_id: e.target.value }))}
              disabled={loading || !selectedSectionId}
            >
              <option value="">Выберите профессию</option>
              {professions.map(profession => (
                <option key={profession.id} value={profession.id}>
                  {profession.name}
                </option>
              ))}
            </select>
            {errors.profession_template_id && (
              <span className="error-message">{errors.profession_template_id}</span>
            )}
            {!selectedSectionId && (
              <span className="form-hint">
                Сначала выберите участок
              </span>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : (employee ? 'Сохранить' : 'Добавить')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeForm