import { useState } from 'react'

export interface DragItem {
  id: string
  type: 'profile'
}

export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)

  const handleDragStart = (item: DragItem) => {
    setDraggedItem(item)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverTarget(null)
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTarget(targetId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverTarget(null)
  }

  const handleDrop = async (
    e: React.DragEvent,
    targetGroupId: string | null,
    onDrop: (profileId: string, groupId: string | null) => Promise<void>
  ) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedItem && draggedItem.type === 'profile') {
      await onDrop(draggedItem.id, targetGroupId)
    }

    setDraggedItem(null)
    setDragOverTarget(null)
  }

  return {
    draggedItem,
    dragOverTarget,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  }
}
