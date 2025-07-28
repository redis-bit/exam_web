# Исправление ошибки редактирования даты экзамена

## Проблема
Пользователь получал ошибку `RangeError: Invalid time value` при попытке редактировать дату экзамена работника в компоненте `ExamDateEditModal`.

## Причина ошибки
В функции `formatDateForInput` (строка 948-949 в `src/components/Analytics/ExcelTable.tsx`) происходил вызов `toISOString()` на невалидном объекте Date, что приводило к ошибке.

Исходный код:
```tsx
const formatDateForInput = (dateString: string) => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};
```

## Решение
Добавлена проверка валидности даты перед вызовом `toISOString()`:

```tsx
const formatDateForInput = (dateString: string) => {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  // Проверяем, что дата валидна
  if (isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0];
};
```

## Что исправлено
1. **Проверка на пустое значение**: Если `dateString` пустой, null или undefined, возвращается пустая строка
2. **Проверка валидности даты**: Используется `isNaN(date.getTime())` для проверки валидности созданного объекта Date
3. **Безопасная обработка**: Возвращается пустая строка вместо попытки вызвать `toISOString()` на невалидной дате

## Результат
Теперь компонент `ExamDateEditModal` будет корректно обрабатывать невалидные даты без выброса ошибки `RangeError: Invalid time value`.

## Файлы изменены
- `src/components/Analytics/ExcelTable.tsx` - исправлена функция `formatDateForInput`