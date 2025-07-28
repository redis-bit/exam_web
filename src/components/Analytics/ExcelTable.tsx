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
  pending_date?: string;
  periodicity: number;
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

  // Состояние для развернутых групп экзаменов
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Таймеры для автоматического сворачивания групп
  const [groupTimers, setGroupTimers] = useState<Map<string, NodeJS.Timeout>>(new Map());
  
  // Состояние для показа дополнительных данных
  const [showAdditionalData, setShowAdditionalData] = useState(false);
  
  // Состояние для компактного масштабирования
  const [compactScale, setCompactScale] = useState(false);

  // Группировка экзаменов по первым двум буквам
  const groupedExams = useMemo(() => {
    const groups = new Map<string, string[]>();
    const singleExams: string[] = [];

    // Группируем экзамены по первым двум буквам
    examNames.forEach(examName => {
      const prefix = examName.substring(0, 2).toUpperCase();
      const samePrefix = examNames.filter(name => 
        name.substring(0, 2).toUpperCase() === prefix
      );

      if (samePrefix.length > 1) {
        if (!groups.has(prefix)) {
          groups.set(prefix, []);
        }
        if (!groups.get(prefix)!.includes(examName)) {
          groups.get(prefix)!.push(examName);
        }
      } else {
        if (!singleExams.includes(examName)) {
          singleExams.push(examName);
        }
      }
    });

    // Сортируем экзамены в каждой группе
    groups.forEach((exams, prefix) => {
      groups.set(prefix, exams.sort());
    });

    return { groups, singleExams: singleExams.sort() };
  }, [examNames]);

  // Функция для переключения состояния группы
  const toggleGroup = (groupPrefix: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      
      // Очищаем существующий таймер для этой группы
      const existingTimer = groupTimers.get(groupPrefix);
      if (existingTimer) {
        clearTimeout(existingTimer);
        setGroupTimers(prevTimers => {
          const newTimers = new Map(prevTimers);
          newTimers.delete(groupPrefix);
          return newTimers;
        });
      }
      
      if (newSet.has(groupPrefix)) {
        // Сворачиваем группу
        newSet.delete(groupPrefix);
      } else {
        // Разворачиваем группу и устанавливаем таймер на автосворачивание
        newSet.add(groupPrefix);
        
        // Устанавливаем таймер на 10 секунд
        const timer = setTimeout(() => {
          setExpandedGroups(currentExpanded => {
            const updatedSet = new Set(currentExpanded);
            updatedSet.delete(groupPrefix);
            return updatedSet;
          });
          
          // Удаляем таймер из состояния
          setGroupTimers(prevTimers => {
            const newTimers = new Map(prevTimers);
            newTimers.delete(groupPrefix);
            return newTimers;
          });
        }, 10000); // 10 секунд
        
        // Сохраняем таймер в состоянии
        setGroupTimers(prevTimers => {
          const newTimers = new Map(prevTimers);
          newTimers.set(groupPrefix, timer);
          return newTimers;
        });
      }
      
      return newSet;
    });
  };

  // Получение ближайшего экзамена в группе для конкретного сотрудника
  const getNearestExamInGroup = (employeeExams: { [examName: string]: ExamData }, groupExams: string[]) => {
    const employeeGroupExams = groupExams.filter(examName => employeeExams[examName]);
    
    if (employeeGroupExams.length === 0) return null;

    // Находим экзамен с ближайшей датой следующего экзамена
    return employeeGroupExams.reduce((nearest, current) => {
      const nearestData = employeeExams[nearest];
      const currentData = employeeExams[current];

      if (!nearestData) return current;
      if (!currentData) return nearest;

      // Рассчитываем следующие даты экзаменов
      const nearestNextDate = new Date(nearestData.exam_date);
      nearestNextDate.setDate(nearestNextDate.getDate() + nearestData.periodicity);

      const currentNextDate = new Date(currentData.exam_date);
      currentNextDate.setDate(currentNextDate.getDate() + currentData.periodicity);

      return currentNextDate < nearestNextDate ? current : nearest;
    });
  };

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
            pending_date,
            exams!inner(name, periodicity)
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
              
              let status: 'overdue' | 'upcoming' | 'normal' | 'pending';
              
              // Проверяем, есть ли pending_date (дата на согласовании)
              if (examRecord.pending_date) {
                status = 'pending';
              } else {
                // Рассчитываем следующую дату экзамена на основе периодичности
                const examDate = new Date(examRecord.exam_date);
                const periodicity = exam?.periodicity || 365; // По умолчанию год
                const nextExamDate = new Date(examDate);
                nextExamDate.setDate(nextExamDate.getDate() + periodicity);
                
                const now = new Date();
                const daysDiff = Math.ceil((nextExamDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysDiff < 0) {
                  status = 'overdue'; // Просрочен
                } else if (daysDiff <= 30) {
                  status = 'upcoming'; // Скоро истекает (месяц)
                } else {
                  status = 'normal'; // В норме
                }
              }
              
              exams[examName] = {
                exam_date: examRecord.exam_date,
                status,
                pending_date: examRecord.pending_date,
                periodicity: exam?.periodicity || 365
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

  // Очистка таймеров при размонтировании компонента
  useEffect(() => {
    return () => {
      // Очищаем все активные таймеры
      groupTimers.forEach(timer => clearTimeout(timer));
    };
  }, [groupTimers]);

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

    // Создаем подробный tooltip
    const getTooltipText = () => {
      const examDate = new Date(examData.exam_date);
      const nextExamDate = new Date(examDate);
      nextExamDate.setDate(nextExamDate.getDate() + examData.periodicity);
      
      let tooltip = `Дата сдачи: ${formatDate(examData.exam_date)}\n`;
      tooltip += `Следующий экзамен: ${formatDate(nextExamDate.toISOString())}\n`;
      tooltip += `Периодичность: ${examData.periodicity} дней\n`;
      
      if (examData.pending_date) {
        tooltip += `На согласовании: ${formatDate(examData.pending_date)}\n`;
      }
      
      switch (examData.status) {
        case 'overdue':
          tooltip += 'Статус: Просрочен';
          break;
        case 'upcoming':
          tooltip += 'Статус: Скоро истекает (менее месяца)';
          break;
        case 'pending':
          tooltip += 'Статус: На согласовании';
          break;
        default:
          tooltip += 'Статус: В норме';
      }
      
      if (canEdit) {
        tooltip += '\n\nНажмите для изменения даты';
      }
      
      return tooltip;
    };
    
    return (
      <td 
        key={key} 
        className={`exam-cell ${getStatusClass(examData.status)} ${canEdit ? 'clickable-date' : ''}`}
        onClick={() => canEdit && handleExamDateClick(employeeId, examName, examData.exam_date)}
        title={getTooltipText()}
      >
        {examData.pending_date ? (
          <div className="exam-date-content">
            <span className="current-date">{formatDate(examData.exam_date)}</span>
            <span className="pending-indicator">⏳</span>
          </div>
        ) : (
          formatDate(examData.exam_date)
        )}
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
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showAdditionalData}
              onChange={(e) => setShowAdditionalData(e.target.checked)}
              className="additional-data-checkbox"
            />
            Показать дополнительные данные
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={compactScale}
              onChange={(e) => setCompactScale(e.target.checked)}
              className="compact-scale-checkbox"
            />
            Компактный масштаб (50%)
          </label>
          <button onClick={loadData} className="refresh-btn">
            Обновить
          </button>
        </div>
      </div>

      <div className={`excel-table-wrapper ${compactScale ? 'compact-scale' : ''}`}>
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
              
              {showAdditionalData && (
                <>
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
                </>
              )}
              {/* Отображаем группы экзаменов */}
              {Array.from(groupedExams.groups.entries()).map(([prefix, exams]) => {
                const isExpanded = expandedGroups.has(prefix);
                if (isExpanded) {
                  // Показываем все экзамены группы
                  return exams.map(examName => (
                    <th key={examName} onClick={() => handleSort(examName)} className="sortable exam-header">
                      {examName}
                      {sortColumn === examName && (
                        <span className="sort-indicator">
                          {sortDirection === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                  ));
                } else {
                  // Показываем просто префикс группы в заголовке
                  
                  // Показываем заголовок с названием приоритетного экзамена
                  return (
                    <th 
                      key={prefix} 
                      className="sortable exam-header group-header"
                      onClick={() => toggleGroup(prefix)}
                      style={{ 
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                      title={`Группа: ${exams.join(', ')}`}
                    >
                      {prefix} <span style={{ fontSize: '10px' }}>{isExpanded ? '▲' : '▼'}</span>
                    </th>
                  );
                }
              })}
              
              {/* Отображаем одиночные экзамены */}
              {groupedExams.singleExams.map(examName => (
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
                
                {showAdditionalData && (
                  <>
                    <td>{row.section_name}</td>
                    <td>{row.profession_name}</td>
                    <td>{formatDate(row.created_at)}</td>
                  </>
                )}
                
                {/* Отображаем ячейки для групп экзаменов */}
                {Array.from(groupedExams.groups.entries()).map(([prefix, exams]) => {
                  const isExpanded = expandedGroups.has(prefix);
                  if (isExpanded) {
                    // Показываем все экзамены группы
                    return exams.map(examName => 
                      renderExamCell(row.exams[examName], `${row.employee_id}-${examName}`, row.employee_id, examName)
                    );
                  } else {
                    // Показываем только ближайший экзамен группы
                    const nearestExam = getNearestExamInGroup(row.exams, exams);
                    const examData = nearestExam ? row.exams[nearestExam] : undefined;
                    const groupExamsCount = exams.filter(examName => row.exams[examName]).length;
                    
                    return (
                      <td 
                        key={`${row.employee_id}-${prefix}`}
                        className={`exam-cell ${examData ? getStatusClass(examData.status) : 'exam-cell-empty'}`}
                        onClick={() => toggleGroup(prefix)}
                        style={{ 
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                        title={examData ? `${nearestExam} - ${formatDate(examData.exam_date)}${groupExamsCount > 1 ? ` (еще ${groupExamsCount - 1} экз.)` : ''}` : '-'}
                      >
                        {examData ? (
                          <div style={{ position: 'relative' }}>
                            {formatDate(examData.exam_date)}
                            {groupExamsCount > 1 && (
                              <span 
                                style={{
                                  position: 'absolute',
                                  top: '-5px',
                                  right: '-5px',
                                  background: '#8b5cf6',
                                  color: 'white',
                                  borderRadius: '50%',
                                  width: '16px',
                                  height: '16px',
                                  fontSize: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 'bold'
                                }}
                              >
                                {groupExamsCount}
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                    );
                  }
                })}
                
                {/* Отображаем одиночные экзамены */}
                {groupedExams.singleExams.map(examName => 
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