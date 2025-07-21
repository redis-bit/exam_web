import React, { useState } from 'react';
import { EmployeeWithDetails } from '../../types/database';
import { useAuth } from '../../hooks/useAuth';
import './EmployeeList.css';
import './EmployeeList.mobile.css';
import ExamManagement from './ExamManagement';
import AddExamModal from './AddExamModal';

interface EmployeeListProps {
  employees: EmployeeWithDetails[];
  loading: boolean;
  onEdit: (employee: EmployeeWithDetails) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  loading,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const { canEditEmployee, canViewAllSections } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');
  const [selectedEmployeeForExams, setSelectedEmployeeForExams] = useState<EmployeeWithDetails | null>(null);
  const [showAddExam, setShowAddExam] = useState<EmployeeWithDetails | null>(null);
  const [swipedCard, setSwipedCard] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = !selectedSection || employee.section_name === selectedSection;
    const matchesProfession = !selectedProfession || employee.profession_name === selectedProfession;
    return matchesSearch && matchesSection && matchesProfession;
  });

  const uniqueSections = Array.from(new Set(employees.map(emp => emp.section_name)));
  const uniqueProfessions = Array.from(new Set(employees.map(emp => emp.profession_name)));

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Загрузка работников...</div>
      </div>
    );
  }

  return (
    <div className="employee-list-container">
      {/* ... filters and stats ... */}

      {/* Desktop Table */}
      <div className="table-container">
        <table className="employees-table">
          {/* ... table head ... */}
          <tbody>
            {filteredEmployees.map(employee => (
              <tr key={employee.id}>
                <td>{employee.full_name}</td>
                <td>{employee.profession_name}</td>
                {canViewAllSections() && <td>{employee.section_name}</td>}
                <td>{new Date(employee.created_at).toLocaleDateString('ru-RU')}</td>
                <td className="actions-cell">
                  <div className="actions-wrapper">
                    <button onClick={() => setSelectedEmployeeForExams(employee)} className="btn btn-sm btn-info">Экзамены</button>
                    <button onClick={() => setShowAddExam(employee)} className="btn btn-sm btn-success">+ Экзамен</button>
                    <button onClick={() => onEdit(employee)} className="btn btn-sm btn-primary">Редактировать</button>
                    <button onClick={() => onDelete(employee.id)} className="btn btn-sm btn-danger">Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mobile-employee-cards">
        {filteredEmployees.map(employee => {
          const isSwipedOpen = swipedCard === employee.id;
          
          const handleTouchStart = (e: React.TouchEvent) => {
            const touch = e.touches[0];
            setTouchStart({ x: touch.clientX, y: touch.clientY });
          };

          const handleTouchEnd = (e: React.TouchEvent) => {
            if (!touchStart) return;
            
            const touch = e.changedTouches[0];
            const deltaX = touchStart.x - touch.clientX;
            const deltaY = Math.abs(touchStart.y - touch.clientY);
            
            // Проверяем, что это горизонтальный свайп (не вертикальный скролл)
            if (deltaY < 50 && Math.abs(deltaX) > 50) {
              if (deltaX > 0) {
                // Свайп влево - открываем действия
                setSwipedCard(employee.id);
              } else {
                // Свайп вправо - закрываем действия
                setSwipedCard(null);
              }
            }
            
            setTouchStart(null);
          };

          const handleCardClick = () => {
            if (isSwipedOpen) {
              setSwipedCard(null);
            }
          };

          return (
            <div 
              key={employee.id} 
              className={`employee-card-wrapper ${isSwipedOpen ? 'swiped-open' : ''}`}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onClick={handleCardClick}
            >
              <div className="employee-card">
                <div className="card-header">
                  <div className="employee-name">{employee.full_name}</div>
                  <div className="employee-profession">{employee.profession_name}</div>
                </div>
                <div className="card-body">
                  {canViewAllSections() && (
                    <div className="detail-item">
                      <span className="detail-label">Участок:</span>
                      <span className="detail-value">{employee.section_name}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Дата создания:</span>
                    <span className="detail-value">{new Date(employee.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              </div>
              
              <div className="card-actions-swipe">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEmployeeForExams(employee);
                    setSwipedCard(null);
                  }} 
                  className="btn btn-info"
                  title="Экзамены"
                >
                  Экзамены
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddExam(employee);
                    setSwipedCard(null);
                  }} 
                  className="btn btn-success"
                  title="Добавить экзамен"
                >
                  + Экзамен
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(employee);
                    setSwipedCard(null);
                  }} 
                  className="btn btn-primary"
                  title="Редактировать"
                >
                  Изменить
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(employee.id);
                    setSwipedCard(null);
                  }} 
                  className="btn btn-danger"
                  title="Удалить"
                >
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedEmployeeForExams && (
        <ExamManagement employee={selectedEmployeeForExams} onClose={() => setSelectedEmployeeForExams(null)} onUpdate={onRefresh} />
      )}

      {showAddExam && (
        <AddExamModal employeeId={showAddExam.id} employeeName={showAddExam.full_name} onClose={() => setShowAddExam(null)} onSuccess={onRefresh} />
      )}
    </div>
  );
};

export default EmployeeList;
