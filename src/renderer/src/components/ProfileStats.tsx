import type { Profile, Group } from '../../../shared/types'

interface Props {
  profiles: Profile[]
  groups: Group[]
  runningIds: string[]
}

export default function ProfileStats({ profiles, groups, runningIds }: Props) {
  const total = profiles.length
  const open = runningIds.length
  const closed = total - open
  
  const byGroup = groups.map(g => ({
    name: g.name,
    count: profiles.filter(p => p.groupId === g.id).length
  })).filter(g => g.count > 0)
  
  const noGroup = profiles.filter(p => !p.groupId).length

  return (
    <div className="grid grid-cols-4 gap-4 px-6 pb-4">
      <StatCard label="Tổng số" value={total} color="purple" />
      <StatCard label="Đang mở" value={open} color="green" />
      <StatCard label="Đã đóng" value={closed} color="red" />
      <StatCard label="Không nhóm" value={noGroup} color="slate" />
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors = {
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    slate: 'bg-slate-500/10 border-slate-500/20 text-slate-400'
  }

  return (
    <div className={`glass rounded-xl p-4 border ${colors[color as keyof typeof colors]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </div>
  )
}
