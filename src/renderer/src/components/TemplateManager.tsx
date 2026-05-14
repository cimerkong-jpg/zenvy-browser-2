import { useState, useEffect } from 'react'
import { toast } from '../store/useToast'
import { dialog } from '../store/useDialog'

interface Template {
  name: string
  description: string
  icon: string
  fingerprint: any
  proxy: any
}

interface Props {
  onClose: () => void
}

export default function TemplateManager({ onClose }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    const all = await window.api.templates.getAll()
    setTemplates(all)
    setLoading(false)
  }

  const handleDelete = async (name: string) => {
    const confirmed = await dialog.confirmDelete(
      'Xóa template',
      `Xóa template "${name}"?`
    )

    if (!confirmed) return

    try {
      await window.api.templates.delete(name)
      await loadTemplates()
      toast.success('Đã xóa template')
    } catch (error) {
      console.error('Failed to delete template:', error)
      toast.error('Lỗi khi xóa template')
    }
  }

  const handleExport = async (template: Template) => {
    try {
      const success = await window.api.templates.export(template)
      if (success) {
        toast.success('Template đã được export!')
      }
    } catch (error) {
      console.error('Failed to export template:', error)
      toast.error('Lỗi khi export template')
    }
  }

  const handleImport = async () => {
    try {
      const template = await window.api.templates.import()
      if (template) {
        await loadTemplates()
        toast.success(`Template "${template.name}" đã được import!`)
      }
    } catch (error) {
      console.error('Failed to import template:', error)
      toast.error('Lỗi khi import template')
    }
  }

  // Separate built-in and custom templates
  const builtInTemplates = templates.filter(t =>
    ['Facebook', 'Google', 'Amazon', 'TikTok', 'Instagram'].includes(t.name)
  )
  const customTemplates = templates.filter(t =>
    !['Facebook', 'Google', 'Amazon', 'TikTok', 'Instagram'].includes(t.name)
  )

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-xl font-bold">Template Manager</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12 text-white/60">Loading...</div>
          ) : (
            <>
              {/* Built-in Templates */}
              <div>
                <h3 className="text-sm font-semibold text-white/80 mb-3">Built-in Templates</h3>
                <div className="grid grid-cols-5 gap-3">
                  {builtInTemplates.map((t) => (
                    <div
                      key={t.name}
                      className="glass p-4 rounded-lg text-center border border-white/10"
                    >
                      <div className="text-3xl mb-2">{t.icon}</div>
                      <div className="text-sm font-medium text-white/90">{t.name}</div>
                      <div className="text-xs text-white/50 mt-1 line-clamp-2">{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Templates */}
              <div>
                <h3 className="text-sm font-semibold text-white/80 mb-3">
                  Custom Templates ({customTemplates.length})
                </h3>
                {customTemplates.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    Chưa có custom template. Tạo template từ ProfileModal!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customTemplates.map((t) => (
                      <div
                        key={t.name}
                        className="glass p-4 rounded-lg flex items-center justify-between hover:bg-white/5"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{t.icon}</div>
                          <div>
                            <div className="font-medium text-white">{t.name}</div>
                            <div className="text-sm text-white/60">{t.description}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleExport(t)}
                            className="px-3 py-1 text-sm bg-blue-500/20 hover:bg-blue-500/30 rounded text-blue-400"
                          >
                            Export
                          </button>
                          <button
                            onClick={() => handleDelete(t.name)}
                            className="px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/30 rounded text-red-400"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex justify-between">
          <button
            onClick={handleImport}
            className="px-6 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300"
          >
            📥 Import Template
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
