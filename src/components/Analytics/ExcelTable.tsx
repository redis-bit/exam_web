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
  }, [sectionId]);

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

  // Рендер ячейки экзамена
  const renderExamCell = (examData: ExamData | undefined, key: string) => {
    if (!examData) {
      return <td key={key} className="exam-cell-empty">-</td>;
    }
    
    return (
      <td key={key} className={`exam-cell ${getStatusClass(examData.status)}`}>
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
                <td>{row.employee_name}</td>
                <td>{row.section_name}</td>
                <td>{row.profession_name}</td>
                <td>{formatDate(row.created_at)}</td>
                {examNames.map(examName => 
                  renderExamCell(row.exams[examName], `${row.employee_id}-${examName}`)
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
    </div>
  );
};

export default ExcelTable;