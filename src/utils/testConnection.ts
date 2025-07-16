// Утилита для тестирования подключения к Supabase
import { supabase } from '../lib/supabase'

export const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Тестирование подключения к Supabase...')
    
    // Проверяем подключение к базе данных
    const { data, error } = await supabase
      .from('sections')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Ошибка подключения к базе данных:', error.message)
      return false
    }
    
    console.log('✅ Подключение к базе данных успешно')
    
    // Проверяем аутентификацию
    const { data: { session } } = await supabase.auth.getSession()
    console.log('🔐 Статус аутентификации:', session ? 'Пользователь авторизован' : 'Пользователь не авторизован')
    
    return true
  } catch (err) {
    console.error('❌ Критическая ошибка:', err)
    return false
  }
}

export const testDatabaseTables = async () => {
  const tables = [
    'sections',
    'users', 
    'exams',
    'profession_templates',
    'profession_exams',
    'employees',
    'employee_exams',
    'news',
    'backups',
    'forum_topics',
    'forum_messages'
  ]
  
  console.log('🔄 Проверка доступности таблиц...')
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.error(`❌ Таблица ${table}: ${error.message}`)
      } else {
        console.log(`✅ Таблица ${table}: доступна`)
      }
    } catch (err) {
      console.error(`❌ Таблица ${table}: критическая ошибка`, err)
    }
  }
}