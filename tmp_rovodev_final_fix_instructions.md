# 🔧 ИСПРАВЛЕНИЕ: Автоматическая очистка прочитанных уведомлений

## 🚨 Проблема
Из `log.md` видно повторяющуюся ошибку:
```
POST .../maintenance_cleanup_notifications 404 (Not Found)
```

**Причина**: Функция `maintenance_cleanup_notifications` не существует в базе данных, но вызывается из приложения каждые 30 минут.

## ✅ Решение

### Шаг 1: Выполнить SQL в Supabase Dashboard

Скопируйте и выполните содержимое файла `tmp_rovodev_apply_cleanup_fix.sql` в SQL Editor:

1. Откройте Supabase Dashboard → SQL Editor
2. Вставьте весь код из `tmp_rovodev_apply_cleanup_fix.sql`
3. Нажмите "Run"

### Шаг 2: Проверить создание функций

Выполните проверочный запрос:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN (
    'maintenance_cleanup_notifications',
    'force_cleanup_old_notifications'
) AND routine_schema = 'public';
```

Должно вернуть 2 строки с названиями функций.

### Шаг 3: Протестировать работу

```sql
-- Тест основной функции
SELECT maintenance_cleanup_notifications();

-- Проверка статистики уведомлений
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_read = true) as read,
    COUNT(*) FILTER (WHERE is_read = false) as unread
FROM user_notifications;
```

## 🔄 Как работает исправление

### Автоматическая очистка:
1. **Триггер**: При отметке уведомления как прочитанного автоматически устанавливается `last_viewed_at = NOW()`
2. **Периодическая очистка**: Каждые 30 минут вызывается `maintenance_cleanup_notifications()`
3. **Условие удаления**: `is_read = TRUE AND last_viewed_at < NOW() - INTERVAL '1 day'`

### Функции в базе данных:
- `maintenance_cleanup_notifications()` - основная функция для приложения
- `cleanup_old_read_notifications()` - логика очистки с возвратом статистики  
- `force_cleanup_old_notifications()` - принудительная очистка всех уведомлений старше 2 дней
- `update_notification_viewed()` - правильная отметка уведомления как прочитанного

### Логика в приложении:
- `useNotificationsCleanup.ts` - вызывает очистку каждые 30 минут
- `useNotifications.ts` - вызывает очистку перед каждым запросом уведомлений
- Обе функции используют `maintenance_cleanup_notifications()`

## 🎯 Ожидаемый результат

### До исправления:
```
❌ POST .../maintenance_cleanup_notifications 404 (Not Found)
🧹 Очистка старых уведомлений выполнена (но ничего не удалилось)
```

### После исправления:
```
✅ POST .../maintenance_cleanup_notifications 200 OK
🧹 Очистка старых уведомлений выполнена
📊 Удалено X прочитанных уведомлений старше 1 дня
```

## 🧪 Тестирование

1. **Создать тестовое уведомление**
2. **Пометить как прочитанное** (должно установиться `last_viewed_at`)
3. **Подождать 24+ часов** или изменить интервал в SQL для теста
4. **Проверить автоматическое удаление**

Или принудительно:
```sql
SELECT force_cleanup_old_notifications();
```

## 📝 Примечания

- Исправление обратно совместимо - если функции не существуют, приложение продолжит работать
- Добавлен fallback в `markAsRead()` и `markAllAsRead()` функциях
- Все функции имеют права `SECURITY DEFINER` и `GRANT EXECUTE TO authenticated`
- Логирование результатов очистки в консоль браузера