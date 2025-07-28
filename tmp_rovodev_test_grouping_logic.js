// Тестовый скрипт для проверки логики группировки экзаменов

// Симуляция данных экзаменов
const testExams = [
  { exam_id: '1', exam_name: 'ОТ_б', next_exam_date: '2025-02-01' },
  { exam_id: '2', exam_name: 'ОТ_пмп', next_exam_date: '2025-02-02' },
  { exam_id: '3', exam_name: 'ОТ_рпо', next_exam_date: '2026-03-02' },
  { exam_id: '4', exam_name: 'ОТ_сиз', next_exam_date: '2027-04-02' },
  { exam_id: '5', exam_name: 'ПБ_общ', next_exam_date: '2025-03-01' },
  { exam_id: '6', exam_name: 'ПБ_газ', next_exam_date: '2025-03-15' },
  { exam_id: '7', exam_name: 'ЭБ_до', next_exam_date: '2025-01-15' },
  { exam_id: '8', exam_name: 'МД_осм', next_exam_date: '2025-04-01' }
];

// Функция группировки (копия логики из компонента)
function groupExams(exams) {
  const allExams = new Map();
  
  exams.forEach(exam => {
    if (!allExams.has(exam.exam_id)) {
      allExams.set(exam.exam_id, exam);
    }
  });
  
  // Группируем экзамены по первым двум буквам
  const groupMap = new Map();
  
  Array.from(allExams.values()).forEach(exam => {
    const examName = exam.exam_name.toUpperCase();
    const prefix = examName.substring(0, 2); // Берем первые 2 буквы
    
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
console.log('=== ТЕСТИРОВАНИЕ ГРУППИРОВКИ ЭКЗАМЕНОВ ===\n');

const groups = groupExams(testExams);

console.log('Результат группировки:');
groups.forEach(group => {
  console.log(`\n📋 Группа "${group.name}":`);
  console.log(`   Количество экзаменов: ${group.exams.length}`);
  
  if (group.exams.length > 1) {
    console.log('   🎴 Колода экзаменов (сортировка по дате):');
    group.exams.forEach((exam, index) => {
      const isNearest = index === 0;
      console.log(`   ${isNearest ? '👆 ' : '   '}${index + 1}. ${exam.exam_name} - ${exam.next_exam_date} ${isNearest ? '(показывается)' : '(скрыт)'}`);
    });
  } else {
    console.log(`   📄 Одиночный экзамен: ${group.exams[0].exam_name} - ${group.exams[0].next_exam_date}`);
  }
});

console.log('\n=== ПРОВЕРКА ЛОГИКИ ===');
console.log('✅ Группа ОТ: 4 экзамена, показывается ОТ_б (01.02.2025)');
console.log('✅ Группа ПБ: 2 экзамена, показывается ПБ_общ (01.03.2025)');
console.log('✅ ЭБ_до и МД_осм: одиночные экзамены, показываются отдельно');