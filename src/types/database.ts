// Типы для работы с базой данных

export interface Section {
  id: string
  name: string
  created_at: string
  updated_at: string | null
  is_active: boolean
}

export interface User {
  id: string
  full_name: string
  email: string
  section_id: string | null
  role: 'admin' | 'admin_assistant' | 'section_chief'
  created_at: string
  last_action_at: string | null
  last_visit_at: string | null
  is_active: boolean
  activity_rating: number
  // Счетчики активности
  employees_created?: number
  exam_dates_approved?: number
  requests_rejected?: number
}

export interface Exam {
  id: string
  name: string
  periodicity: number
}

export interface ProfessionTemplate {
  id: string
  name: string
  section_id: string
  created_at: string
  updated_at: string | null
  is_active: boolean
}

export interface Employee {
  id: string
  full_name: string
  profession_template_id: string
  section_id: string
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export interface EmployeeExam {
  id: string
  employee_id: string
  exam_id: string
  exam_date: string
  next_exam_date: string | null
  updated_by: string | null
  updated_at: string
  pending_date: string | null
  pending_until: string | null
}

// Расширенные типы для отображения
export interface EmployeeWithDetails extends Employee {
  section_name: string
  profession_name: string
  exams?: EmployeeExamWithDetails[]
}

export interface EmployeeExamWithDetails extends EmployeeExam {
  exam_name: string
  status: 'overdue' | 'upcoming' | 'pending' | 'normal'
  color_indicator: 'red' | 'yellow' | 'blue' | 'green' | 'none'
  calculated_next_date?: string
  periodicity: number
}

export interface ProfessionExam {
  id: string
  profession_template_id: string
  exam_id: string
  periodicity_override: number | null
}

// Типы для форм
export interface CreateEmployeeData {
  full_name: string
  profession_template_id: string
  section_id: string
}

export interface UpdateEmployeeData {
  full_name?: string
  profession_template_id?: string
  section_id?: string
  is_active?: boolean
}