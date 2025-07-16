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
      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()

      if (error) {
        throw error
      }

      // Обновляем список работников
      await fetchEmployees()
      return data[0]
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