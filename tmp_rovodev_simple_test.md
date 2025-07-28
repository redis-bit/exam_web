# Простой тест исправления Real-Time уведомлений

## 🚀 Быстрое исправление

### Шаг 1: Выполните в Supabase SQL Editor
```sql
-- Быстрое отключение RLS для тестирования
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;
GRANT ALL ON user_notifications TO authenticated;
```

### Шаг 2: Проверьте в браузере
1. Откройте приложение под проблемным пользователем
2. Откройте консоль (F12)
3. Должны появиться логи:
   ```
   🔄 fetchNotifications вызван для пользователя: [ID]
   📊 Результат запроса уведомлений: { data: 8, error: null }
   ```

### Шаг 3: Тест real-time
Выполните в Supabase (замените USER_ID):
```sql
INSERT INTO user_notifications (user_id, type, title, message)
VALUES ('USER_ID_ЗДЕСЬ', 'exam_date_pending', 'Тест Real-Time', 'Это должно появиться сразу!');
```

## ✅ Ожидаемый результат
- Сразу должны появиться все 8 накопившихся уведомлений
- Новое тестовое уведомление должно появиться без перезагрузки
- В консоли должны быть логи с эмодзи 🔄📊📡📨

## 🔧 Если не работает
Выполните полный скрипт: `tmp_rovodev_quick_fix_rls.sql`

**Попробуйте сначала простое решение выше!**