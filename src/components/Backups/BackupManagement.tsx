import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useBackups } from '../../hooks/useBackups'
import './BackupManagement.css'

const BackupManagement: React.FC = () => {
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
      <div className="access-denied">
        <h3>Доступ запрещен</h3>
        <p>Только администраторы могут управлять резервными копиями.</p>
      </div>
    )
  }

  const handleCreateBackup = async () => {
    if (creating) return

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
  }

  const handleDownloadBackup = async (backup: any) => {
    const result = await downloadBackup(backup)
    
    if (!result.success) {
      alert(`❌ Ошибка скачивания:\n${result.error}`)
    }
  }

  const handleDeleteBackup = async (backupId: string, fileName: string) => {
    const confirmed = window.confirm(
      `Удалить резервную копию?\n\n${fileName}\n\nЭто действие нельзя отменить!`
    )

    if (!confirmed) return

    const result = await deleteBackup(backupId)
    
    if (result.success) {
      alert('✅ Резервная копия удалена')
    } else {
      alert(`❌ Ошибка удаления:\n${result.error}`)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setSelectedFile(file)
      } else {
        alert('Пожалуйста, выберите JSON файл резервной копии')
        event.target.value = ''
      }
    }
  }

  const handleRestoreBackup = async () => {
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
        const fileInput = document.getElementById('backup-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        alert(`❌ Ошибка восстановления:\n${result.error}`)
      }
    } catch (err) {
      alert(`❌ Неожиданная ошибка:\n${err instanceof Error ? err.message : 'Неизвестная ошибка'}`)
    } finally {
      setRestoring(false)
    }
  }

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Неизвестно'
    
    if (bytes < 1024) return `${bytes} Б`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (error) {
    return (
      <div className="backup-management">
        <div className="error-container">
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="backup-management">
      <div className="backup-header">
        <h2>🗄️ Управление резервными копиями</h2>
        <p>Создание и восстановление резервных копий системы</p>
      </div>

      {/* Создание резервной копии */}
      <div className="backup-section">
        <h3>📦 Создание резервной копии</h3>
        <p>Создает полную резервную копию всех данных системы в формате JSON</p>
        
        <button 
          onClick={handleCreateBackup}
          disabled={creating}
          className="create-backup-btn"
        >
          {creating ? '⏳ Создание...' : '📦 Создать резервную копию'}
        </button>
      </div>

      {/* Восстановление из файла */}
      <div className="backup-section">
        <h3>📥 Восстановление из файла</h3>
        <p className="warning">
          ⚠️ Внимание: восстановление удалит все текущие данные и заменит их данными из резервной копии
        </p>
        
        <div className="restore-controls">
          <input
            id="backup-file-input"
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            disabled={restoring}
          />
          
          {selectedFile && (
            <div className="selected-file">
              <span>Выбран файл: {selectedFile.name}</span>
              <button 
                onClick={handleRestoreBackup}
                disabled={restoring}
                className="restore-btn"
              >
                {restoring ? '⏳ Восстановление...' : '📥 Восстановить'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Список существующих резервных копий */}
      <div className="backup-section">
        <h3>📋 Существующие резервные копии</h3>
        
        {loading ? (
          <div className="loading">Загрузка резервных копий...</div>
        ) : backups.length === 0 ? (
          <div className="no-backups">
            <p>Резервные копии не найдены</p>
            <p>Создайте первую резервную копию, используя кнопку выше</p>
          </div>
        ) : (
          <div className="backups-list">
            {backups.map((backup) => (
              <div key={backup.id} className="backup-item">
                <div className="backup-info">
                  <div className="backup-name">
                    📄 {backup.file_path?.split('/').pop() || 'backup.json'}
                  </div>
                  <div className="backup-details">
                    <span>📅 {formatDate(backup.created_at)}</span>
                    <span>👤 {backup.creator_name}</span>
                    <span>📊 {formatFileSize(backup.file_size)}</span>
                  </div>
                </div>
                
                <div className="backup-actions">
                  <button 
                    onClick={() => handleDownloadBackup(backup)}
                    className="download-btn"
                    title="Скачать резервную копию"
                  >
                    📥 Скачать
                  </button>
                  <button 
                    onClick={() => handleDeleteBackup(backup.id, backup.file_path?.split('/').pop() || 'backup.json')}
                    className="delete-btn"
                    title="Удалить резервную копию"
                  >
                    🗑️ Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Информация о резервном копировании */}
      <div className="backup-section info-section">
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

export default BackupManagement