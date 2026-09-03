import React from 'react'

export function LineChart({ data, height = 220, color = '#1b92f5', format = (v: number) => String(v) }: {
  data: { label: string; value: number }[]; height?: number; color?: string; format?: (v: number) => string
}) {
  const w = 720
  const h = height
  const padL = 52, padR = 16, padT = 16, padB = 28
  const max = Math.max(...data.map(d => d.value), 1)
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const pts = data.map((d, i) => ({
    x: padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: padT + innerH - (d.value / max) * innerH,
    ...d,
  }))
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${path} L${pts[pts.length - 1]?.x ?? padL},${padT + innerH} L${padL},${padT + innerH} Z`
  const ticks = 4
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[480px]">
        <defs>
          <linearGradient id="linefill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.30" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const y = padT + innerH - (i / ticks) * innerH
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="10">{format((max * i) / ticks)}</text>
            </g>
          )
        })}
        <path d={area} fill="url(#linefill)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color} className="stroke-white dark:stroke-slate-900" strokeWidth="2">
              <title>{`${p.label}: ${format(p.value)}`}</title>
            </circle>
            {(data.length <= 12 || i % Math.ceil(data.length / 10) === 0) && (
              <text x={p.x} y={h - 8} textAnchor="middle" className="fill-slate-400" fontSize="10">{p.label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

const donutColors = ['#1b92f5', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#64748b']

export function Donut({ data, size = 180 }: { data: { label: string; value: number }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = 60, cx = 75, cy = 75, sw = 26
  let acc = 0
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox="0 0 150 150">
        <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth={sw} />
        {data.map((d, i) => {
          const frac = d.value / total
          const dash = frac * 2 * Math.PI * r
          const gap = 2 * Math.PI * r - dash
          const rot = (acc / total) * 360 - 90
          acc += d.value
          if (d.value === 0) return null
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={donutColors[i % donutColors.length]} strokeWidth={sw}
              strokeDasharray={`${dash} ${gap}`} transform={`rotate(${rot} ${cx} ${cy})`}>
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          )
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-900 dark:fill-white" fontSize="18" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-400" fontSize="9">TOTAL</text>
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: donutColors[i % donutColors.length] }} />
            <span className="text-slate-600 dark:text-slate-300">{d.label}</span>
            <span className="font-semibold text-slate-900 dark:text-white">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BarChart({ data, color = '#10b981', format = (v: number) => String(v) }: {
  data: { label: string; value: number }[]; color?: string; format?: (v: number) => string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-2 h-44">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{format(d.value)}</span>
          <div className="w-full max-w-10 rounded-t-md transition-all" style={{ height: `${(d.value / max) * 120}px`, background: color }} title={`${d.label}: ${format(d.value)}`} />
          <span className="text-[10px] text-slate-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
