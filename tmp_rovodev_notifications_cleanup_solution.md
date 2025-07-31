# РЕШЕНИЕ ПРОБЛЕМЫ АВТОМАТИЧЕСКОЙ ОЧИСТКИ УВЕДОМЛЕНИЙ

## Проблема
Из файла `log.md` видно, что функция `maintenance_cleanup_notifications` возвращает ошибку 404 (Not Found), что означает отсутствие этой функции в базе данных. Прочитанные уведомления не удаляются автоматически через сутки.

## Причины проблемы
1. **Отсутствует функция `maintenance_cleanup_notifications`** - основная функция для очистки
2. **Отсутствует поле `last_viewed_at`** - для отслеживания времени просмотра
3. **Функция `markAllAsRead` не обновляет `last_viewed_at`** - массовая отметка не учитывает время просмотра
4. **Нет триггера для автоматического обновления `last_viewed_at`**

## Решение

### 1. Выполнить SQL-скрипт
Запустите файл `tmp_rovodev_complete_notifications_fix.sql` в Supabase SQL Editor:

```sql
-- Этот скрипт создает все необходимые функции и исправления
```

### 2. Обновлен код приложения
Исправлена функция `markAllAsRead` в `src/hooks/useNotifications.ts` для использования новой функции `mark_notifications_as_read`.

## Что исправлено

### В базе данных:
- ✅ Добавлено поле `last_viewed_at` в таблицу `user_notifications`
- ✅ Создана функция `maintenance_cleanup_notifications()` (исправляет ошибку 404)
- ✅ Создана функция `cleanup_old_read_notifications()`
- ✅ Создана функция `force_cleanup_old_notifications()`
- ✅ Создана функция `update_notification_viewed(UUID)`
- ✅ Создана функция `mark_notifications_as_read(UUID)`
- ✅ Добавлен триггер для автоматического обновления `last_viewed_at`
- ✅ Обновлены существующие прочитанные уведомления

### В коде приложения:
- ✅ Исправлена функция `markAllAsRead` для использования `mark_notifications_as_read`
- ✅ Функция `markAsRead` уже использует `update_notification_viewed`

## Логика работы
1. При отметке уведомления как прочитанного устанавливается `last_viewed_at = NOW()`
2. Функция `maintenance_cleanup_notifications` вызывается каждые 30 минут из `useNotificationsCleanup`
3. Удаляются уведомления где `is_read = TRUE` и `last_viewed_at < NOW() - INTERVAL '1 day'`
4. Для старых уведомлений без `last_viewed_at` используется `created_at`

## Проверка работы
После применения исправлений в логах должно появиться:
```
✅ Очистка завершена: удалено X уведомлений
```
Вместо:
```
❌ POST .../maintenance_cleanup_notifications 404 (Not Found)
```

## Тестирование
1. Отметьте несколько уведомлений как прочитанные
2. Подождите сутки или измените интервал в функции для тестирования
3. Проверьте, что старые прочитанные уведомления удаляются автоматически