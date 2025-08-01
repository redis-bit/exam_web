🔄 Начинаем создание резервной копии...
useBackups.ts:85 📊 Экспортируем таблицу: sections
useBackups.ts:96 ✅ Экспортировано записей из sections: 4
useBackups.ts:85 📊 Экспортируем таблицу: users
useBackups.ts:96 ✅ Экспортировано записей из users: 4
useBackups.ts:85 📊 Экспортируем таблицу: employees
useBackups.ts:96 ✅ Экспортировано записей из employees: 26
useBackups.ts:85 📊 Экспортируем таблицу: employee_exams
useBackups.ts:96 ✅ Экспортировано записей из employee_exams: 45
useBackups.ts:85 📊 Экспортируем таблицу: exams
useBackups.ts:96 ✅ Экспортировано записей из exams: 21
useBackups.ts:85 📊 Экспортируем таблицу: profession_templates
useBackups.ts:96 ✅ Экспортировано записей из profession_templates: 5
useBackups.ts:85 📊 Экспортируем таблицу: profession_exams
useBackups.ts:96 ✅ Экспортировано записей из profession_exams: 54
useBackups.ts:85 📊 Экспортируем таблицу: news
useBackups.ts:96 ✅ Экспортировано записей из news: 14
useBackups.ts:114 💾 Сохраняем файл в Storage...
useBackups.ts:115  POST https://dvdribnzlrbmqzeurino.supabase.co/storage/v1/object/backups/backup_2025-07-31T15-50-25-393Z.json 400 (Bad Request)
(анонимная) @ fetch.ts:15
(анонимная) @ fetch.ts:46
fulfilled @ constants.ts:35
Promise.then
step @ constants.ts:35
(анонимная) @ constants.ts:35
__webpack_modules__../node_modules/@supabase/supabase-js/dist/module/lib/fetch.js.__awaiter @ constants.ts:35
(анонимная) @ fetch.ts:34
(анонимная) @ helpers.ts:13
(анонимная) @ helpers.ts:13
(анонимная) @ StorageFileApi.ts:121
(анонимная) @ StorageBucketApi.ts:246
__webpack_modules__../node_modules/@supabase/storage-js/dist/module/packages/StorageFileApi.js.__awaiter @ StorageBucketApi.ts:246
uploadOrUpdate @ StorageFileApi.ts:67
(анонимная) @ StorageFileApi.ts:168
(анонимная) @ StorageBucketApi.ts:246
__webpack_modules__../node_modules/@supabase/storage-js/dist/module/packages/StorageFileApi.js.__awaiter @ StorageBucketApi.ts:246
upload @ StorageFileApi.ts:154
createBackup @ useBackups.ts:115
await in createBackup
onClick @ BackupManagementSimple.tsx:64
callCallback @ react-dom.development.js:4164
invokeTarget @ ?ts=1753975028902&name=AdGuard%20Extra&name=AdGuard%20Popup%20Blocker&type=user-script:1714
ga @ ?ts=1753975028902&name=AdGuard%20Extra&name=AdGuard%20Popup%20Blocker&type=user-script:1714
(анонимная) @ ?ts=1753975028902&name=AdGuard%20Extra&name=AdGuard%20Popup%20Blocker&type=user-script:1714
(анонимная) @ ?ts=1753975028902&name=AdGuard%20Extra&name=AdGuard%20Popup%20Blocker&type=user-script:1714
dispatchEvent @ ?ts=1753975028902&name=AdGuard%20Extra&name=AdGuard%20Popup%20Blocker&type=user-script:1714
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(анонимная) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430Пояснение к ошибке
useBackups.ts:122 Ошибка загрузки в Storage: {statusCode: '404', error: 'Bucket not found', message: 'Bucket not found'}
createBackup @ useBackups.ts:122
await in createBackup
onClick @ BackupManagementSimple.tsx:64
callCallback @ react-dom.development.js:4164
invokeTarget @ ?ts=1753975028902&name=AdGuard%20Extra&name=AdGuard%20Popup%20Blocker&type=user-script:1714
ga @ ?ts=1753975028902&name=AdGuard%20Extra&name=AdGuard%20Popup%20Blocker&type=user-script:1714
(анонимная) @ ?ts=1753975028902&name=AdGuard%20Extra&name=AdGuard%20Popup%20Blocker&type=user-script:1714
(анонимная) @ ?ts=1753975028902&name=AdGuard%20Extra&name=AdGuard%20Popup%20Blocker&type=user-script:1714
dispatchEvent @ ?ts=1753975028902&name=AdGuard%20Extra&name=AdGuard%20Popup%20Blocker&type=user-script:1714
invokeGuardedCallbackDev @ react-dom.development.js:4213
invokeGuardedCallback @ react-dom.development.js:4277
invokeGuardedCallbackAndCatchFirstError @ react-dom.development.js:4291
executeDispatch @ react-dom.development.js:9041
processDispatchQueueItemsInOrder @ react-dom.development.js:9073
processDispatchQueue @ react-dom.development.js:9086
dispatchEventsForPlugins @ react-dom.development.js:9097
(анонимная) @ react-dom.development.js:9288
batchedUpdates$1 @ react-dom.development.js:26179
batchedUpdates @ react-dom.development.js:3991
dispatchEventForPluginEventSystem @ react-dom.development.js:9287
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ react-dom.development.js:6465
dispatchEvent @ react-dom.development.js:6457
dispatchDiscreteEvent @ react-dom.development.js:6430Пояснение к ошибке
useBackups.ts:154 ❌ Ошибка создания резервной копии: Error: Ошибка сохранения файла: Bucket not found
    at createBackup (useBackups.ts:123:1)
    at async onClick (BackupManagementSimple.tsx:64:1)