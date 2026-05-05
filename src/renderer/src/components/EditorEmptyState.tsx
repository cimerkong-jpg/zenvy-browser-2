interface EditorEmptyStateProps {
  onSelectTemplate: () => void
}

export default function EditorEmptyState({ onSelectTemplate }: EditorEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-3xl mb-4">
        ⌨️
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">
        Bắt đầu viết script
      </h3>

      <p className="text-sm text-slate-600 mb-6 max-w-md">
        Chọn mẫu bên trái hoặc click vào Action Library để chèn code
      </p>

      <div className="flex flex-col gap-3 text-left bg-white/5 rounded-lg p-4 mb-6 max-w-md">
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">1</span>
          <div>
            <p className="text-sm text-white">Chọn mẫu hoặc tạo mới</p>
            <p className="text-xs text-slate-600">Có 25+ mẫu sẵn cho Facebook, Gmail, Shopee...</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
          <div>
            <p className="text-sm text-white">Click action để chèn code</p>
            <p className="text-xs text-slate-600">Dùng goto, click, type, sleep...</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">3</span>
          <div>
            <p className="text-sm text-white">Chọn profile và chạy</p>
            <p className="text-xs text-slate-600">Xem kết quả real-time trong panel bên phải</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onSelectTemplate}
          className="btn-primary px-5 py-2 text-sm rounded-lg"
        >
          📚 Chọn mẫu
        </button>
        <a
          href="https://docs.zenvy.app/automation"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2 text-sm border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-white"
        >
          📖 Xem hướng dẫn
        </a>
      </div>
    </div>
  )
}
