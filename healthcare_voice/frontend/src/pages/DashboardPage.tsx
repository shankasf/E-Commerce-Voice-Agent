import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import {
  CalendarIcon,
  UsersIcon,
  UserGroupIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

interface OverviewData {
  todaysAppointments: number
  totalPatients: number
  activeProviders: number
  recentCalls: number
  appointmentsByStatus: Record<string, number>
}

interface Appointment {
  appointmentId: string
  scheduledTime: string
  status: string
  patient: { firstName: string; lastName: string }
  provider: { firstName: string; lastName: string; title: string }
  service?: { name: string }
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [todaysSchedule, setTodaysSchedule] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, scheduleRes] = await Promise.all([
          api.get('/dashboard/overview'),
          api.get('/dashboard/today'),
        ])
        setOverview(overviewRes.data)
        setTodaysSchedule(scheduleRes.data)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'checked_in':
        return 'bg-purple-100 text-purple-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome to Sunrise Family Healthcare</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.todaysAppointments || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.totalPatients || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active Providers</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.activeProviders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <PhoneIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Recent Calls (24h)</p>
              <p className="text-2xl font-bold text-gray-900">{overview?.recentCalls || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/voice"
          className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white hover:from-primary-600 hover:to-primary-700 transition shadow-lg"
        >
          <div className="flex items-center">
            <div className="p-3 bg-white/20 rounded-lg">
              <PhoneIcon className="w-8 h-8" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">Voice Agent</h3>
              <p className="text-primary-100">Start a voice conversation</p>
            </div>
          </div>
        </Link>

        <Link
          to="/appointments"
          className="bg-white rounded-xl p-6 hover:shadow-md transition shadow-sm border border-gray-100"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
              <p className="text-gray-500">Manage appointments</p>
            </div>
          </div>
        </Link>

        <Link
          to="/patients"
          className="bg-white rounded-xl p-6 hover:shadow-md transition shadow-sm border border-gray-100"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <UsersIcon className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">Patients</h3>
              <p className="text-gray-500">View patient records</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {todaysSchedule.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No appointments scheduled for today
            </div>
          ) : (
            todaysSchedule.map((appointment) => (
              <div key={appointment.appointmentId} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-16 text-center">
                      <ClockIcon className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm font-medium text-gray-900">
                        {formatTime(appointment.scheduledTime)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">
                        {appointment.patient.firstName} {appointment.patient.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {appointment.provider.title} {appointment.provider.firstName}{' '}
                        {appointment.provider.lastName}
                        {appointment.service && ` - ${appointment.service.name}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      appointment.status
                    )}`}
                  >
                    {appointment.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
