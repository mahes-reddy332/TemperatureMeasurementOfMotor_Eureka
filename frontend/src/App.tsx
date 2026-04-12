import { useEffect, useState } from 'react'
import LiveMetrics from './components/LiveMetrics'
import DynamicFlowDiagram3D from './components/DynamicFlowDiagram3D'
import DualTrendGraph from './components/DualTrendGraph'
import { Radio, AlertTriangle } from 'lucide-react'

type TelemetryPacket = {
  I: number
  V: number
  omega: number
  T_true: number
  T_base: number
  T_final: number
  ai_correction: number
  T_winding: number
  T_stator: number
  T_housing: number
  flux_linkage: number
  trust_weight: number
  err_ekf: number
  err_afto: number
  noise_level: number
  mode: string
  timestamp: number
}

function App() {
  const [data, setData] = useState<TelemetryPacket | null>(null)
  const [history, setHistory] = useState<TelemetryPacket[]>([])
  const [connected, setConnected] = useState(false)
  const [mode, setMode] = useState('normal')

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws')
    
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    
    ws.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as TelemetryPacket
      setHistory(prev => [...prev.slice(-29), parsed]) // Keep 30 points
      setData(parsed)
      setMode(parsed.mode)
    }

    return () => ws.close()
  }, [])

  const triggerFault = async (newMode: string) => {
    await fetch(`http://localhost:8000/trigger/${newMode}`)
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] p-4 lg:p-8 font-sans flex flex-col gap-6">
      
      {/* Header */}
      <header className="flex justify-between items-center border-b border-[#30363d] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#58a6ff] tracking-wide">COGNI<span className="text-white">THERM</span></h1>
          <p className="text-xs text-[#8b949e] uppercase tracking-widest mt-1">System Flow Diagram V3.1 // Node Cluster: 0xFF12_A</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider border ${connected ? 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/30' : 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30'}`}>
            <Radio size={14} className={connected ? 'animate-pulse' : ''} />
            {connected ? 'SYSTEM ACTIVE' : 'DISCONNECTED'}
          </div>
        </div>
      </header>

      {/* Row 1: The Four Parameters (Like Screenshot) */}
      <LiveMetrics data={data} />

      {/* Row 2: Wide Angle Architecture (Center) & Faults */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Center Architecture */}
        <div className="xl:w-4/5">
          <DynamicFlowDiagram3D data={data} />
        </div>

        {/* Fault Injection Side Panel */}
        <div className="xl:w-1/5 bg-[#161b22] border border-[#30363d] p-5 rounded-xl h-[500px] flex flex-col">
          <h2 className="text-sm font-bold tracking-wide uppercase text-[#8b949e] mb-4 flex items-center gap-2 border-b border-[#30363d] pb-2">
            <AlertTriangle size={16} className="text-[#f0883e]" /> Fault Injector
          </h2>
          <div className="flex flex-col gap-3 flex-grow">
            <button onClick={() => triggerFault('normal')} className={`p-4 rounded-lg text-sm font-bold text-left transition-all ${mode === 'normal' && data?.noise_level < 2.0 ? 'bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/50' : 'bg-[#21262d] text-[#8b949e] border border-transparent hover:border-[#30363d]'}`}>
              Normal Cruising
            </button>
            <button onClick={() => triggerFault('spike')} className={`p-4 rounded-lg text-sm font-bold text-left transition-all ${mode === 'spike' ? 'bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/50' : 'bg-[#21262d] text-[#8b949e] border border-transparent hover:border-[#30363d]'}`}>
              High Current Spike
            </button>
            <button onClick={() => triggerFault('load')} className={`p-4 rounded-lg text-sm font-bold text-left transition-all ${mode === 'load' ? 'bg-[#d29922]/20 text-[#d29922] border border-[#d29922]/50' : 'bg-[#21262d] text-[#8b949e] border border-transparent hover:border-[#30363d]'}`}>
              Sudden Load Drop
            </button>
            <button onClick={() => triggerFault('noise')} className={`p-4 rounded-lg text-sm font-bold text-left transition-all ${data?.noise_level > 2.0 ? 'bg-[#bc8cff]/20 text-[#bc8cff] border border-[#bc8cff]/50' : 'bg-[#21262d] text-[#8b949e] border border-transparent hover:border-[#30363d]'}`}>
              Inject EMI Noise
            </button>
          </div>
        </div>

      </div>

      {/* Row 3: Live Analytical Graph Panel */}
      <div className="bg-[#161b22] border border-[#30363d] p-4 rounded-xl flex flex-col min-h-[320px]">
        <DualTrendGraph history={history} />
      </div>

    </div>
  )
}

export default App
