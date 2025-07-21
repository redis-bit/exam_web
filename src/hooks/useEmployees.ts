// Хук для работы с данными работников
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { EmployeeWithDetails, CreateEmployeeData, UpdateEmployeeData } from '../types/database'

export const useEmployees = (sectionId?: string) => {
  const [employees, setEmployees] = useState<EmployeeWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('employees')
        .select(`
          *,
          sections!inner(name),
          profession_templates!inner(name)
        `)
        .eq('is_active', true)

      // Если указан section_id, фильтруем по участку
      if (sectionId) {
        query = query.eq('section_id', sectionId)
      }

      const { data, error: fetchError } = await query.order('full_name')

      if (fetchError) {
        throw fetchError
      }

      // Преобразуем данные в нужный формат
      const employeesWithDetails: EmployeeWithDetails[] = (data || []).map(emp => ({
        id: emp.id,
        full_name: emp.full_name,
        profession_template_id: emp.profession_template_id,
        section_id: emp.section_id,
        is_active: emp.is_active,
        created_at: emp.created_at,
        updated_at: emp.updated_at,
        section_name: emp.sections?.name || '',
        profession_name: emp.profession_templates?.name || ''
      }))

      setEmployees(employeesWithDetails)
    } catch (err) {
      console.error('Ошибка при загрузке работников:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const createEmployee = async (employeeData: CreateEmployeeData) => {
    try {
      // Создаем сотрудника
      const { data: employeeResult, error: employeeError } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()

      if (employeeError) {
        throw employeeError
      }

      const newEmployee = employeeResult[0]

      // Получаем экзамены для выбранной профессии
      const { data: professionExams, error: examsError } = await supabase
        .from('profession_exams')
        .select(`
          exam_id,
          periodicity_override,
          exams!inner(
            id,
            name,
            periodicity
          )
        `)
        .eq('profession_template_id', employeeData.profession_template_id)

      if (examsError) {
        console.error('Ошибка при получении экзаменов профессии:', examsError)
      } else if (professionExams && professionExams.length > 0) {
        // Создаем записи экзаменов для сотрудника с пустыми датами
        // Используем дату в далеком прошлом для обозначения "не установлено"
        const defaultDate = '1900-01-01'
        const employeeExams = professionExams.map(profExam => ({
          employee_id: newEmployee.id,
          exam_id: profExam.exam_id,
          exam_date: defaultDate,
          next_exam_date: defaultDate,
          updated_by: null,
          updated_at: new Date().toISOString(),
          pending_date: null,
          pending_until: null
        }))

        const { error: insertExamsError } = await supabase
          .from('employee_exams')
          .insert(employeeExams)

        if (insertExamsError) {
          console.error('Ошибка при создании записей экзаменов:', insertExamsError)
        }
      }

      // Обновляем список работников
      await fetchEmployees()
      return newEmployee
    } catch (err) {
      console.error('Ошибка при создании работника:', err)
      throw err
    }
  }

  const updateEmployee = async (id: string, employeeData: UpdateEmployeeData) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .update(employeeData)
        .eq('id', id)
        .select()

      if (error) {
        throw error
      }

      // Обновляем список работников
      await fetchEmployees()
      return data[0]
    } catch (err) {
      console.error('Ошибка при обновлении работника:', err)
      throw err
    }
  }

  const deleteEmployee = async (id: string) => {
    try {
      // Мягкое удаление - помечаем как неактивного
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        throw error
      }

      // Обновляем список работников
      await fetchEmployees()
    } catch (err) {
      console.error('Ошибка при удалении работника:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [sectionId])

  return {
    employees,
    loading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee
  }
}