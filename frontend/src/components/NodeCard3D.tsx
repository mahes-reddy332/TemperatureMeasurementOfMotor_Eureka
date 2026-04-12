import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'

interface NodeCard3DProps {
  icon: LucideIcon
  label: string
  value?: string
  isAi?: boolean
  isTarget?: boolean
  aiLabel?: number
  color?: 'blue' | 'purple' | 'green' | 'red' | 'orange'
  description?: string
  onHover?: (isHovered: boolean) => void
}

const colorSchemes = {
  blue: {
    border: '#58a6ff',
    text: '#58a6ff'
  },
  purple: {
    border: '#8B5CF6',
    text: '#8B5CF6'
  },
  green: {
    border: '#3fb950',
    text: '#3fb950'
  },
  red: {
    border: '#f85149',
    text: '#f85149'
  },
  orange: {
    border: '#f0883e',
    text: '#f0883e'
  }
}

export default function NodeCard3D({
  icon: Icon,
  label,
  value,
  isAi = false,
  isTarget = false,
  aiLabel,
  color = 'blue',
  description,
  onHover
}: NodeCard3DProps) {
  void isAi
  void isTarget
  const [hovered, setHovered] = useState(false)
  const scheme = colorSchemes[color]

  const handleHover = (state: boolean) => {
    setHovered(state)
    onHover?.(state)
  }

  return (
    <div
      onMouseEnter={() => handleHover(true)}
      onMouseLeave={() => handleHover(false)}
      className="relative w-[160px] h-[90px] perspective"
    >
      {/* 3D shadow effect */}
      <div
        className="absolute inset-0 rounded-xl blur-lg"
        style={{
          background: `${scheme.border}40`,
          top: '8px',
          opacity: hovered ? 0.6 : 0.3,
          transition: 'all 0.3s ease'
        }}
      />

      {/* Main card */}
      <div
        className={`relative z-10 w-full h-full flex flex-col items-center justify-center p-2 rounded-xl border-2 bg-[#0d1117] transition-all duration-300 cursor-pointer`}
        style={{
          borderColor: scheme.border,
          boxShadow: hovered ? `0 0 20px ${scheme.border}80, inset 0 0 20px ${scheme.border}20` : `0 0 10px ${scheme.border}40`,
          transform: hovered ? 'translateY(-4px) scale(1.05)' : 'translateY(0) scale(1)'
        }}
      >
        {/* Icon and label */}
        <div className="flex items-center gap-2 mb-1">
          <Icon size={16} color={scheme.text} />
          <span className="text-[9px] font-bold text-[#e6edf3] uppercase tracking-wide leading-tight text-center">
            {label}
          </span>
        </div>

        {/* Value display */}
        {value !== undefined && (
          <span
            className="text-[11px] font-mono font-bold text-white tracking-widest mt-1 px-2 py-0.5 rounded"
            style={{
              background: `${scheme.border}20`,
              border: `1px solid ${scheme.border}40`,
              textShadow: `0 0 4px ${scheme.border}80`
            }}
          >
            {value}
          </span>
        )}

        {/* AI Delta label */}
        {aiLabel !== undefined && (
          <span
            className="text-[10px] text-[#f0883e] font-bold mt-1 px-2 py-0.5 rounded"
            style={{
              background: 'rgba(240, 136, 62, 0.1)',
              border: '1px solid rgba(240, 136, 62, 0.5)'
            }}
          >
            ΔT = {aiLabel > 0 ? '+' : ''}{aiLabel}°C
          </span>
        )}
      </div>

      {/* Tooltip */}
      {hovered && description && (
        <div
          className="absolute w-48 bg-[#161b22] border border-[#30363d] rounded-lg p-3 z-50 left-1/2 transform -translate-x-1/2"
          style={{
            top: '-120px',
            boxShadow: `0 8px 32px ${scheme.border}60`,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <p className="text-xs text-[#ccc] leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  )
}
