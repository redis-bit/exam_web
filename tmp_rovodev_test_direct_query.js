// Тест прямого запроса к Supabase из консоли браузера
// Выполните этот код в консоли браузера под проблемным пользователем

console.log('=== ТЕСТ ПРЯМОГО ЗАПРОСА К SUPABASE ===');

// Получаем текущего пользователя
const getCurrentUser = async () => {
  if (!window.supabase) {
    console.error('❌ Supabase не найден в window');
    return null;
  }
  
  const { data: { user }, error } = await window.supabase.auth.getUser();
  if (error) {
    console.error('❌ Ошибка получения пользователя:', error);
    return null;
  }
  
  console.log('👤 Текущий пользователь:', user);
  return user;
};

// Тестируем запрос уведомлений
const testNotificationsQuery = async () => {
  const user = await getCurrentUser();
  if (!user) return;
  
  console.log('🔍 Тестируем запрос уведомлений для пользователя:', user.id);
  
  try {
    // Прямой запрос к таблице
    const { data, error } = await window.supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('📊 Результат запроса:', { 
      success: !error, 
      count: data?.length || 0, 
      data, 
      error 
    });
    
    if (error) {
      console.error('❌ Ошибка запроса:', error);
      console.error('Код ошибки:', error.code);
      console.error('Сообщение:', error.message);
      console.error('Детали:', error.details);
    } else {
      console.log('✅ Запрос успешен, получено уведомлений:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📝 Первое уведомление:', data[0]);
      }
    }
  } catch (err) {
    console.error('💥 Исключение при запросе:', err);
  }
};

// Тестируем подписку
const testSubscription = async () => {
  const user = await getCurrentUser();
  if (!user) return;
  
  console.log('📡 Тестируем подписку для пользователя:', user.id);
  
  const subscription = window.supabase
    .channel(`test_notifications_${user.id}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'user_notifications', 
        filter: `user_id=eq.${user.id}` 
      }, 
      (payload) => {
        console.log('🎉 ПОЛУЧЕНО ИЗМЕНЕНИЕ В ПОДПИСКЕ:', payload);
      }
    )
    .subscribe((status) => {
      console.log('📡 Статус подписки:', status);
    });
  
  // Сохраняем подписку в window для возможности отключения
  window.testSubscription = subscription;
  
  console.log('📡 Подписка создана. Для отключения выполните: window.testSubscription.unsubscribe()');
};

// Запускаем тесты
(async () => {
  await testNotificationsQuery();
  await testSubscription();
  
  console.log('=== ТЕСТЫ ЗАВЕРШЕНЫ ===');
  console.log('Теперь создайте новое уведомление в админке и проверьте логи');
})();