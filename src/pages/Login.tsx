import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/utils/supabase/client'

const Login: React.FC = () => {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setError('')
    setSuccess('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Đăng nhập thành công!')

    setTimeout(() => {
      navigate('/')
    }, 500)
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: 24 }}>
      <h1>Đăng nhập Ngâu Hub</h1>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 12, marginBottom: 12 }}
        />

        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 12, marginBottom: 12 }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 12 }}
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      {error && (
        <p style={{ color: 'red' }}>
          ❌ {error}
        </p>
      )}

      {success && (
        <p style={{ color: 'green' }}>
          ✅ {success}
        </p>
      )}

      <p>
        Chưa có tài khoản?{' '}
        <Link to="/register">Đăng ký</Link>
      </p>
    </div>
  )
}

export default Login