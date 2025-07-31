# Пошаговая диагностика проблемы с активностью пользователей

## Шаг 1: Проверьте функции в базе данных
Выполните скрипт `tmp_rovodev_debug_activity.sql` в Supabase Dashboard для проверки:
- Существуют ли функции `update_user_last_action`, `update_user_last_visit`
- Есть ли права доступа к функциям
- Работает ли тестовый вызов функции

## Шаг 2: Проверьте консоль браузера
1. Откройте приложение и войдите как администратор
2. Откройте консоль разработчика (F12)
3. Перейдите на вкладку "Аналитика" - должно появиться сообщение:
   ```
   Обновлено время последнего визита при заходе на вкладку Аналитика
   ```
4. Измените дату экзамена - должно появиться сообщение:
   ```
   Время последнего действия обновлено после изменения даты экзамена в [InteractiveTable/ExcelTable]
   ```

## Шаг 3: Проверьте данные в базе
После изменения даты экзамена выполните в Supabase:
```sql
SELECT 
    full_name,
    last_visit_at,
    last_action_at,
    activity_rating
FROM users 
WHERE id = 'ваш-user-id'
ORDER BY last_action_at DESC;
```

## Шаг 4: Проверьте цветовую индикацию
1. Перейдите в раздел "Пользователи"
2. Сделайте свайп вправо по карточке пользователя
3. Выполните тестовый скрипт `tmp_rovodev_test_activity_debug.js` в консоли браузера

## Возможные проблемы и решения:

### Проблема 1: Функции не созданы
**Решение:** Выполните `tmp_rovodev_fix_function_conflict.sql`

### Проблема 2: Нет прав доступа к функциям
**Решение:** Добавьте права:
```sql
GRANT EXECUTE ON FUNCTION update_user_last_action(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_last_visit(UUID) TO authenticated;
```

### Проблема 3: Функция вызывается, но данные не обновляются
**Решение:** Проверьте RLS политики:
```sql
-- Временно отключите RLS для тестирования
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- Протестируйте
-- Затем включите обратно
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### Проблема 4: Цветовая индикация не работает
**Решение:** Проверьте CSS стили и убедитесь, что функция `getActivityStatus` вызывается

## Быстрый тест:
Выполните в консоли браузера:
```javascript
// Проверка данных пользователя
console.log('Текущий пользователь:', window.location.href);
// Найдите карточки пользователей
document.querySelectorAll('.activity-badge').forEach(badge => {
  console.log('Найден badge активности:', badge.textContent, badge.className);
});
```