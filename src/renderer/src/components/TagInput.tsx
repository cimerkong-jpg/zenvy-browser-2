import { useState, useEffect } from 'react'
import type { Tag } from '../../../shared/types'

interface Props {
  selectedTags: string[]
  onChange: (tags: string[]) => void
}

export default function TagInput({ selectedTags, onChange }: Props) {
  const [tags, setTags] = useState<Tag[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#8b5cf6')

  useEffect(() => {
    window.api.tags.getAll().then(setTags)
  }, [])

  const handleToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(t => t !== tagId))
    } else {
      onChange([...selectedTags, tagId])
    }
  }

  const handleCreate = async () => {
    if (!newTagName.trim()) return
    const tag = await window.api.tags.create(newTagName.trim(), newTagColor)
    setTags([...tags, tag])
    onChange([...selectedTags, tag.id])
    setNewTagName('')
    setShowCreate(false)
  }

  const colors = ['#8b5cf6', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ec4899']

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <button
            key={tag.id}
            onClick={() => handleToggle(tag.id)}
            className={`px-2 py-1 rounded text-xs transition-all ${
              selectedTags.includes(tag.id)
                ? 'opacity-100 ring-2 ring-white/20'
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{ backgroundColor: tag.color + '30', color: tag.color }}
          >
            {tag.name}
          </button>
        ))}
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-2 py-1 rounded text-xs bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
        >
          + Tag
        </button>
      </div>

      {showCreate && (
        <div className="mt-2 p-3 rounded-lg bg-white/5 border border-white/10">
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tên tag..."
            className="input-field mb-2"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-2 mb-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setNewTagColor(c)}
                className={`w-6 h-6 rounded ${newTagColor === c ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary px-3 py-1 text-xs rounded">
              Tạo
            </button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-1 text-xs rounded bg-white/5 hover:bg-white/10">
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
