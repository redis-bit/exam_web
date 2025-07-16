import React, { useState, useEffect } from 'react'
import { UserWithSection, useUsers } from '../../hooks/useUsers'
import { useSections } from '../../hooks/useSections'

interface UserFormProps {
  user: UserWithSection | null // null для создания, объект для редактирования
  onSuccess: () => void
  onCancel: () => void
}

const UserForm: React.FC<UserFormProps> = ({
  user,
  onSuccess,
  onCancel
}) => {
  const { createUser, updateUser } = useUsers()
  const { sections } = useSections()
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'section_chief' as 'admin' | 'admin_assistant' | 'section_chief',
    section_id: '',
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!user

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        email: user.email,
        password: '', // Пароль не показываем при редактировании
        role: user.role,
        section_id: user.section_id || '',
        is_active: user.is_active
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name.trim()) {
      setError('ФИО обязательно для заполнения')
      return
    }

    if (!formData.email.trim()) {
      setError('Email обязателен для заполнения')
      return
    }

    if (!isEditing && !formData.password.trim()) {
      setError('Пароль обязателен при создании пользователя')
      return
    }

    if (formData.role === 'section_chief' && !formData.section_id) {
      setError('Для начальника участка необходимо выбрать участок')
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (isEditing) {
        // Обновление существующего пользователя
        await updateUser(user.id, {
          full_name: formData.full_name.trim(),
          role: formData.role,
          section_id: formData.role === 'section_chief' ? formData.section_id : null,
          is_active: formData.is_active
        })

        alert('Пользователь успешно обновлен')
      } else {
        // Создание нового пользователя
        await createUser({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          section_id: formData.role === 'section_chief' ? formData.section_id : undefined
        })

        alert('Пользователь успешно создан')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Ошибка при сохранении пользователя:', error)
      
      // Обработка специфичных ошибок
      if (error.message?.includes('email')) {
        setError('Пользователь с таким email уже существует')
      } else if (error.message?.includes('password')) {
        setError('Пароль должен содержать минимум 6 символов')
      } else {
        setError(error.message || 'Произошла ошибка при сохранении')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Очищаем ошибку при изменении данных
    if (error) {
      setError(null)
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Полный доступ ко всем функциям системы'
      case 'admin_assistant':
        return 'Просмотр всех данных, подтверждение изменений'
      case 'section_chief':
        return 'Доступ только к своему участку'
      default:
        return ''
    }
  }

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h2>{isEditing ? 'Редактирование пользователя' : 'Создание нового пользователя'}</h2>
        <button 
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Назад к списку
        </button>
      </div>

      {!isEditing && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          border: '1px solid #bee5eb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Важно:</strong> При создании пользователя будет отправлено письмо с подтверждением на указанный email. 
          Пользователь сможет войти в систему только после подтверждения email.
        </div>
      )}

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="full_name"
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#495057'
            }}
          >
            ФИО *
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleInputChange}
            placeholder="Введите полное имя пользователя"
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="email"
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#495057'
            }}
          >
            Email *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="user@example.com"
            required
            disabled={isEditing} // Email нельзя изменять при редактировании
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box',
              backgroundColor: isEditing ? '#f8f9fa' : 'white'
            }}
          />
          {isEditing && (
            <small style={{ color: '#6c757d', fontSize: '14px' }}>
              Email нельзя изменить после создания пользователя
            </small>
          )}
        </div>

        {!isEditing && (
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="password"
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#495057'
              }}
            >
              Пароль *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Минимум 6 символов"
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
            <small style={{ color: '#6c757d', fontSize: '14px' }}>
              Пароль должен содержать минимум 6 символов
            </small>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="role"
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '500',
              color: '#495057'
            }}
          >
            Роль *
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            required
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          >
            <option value="section_chief">Начальник участка</option>
            <option value="admin_assistant">Помощник администратора</option>
            <option value="admin">Администратор</option>
          </select>
          <small style={{ color: '#6c757d', fontSize: '14px' }}>
            {getRoleDescription(formData.role)}
          </small>
        </div>

        {formData.role === 'section_chief' && (
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="section_id"
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#495057'
              }}
            >
              Участок *
            </label>
            <select
              id="section_id"
              name="section_id"
              value={formData.section_id}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Выберите участок</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
            <small style={{ color: '#6c757d', fontSize: '14px' }}>
              Начальник участка имеет доступ только к своему участку
            </small>
          </div>
        )}

        {isEditing && (
          <div style={{ marginBottom: '30px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center',
              cursor: 'pointer',
              fontWeight: '500',
              color: '#495057'
            }}>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                style={{ marginRight: '8px' }}
              />
              Пользователь активен
            </label>
            <small style={{ color: '#6c757d', fontSize: '14px', marginLeft: '24px' }}>
              Неактивные пользователи не могут войти в систему
            </small>
          </div>
        )}

        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '16px'
            }}
          >
            {loading ? 'Сохранение...' : (isEditing ? 'Обновить пользователя' : 'Создать пользователя')}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#6c757d',
              border: '1px solid #6c757d',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '16px'
            }}
          >
            Отмена
          </button>
        </div>
      </form>

      {isEditing && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ marginBottom: '10px' }}>Информация о пользователе</h4>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Дата создания:</strong> {new Date(user.created_at).toLocaleString('ru-RU')}</p>
          {user.last_visit_at && (
            <p><strong>Последний визит:</strong> {new Date(user.last_visit_at).toLocaleString('ru-RU')}</p>
          )}
          <p><strong>Рейтинг активности:</strong> {user.activity_rating}</p>
        </div>
      )}
    </div>
  )
}

export default UserForm