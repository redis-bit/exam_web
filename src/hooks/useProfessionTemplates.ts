// Хук для работы с шаблонами профессий
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ProfessionTemplate, Exam } from '../types/database'

export interface ProfessionTemplateWithExams extends ProfessionTemplate {
  section_name?: string
  exams?: ExamWithPeriodicity[]
}

export interface ExamWithPeriodicity extends Exam {
  periodicity_override?: number | null
}

export const useProfessionTemplates = (sectionId?: string) => {
  const [professionTemplates, setProfessionTemplates] = useState<ProfessionTemplateWithExams[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfessionTemplates = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('profession_templates')
        .select(`
          *,
          sections!profession_templates_section_id_fkey (
            name
          ),
          profession_exams (
            periodicity_override,
            exams (
              id,
              name,
              periodicity
            )
          )
        `)

      // Если указан section_id, фильтруем по участку
      if (sectionId) {
        query = query.eq('section_id', sectionId)
      }

      const { data, error: fetchError } = await query.order('name')

      if (fetchError) {
        throw fetchError
      }

      // Преобразуем данные для удобного использования
      const templatesWithExams = data?.map(template => ({
        ...template,
        section_name: template.sections?.name || null,
        exams: template.profession_exams?.map((pe: any) => ({
          ...pe.exams,
          periodicity_override: pe.periodicity_override
        })) || []
      })) || []

      setProfessionTemplates(templatesWithExams)
    } catch (err) {
      console.error('Ошибка при загрузке шаблонов профессий:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const createProfessionTemplate = async (templateData: {
    name: string
    section_id: string
    exam_ids: string[]
  }) => {
    try {
      // Создаем шаблон профессии
      const { data: templateData_result, error: templateError } = await supabase
        .from('profession_templates')
        .insert([{
          name: templateData.name,
          section_id: templateData.section_id,
          is_active: true
        }])
        .select()
        .single()

      if (templateError) {
        throw templateError
      }

      // Добавляем связи с экзаменами
      if (templateData.exam_ids.length > 0) {
        const professionExams = templateData.exam_ids.map(examId => ({
          profession_template_id: templateData_result.id,
          exam_id: examId,
          periodicity_override: null
        }))

        const { error: examsError } = await supabase
          .from('profession_exams')
          .insert(professionExams)

        if (examsError) {
          // Если не удалось добавить экзамены, удаляем шаблон
          await supabase
            .from('profession_templates')
            .delete()
            .eq('id', templateData_result.id)
          throw examsError
        }
      }

      return { success: true, template: templateData_result }
    } catch (error) {
      console.error('Ошибка при создании шаблона профессии:', error)
      throw error
    }
  }

  const updateProfessionTemplate = async (templateId: string, updates: {
    name?: string
    section_id?: string
    is_active?: boolean
    exam_ids?: string[]
  }) => {
    try {
      // Обновляем основные данные шаблона
      const { error: updateError } = await supabase
        .from('profession_templates')
        .update({
          name: updates.name,
          section_id: updates.section_id,
          is_active: updates.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)

      if (updateError) {
        throw updateError
      }

      // Если переданы exam_ids, обновляем связи с экзаменами
      if (updates.exam_ids !== undefined) {
        // Удаляем старые связи
        await supabase
          .from('profession_exams')
          .delete()
          .eq('profession_template_id', templateId)

        // Добавляем новые связи
        if (updates.exam_ids.length > 0) {
          const professionExams = updates.exam_ids.map(examId => ({
            profession_template_id: templateId,
            exam_id: examId,
            periodicity_override: null
          }))

          const { error: examsError } = await supabase
            .from('profession_exams')
            .insert(professionExams)

          if (examsError) {
            throw examsError
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка при обновлении шаблона профессии:', error)
      throw error
    }
  }

  const deactivateProfessionTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('profession_templates')
        .update({ 
          is_active: false
        })
        .eq('id', templateId)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка при деактивации шаблона профессии:', error)
      throw error
    }
  }

  const activateProfessionTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('profession_templates')
        .update({ 
          is_active: true
        })
        .eq('id', templateId)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка при активации шаблона профессии:', error)
      throw error
    }
  }

  const deleteProfessionTemplate = async (templateId: string) => {
    try {
      // Сначала удаляем связи с экзаменами
      await supabase
        .from('profession_exams')
        .delete()
        .eq('profession_template_id', templateId)

      // Затем удаляем сам шаблон профессии
      const { error } = await supabase
        .from('profession_templates')
        .delete()
        .eq('id', templateId)

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Ошибка при удалении шаблона профессии:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchProfessionTemplates()
  }, [sectionId])

  return {
    professionTemplates,
    loading,
    error,
    fetchProfessionTemplates,
    createProfessionTemplate,
    updateProfessionTemplate,
    deactivateProfessionTemplate,
    activateProfessionTemplate,
    deleteProfessionTemplate
  }
}