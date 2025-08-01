import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useBackups } from '../../hooks/useBackups'

const BackupManagementSimple: React.FC = () => {
  const { user } = useAuth()
  const { 
    backups, 
    loading, 
    error, 
    createBackup, 
    downloadBackup, 
    deleteBackup,
    restoreBackup 
  } = useBackups()
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Проверяем права доступа
  if (user?.role !== 'admin') {
    return (
      <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
        <h3>Доступ запрещен</h3>
        <p>Только администраторы могут управлять резервными копиями.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
      <h2>🗄️ Управление резервными копиями</h2>
      <p>Создание и восстановление резервных копий системы</p>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
        <h3>📦 Создание резервной копии</h3>
        <p>Создает полную резервную копию всех данных системы в формате JSON</p>
        <button 
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
          disabled={creating}
          onClick={async () => {
            const confirmed = window.confirm(
              'Создать резервную копию?\n\n' +
              'Будут экспортированы все данные системы:\n' +
              '• Участки\n' +
              '• Пользователи\n' +
              '• Работники\n' +
              '• Экзамены\n' +
              '• Профессии\n' +
              '• Новости'
            )

            if (!confirmed) return

            setCreating(true)
            try {
              const result = await createBackup()
              
              if (result.success) {
                alert('✅ Резервная копия создана успешно!')
              } else {
                alert(`❌ Ошибка создания резервной копии:\n${result.error}`)
              }
            } catch (err) {
              alert(`❌ Неожиданная ошибка:\n${err instanceof Error ? err.message : 'Неизвестная ошибка'}`)
            } finally {
              setCreating(false)
            }
          }}
        >
          {creating ? '⏳ Создание...' : '📦 Создать резервную копию'}
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
        <h3>📥 Восстановление из файла</h3>
        <p style={{ color: '#dc3545' }}>
          ⚠️ Внимание: восстановление удалит все текущие данные и заменит их данными из резервной копии
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input
            type="file"
            accept=".json,application/json"
            disabled={restoring}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                if (file.type === 'application/json' || file.name.endsWith('.json')) {
                  setSelectedFile(file)
                } else {
                  alert('Пожалуйста, выберите JSON файл резервной копии')
                  event.target.value = ''
                }
              }
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          />
          
          {selectedFile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              padding: '10px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px'
            }}>
              <span style={{ flex: 1, color: 'var(--text-primary)' }}>
                Выбран файл: {selectedFile.name}
              </span>
              <button 
                disabled={restoring}
                onClick={async () => {
                  if (!selectedFile || restoring) return

                  const confirmed = window.confirm(
                    '⚠️ ВНИМАНИЕ! ВОССТАНОВЛЕНИЕ РЕЗЕРВНОЙ КОПИИ\n\n' +
                    'Это действие:\n' +
                    '• УДАЛИТ все текущие данные\n' +
                    '• Заменит их данными из резервной копии\n' +
                    '• НЕЛЬЗЯ отменить\n\n' +
                    'Вы уверены, что хотите продолжить?\n\n' +
                    `Файл: ${selectedFile.name}`
                  )

                  if (!confirmed) return

                  setRestoring(true)
                  try {
                    const result = await restoreBackup(selectedFile)
                    
                    if (result.success) {
                      const tablesText = result.restoredTables?.join(', ') || 'неизвестно'
                      alert(
                        '✅ Восстановление завершено успешно!\n\n' +
                        `Восстановлены таблицы: ${tablesText}\n\n` +
                        'Рекомендуется перезагрузить страницу.'
                      )
                      setSelectedFile(null)
                      // Сбрасываем input
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                      if (fileInput) fileInput.value = ''
                    } else {
                      alert(`❌ Ошибка восстановления:\n${result.error}`)
                    }
                  } catch (err) {
                    alert(`❌ Неожиданная ошибка:\n${err instanceof Error ? err.message : 'Неизвестная ошибка'}`)
                  } finally {
                    setRestoring(false)
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffc107',
                  color: '#212529',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {restoring ? '⏳ Восстановление...' : '📥 Восстановить'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
        <h3>📋 Существующие резервные копии</h3>
        
        {loading ? (
          <p>Загрузка резервных копий...</p>
        ) : error ? (
          <p style={{ color: '#dc3545' }}>Ошибка загрузки: {error}</p>
        ) : backups.length === 0 ? (
          <div>
            <p>Резервные копии не найдены</p>
            <p>Создайте первую резервную копию, используя кнопку выше</p>
          </div>
        ) : (
          <div>
            {backups.map((backup) => (
              <div key={backup.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                marginBottom: '10px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px'
              }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                    📄 {backup.file_path?.split('/').pop() || 'backup.json'}
                  </div>
                  <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                    <span>📅 {new Date(backup.created_at).toLocaleString('ru-RU')}</span>
                    <span style={{ marginLeft: '15px' }}>👤 {backup.creator_name}</span>
                    <span style={{ marginLeft: '15px' }}>📊 {backup.file_size ? `${Math.round(backup.file_size / 1024)} КБ` : 'Неизвестно'}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={async () => {
                      const result = await downloadBackup(backup)
                      if (!result.success) {
                        alert(`❌ Ошибка скачивания:\n${result.error}`)
                      }
                    }}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9em'
                    }}
                  >
                    📥 Скачать
                  </button>
                  <button 
                    onClick={async () => {
                      const confirmed = window.confirm(
                        `Удалить резервную копию?\n\n${backup.file_path?.split('/').pop() || 'backup.json'}\n\nЭто действие нельзя отменить!`
                      )

                      if (!confirmed) return

                      const result = await deleteBackup(backup.id)
                      
                      if (result.success) {
                        alert('✅ Резервная копия удалена')
                      } else {
                        alert(`❌ Ошибка удаления:\n${result.error}`)
                      }
                    }}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9em'
                    }}
                  >
                    🗑️ Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px' }}>
        <h3>ℹ️ Информация</h3>
        <ul>
          <li><strong>Что включается:</strong> участки, пользователи, работники, экзамены, профессии, новости</li>
          <li><strong>Формат:</strong> JSON файл с полной структурой данных</li>
          <li><strong>Хранение:</strong> Supabase Storage (bucket: backups)</li>
          <li><strong>Восстановление:</strong> полная замена текущих данных</li>
          <li><strong>Рекомендация:</strong> создавайте резервные копии перед важными изменениями</li>
        </ul>
      </div>
    </div>
  )
}

export default BackupManagementSimple