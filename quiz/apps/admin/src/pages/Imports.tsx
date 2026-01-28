import { useState, useEffect, useRef } from 'react'
import { getImports, getQuizzes, createImport, processImport, Import, Quiz } from '../lib/api'

export default function Imports() {
  const [imports, setImports] = useState<Import[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState('')
  const [fileType, setFileType] = useState<'csv' | 'pdf'>('csv')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [importsData, quizzesData] = await Promise.all([
        getImports(),
        getQuizzes()
      ])
      setImports(importsData.imports)
      setQuizzes(quizzesData.quizzes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      // Create import and get signed URL
      const importData = await createImport(
        selectedQuiz || null,
        fileType
      )

      // Upload file to signed URL
      const uploadResponse = await fetch(importData.signedUploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      // Process the import
      await processImport(importData.importId)

      setShowUpload(false)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (date: string) => new Date(date).toLocaleString()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Imports</h1>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Upload File
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showUpload && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Upload Questions File</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Target Quiz (optional)</label>
              <select
                value={selectedQuiz}
                onChange={(e) => setSelectedQuiz(e.target.value)}
                className="w-full border rounded-md p-2"
              >
                <option value="">Create new quiz</option>
                {quizzes.map(q => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File Type</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as 'csv' | 'pdf')}
                className="border rounded-md p-2"
              >
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept={fileType === 'csv' ? '.csv' : '.pdf'}
                className="border rounded-md p-2 w-full"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Processing...' : 'Upload & Process'}
              </button>
              <button
                onClick={() => setShowUpload(false)}
                className="border px-4 py-2 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quiz</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {imports.map((imp) => (
                <tr key={imp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {imp.file_type.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {imp.quizzes?.title || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      imp.status === 'done'
                        ? 'bg-green-100 text-green-800'
                        : imp.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : imp.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {imp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {imp.result_summary
                      ? JSON.stringify(imp.result_summary)
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatDate(imp.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
