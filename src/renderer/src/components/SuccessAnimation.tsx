import { useEffect, useState } from 'react'

interface SuccessAnimationProps {
  message: string
  onClose?: () => void
  duration?: number
}

export default function SuccessAnimation({ message, onClose, duration = 2000 }: SuccessAnimationProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Fade in
    setTimeout(() => setVisible(true), 10)

    // Auto close
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose?.(), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className={`flex flex-col items-center gap-4 rounded-2xl border border-purple-500/20 bg-[#0D0B1A] p-8 shadow-2xl transition-all duration-300 ${
          visible ? 'scale-100' : 'scale-90'
        }`}
      >
        {/* Animated checkmark */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/30" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-900/50">
            <svg
              className="h-8 w-8 text-white animate-[bounce_0.6s_ease-in-out]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <p className="text-lg font-semibold text-white">{message}</p>
      </div>
    </div>
  )
}
