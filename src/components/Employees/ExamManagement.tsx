import React, { useState, useEffect } from 'react';
import { EmployeeWithDetails, EmployeeExamWithDetails } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import AddExamModal from './AddExamModal';
import './ExamManagement.css';
import './ExamManagement.mobile.css';

interface ExamManagementProps {
  employee: EmployeeWithDetails;
  onClose: () => void;
  onUpdate: () => void;
}

const ExamManagement: React.FC<ExamManagementProps> = ({ employee, onClose, onUpdate }) => {
  const { user } = useAuth();
  const { requestExamDateChange } = useNotifications();
  const [exams, setExams] = useState<EmployeeExamWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDates, setPendingDates] = useState<Record<string, string>>({});
  const [showAddExamModal, setShowAddExamModal] = useState(false);

  useEffect(() => {
    loadEmployeeExams();
  }, [employee.id]);

  // Добавляем функцию для принудительного обновления данных
  const refreshExams = () => {
    loadEmployeeExams();
  };

  const loadEmployeeExams = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await supabase
        .from('employee_exams')
        .select(`
          id,
          employee_id,
          exam_id,
          exam_date,
          next_exam_date,
          updated_by,
          updated_at,
          pending_date,
          pending_until,
          exams!inner(
            name,
            periodicity
          )
        `)
        .eq('employee_id', employee.id)
        .order('exam_date', { ascending: false });

      if (result.error) {
        console.error('Error loading employee exams:', result.error);
        setError('Ошибка загрузки экзаменов: ' + result.error.message);
        return;
      }

      const formattedExams: EmployeeExamWithDetails[] = result.data?.map((exam: any) => {
        let status: 'overdue' | 'upcoming' | 'pending' | 'normal' = 'normal';
        let colorIndicator: 'red' | 'yellow' | 'blue' | 'green' | 'none' = 'green';
        
        if (exam.exam_date && exam.next_exam_date && 
            exam.exam_date !== '1900-01-01' && exam.next_exam_date !== '1900-01-01') {
          const nextExamDate = new Date(exam.next_exam_date)
          const today = new Date()
          const daysUntilNext = Math.ceil((nextExamDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysUntilNext < 0) {
            status = 'overdue'
            colorIndicator = 'red'
          } else if (daysUntilNext <= 30) {
            status = 'upcoming'
            colorIndicator = 'yellow'
          } else {
            status = 'normal'
            colorIndicator = 'green'
          }
        }

        if (exam.pending_date && exam.pending_until) {
          const pendingUntil = new Date(exam.pending_until);
          const today = new Date();
          
          if (today <= pendingUntil) {
            status = 'pending';
            colorIndicator = 'blue';
          }
        }

        return {
          id: exam.id,
          employee_id: exam.employee_id,
          exam_id: exam.exam_id,
          exam_name: exam.exams.name,
          exam_date: exam.exam_date,
          next_exam_date: exam.next_exam_date,
          status,
          color_indicator: colorIndicator,
          periodicity: exam.exams.periodicity,
          updated_by: exam.updated_by,
          updated_at: exam.updated_at,
          pending_date: exam.pending_date,
          pending_until: exam.pending_until,
        };
      }) || [];

      setExams(formattedExams);
    } catch (error) {
      console.error('Error in loadEmployeeExams:', error);
      setError('Произошла ошибка при загрузке экзаменов');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (examId: string, newDate: string) => {
    if (!user || !newDate) return;

    setSaving(true);
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;

    const examDate = new Date(newDate);
    const nextExamDate = new Date(examDate);
    nextExamDate.setMonth(nextExamDate.getMonth() + exam.periodicity);

    const { error } = await supabase
      .from('employee_exams')
      .update({
        exam_date: newDate,
        next_exam_date: nextExamDate.toISOString().split('T')[0],
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        pending_date: null,
        pending_until: null,
      })
      .eq('id', examId);

    if (error) {
      setError('Ошибка обновления даты экзамена: ' + error.message);
    } else {
      setPendingDates(prev => ({ ...prev, [examId]: '' }));
      await loadEmployeeExams();
      onUpdate();
    }
    setSaving(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString || dateString === '1900-01-01') return 'Не установлена';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'overdue': return 'Просрочен';
      case 'upcoming': return 'Скоро';
      case 'pending': return 'Ожидает';
      case 'normal': return 'Норма';
      default: return 'Неизвестно';
    }
  };

  if (loading) {
    return (
      <div className="exam-management-modal">
        <div className="exam-management-content">
          <div className="loading-container">
            <div className="loading-spinner">Загрузка экзаменов...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-management-modal">
      <div className="exam-management-content">
        <div className="exam-management-header">
          <h3>Экзамены: {employee.full_name}</h3>
          <div className="header-actions">
            <button 
              onClick={refreshExams} 
              className="btn btn-sm btn-secondary"
              disabled={loading}
              title="Обновить данные"
            >
              Обновить
            </button>
            <button 
              onClick={() => setShowAddExamModal(true)} 
              className="btn btn-sm btn-success"
              title="Добавить экзамен"
            >
              + Добавить экзамен
            </button>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="exams-list">
          {exams.length === 0 ? (
            <div className="no-exams">
              <p>У работника пока нет назначенных экзаменов.</p>
              <button 
                onClick={() => setShowAddExamModal(true)} 
                className="btn btn-primary"
              >
                Добавить первый экзамен
              </button>
            </div>
          ) : (
            exams.map(exam => (
              <div key={exam.id} className={`exam-item status-${exam.status}`}>
                <div className="exam-info">
                  <h4>{exam.exam_name}</h4>
                  <div className="exam-details">
                    <div className="exam-detail">
                      <span className="label">Последний:</span>
                      <span className="value">{formatDate(exam.exam_date)}</span>
                    </div>
                    <div className="exam-detail">
                      <span className="label">Следующий:</span>
                      <span className="value">{formatDate(exam.next_exam_date)}</span>
                    </div>
                    <div className="exam-detail">
                      <span className="label">Статус:</span>
                      <span className={`status ${exam.status}`}>{getStatusText(exam.status)}</span>
                    </div>
                  </div>
                </div>

                <div className="exam-actions">
                  <div className="date-input-group">
                    <label htmlFor={`date-input-${exam.id}`}>Новая дата:</label>
                    <div className="date-and-button">
                      <input
                        id={`date-input-${exam.id}`}
                        type="date"
                        className="date-input"
                        defaultValue={exam.exam_date === '1900-01-01' ? '' : exam.exam_date || ''}
                        onChange={(e) => setPendingDates(prev => ({ ...prev, [exam.id]: e.target.value }))}
                      />
                      <button 
                        onClick={() => handleDateChange(exam.id, pendingDates[exam.id])}
                        disabled={saving || !pendingDates[exam.id]}
                      >
                        {saving ? '...' : 'ОК'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="exam-management-footer">
          <button onClick={onClose} className="btn btn-secondary">Закрыть</button>
        </div>
      </div>

      {showAddExamModal && (
        <AddExamModal
          employeeId={employee.id}
          employeeName={employee.full_name}
          onClose={() => setShowAddExamModal(false)}
          onSuccess={() => {
            setShowAddExamModal(false);
            refreshExams();
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

export default ExamManagement;