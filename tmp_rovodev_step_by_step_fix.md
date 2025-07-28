# Пошаговое исправление Real-Time уведомлений

## 🔍 Диагностика проблемы

### Шаг 1: Проверить состояние RLS и данных
Выполните в Supabase SQL Editor: `tmp_rovodev_debug_user_notifications.sql`

Это покажет:
- Какие RLS политики существуют
- Сколько уведомлений у каждого пользователя
- Структуру таблицы

### Шаг 2: Проверить доступ из браузера
1. Откройте приложение под проблемным пользователем
2. Откройте консоль браузера (F12)
3. Вставьте и выполните код из `tmp_rovodev_test_direct_query.js`
4. Посмотрите на результаты в консоли

## 🛠️ Исправление

### Вариант A: Временно отключить RLS (для тестирования)
Если нужно быстро проверить что проблема в RLS:
1. Выполните `tmp_rovodev_force_disable_rls.sql`
2. Проверьте работает ли real-time
3. **ВАЖНО:** Это небезопасно для продакшена!

### Вариант B: Исправить RLS политики (рекомендуется)
```sql
-- Удаляем все политики
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON user_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON user_notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON user_notifications;

-- Отключаем RLS временно
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;

-- Создаем новые упрощенные политики
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Политика для чтения своих уведомлений
CREATE POLICY "users_select_own_notifications" ON user_notifications
    FOR SELECT USING (user_id = auth.uid());

-- Политика для обновления своих уведомлений
CREATE POLICY "users_update_own_notifications" ON user_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Политика для создания уведомлений (системная)
CREATE POLICY "system_insert_notifications" ON user_notifications
    FOR INSERT WITH CHECK (true);

-- Политика для админов
CREATE POLICY "admins_all_notifications" ON user_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'admin_assistant')
        )
    );
```

## 🧪 Тестирование

### После исправления:
1. Перезагрузите страницу приложения
2. Проверьте логи в консоли - должны появиться:
   ```
   🔄 fetchNotifications вызван для пользователя: [ID] роль: [role]
   📊 Результат запроса уведомлений: { data: X, error: null }
   📡 Статус подписки user_notifications: SUBSCRIBED
   ```

3. Создайте тестовое уведомление:
   ```sql
   INSERT INTO user_notifications (user_id, type, title, message)
   VALUES ('USER_ID', 'exam_date_pending', 'Тест', 'Тестовое сообщение');
   ```

4. Модал должен появиться сразу без перезагрузки

## 🚨 Если ничего не помогает

### Альтернативное решение - Polling вместо Real-Time
Если real-time подписки не работают, можно временно использовать опрос:

```typescript
// В useAutoNotifications.ts добавить:
useEffect(() => {
  if (!user) return;
  
  const interval = setInterval(() => {
    fetchNotifications();
  }, 5000); // Проверяем каждые 5 секунд
  
  return () => clearInterval(interval);
}, [user, fetchNotifications]);
```

## 📋 Файлы для диагностики
- `tmp_rovodev_debug_user_notifications.sql` - диагностика БД
- `tmp_rovodev_test_direct_query.js` - тест из браузера  
- `tmp_rovodev_force_disable_rls.sql` - временное отключение RLS

## 🎯 Ожидаемый результат
После исправления:
- ✅ Пользователи видят свои уведомления в real-time
- ✅ Модал появляется сразу при новых уведомлениях
- ✅ Логи показывают успешные подписки и запросы
- ✅ 8 накопившихся уведомлений отображаются корректно