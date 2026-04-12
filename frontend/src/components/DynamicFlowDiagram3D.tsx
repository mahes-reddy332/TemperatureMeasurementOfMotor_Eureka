type FlowData = {
  V?: number
  I?: number
  omega?: number
  T_base?: number
  T_final?: number
  ai_correction?: number
  noise_level?: number
  mode?: string
}

type NodeItem = {
  id: string
  label: string
  image: string
  x: number
  y: number
  emphasized?: boolean
}

export default function DynamicFlowDiagram3D({ data }: { data: FlowData | null | undefined }) {
  if (!data) {
    return (
      <div className="w-full min-h-[420px] bg-[#0f172a] rounded-xl border border-[#334155] flex items-center justify-center">
        <div className="text-center text-[#cbd5e1]">
          <div className="text-base font-semibold mb-2">Connecting to telemetry...</div>
          <div className="text-sm">Waiting for backend stream</div>
        </div>
      </div>
    )
  }

  const temperature = Math.round(data.T_final ?? 0)

  const nodes: NodeItem[] = [
    { id: 'motor', label: 'Motor', image: '/system/motor.svg', x: 20, y: 210 },
    { id: 'signals', label: 'Signals (V, I, ω)', image: '/system/signals.svg', x: 145, y: 210 },
    { id: 'conditioning', label: 'Signal Conditioning', image: '/system/conditioning.svg', x: 270, y: 210 },
    { id: 'feature', label: 'Feature Extraction', image: '/system/feature.svg', x: 395, y: 210 },
    { id: 'lptn', label: 'LPTN Thermal Model', image: '/system/physics.svg', x: 535, y: 120 },
    { id: 'ekf', label: 'EKF / Flux Observer', image: '/system/observer.svg', x: 535, y: 300 },
    { id: 'fusion', label: 'Fusion (Weighted / EKF)', image: '/system/fusion.svg', x: 690, y: 210, emphasized: true },
    { id: 'ai', label: 'AI Residual Model', image: '/system/ai-chip.svg', x: 840, y: 300 },
    { id: 'output', label: 'Temperature Output', image: '/system/output-temp.svg', x: 840, y: 40 },
  ]

  const edgeSpecs = [
    { id: 'e1', d: 'M 120 246 L 145 246', label: '' , delay: '0s'},
    { id: 'e2', d: 'M 245 246 L 270 246', label: 'V, I, ω', delay: '0.25s' },
    { id: 'e3', d: 'M 370 246 L 395 246', label: '', delay: '0.45s' },
    { id: 'e4', d: 'M 495 246 C 515 246, 515 156, 535 156', label: 'P_loss', delay: '0.7s' },
    { id: 'e5', d: 'M 495 246 C 515 246, 515 336, 535 336', label: 'V, I, ω', delay: '0.95s' },
    { id: 'e6', d: 'M 635 156 C 665 156, 665 246, 690 246', label: 'T_lptn', delay: '1.2s' },
    { id: 'e7', d: 'M 635 336 C 665 336, 665 246, 690 246', label: 'T_ekf', delay: '1.45s' },
    { id: 'e8', d: 'M 790 246 C 815 246, 815 336, 840 336', label: 'Fused T', delay: '1.7s' },
    { id: 'e9', d: 'M 940 336 C 970 336, 970 76, 940 76', label: 'Correction', delay: '1.95s' },
  ]

  return (
    <div className="w-full min-h-[500px] rounded-xl border border-[#334155] p-4 overflow-hidden bg-[radial-gradient(circle_at_top,_#1e293b_0%,_#0f172a_45%,_#020617_100%)]">
      <div className="relative w-[1020px] h-[450px] mx-auto">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute top-2 left-2 border border-[#475569] px-3 py-2 rounded bg-[#111827] z-20 flex items-center gap-2 text-[#e2e8f0]">
          <svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">
            <rect x="5" y="2" width="4" height="11" rx="2" fill="#e2e8f0" />
            <circle cx="7" cy="15" r="4" fill="#ef4444" />
            <rect x="6" y="7" width="2" height="8" fill="#ef4444" />
          </svg>
          <div className="text-sm">
            Temp Monitor: {temperature}°C
          </div>
        </div>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1020 450" aria-hidden="true">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <polygon points="0 0, 8 4, 0 8" fill="#94a3b8" />
            </marker>
          </defs>

          {edgeSpecs.map((edge) => {
            return (
              <g key={edge.id}>
                <path d={edge.d} stroke="#94a3b8" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
                {edge.label && (
                  <text
                    x={edge.id === 'e4' ? 625 : edge.id === 'e5' ? 625 : edge.id === 'e6' ? 815 : edge.id === 'e7' ? 815 : edge.id === 'e8' ? 995 : edge.id === 'e9' ? 1170 : 370}
                    x={edge.id === 'e4' ? 520 : edge.id === 'e5' ? 520 : edge.id === 'e6' ? 665 : edge.id === 'e7' ? 665 : edge.id === 'e8' ? 815 : edge.id === 'e9' ? 978 : 260}
                    y={edge.id === 'e4' ? 175 : edge.id === 'e5' ? 322 : edge.id === 'e6' ? 185 : edge.id === 'e7' ? 307 : edge.id === 'e8' ? 286 : edge.id === 'e9' ? 210 : 232}
                    fill="#cbd5e1"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                )}
                <circle r="3" fill="#38bdf8">
                  <animateMotion dur="2.4s" repeatCount="indefinite" begin={edge.delay} path={edge.d} />
                </circle>
              </g>
            )
          })}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute flex flex-col items-center"
            style={{ left: `${node.x}px`, top: `${node.y}px`, width: '100px' }}
          >
            <div className={node.emphasized ? 'border-2 border-[#eab308] rounded p-1 bg-[#1e293b]' : ''}>
              <img src={node.image} alt={node.label} className="w-[100px] h-[72px] object-contain" />
            </div>
            <div className="mt-2 text-xs text-[#cbd5e1] text-center">{node.label}</div>
          </div>
        ))}

        <div className="absolute left-[155px] top-[275px] text-[11px] text-[#94a3b8]">V: {(data.V ?? 0).toFixed(1)} V</div>
        <div className="absolute left-[228px] top-[275px] text-[11px] text-[#94a3b8]">I: {(data.I ?? 0).toFixed(1)} A</div>
        <div className="absolute left-[300px] top-[275px] text-[11px] text-[#94a3b8]">ω: {(data.omega ?? 0).toFixed(0)} RPM</div>
        <div className="absolute left-[845px] top-[390px] text-[11px] text-[#94a3b8]">ΔT: {(data.ai_correction ?? 0).toFixed(2)}°C</div>
      </div>
    </div>
  )
}
