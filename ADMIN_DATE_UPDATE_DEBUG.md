# ОТЛАДКА: Проблема с обновлением даты экзамена администратором

## Описание проблемы
Администратор выбирает дату в календаре для экзамена работника, но дата не обновляется. В консоли видно, что `newDate` и `currentDate` одинаковые, поэтому `willUpdate: false`.

## Добавленные исправления и отладка

### 1. Принудительное обновление для администратора
```tsx
// ВРЕМЕННОЕ ИСПРАВЛЕНИЕ: Для администратора принудительно обновляем, даже если даты одинаковые
const isAdmin = user && ['admin', 'admin_assistant'].includes(user.role)
if (isAdmin && newDate) {
  console.log('Admin force updating date (even if same):', newDate)
  updateExamDate(exam.exam_id, newDate)
}
```

### 2. Визуальная отладочная информация
Добавлена строка над каждым полем даты:
```
ID: uuid | Date: 2024-07-01 | Status: normal
```

### 3. Расширенная отладка в onBlur
```tsx
console.log('Date input blur:', {
  newDate,
  currentDate,
  examName: exam.exam_name,
  willUpdate: newDate && newDate !== currentDate,
  examRecord: exams.find(ex => ex.exam_id === exam.exam_id),
  userRole: user?.role,
  isAdmin: user && ['admin', 'admin_assistant'].includes(user.role)
})
```

### 4. Кнопка принудительного обновления
Добавлена кнопка 🔄 для перезагрузки данных экзамена (только для администраторов).

### 5. Улучшенная отладка состояния
```tsx
setExams(prev => {
  const updated = prev.map(e => 
    e.id === examRecord.id 
      ? { ...e, exam_date: newDate, status: 'normal', color_indicator: 'green', pending_date: null }
      : e
  )
  console.log('Updated exams state:', updated.find(e => e.id === examRecord.id))
  return updated
})
```

## Инструкции по тестированию

### Шаг 1: Войти как администратор
- Использовать учетную запись с ролью `admin` или `admin_assistant`

### Шаг 2: Открыть управление экзаменами
- Перейти к "Управление работниками"
- Выбрать любого работника
- Нажать кнопку "Экзамены"

### Шаг 3: Проверить отладочную информацию
- Посмотреть на строку над полем даты: `ID: uuid | Date: текущая_дата | Status: статус`
- Открыть консоль браузера (F12 → Console)

### Шаг 4: Попробовать изменить дату
- Кликнуть на поле даты
- Выбрать новую дату в календаре
- Кликнуть вне поля или нажать Enter

### Шаг 5: Проверить логи в консоли
Ожидаемые логи:
```
Date input focused for exam: Название экзамена
Date input changed: {newDate: "2024-07-01", currentDate: "2024-06-01", ...}
Date input blur: {newDate: "2024-07-01", currentDate: "2024-06-01", willUpdate: true, isAdmin: true}
Admin force updating date (even if same): 2024-07-01
updateExamDate called: {...}
Admin updating exam date: {...}
Database update successful for date: 2024-07-01
Updated exams state: {...}
```

### Шаг 6: Если проблема остается
- Нажать кнопку 🔄 для принудительного обновления данных
- Проверить, изменилась ли отладочная информация над полем

## Возможные причины проблемы

1. **Поле уже содержит выбранную дату**
   - Решение: Принудительное обновление для администратора

2. **Проблема с форматом даты**
   - База данных возвращает дату в одном формате, а input ожидает другой

3. **Кэширование данных**
   - Старые данные не обновляются после изменения в базе

4. **Проблема с React состоянием**
   - setExams не срабатывает или перезаписывается

## Временные исправления
- Принудительное обновление для администратора (игнорирует проверку одинаковых дат)
- Визуальная отладка для понимания текущего состояния
- Кнопка принудительного обновления данных

## Файлы изменены
- `src/components/Employees/ExamManagement.tsx` - основные исправления и отладка
- `ADMIN_DATE_UPDATE_DEBUG.md` - документация отладки