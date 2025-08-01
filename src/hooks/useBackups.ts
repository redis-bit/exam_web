import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface Backup {
  id: string
  created_at: string
  file_size: number | null
  file_path: string | null
  created_by: string
  creator_name?: string
}

export interface BackupData {
  sections: any[]
  users: any[]
  employees: any[]
  employee_exams: any[]
  exams: any[]
  profession_templates: any[]
  profession_exams: any[]
  news: any[]
}

export const useBackups = () => {
  const { user } = useAuth()
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBackups = useCallback(async () => {
    if (!user || user.role !== 'admin') return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('backups')
        .select(`
          *,
          users!backups_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const backupsWithCreatorNames = data?.map(backup => ({
        ...backup,
        creator_name: backup.users?.full_name || 'Неизвестно'
      })) || []

      setBackups(backupsWithCreatorNames)
    } catch (err) {
      console.error('Ошибка загрузки резервных копий:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }, [user])

  const createBackup = async (): Promise<{ success: boolean; error?: string; backupId?: string }> => {
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Недостаточно прав' }
    }

    try {
      console.log('🔄 Начинаем создание резервной копии...')

      // 1. Экспортируем данные из всех основных таблиц
      const tables = [
        'sections',
        'users', 
        'employees',
        'employee_exams',
        'exams',
        'profession_templates',
        'profession_exams',
        'news'
      ]

      const backupData: any = {}
      
      for (const table of tables) {
        console.log(`📊 Экспортируем таблицу: ${table}`)
        const { data, error } = await supabase
          .from(table)
          .select('*')

        if (error) {
          console.error(`Ошибка экспорта таблицы ${table}:`, error)
          throw new Error(`Ошибка экспорта таблицы ${table}: ${error.message}`)
        }

        backupData[table] = data || []
        console.log(`✅ Экспортировано записей из ${table}: ${data?.length || 0}`)
      }

      // 2. Создаем JSON файл
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `backup_${timestamp}.json`
      const backupJson = JSON.stringify({
        created_at: new Date().toISOString(),
        created_by: user.id,
        creator_name: user.full_name,
        version: '1.0',
        tables: Object.keys(backupData),
        data: backupData
      }, null, 2)

      const fileSize = new Blob([backupJson]).size

      // 3. Сохраняем в Supabase Storage
      console.log('💾 Сохраняем файл в Storage...')
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('backups')
        .upload(fileName, backupJson, {
          contentType: 'application/json'
        })

      if (uploadError) {
        console.error('Ошибка загрузки в Storage:', uploadError)
        throw new Error(`Ошибка сохранения файла: ${uploadError.message}`)
      }

      // 4. Записываем информацию о бэкапе в таблицу
      console.log('📝 Записываем информацию о бэкапе в БД...')
      const { data: backupRecord, error: dbError } = await supabase
        .from('backups')
        .insert({
          file_size: fileSize,
          file_path: uploadData.path,
          created_by: user.id
        })
        .select()
        .single()

      if (dbError) {
        console.error('Ошибка записи в БД:', dbError)
        throw new Error(`Ошибка записи в базу данных: ${dbError.message}`)
      }

      console.log('✅ Резервная копия создана успешно!')
      
      // Обновляем список бэкапов
      await fetchBackups()

      return { 
        success: true, 
        backupId: backupRecord.id 
      }

    } catch (err) {
      console.error('❌ Ошибка создания резервной копии:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Неизвестная ошибка' 
      }
    }
  }

  const downloadBackup = async (backup: Backup): Promise<{ success: boolean; error?: string }> => {
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Недостаточно прав' }
    }

    if (!backup.file_path) {
      return { success: false, error: 'Путь к файлу не найден' }
    }

    try {
      console.log('📥 Скачиваем резервную копию:', backup.file_path)

      const { data, error } = await supabase.storage
        .from('backups')
        .download(backup.file_path)

      if (error) {
        throw new Error(`Ошибка скачивания: ${error.message}`)
      }

      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = backup.file_path.split('/').pop() || 'backup.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('✅ Файл скачан успешно')
      return { success: true }

    } catch (err) {
      console.error('❌ Ошибка скачивания:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Неизвестная ошибка' 
      }
    }
  }

  const deleteBackup = async (backupId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Недостаточно прав' }
    }

    try {
      const backup = backups.find(b => b.id === backupId)
      if (!backup) {
        throw new Error('Резервная копия не найдена')
      }

      // Удаляем файл из Storage
      if (backup.file_path) {
        const { error: storageError } = await supabase.storage
          .from('backups')
          .remove([backup.file_path])

        if (storageError) {
          console.warn('Предупреждение при удалении файла:', storageError)
        }
      }

      // Удаляем запись из БД
      const { error: dbError } = await supabase
        .from('backups')
        .delete()
        .eq('id', backupId)

      if (dbError) {
        throw new Error(`Ошибка удаления из БД: ${dbError.message}`)
      }

      // Обновляем список
      await fetchBackups()

      return { success: true }

    } catch (err) {
      console.error('❌ Ошибка удаления:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Неизвестная ошибка' 
      }
    }
  }

  const restoreBackup = async (file: File): Promise<{ success: boolean; error?: string; restoredTables?: string[] }> => {
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Недостаточно прав' }
    }

    try {
      console.log('🔄 Начинаем восстановление из файла:', file.name)

      // Читаем файл
      const fileText = await file.text()
      const backupData = JSON.parse(fileText)

      if (!backupData.data || !backupData.tables) {
        throw new Error('Неверный формат файла резервной копии')
      }

      const restoredTables: string[] = []

      // Восстанавливаем данные по таблицам в правильном порядке (с учетом зависимостей)
      const restoreOrder = [
        'sections',
        'users',
        'exams', 
        'profession_templates',
        'profession_exams',
        'employees',
        'employee_exams',
        'news'
      ]

      for (const tableName of restoreOrder) {
        if (backupData.data[tableName] && Array.isArray(backupData.data[tableName])) {
          const tableData = backupData.data[tableName]
          
          if (tableData.length > 0) {
            console.log(`📊 Восстанавливаем таблицу ${tableName} (${tableData.length} записей)`)

            // Очищаем таблицу перед восстановлением (кроме users - там могут быть новые пользователи)
            if (tableName !== 'users') {
              const { error: deleteError } = await supabase
                .from(tableName)
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000') // удаляем все записи

              if (deleteError) {
                console.warn(`Предупреждение при очистке ${tableName}:`, deleteError)
              }
            }

            // Вставляем данные
            const { error: insertError } = await supabase
              .from(tableName)
              .upsert(tableData, { onConflict: 'id' })

            if (insertError) {
              console.error(`Ошибка восстановления ${tableName}:`, insertError)
              throw new Error(`Ошибка восстановления таблицы ${tableName}: ${insertError.message}`)
            }

            restoredTables.push(tableName)
            console.log(`✅ Таблица ${tableName} восстановлена`)
          }
        }
      }

      console.log('✅ Восстановление завершено успешно!')
      
      // Обновляем список бэкапов
      await fetchBackups()

      return { 
        success: true, 
        restoredTables 
      }

    } catch (err) {
      console.error('❌ Ошибка восстановления:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Неизвестная ошибка' 
      }
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchBackups()
    }
  }, [user, fetchBackups])

  return {
    backups,
    loading,
    error,
    fetchBackups,
    createBackup,
    downloadBackup,
    deleteBackup,
    restoreBackup
  }
}