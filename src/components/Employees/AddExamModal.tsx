import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import './AddExamModal.css'

interface Exam {
  id: string
  name: string
  periodicity: number
  has_exam: boolean
}

interface AddExamModalProps {
  employeeId: string
  employeeName: string
  onClose: () => void
  onSuccess: () => void
}

const AddExamModal: React.FC<AddExamModalProps> = ({
  employeeId,
  employeeName,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth()
  const [availableExams, setAvailableExams] = useState<Exam[]>([])
  const [selectedExamId, setSelectedExamId] = useState('')
  const [examDate, setExamDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAvailableExams()
  }, [employeeId])

  const loadAvailableExams = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .rpc('get_available_exams_for_employee', { p_employee_id: employeeId })

      if (error) {
        throw error
      }

      setAvailableExams(data || [])
    } catch (err) {
      console.error('Ошибка при загрузке доступных экзаменов:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при загрузке')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedExamId || !examDate) {
      setError('Заполните все поля')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const { error } = await supabase
        .rpc('add_employee_exam', {
          p_employee_id: employeeId,
          p_exam_id: selectedExamId,
          p_exam_date: examDate,
          p_updated_by: user?.id
        })

      if (error) {
        throw error
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Ошибка при добавлении экзамена:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при добавлении')
    } finally {
      setSaving(false)
    }
  }

  // Фильтруем только экзамены, которых еще нет у работника
  const examsToAdd = availableExams.filter(exam => !exam.has_exam)

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="loading">Загрузка доступных экзаменов...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Добавить экзамен</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p><strong>Работник:</strong> {employeeName}</p>
          
          {examsToAdd.length === 0 ? (
            <div className="no-exams">
              <p>Все доступные экзамены для данной профессии уже добавлены.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="exam">Экзамен:</label>
                <select
                  id="exam"
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  required
                >
                  <option value="">Выберите экзамен</option>
                  {examsToAdd.map(exam => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} (периодичность: {exam.periodicity} дней)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="examDate">Дата сдачи экзамена:</label>
                <input
                  type="date"
                  id="examDate"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]} // Не позволяем выбрать будущую дату
                  required
                />
                <small>Укажите дату фактической сдачи экзамена</small>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="form-actions">
                <button type="button" onClick={onClose} disabled={saving}>
                  Отмена
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? 'Добавление...' : 'Добавить экзамен'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AddExamModal