import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const { signInWithOtp, signInWithPassword, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (usePassword) {
        if (isSignUp) {
          await signUp(email, password, name)
          navigate('/')
        } else {
          await signInWithPassword(email, password)
          navigate('/')
        }
      } else {
        await signInWithOtp(email, name)
        sessionStorage.setItem('otp_email', email)
        navigate('/verify')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Quiz
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {usePassword ? (isSignUp ? 'Create your account' : 'Sign in to your account') : 'Enter your details to get started'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-3">
            {(!usePassword || isSignUp) && (
              <div>
                <label htmlFor="name" className="sr-only">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {usePassword && (
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Please wait...' : (usePassword ? (isSignUp ? 'Sign Up' : 'Sign In') : 'Send OTP')}
            </button>
          </div>

          <div className="flex flex-col items-center space-y-2">
            <button
              type="button"
              onClick={() => {
                setUsePassword(!usePassword)
                setIsSignUp(false)
              }}
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              {usePassword ? 'Use OTP instead' : 'Use password instead'}
            </button>
            {usePassword && (
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            )}
            <a
              href="/admin/"
              className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
            >
              Login as Admin
            </a>
            <p className="text-xs text-gray-400 mt-4">
              For best experience on iPhone, use Safari and add to Home Screen
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
