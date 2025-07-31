# Исправление автоматической очистки прочитанных уведомлений

## Проблема
Из файла `log.md` видно, что функция `maintenance_cleanup_notifications` возвращает ошибку 404 (Not Found), что означает отсутствие этой функции в базе данных. Прочитанные уведомления не удаляются автоматически через сутки.

## Причины проблемы
1. **Отсутствует функция `maintenance_cleanup_notifications`** - основная функция для очистки
2. **Отсутствует функция `force_cleanup_old_notifications`** - принудительная очистка
3. **Не настроен триггер** для автоматического обновления `last_viewed_at`
4. **Отсутствует поле `last_viewed_at`** в таблице `user_notifications`

## Решение
Создан файл `tmp_rovodev_apply_cleanup_fix.sql` который содержит:

### Функции базы данных:
- ✅ `cleanup_old_read_notifications()` - основная логика очистки
- ✅ `force_cleanup_old_notifications()` - принудительно удаляет все уведомления старше 2 дней  
- ✅ `maintenance_cleanup_notifications()` - функция для вызова из приложения
- ✅ `update_notification_viewed()` - обновляет статус прочтения
- ✅ Триггер `update_last_viewed_trigger` - автоматически обновляет `last_viewed_at`

### Логика работы:
1. При отметке уведомления как прочитанного триггер автоматически устанавливает `last_viewed_at = NOW()`
2. Функция `maintenance_cleanup_notifications` вызывается каждые 30 минут из `useNotificationsCleanup`
3. Удаляются уведомления где `is_read = TRUE` И `last_viewed_at < NOW() - INTERVAL '1 day'`

### Текущие ошибки в логах:
```
❌ POST .../maintenance_cleanup_notifications 404 (Not Found)
✅ 🧹 Очистка старых уведомлений выполнена (но функция не найдена)
```

## Инструкции по применению

### Шаг 1: Выполнить SQL в Supabase Dashboard
```sql
-- Выполнить содержимое файла tmp_rovodev_apply_cleanup_fix.sql
-- в SQL Editor в Supabase Dashboard
```

### Шаг 2: Проверить работу
```sql
-- Проверить что функции созданы
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'maintenance_cleanup_notifications';

-- Протестировать функцию
SELECT maintenance_cleanup_notifications();
```

### Шаг 3: Проверить в приложении
После применения SQL исправлений:
1. Перезагрузить приложение
2. Проверить консоль браузера - ошибки 404 должны исчезнуть
3. Создать тестовое уведомление, пометить как прочитанное
4. Подождать 24+ часов или принудительно вызвать очистку

## Автоматическая работа
После исправления система будет:
- ✅ Автоматически помечать `last_viewed_at` при чтении уведомлений
- ✅ Каждые 30 минут вызывать очистку через `useNotificationsCleanup`
- ✅ Удалять прочитанные уведомления старше 1 дня
- ✅ Логировать результаты очистки в консоль