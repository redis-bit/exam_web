# ✅ ИСПРАВЛЕНИЕ АВТОМАТИЧЕСКОЙ ОЧИСТКИ УВЕДОМЛЕНИЙ

## 🔍 Проблема:
У пользователей накапливаются прочитанные уведомления более 2 дней, хотя они должны автоматически удаляться через сутки.

## ✅ Решение:

### 1. Создан улучшенный SQL скрипт
**Файл:** `database/fix_notifications_cleanup.sql`

**Ключевые функции:**
- ✅ `cleanup_old_read_notifications()` - удаляет прочитанные уведомления старше 1 дня
- ✅ `force_cleanup_old_notifications()` - принудительно удаляет все уведомления старше 2 дней
- ✅ `update_notification_viewed()` - правильно помечает уведомления как прочитанные
- ✅ `maintenance_cleanup_notifications()` - функция для вызова из приложения
- ✅ Триггер для автоматического обновления `last_viewed_at`

### 2. Создан хук для автоматической очистки
**Файл:** `src/hooks/useNotificationsCleanup.ts`

**Функциональность:**
- ✅ Автоматическая очистка при входе пользователя (через 5 секунд)
- ✅ Периодическая очистка каждые 30 минут
- ✅ Функция принудительной очистки
- ✅ Логирование результатов очистки

### 3. Обновлен хук useNotifications
**Изменения в `src/hooks/useNotifications.ts`:**

**markAsRead функция:**
```typescript
const markAsRead = async (notificationId: string) => {
  try {
    // Используем функцию для обновления с автоматическим last_viewed_at
    const { error } = await supabase
      .rpc('update_notification_viewed', { notification_id: notificationId })

    if (error) {
      // Fallback на обычное обновление если функция не существует
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
    }
    // ... остальная логика
  }
}
```

**fetchNotifications функция:**
```typescript
const fetchNotifications = useCallback(async (markAsRead: boolean = false) => {
  // Сначала выполняем очистку старых уведомлений
  try {
    await supabase.rpc('maintenance_cleanup_notifications')
    console.log('🧹 Очистка старых уведомлений выполнена')
  } catch (cleanupError) {
    console.warn('⚠️ Не удалось выполнить очистку уведомлений:', cleanupError)
  }
  
  // Затем загружаем актуальные уведомления
  // ... остальная логика
})
```

## 🔧 Логика работы очистки:

### Автоматическая очистка:
1. **При входе пользователя** - очистка через 5 секунд
2. **Каждые 30 минут** - периодическая очистка
3. **При загрузке уведомлений** - очистка перед каждым запросом

### Критерии удаления:
- **Прочитанные уведомления** старше 1 дня
- **Все уведомления** старше 2 дней (принудительная очистка)
- Учитывается поле `last_viewed_at` или `created_at`

### Триггер для last_viewed_at:
```sql
CREATE TRIGGER update_last_viewed_trigger
    BEFORE UPDATE ON user_notifications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_last_viewed();
```

## 🚀 Инструкция по применению:

### 1. Выполнить SQL скрипт
```sql
-- В Supabase SQL Editor выполнить:
-- Содержимое файла database/fix_notifications_cleanup.sql
```

### 2. Перезапустить приложение
```bash
npm start
```

### 3. Проверить работу
- Откройте консоль браузера
- Войдите в систему
- Через 5 секунд увидите сообщение: "🧹 Очистка старых уведомлений выполнена"

## 📊 Мониторинг очистки:

### В консоли браузера:
```
🧹 Выполняем очистку старых уведомлений...
✅ Очистка завершена: удалено 5 уведомлений
ℹ️ Нет уведомлений для очистки
```

### В SQL для проверки:
```sql
-- Проверить статистику уведомлений
SELECT 
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE is_read = true) as read_notifications,
    COUNT(*) FILTER (WHERE is_read = false) as unread_notifications,
    COUNT(*) FILTER (WHERE is_read = true AND created_at < NOW() - INTERVAL '1 day') as old_read_notifications
FROM user_notifications;

-- Ручная очистка
SELECT * FROM maintenance_cleanup_notifications();
```

## ✅ Результат:

### До исправления:
- ❌ Прочитанные уведомления накапливались
- ❌ Нет автоматической очистки
- ❌ База данных засорялась старыми записями

### После исправления:
- ✅ Автоматическая очистка каждые 30 минут
- ✅ Очистка при входе пользователя
- ✅ Правильное обновление времени просмотра
- ✅ Логирование процесса очистки
- ✅ Fallback на обычное обновление

## 🎯 Статус: ГОТОВО К ПРИМЕНЕНИЮ

Выполните SQL скрипт и перезапустите приложение. Автоматическая очистка уведомлений начнет работать немедленно!