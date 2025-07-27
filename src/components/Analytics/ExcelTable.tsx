import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import './ExcelTable.css';

interface EmployeeRowData {
  employee_id: string;
  employee_name: string;
  section_name: string;
  profession_name: string;
  created_at: string;
  exams: { [examName: string]: ExamData };
}

interface ExamData {
  exam_date: string;
  status: 'overdue' | 'upcoming' | 'normal' | 'pending';
}

interface ExcelTableProps {
  sectionId?: string;
}

const ExcelTable: React.FC<ExcelTableProps> = ({ sectionId }) => {
  const { user } = useAuth();
  const [data, setData] = useState<EmployeeRowData[]>([]);
  const [examNames, setExamNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('employee_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Состояние для редактирования работника
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRowData | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [professions, setProfessions] = useState<any[]>([]);
  
  // Состояние для редактирования дат экзаменов
  const [editingExam, setEditingExam] = useState<{
    employeeId: string;
    examName: string;
    currentDate: string;
  } | null>(null);

  // Загрузка данных
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Загружаем работников с их экзаменами
      let employeeQuery = supabase
        .from('employees')
        .select(`
          id,
          full_name,
          created_at,
          sections!inner(name),
          profession_templates!inner(name),
          employee_exams(
            exam_date,
            exams!inner(name)
          )
        `)
        .eq('is_active', true);

      // Фильтр по секции если указан
      if (sectionId) {
        employeeQuery = employeeQuery.eq('section_id', sectionId);
      }

      const { data: employeesData, error: fetchError } = await employeeQuery;

      if (fetchError) {
        throw fetchError;
      }

      // Получаем все уникальные названия экзаменов
      const allExamNames = new Set<string>();
      
      // Группируем данные по работникам
      const groupedData: EmployeeRowData[] = (employeesData || []).map((employee: any) => {
        const section = Array.isArray(employee.sections) ? employee.sections[0] : employee.sections;
        const profession = Array.isArray(employee.profession_templates) ? employee.profession_templates[0] : employee.profession_templates;
        
        const exams: { [examName: string]: ExamData } = {};
        
        // Обрабатываем экзамены работника
        if (employee.employee_exams && Array.isArray(employee.employee_exams)) {
          employee.employee_exams.forEach((examRecord: any) => {
            const exam = Array.isArray(examRecord.exams) ? examRecord.exams[0] : examRecord.exams;
            const examName = exam?.name || '';
            
            if (examName) {
              allExamNames.add(examName);
              
              const examDate = new Date(examRecord.exam_date);
              const now = new Date();
              const daysDiff = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              let status: 'overdue' | 'upcoming' | 'normal' | 'pending';
              if (daysDiff < 0) {
                status = 'overdue';
              } else if (daysDiff <= 30) {
                status = 'upcoming';
              } else {
                status = 'normal';
              }
              
              exams[examName] = {
                exam_date: examRecord.exam_date,
                status
              };
            }
          });
        }

        return {
          employee_id: employee.id,
          employee_name: employee.full_name || '',
          section_name: section?.name || '',
          profession_name: profession?.name || '',
          created_at: employee.created_at,
          exams
        };
      });

      setData(groupedData);
      setExamNames(Array.from(allExamNames).sort());
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadSectionsAndProfessions();
  }, [sectionId]);

  // Загрузка участков и профессий для редактирования
  const loadSectionsAndProfessions = async () => {
    try {
      const [sectionsResponse, professionsResponse] = await Promise.all([
        supabase.from('sections').select('*').eq('is_active', true).order('name'),
        supabase.from('profession_templates').select('*').eq('is_active', true).order('name')
      ]);

      if (sectionsResponse.data) setSections(sectionsResponse.data);
      if (professionsResponse.data) setProfessions(professionsResponse.data);
    } catch (err) {
      console.error('Ошибка при загрузке справочников:', err);
    }
  };

  // Сортировка данных
  const sortedData = useMemo(() => {
    const filtered = data.filter(item =>
      item.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.profession_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      // Определяем значения для сортировки
      if (sortColumn === 'employee_name') {
        aValue = a.employee_name;
        bValue = b.employee_name;
      } else if (sortColumn === 'section_name') {
        aValue = a.section_name;
        bValue = b.section_name;
      } else if (sortColumn === 'profession_name') {
        aValue = a.profession_name;
        bValue = b.profession_name;
      } else if (sortColumn === 'created_at') {
        aValue = a.created_at;
        bValue = b.created_at;
      } else if (examNames.includes(sortColumn)) {
        // Сортировка по дате экзамена
        aValue = a.exams[sortColumn]?.exam_date || '';
        bValue = b.exams[sortColumn]?.exam_date || '';
      } else {
        aValue = '';
        bValue = '';
      }
      
      if (aValue === null || aValue === undefined || aValue === '') return 1;
      if (bValue === null || bValue === undefined || bValue === '') return -1;
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [data, sortColumn, sortDirection, searchTerm, examNames]);

  // Обработка клика по заголовку для сортировки
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  // Получение CSS класса для статуса
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'overdue': return 'status-overdue';
      case 'upcoming': return 'status-upcoming';
      case 'pending': return 'status-pending';
      default: return 'status-normal';
    }
  };

  // Обработка клика по ФИО для редактирования
  const handleEmployeeClick = (employee: EmployeeRowData) => {
    if (user?.role === 'admin' || user?.role === 'admin_assistant') {
      setEditingEmployee(employee);
    }
  };

  // Сохранение изменений работника
  const handleSaveEmployee = async (updatedData: {
    full_name: string;
    section_id: string;
    profession_template_id: string;
  }) => {
    if (!editingEmployee) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          full_name: updatedData.full_name,
          section_id: updatedData.section_id,
          profession_template_id: updatedData.profession_template_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEmployee.employee_id);

      if (error) throw error;

      // Обновляем данные
      await loadData();
      setEditingEmployee(null);
    } catch (err) {
      console.error('Ошибка при обновлении работника:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    }
  };

  // Обработка клика по дате экзамена
  const handleExamDateClick = (employeeId: string, examName: string, currentDate: string) => {
    const canEdit = user?.role === 'admin' || user?.role === 'admin_assistant';
    if (canEdit) {
      setEditingExam({
        employeeId,
        examName,
        currentDate
      });
    }
  };

  // Сохранение новой даты экзамена
  const handleSaveExamDate = async (newDate: string) => {
    if (!editingExam || !user) return;

    try {
      // Находим ID экзамена по названию
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('id')
        .eq('name', editingExam.examName)
        .single();

      if (examError || !examData) {
        throw new Error('Экзамен не найден');
      }

      // Обновляем дату экзамена
      const { error } = await supabase
        .from('employee_exams')
        .update({
          exam_date: newDate,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
          pending_date: null,
          pending_until: null
        })
        .eq('employee_id', editingExam.employeeId)
        .eq('exam_id', examData.id);

      if (error) throw error;

      // Обновляем данные таблицы
      await loadData();
      setEditingExam(null);
    } catch (err) {
      console.error('Ошибка при обновлении даты экзамена:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении даты');
    }
  };

  // Рендер ячейки экзамена
  const renderExamCell = (examData: ExamData | undefined, key: string, employeeId: string, examName: string) => {
    const canEdit = user?.role === 'admin' || user?.role === 'admin_assistant';
    
    if (!examData) {
      return <td key={key} className="exam-cell-empty">-</td>;
    }
    
    return (
      <td 
        key={key} 
        className={`exam-cell ${getStatusClass(examData.status)} ${canEdit ? 'clickable-date' : ''}`}
        onClick={() => canEdit && handleExamDateClick(employeeId, examName, examData.exam_date)}
        title={canEdit ? 'Нажмите для изменения даты' : ''}
      >
        {formatDate(examData.exam_date)}
      </td>
    );
  };

  if (loading) {
    return (
      <div className="excel-table-container">
        <div className="loading">Загрузка данных...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="excel-table-container">
        <div className="error">Ошибка: {error}</div>
      </div>
    );
  }

  return (
    <div className="excel-table-container">
      <div className="excel-table-header">
        <h3>Данные о работниках и экзаменах</h3>
        <div className="excel-table-controls">
          <input
            type="text"
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={loadData} className="refresh-btn">
            Обновить
          </button>
        </div>
      </div>

      <div className="excel-table-wrapper">
        <table className="excel-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('employee_name')} className="sortable">
                ФИО работника
                {sortColumn === 'employee_name' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('section_name')} className="sortable">
                Участок
                {sortColumn === 'section_name' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('profession_name')} className="sortable">
                Профессия
                {sortColumn === 'profession_name' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              <th onClick={() => handleSort('created_at')} className="sortable">
                Дата создания
                {sortColumn === 'created_at' && (
                  <span className="sort-indicator">
                    {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                  </span>
                )}
              </th>
              {examNames.map(examName => (
                <th key={examName} onClick={() => handleSort(examName)} className="sortable exam-header">
                  {examName}
                  {sortColumn === examName && (
                    <span className="sort-indicator">
                      {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row.employee_id}>
                <td 
                  className={`employee-name-cell ${(user?.role === 'admin' || user?.role === 'admin_assistant') ? 'clickable' : ''}`}
                  onClick={() => handleEmployeeClick(row)}
                  title={(user?.role === 'admin' || user?.role === 'admin_assistant') ? 'Нажмите для редактирования' : ''}
                >
                  {row.employee_name}
                </td>
                <td>{row.section_name}</td>
                <td>{row.profession_name}</td>
                <td>{formatDate(row.created_at)}</td>
                {examNames.map(examName => 
                  renderExamCell(row.exams[examName], `${row.employee_id}-${examName}`, row.employee_id, examName)
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedData.length === 0 && (
        <div className="no-data">
          {searchTerm ? 'Нет данных, соответствующих поиску' : 'Нет данных для отображения'}
        </div>
      )}

      <div className="excel-table-footer">
        <span>Всего записей: {sortedData.length}</span>
      </div>

      {/* Модальное окно редактирования работника */}
      {editingEmployee && (
        <EmployeeEditModal
          employee={editingEmployee}
          sections={sections}
          professions={professions}
          onSave={handleSaveEmployee}
          onCancel={() => setEditingEmployee(null)}
        />
      )}

      {/* Модальное окно редактирования даты экзамена */}
      {editingExam && (
        <ExamDateEditModal
          examInfo={editingExam}
          onSave={handleSaveExamDate}
          onCancel={() => setEditingExam(null)}
        />
      )}
    </div>
  );
};

// Компонент модального окна для редактирования работника
interface EmployeeEditModalProps {
  employee: EmployeeRowData;
  sections: any[];
  professions: any[];
  onSave: (data: { full_name: string; section_id: string; profession_template_id: string }) => void;
  onCancel: () => void;
}

const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({
  employee,
  sections,
  professions,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    full_name: employee.employee_name,
    section_id: '',
    profession_template_id: ''
  });

  // Находим ID участка и профессии по названиям
  useEffect(() => {
    const section = sections.find(s => s.name === employee.section_name);
    const profession = professions.find(p => p.name === employee.profession_name);
    
    setFormData(prev => ({
      ...prev,
      section_id: section?.id || '',
      profession_template_id: profession?.id || ''
    }));
  }, [sections, professions, employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Редактирование работника</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="employee-edit-form">
          <div className="form-group">
            <label htmlFor="full_name">ФИО:</label>
            <input
              type="text"
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="section_id">Участок:</label>
            <select
              id="section_id"
              value={formData.section_id}
              onChange={(e) => setFormData(prev => ({ ...prev, section_id: e.target.value }))}
              required
            >
              <option value="">Выберите участок</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="profession_template_id">Профессия:</label>
            <select
              id="profession_template_id"
              value={formData.profession_template_id}
              onChange={(e) => setFormData(prev => ({ ...prev, profession_template_id: e.target.value }))}
              required
            >
              <option value="">Выберите профессию</option>
              {professions.map(profession => (
                <option key={profession.id} value={profession.id}>
                  {profession.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              Отмена
            </button>
            <button type="submit" className="btn-save">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Компонент модального окна для редактирования даты экзамена
interface ExamDateEditModalProps {
  examInfo: {
    employeeId: string;
    examName: string;
    currentDate: string;
  };
  onSave: (newDate: string) => void;
  onCancel: () => void;
}

const ExamDateEditModal: React.FC<ExamDateEditModalProps> = ({
  examInfo,
  onSave,
  onCancel
}) => {
  const [newDate, setNewDate] = useState(examInfo.currentDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDate) {
      onSave(newDate);
    }
  };

  // Форматируем дату для input[type="date"]
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Получаем ограничения для выбора даты
  const today = new Date();
  const maxDate = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()); // Максимум 2 года вперед
  const minDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate()); // Минимум 10 лет назад
  
  const maxDateString = maxDate.toISOString().split('T')[0];
  const minDateString = minDate.toISOString().split('T')[0];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content exam-date-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Изменение даты экзамена</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="exam-date-form">
          <div className="exam-info">
            <p><strong>Экзамен:</strong> {examInfo.examName}</p>
            <p><strong>Текущая дата:</strong> {new Date(examInfo.currentDate).toLocaleDateString('ru-RU')}</p>
          </div>

          <div className="form-group">
            <label htmlFor="exam_date">Новая дата экзамена:</label>
            <input
              type="date"
              id="exam_date"
              value={formatDateForInput(newDate)}
              onChange={(e) => setNewDate(e.target.value)}
              min={minDateString}
              max={maxDateString}
              required
            />
            <small className="date-hint">
              Можно выбрать дату от {new Date(minDateString).toLocaleDateString('ru-RU')} до {new Date(maxDateString).toLocaleDateString('ru-RU')}
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              Отмена
            </button>
            <button type="submit" className="btn-save">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExcelTable;