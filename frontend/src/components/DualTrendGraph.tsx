import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ScatterChart, Scatter } from 'recharts'

export default function DualTrendGraph({ history }) {
  if (!history || history.length === 0) {
    return <div className="h-full w-full flex items-center justify-center text-[#8b949e]">Awaiting Simulation Data...</div>
  }

  const currentTemp = history[history.length - 1].T_true;
  const yMinTemp = Math.max(0, Math.floor(currentTemp - 30));
  const yMaxTemp = Math.ceil(currentTemp + 30);

  const ChartContainer = ({ title, children }) => (
    <div className="flex flex-col bg-[#0d1117] rounded-lg border border-[#30363d] p-3 shadow-lg min-h-[250px]">
      <h3 className="text-xs font-bold text-[#e6edf3] mb-2 uppercase tracking-wide text-center">{title}</h3>
      <div className="flex-grow w-full">
        {children}
      </div>
    </div>
  )

  const commonXAxis = <XAxis dataKey="timestamp" stroke="#8b949e" tickFormatter={(tick) => { const d = new Date(tick); return `${d.getSeconds()}.${d.getMilliseconds().toString().substring(0,1)}s`; }} tick={{ fontSize: 10 }} />
  const commonTooltip = <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#e6edf3', fontSize: '11px', padding: '4px' }} labelFormatter={() => ''} />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 w-full h-full">

      {/* GRAPH 1: PM Temperature - All Methods */}
      <ChartContainer title="Graph 1: PM Temperature Comparison">
        <ResponsiveContainer>
          <LineChart data={history} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#30363d" vertical={false} />
            {commonXAxis}
            <YAxis stroke="#8b949e" tick={{ fontSize: 10 }} domain={[yMinTemp, yMaxTemp]} />
            {commonTooltip}
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="T_true" name="True T_PM" stroke="#8b949e" strokeWidth={3} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="T_base" name="EKF Fusion" stroke="#f85149" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="T_final" name="AFTO (Ours)" stroke="#3fb950" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* GRAPH 2: Estimation Error */}
      <ChartContainer title="Graph 2: Estimation Error Comparison">
        <ResponsiveContainer>
          <LineChart data={history} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#30363d" vertical={false} />
            {commonXAxis}
            <YAxis stroke="#8b949e" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
            {commonTooltip}
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="err_ekf" name="EKF Error" stroke="#f85149" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="err_afto" name="AFTO Error" stroke="#3fb950" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* GRAPH 3: Dynamic Trust Weighting */}
      <ChartContainer title="Graph 3: Speed-Adaptive Trust Weighting">
        <ResponsiveContainer>
          <LineChart data={history} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#30363d" vertical={false} />
            {commonXAxis}
            <YAxis yAxisId="left" stroke="#58a6ff" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#d29922" tick={{ fontSize: 10 }} domain={[0, 1.2]} />
            {commonTooltip}
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line yAxisId="left" type="monotone" dataKey="omega" name="Motor Speed RPM" stroke="#58a6ff" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="right" type="monotone" dataKey="trust_weight" name="Flux Trust (0-1)" stroke="#d29922" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* GRAPH 4: Physics Flux vs Temp */}
      <ChartContainer title="Graph 4: Physics - Flux Linkage Loss">
        <ResponsiveContainer>
          <LineChart data={history} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#30363d" vertical={false} />
            {commonXAxis}
            <YAxis stroke="#8b949e" tick={{ fontSize: 10 }} domain={['dataMin - 0.005', 'dataMax + 0.005']} />
            {commonTooltip}
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="flux_linkage" name="Flux Linkage (Wb)" stroke="#bc8cff" strokeWidth={2} dot={{ r: 2, fill: "#bc8cff" }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* GRAPH 5: Internal 4-Node LPTN */}
      <ChartContainer title="Graph 5: Internal Temperatures (LPTN)">
        <ResponsiveContainer>
          <LineChart data={history} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#30363d" vertical={false} />
            {commonXAxis}
            <YAxis stroke="#8b949e" tick={{ fontSize: 10 }} domain={[20, 'auto']} />
            {commonTooltip}
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="T_winding" name="T Winding" stroke="#f0883e" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="T_stator" name="T Stator Core" stroke="#58a6ff" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="T_true" name="T Magnet (True)" stroke="#8b949e" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="T_housing" name="T Housing" stroke="#3fb950" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* GRAPH 6: Edge-AI Correction */}
      <ChartContainer title="Graph 6: Edge-AI Neural Net Correction">
        <ResponsiveContainer>
          <AreaChart data={history} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#30363d" vertical={false} />
            {commonXAxis}
            <YAxis stroke="#8b949e" tick={{ fontSize: 10 }} domain={[-15, 15]} />
            {commonTooltip}
            <Legend wrapperStyle={{ fontSize: '10px' }} />
            <Area type="monotone" dataKey="ai_correction" name="AI Correction (ΔT °C)" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.4} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

    </div>
  )
}
