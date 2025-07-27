import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { EmployeeWithDetails, EmployeeExamWithDetails, ProfessionTemplate } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import './InteractiveTableEnhanced.css';

interface InteractiveTableProps {
  sectionId?: string;
}

interface EmployeeTableData extends EmployeeWithDetails {
  exams: EmployeeExamWithDetails[];
}

interface ExamGroup {
  key: string;
  name: string;
  exams: EmployeeExamWithDetails[];
  count: number;
}

interface EditingCell {
  employeeId: string;
  type: 'name' | 'profession' | 'exam';
  examId?: string;
  value: string;
}

const InteractiveTableNew: React.FC<InteractiveTableProps> = ({ sectionId }) => {
  const { user } = useAuth();
  const { requestExamDateChange, requestEmployeeNameChange, requestEmployeeProfessionChange } = useNotifications();
  
  // Data state
  const [employees, setEmployees] = useState<EmployeeTableData[]>([]);
  const [professions, setProfessions] = useState<ProfessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'upcoming' | 'pending'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Permissions
  const isAdmin = user?.role === 'admin' || user?.role === 'admin_assistant';
  const canEdit = isAdmin || user?.role === 'section_chief';

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadEmployeesWithExams(),
        loadProfessions()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadEmployeesWithExams = async () => {
    // Load employees
    let employeesQuery = supabase
      .from('employees')
      .select(`
        *,
        sections(name),
        profession_templates(name)
      `)
      .eq('is_active', true);

    if (sectionId) {
      employeesQuery = employeesQuery.eq('section_id', sectionId);
    }

    const { data: employeesData, error: employeesError } = await employeesQuery.order('full_name');

    if (employeesError) throw employeesError;
    if (!employeesData) {
      setEmployees([]);
      return;
    }

    const employeeIds = employeesData.map(e => e.id);

    // Load exams for all employees
    const { data: examsData, error: examsError } = await supabase
      .from('employee_exams')
      .select(`
        *,
        exams(name, periodicity)
      `)
      .in('employee_id', employeeIds);

    if (examsError) throw examsError;

    // Process exams data
    const examsByEmployeeId = new Map<string, EmployeeExamWithDetails[]>();
    examsData?.forEach(exam => {
      const list = examsByEmployeeId.get(exam.employee_id) || [];
      
      const examDate = exam.exam_date ? new Date(exam.exam_date) : null;
      const nextExamDate = exam.next_exam_date ? new Date(exam.next_exam_date) : null;
      const now = new Date();
      
      let status: 'overdue' | 'upcoming' | 'pending' | 'normal' = 'normal';
      let color_indicator: 'red' | 'yellow' | 'blue' | 'green' | 'none' = 'none';

      if (exam.pending_date) {
        status = 'pending';
        color_indicator = 'blue';
      } else if (!examDate || examDate.getFullYear() === 1900) {
        status = 'overdue';
        color_indicator = 'red';
      } else if (nextExamDate) {
        const daysDiff = Math.ceil((nextExamDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 0) {
          status = 'overdue';
          color_indicator = 'red';
        } else if (daysDiff <= 30) {
          status = 'upcoming';
          color_indicator = 'yellow';
        } else {
          status = 'normal';
          color_indicator = 'green';
        }
      }

      list.push({
        ...exam,
        exam_name: exam.exams?.name || '',
        status,
        color_indicator,
        periodicity: exam.exams?.periodicity || 0
      });
      examsByEmployeeId.set(exam.employee_id, list);
    });

    // Combine employees with their exams
    const employeesWithExams: EmployeeTableData[] = employeesData.map(emp => ({
      id: emp.id,
      full_name: emp.full_name,
      profession_template_id: emp.profession_template_id,
      section_id: emp.section_id,
      is_active: emp.is_active,
      created_at: emp.created_at,
      updated_at: emp.updated_at,
      section_name: emp.sections?.name || '',
      profession_name: emp.profession_templates?.name || '',
      exams: examsByEmployeeId.get(emp.id) || []
    }));

    setEmployees(employeesWithExams);
  };

  const loadProfessions = async () => {
    const { data, error } = await supabase
      .from('profession_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    setProfessions(data || []);
  };

  // Utility functions
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (date.getFullYear() === 1900) return 'Не проходил';
    return date.toLocaleDateString('ru-RU');
  };

  const formatName = (name: string) => {
    return name || '-';
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'overdue': return 'status-overdue';
      case 'upcoming': return 'status-upcoming';
      case 'pending': return 'status-pending';
      default: return 'status-normal';
    }
  };

  // Edit functions
  const handleCellEdit = (employeeId: string, type: 'name' | 'profession' | 'exam', examId?: string) => {
    if (!canEdit) return;
    
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    let currentValue = '';
    if (type === 'name') {
      currentValue = employee.full_name;
    } else if (type === 'profession') {
      currentValue = employee.profession_name;
    } else if (type === 'exam' && examId) {
      const exam = employee.exams.find(e => e.id === examId);
      currentValue = exam?.exam_date || '';
    }

    setEditingCell({ employeeId, type, examId, value: currentValue });
  };

  const handleCellSave = async () => {
    if (!editingCell) return;

    const { employeeId, type, examId, value } = editingCell;
    const changeKey = `${employeeId}-${type}-${examId || ''}`;

    try {
      if (isAdmin) {
        if (type === 'name') {
          await updateEmployeeName(employeeId, value);
        } else if (type === 'profession') {
          await updateEmployeeProfession(employeeId, value);
        } else if (type === 'exam' && examId) {
          await updateExamDate(employeeId, examId, value);
        }
        await loadData();
      } else {
        setPendingChanges(prev => new Set(Array.from(prev).concat([changeKey])));

        if (type === 'name') {
          await requestEmployeeNameChange(employeeId, value);
        } else if (type === 'profession') {
          await requestEmployeeProfessionChange(employeeId, value);
        } else if (type === 'exam' && examId) {
          await requestExamDateChange(employeeId, examId, value);
        }
      }
    } catch (error) {
      console.error('Error saving cell:', error);
      setPendingChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(changeKey);
        return newSet;
      });
    } finally {
      setEditingCell(null);
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  // Update functions
  const updateExamDate = async (employeeId: string, examId: string, newDate: string) => {
    const exam = employees.find(e => e.id === employeeId)?.exams.find(ex => ex.id === examId);
    if (!exam) throw new Error('Exam not found');

    const next_exam_date = new Date(newDate);
    next_exam_date.setMonth(next_exam_date.getMonth() + exam.periodicity);

    const { error } = await supabase
      .from('employee_exams')
      .update({ 
        exam_date: newDate,
        next_exam_date: next_exam_date.toISOString().split('T')[0],
        pending_date: null
      })
      .eq('id', examId);
    
    if (error) throw error;
  };

  const updateEmployeeName = async (employeeId: string, newName: string) => {
    const { error } = await supabase
      .from('employees')
      .update({ full_name: newName })
      .eq('id', employeeId);
    
    if (error) throw error;
  };

  const updateEmployeeProfession = async (employeeId: string, professionName: string) => {
    const profession = professions.find(p => p.name === professionName);
    if (!profession) throw new Error('Profession not found');

    const { error } = await supabase
      .from('employees')
      .update({ profession_template_id: profession.id })
      .eq('id', employeeId);
    
    if (error) throw error;
  };

  // Group management
  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  // Prepare exam groups
  const examGroups = useMemo(() => {
    const groupMap = new Map<string, ExamGroup>();
    
    employees.forEach(employee => {
      employee.exams.forEach(exam => {
        const prefix = exam.exam_name.split('_')[0].substring(0, 3).toUpperCase();
        const groupKey = `${prefix}_`;
        
        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, {
            key: groupKey,
            name: groupKey,
            exams: [],
            count: 0
          });
        }
        
        const group = groupMap.get(groupKey)!;
        if (!group.exams.some(e => e.exam_name === exam.exam_name)) {
          group.exams.push(exam);
        }
      });
    });
    
    // Sort groups and calculate counts
    return Array.from(groupMap.values())
      .map(group => ({
        ...group,
        count: group.exams.length,
        exams: group.exams.sort((a, b) => a.exam_name.localeCompare(b.exam_name))
      }))
      .sort((a, b) => {
        const aMinPeriodicity = Math.min(...a.exams.map(e => e.periodicity));
        const bMinPeriodicity = Math.min(...b.exams.map(e => e.periodicity));
        if (aMinPeriodicity !== bMinPeriodicity) return aMinPeriodicity - bMinPeriodicity;
        return a.key.localeCompare(b.key);
      });
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!employee.full_name.toLowerCase().includes(searchLower) &&
            !employee.profession_name.toLowerCase().includes(searchLower) &&
            !employee.section_name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== 'all') {
        const hasStatus = employee.exams.some(exam => exam.status === filterStatus);
        if (!hasStatus) return false;
      }

      return true;
    });
  }, [employees, searchTerm, filterStatus]);

  // Render editable cell
  const renderEditableCell = (
    employee: EmployeeTableData,
    type: 'name' | 'profession' | 'exam',
    value: string,
    examId?: string
  ) => {
    const isEditing = editingCell?.employeeId === employee.id && 
                     editingCell?.type === type && 
                     editingCell?.examId === examId;
    const isPending = pendingChanges.has(`${employee.id}-${type}-${examId || ''}`);

    if (isEditing) {
      return (
        <div className="edit-cell">
          {type === 'profession' ? (
            <select 
              value={editingCell.value}
              onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
              onBlur={handleCellSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCellSave();
                if (e.key === 'Escape') handleCellCancel();
              }}
              autoFocus
              className="edit-input"
            >
              {professions.map(prof => (
                <option key={prof.id} value={prof.name}>{prof.name}</option>
              ))}
            </select>
          ) : (
            <input
              type={type === 'exam' ? 'date' : 'text'}
              value={editingCell.value}
              onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
              onBlur={handleCellSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCellSave();
                if (e.key === 'Escape') handleCellCancel();
              }}
              autoFocus
              className="edit-input"
            />
          )}
          <div className="edit-actions">
            <button onClick={handleCellSave} className="save-btn">✓</button>
            <button onClick={handleCellCancel} className="cancel-btn">✗</button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`cell-content ${isPending ? 'pending' : ''} ${canEdit ? 'editable' : ''}`}
        onClick={() => handleCellEdit(employee.id, type, examId)}
        title={isPending ? 'Изменение ожидает подтверждения' : canEdit ? 'Нажмите для редактирования' : ''}
      >
        {value}
        {isPending && <span className="pending-indicator">⏳</span>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="interactive-table-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Загрузка интерактивной таблицы...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="interactive-table-container">
        <div className="error-state">
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
          <button onClick={loadData} className="retry-btn">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="interactive-table-container">
      {/* Header with controls */}
      <div className="table-header">
        <h3>Интерактивная таблица сотрудников</h3>
        <div className="table-controls">
          <div className="search-controls">
            <input
              type="text"
              placeholder="Поиск по ФИО, профессии, участку..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="status-filter"
            >
              <option value="all">Все статусы</option>
              <option value="overdue">Просрочено</option>
              <option value="upcoming">Скоро истекает</option>
              <option value="pending">Ожидает подтверждения</option>
            </select>
          </div>
          <button onClick={loadData} className="refresh-btn">
            🔄 Обновить
          </button>
        </div>
      </div>

      {/* Status legend */}
      <div className="status-legend">
        <div className="legend-item">
          <span className="status-indicator status-overdue"></span>
          Просрочено
        </div>
        <div className="legend-item">
          <span className="status-indicator status-upcoming"></span>
          Скоро истекает (≤30 дней)
        </div>
        <div className="legend-item">
          <span className="status-indicator status-pending"></span>
          Ожидает подтверждения
        </div>
        <div className="legend-item">
          <span className="status-indicator status-normal"></span>
          Нормально
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="interactive-table">
          <thead>
            <tr>
              <th className="col-fixed">ФИО</th>
              <th>Участок</th>
              <th>Профессия</th>
              {examGroups.map(group => {
                if (expandedGroups.has(group.key)) {
                  return group.exams.map(exam => (
                    <th key={exam.exam_name} className="col-exam">
                      {exam.exam_name}
                    </th>
                  ));
                } else {
                  return (
                    <th 
                      key={group.key} 
                      className="col-group clickable"
                      onClick={() => toggleGroup(group.key)}
                      title={`Нажмите для развертывания (${group.count} экзаменов)`}
                    >
                      {group.name} ({group.count})
                      <span className="expand-icon">▼</span>
                    </th>
                  );
                }
              })}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(employee => (
              <tr key={employee.id} className="table-row">
                <td className="col-fixed">
                  {renderEditableCell(employee, 'name', formatName(employee.full_name))}
                </td>
                <td>{employee.section_name}</td>
                <td>
                  {renderEditableCell(employee, 'profession', employee.profession_name)}
                </td>
                {examGroups.map(group => {
                  if (expandedGroups.has(group.key)) {
                    return group.exams.map(exam => {
                      const examData = employee.exams.find(e => e.exam_name === exam.exam_name);
                      return (
                        <td 
                          key={`${employee.id}-${exam.exam_name}`} 
                          className={`col-exam ${examData ? getStatusClass(examData.status) : ''}`}
                        >
                          {examData ? renderEditableCell(
                            employee, 
                            'exam', 
                            formatDate(examData.exam_date),
                            examData.id
                          ) : '-'}
                        </td>
                      );
                    });
                  } else {
                    // Group cell - show nearest exam
                    const employeeExamsInGroup = employee.exams.filter(e =>
                      e.exam_name.split('_')[0].substring(0, 3).toUpperCase() === group.key.replace('_', '')
                    );
                    
                    const nearestExam = employeeExamsInGroup.reduce((nearest, current) => {
                      if (!nearest?.next_exam_date) return current;
                      if (!current?.next_exam_date) return nearest;
                      return new Date(current.next_exam_date) < new Date(nearest.next_exam_date) ? current : nearest;
                    }, employeeExamsInGroup[0]);
                    
                    return (
                      <td
                        key={`${employee.id}-${group.key}`}
                        className={`col-group clickable ${nearestExam ? getStatusClass(nearestExam.status) : ''}`}
                        onClick={() => toggleGroup(group.key)}
                        title="Нажмите для развертывания группы"
                      >
                        {nearestExam ? formatDate(nearestExam.next_exam_date) : '-'}
                        {employeeExamsInGroup.length > 1 && (
                          <span className="exam-count"> ({employeeExamsInGroup.length})</span>
                        )}
                      </td>
                    );
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="table-footer">
        <p>Показано {filteredEmployees.length} из {employees.length} сотрудников</p>
        <p>Нажмите на ячейку для редактирования • Группы экзаменов можно развернуть</p>
      </div>

      {filteredEmployees.length === 0 && (
        <div className="empty-state">
          <p>Нет сотрудников, соответствующих критериям поиска</p>
        </div>
      )}
    </div>
  );
};

export default InteractiveTableNew;