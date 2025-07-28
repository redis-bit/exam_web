// Отладочная версия компонента для проверки группировки

// Добавьте этот код в начало useMemo для отладки:
console.log('=== ОТЛАДКА ГРУППИРОВКИ ===');

// Собираем все уникальные экзамены
const allExams = new Map<string, EmployeeExamWithDetails>();

employees.forEach(employee => {
  employee.exams.forEach(exam => {
    if (!allExams.has(exam.exam_id)) {
      allExams.set(exam.exam_id, exam);
    }
  });
});

console.log('Все экзамены:', Array.from(allExams.values()).map(e => e.exam_name));

// Группируем экзамены по префиксу (до первого подчеркивания)
const groupMap = new Map<string, ExamGroup>();

Array.from(allExams.values()).forEach(exam => {
  const examName = exam.exam_name.toUpperCase();
  const underscoreIndex = examName.indexOf('_');
  const prefix = underscoreIndex !== -1 ? examName.substring(0, underscoreIndex) : examName;
  
  console.log(`Экзамен: ${exam.exam_name} -> Префикс: ${prefix}`);
  
  if (!groupMap.has(prefix)) {
    groupMap.set(prefix, {
      key: prefix,
      name: prefix,
      exams: []
    });
  }
  
  groupMap.get(prefix)!.exams.push(exam);
});

console.log('Группы до фильтрации:', Array.from(groupMap.entries()).map(([key, group]) => ({
  key,
  count: group.exams.length,
  exams: group.exams.map(e => e.exam_name)
})));

// Фильтруем группы - оставляем только те, где больше одного экзамена
const filteredGroups = Array.from(groupMap.values()).filter(group => group.exams.length > 1);

console.log('Группы после фильтрации:', filteredGroups.map(group => ({
  key: group.key,
  count: group.exams.length,
  exams: group.exams.map(e => e.exam_name)
})));

// Остальная логика...