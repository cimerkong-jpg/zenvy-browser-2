import type { ScriptExecution } from '../../../shared/types'

interface Props {
  execution: ScriptExecution | null
}

const levelColor: Record<string, string> = {
  info: 'text-slate-300',
  warn: 'text-yellow-400',
  error: 'text-red-400'
}

const statusBadge: Record<string, string> = {
  running: 'bg-blue-500/20 text-blue-400',
  success: 'bg-emerald-500/20 text-emerald-400',
  error: 'bg-red-500/20 text-red-400',
  idle: 'bg-slate-500/20 text-slate-400'
}

const statusLabel: Record<string, string> = {
  running: 'Đang chạy...',
  success: 'Thành công',
  error: 'Lỗi',
  idle: 'Chờ'
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function duration(exec: ScriptExecution): string {
  if (!exec.finishedAt) return ''
  const ms = exec.finishedAt - exec.startedAt
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

export default function ExecutionLogs({ execution }: Props) {
  if (!execution) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-purple-500/10 bg-white/[0.02] text-sm text-slate-500">
        Chưa có lần chạy nào. Chọn script và profile rồi nhấn Chạy.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-purple-500/15 bg-[#0D0B1A] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-purple-500/10 px-4 py-2.5">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${statusBadge[execution.status]}`}>
          {statusLabel[execution.status]}
        </span>
        <span className="text-xs text-slate-500">
          {execution.scriptName} → {execution.profileName}
        </span>
        {execution.finishedAt && (
          <span className="ml-auto text-xs text-slate-600">{duration(execution)}</span>
        )}
      </div>

      {/* Logs */}
      <div className="max-h-56 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {execution.logs.length === 0 && execution.status === 'running' && (
          <p className="text-slate-600 italic">Đang chạy...</p>
        )}
        {execution.logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-slate-600 shrink-0">{formatTime(log.timestamp)}</span>
            <span className={levelColor[log.level] ?? 'text-slate-300'}>{log.message}</span>
          </div>
        ))}
        {execution.error && (
          <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-red-400">
            {execution.error}
          </div>
        )}
        {execution.status === 'running' && (
          <div className="flex items-center gap-1.5 text-blue-400 animate-pulse">
            <span>●</span>
            <span>Đang thực thi...</span>
          </div>
        )}
      </div>
    </div>
  )
}
