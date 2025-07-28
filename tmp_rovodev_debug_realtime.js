// Отладочный скрипт для проверки real-time уведомлений
// Вставить в консоль браузера для обычного пользователя

console.log('=== ОТЛАДКА REAL-TIME УВЕДОМЛЕНИЙ ===');

// Проверяем текущего пользователя
const currentUser = JSON.parse(localStorage.getItem('sb-' + window.location.hostname.replace(/\./g, '-') + '-auth-token') || '{}');
console.log('Текущий пользователь:', currentUser?.user);
console.log('Роль пользователя:', currentUser?.user?.user_metadata?.role);

// Проверяем подписки Supabase
if (window.supabase) {
  console.log('Supabase клиент найден');
  
  // Получаем активные каналы
  const channels = window.supabase.getChannels();
  console.log('Активные каналы:', channels);
  
  channels.forEach((channel, index) => {
    console.log(`Канал ${index}:`, {
      topic: channel.topic,
      state: channel.state,
      bindings: channel.bindings
    });
  });
} else {
  console.log('Supabase клиент не найден в window');
}

// Проверяем состояние уведомлений в React
console.log('Проверяем React состояние...');

// Функция для мониторинга изменений уведомлений
let lastNotificationCount = 0;
const checkNotifications = () => {
  // Попробуем найти элементы уведомлений на странице
  const notificationElements = document.querySelectorAll('[class*="notification"]');
  console.log('Элементы уведомлений на странице:', notificationElements.length);
  
  // Проверяем badge уведомлений
  const badge = document.querySelector('[class*="notification-badge"], [class*="badge"]');
  if (badge) {
    console.log('Badge уведомлений найден:', badge.textContent);
  }
};

// Запускаем проверку каждые 5 секунд
setInterval(checkNotifications, 5000);
checkNotifications();

console.log('=== Мониторинг запущен. Создайте новое уведомление и следите за логами ===');