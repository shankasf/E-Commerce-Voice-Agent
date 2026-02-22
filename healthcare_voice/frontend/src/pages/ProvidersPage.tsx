import { useEffect, useState } from 'react'
import api from '../services/api'
import { UserGroupIcon, ClockIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'

interface Provider {
  providerId: string
  name: string
  firstName: string
  lastName: string
  title: string
  providerType: string
  specialization: string
  acceptingNewPatients: boolean
  telehealthEnabled: boolean
  defaultAppointmentDuration: number
  department: { name: string } | null
  schedules?: Array<{
    dayOfWeek: number
    dayName: string
    startTime: string
    endTime: string
    isAvailable: boolean
  }>
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await api.get('/providers')
      setProviders(response.data)
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProviderDetails = async (providerId: string) => {
    try {
      const response = await api.get(`/providers/${providerId}`)
      setSelectedProvider(response.data)
    } catch (error) {
      console.error('Failed to fetch provider details:', error)
    }
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
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
        <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
        <p className="text-gray-500">{providers.length} providers at the practice</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider List */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((provider) => (
              <div
                key={provider.providerId}
                className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition ${
                  selectedProvider?.providerId === provider.providerId
                    ? 'ring-2 ring-primary-500'
                    : 'hover:shadow-md'
                }`}
                onClick={() => fetchProviderDetails(provider.providerId)}
              >
                <div className="flex items-start">
                  <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-semibold text-lg">
                      {provider.firstName[0]}
                      {provider.lastName[0]}
                    </span>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {provider.title} {provider.firstName} {provider.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{provider.specialization}</p>
                    {provider.department && (
                      <p className="text-xs text-gray-400 mt-1">{provider.department.name}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center space-x-4 text-sm">
                  {provider.acceptingNewPatients && (
                    <span className="flex items-center text-green-600">
                      <CheckBadgeIcon className="w-4 h-4 mr-1" />
                      Accepting patients
                    </span>
                  )}
                  {provider.telehealthEnabled && (
                    <span className="text-blue-600">Telehealth</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Details */}
        <div className="lg:col-span-1">
          {selectedProvider ? (
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto">
                  <span className="text-primary-700 font-bold text-2xl">
                    {selectedProvider.firstName[0]}
                    {selectedProvider.lastName[0]}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-4">
                  {selectedProvider.title} {selectedProvider.firstName} {selectedProvider.lastName}
                </h2>
                <p className="text-gray-500">{selectedProvider.specialization}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium">{selectedProvider.providerType}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Appointment Duration</span>
                      <span className="font-medium">
                        {selectedProvider.defaultAppointmentDuration} min
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Department</span>
                      <span className="font-medium">{selectedProvider.department?.name || '-'}</span>
                    </div>
                  </div>
                </div>

                {selectedProvider.schedules && selectedProvider.schedules.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Weekly Schedule</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      {selectedProvider.schedules
                        .filter((s) => s.isAvailable)
                        .map((schedule, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-500">{schedule.dayName}</span>
                            <span className="font-medium">
                              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a provider to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
