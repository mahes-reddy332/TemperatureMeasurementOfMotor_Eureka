import { Zap, Gauge, Fan, Thermometer } from 'lucide-react'

export default function LiveMetrics({ data }) {
  if (!data) return <div className="h-40 flex items-center justify-center text-[#8b949e]">Waiting for Telemetry...</div>;

  const MetricCard = ({ icon, title, value, unit, color }) => (
    <div className="bg-[#21262d] border border-[#30363d] p-4 rounded-xl flex items-center gap-4">
      <div className={`p-3 rounded-full bg-[#161b22] border border-[#30363d] ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-[#8b949e]">{title}</p>
        <p className="text-2xl font-bold font-mono">
          {value} <span className="text-sm font-normal text-[#8b949e]">{unit}</span>
        </p>
      </div>
    </div>
  )

  const tempStatus = data.T_final < 80 ? 'text-[#3fb950]' : data.T_final < 120 ? 'text-[#d29922]' : 'text-[#f85149]';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard icon={<Zap size={24} />} title="Stator Voltage" value={data.V} unit="V" color="text-[#58a6ff]" />
      <MetricCard icon={<Gauge size={24} />} title="Phase Current" value={data.I} unit="A" color="text-[#bc8cff]" />
      <MetricCard icon={<Fan size={24} />} title="Rotor Speed" value={data.omega} unit="RPM" color="text-[#f0883e]" />
      <MetricCard icon={<Thermometer size={24} />} title="Est. Temperature" value={data.T_final} unit="°C" color={tempStatus} />
    </div>
  )
}
