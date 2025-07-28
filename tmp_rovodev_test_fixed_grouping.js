// Тест исправленной логики группировки экзаменов

const testExams = [
  { exam_id: '1', exam_name: 'ОТ_б', next_exam_date: '2025-02-01' },
  { exam_id: '2', exam_name: 'ОТ_пмп', next_exam_date: '2025-02-02' },
  { exam_id: '3', exam_name: 'ОТ_рпо', next_exam_date: '2026-03-02' },
  { exam_id: '4', exam_name: 'ОТ_сиз', next_exam_date: '2027-04-02' },
  { exam_id: '5', exam_name: 'ПБ_общ', next_exam_date: '2025-03-01' },
  { exam_id: '6', exam_name: 'ПБ_газ', next_exam_date: '2025-03-15' },
  { exam_id: '7', exam_name: 'ЭБ_до', next_exam_date: '2025-01-15' },
  { exam_id: '8', exam_name: 'ЭБ_свыше', next_exam_date: '2025-01-20' },
  { exam_id: '9', exam_name: 'МД_осм', next_exam_date: '2025-04-01' }
];

// Исправленная функция группировки
function groupExams(exams) {
  const allExams = new Map();
  
  exams.forEach(exam => {
    if (!allExams.has(exam.exam_id)) {
      allExams.set(exam.exam_id, exam);
    }
  });
  
  // Группируем экзамены по префиксу (до первого подчеркивания)
  const groupMap = new Map();
  
  Array.from(allExams.values()).forEach(exam => {
    const examName = exam.exam_name.toUpperCase();
    // Берем все символы до первого подчеркивания
    const underscoreIndex = examName.indexOf('_');
    const prefix = underscoreIndex !== -1 ? examName.substring(0, underscoreIndex) : examName;
    
    if (!groupMap.has(prefix)) {
      groupMap.set(prefix, {
        key: prefix,
        name: prefix,
        exams: []
      });
    }
    
    groupMap.get(prefix).exams.push(exam);
  });
  
  // Фильтруем группы - оставляем только те, где больше одного экзамена
  const filteredGroups = Array.from(groupMap.values()).filter(group => group.exams.length > 1);
  
  // Сортируем экзамены в каждой группе по дате следующего экзамена
  filteredGroups.forEach(group => {
    group.exams.sort((a, b) => {
      const aDate = a.next_exam_date ? new Date(a.next_exam_date).getTime() : Infinity;
      const bDate = b.next_exam_date ? new Date(b.next_exam_date).getTime() : Infinity;
      return aDate - bDate;
    });
    
    // Ближайший экзамен - первый в отсортированном списке
    group.nearestExam = group.exams[0];
  });
  
  // Создаем финальный список: сначала группы, потом одиночные экзамены
  const groupedExamIds = new Set();
  filteredGroups.forEach(group => {
    group.exams.forEach(exam => groupedExamIds.add(exam.exam_id));
  });
  
  const singleExams = Array.from(allExams.values())
    .filter(exam => !groupedExamIds.has(exam.exam_id))
    .map(exam => ({
      key: exam.exam_id,
      name: exam.exam_name,
      exams: [exam],
      nearestExam: exam
    }));
  
  // Сортируем группы по названию
  const sortedGroups = [...filteredGroups, ...singleExams].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });
  
  return sortedGroups;
}

// Тестирование
console.log('=== ТЕСТ ИСПРАВЛЕННОЙ ГРУППИРОВКИ ===\n');

const groups = groupExams(testExams);

console.log('Результат группировки:');
groups.forEach(group => {
  console.log(`\n📋 Группа/Экзамен "${group.name}":`);
  console.log(`   Количество экзаменов: ${group.exams.length}`);
  
  if (group.exams.length > 1) {
    console.log('   🎴 Колода экзаменов (сортировка по дате):');
    group.exams.forEach((exam, index) => {
      const isNearest = index === 0;
      console.log(`   ${isNearest ? '👆 ' : '   '}${index + 1}. ${exam.exam_name} - ${exam.next_exam_date} ${isNearest ? '(показывается на верху колоды)' : '(под колодой)'}`);
    });
  } else {
    console.log(`   📄 Одиночный экзамен: ${group.exams[0].exam_name} - ${group.exams[0].next_exam_date}`);
  }
});

console.log('\n=== ПРОВЕРКА ПРАВИЛЬНОСТИ ===');
console.log('✅ Группа ОТ: должна содержать ОТ_б, ОТ_пмп, ОТ_рпо, ОТ_сиз');
console.log('✅ Группа ПБ: должна содержать ПБ_общ, ПБ_газ');
console.log('✅ Группа ЭБ: должна содержать ЭБ_до, ЭБ_свыше');
console.log('✅ МД_осм: должен быть одиночным экзаменом');

// Проверим конкретно группу ОТ
const otGroup = groups.find(g => g.name === 'ОТ');
if (otGroup) {
  console.log('\n🎯 ДЕТАЛЬНАЯ ПРОВЕРКА ГРУППЫ ОТ:');
  console.log(`Найдено экзаменов: ${otGroup.exams.length}`);
  console.log('Список экзаменов:');
  otGroup.exams.forEach(exam => {
    console.log(`  - ${exam.exam_name} (${exam.next_exam_date})`);
  });
  console.log(`Показывается: ${otGroup.nearestExam.exam_name} (${otGroup.nearestExam.next_exam_date})`);
} else {
  console.log('\n❌ ОШИБКА: Группа ОТ не найдена!');
}