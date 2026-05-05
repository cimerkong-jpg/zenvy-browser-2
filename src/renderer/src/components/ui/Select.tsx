import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = ''
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value)

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-[#111218] px-3 py-2 text-sm text-[#E5E7EB] outline-none transition-colors
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-[#374151]'}
          ${isOpen ? 'border-[#7C3AED]' : 'border-[#1F2230]'}
          ${className}
        `}
      >
        <span className={`flex-1 min-w-0 truncate text-left ${selectedOption ? 'text-[#E5E7EB]' : 'text-[#6B7280]'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-[#9CA3AF] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] rounded-xl border border-[#1F2230] bg-[#111218] py-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <div className="max-h-[300px] overflow-y-auto">
            {options.map((option) => {
              const isSelected = option.value === value
              const isDisabled = option.disabled

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !isDisabled && handleSelect(option.value)}
                  disabled={isDisabled}
                  className={`
                    flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors
                    ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    ${isSelected ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : 'text-[#E5E7EB] hover:bg-[#171923]'}
                  `}
                >
                  <span>{option.label}</span>
                  {isSelected && (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
