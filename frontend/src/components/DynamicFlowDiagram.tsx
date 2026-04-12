import { motion } from 'framer-motion'
import { Activity, Settings, Thermometer, Magnet, GitMerge, BrainCircuit, Target } from 'lucide-react'

export default function DynamicFlowDiagram({ data }) {
  if (!data) return <div className="h-full flex items-center justify-center text-[#8b949e]">Awaiting Flow Data...</div>

  const isNoise = data.noise_level > 2.0;
  const lineColor = isNoise ? '#f85149' : '#30363d';
  const glowColor = isNoise ? '#f85149' : '#58a6ff';

  const lineProps = {
    stroke: lineColor,
    strokeWidth: 3,
    fill: "none",
    markerEnd: "url(#arrowBase)"
  };

  const drawDefaults = {
    initial: { pathLength: 0, opacity: 0 },
    animate: { 
      pathLength: [0, 1], 
      opacity: [0, 1, 0],
      transition: { duration: 2, repeat: Infinity, ease: "linear" } 
    }
  };

  const particleDefaults = {
    initial: { pathLength: 0, pathOffset: 0, opacity: 0 },
    animate: {
      pathLength: [0, 0.2, 0.2, 0],
      pathOffset: [0, 0, 0.8, 1],
      opacity: [0, 1, 1, 0],
      transition: { duration: 2, repeat: Infinity, ease: "linear" }
    }
  };

  const NodeHTML = ({ icon: Icon, label, value, isAi, isTarget, aiLabel }) => (
    <div className={`w-[160px] h-[90px] flex flex-col items-center justify-center p-2 rounded-xl shadow-lg border-2 bg-[#0d1117] relative z-20 
      ${isTarget ? 'border-[#3fb950] text-[#3fb950] shadow-[0_0_15px_rgba(63,185,80,0.3)] bg-[#161b22]' : 
      isAi ? 'border-[#8B5CF6] text-[#8B5CF6] shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 
      'border-[#58a6ff] text-[#58a6ff] shadow-[0_0_15px_rgba(88,166,255,0.2)]'}`}>
      
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} />
        <span className="text-[10px] font-bold text-[#e6edf3] uppercase tracking-wide leading-tight text-center">
          {label}
        </span>
      </div>
      
      {value !== undefined && (
        <span className="text-[13px] font-mono font-bold text-white tracking-widest mt-1 bg-black/40 px-3 py-1 rounded shadow-inner">
          {value}
        </span>
      )}
      {aiLabel !== undefined && (
        <span className="text-[11px] text-[#f0883e] font-bold mt-1 bg-[#161b22] px-2 py-0.5 rounded outline outline-1 outline-[#f0883e]/50 shadow-[0_0_8px_rgba(240,136,62,0.3)]">
          ΔT = {aiLabel > 0 ? '+' : ''}{aiLabel}°C
        </span>
      )}
    </div>
  );

  // Exact Edge-to-Edge SVG Paths using Bezier Curves for smooth futuristic flow
  const paths = {
    p1: "M 180 250 L 235 250", // Inv -> Phys
    p2: "M 400 250 C 430 250, 430 105, 455 105", // Phys -> LPTN
    p3: "M 400 250 C 430 250, 430 395, 455 395", // Phys -> Flux
    p4: "M 620 105 C 650 105, 650 240, 675 240", // LPTN -> EKF
    p5: "M 620 395 C 650 395, 650 260, 675 260", // Flux -> EKF
    p6: "M 840 250 L 895 250", // EKF -> Target
    p7: "M 760 295 L 760 375", // EKF -> AI
    p8: "M 840 425 C 870 425, 870 260, 895 260", // AI -> Target
    p_inv_ai: "M 100 295 C 100 520, 500 520, 675 435",
    p_lptn_ai: "M 540 150 C 540 230, 650 380, 675 415"
  };

  return (
    <div className="w-full h-full min-h-[400px] bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden flex items-center justify-center shadow-inner relative">
      <div className="absolute top-4 left-4 flex gap-2 z-30">
         {isNoise && <span className="bg-[#f85149]/20 text-[#f85149] border border-[#f85149] px-3 py-1 rounded-full text-xs font-bold animate-pulse">EMI NOISE FAULT DETECTED</span>}
         <span className="bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff] px-3 py-1 rounded-full text-xs font-bold pulse">LIVE DATA PIPELINE</span>
      </div>

      <svg viewBox="0 0 1100 500" className="w-full h-full p-4" preserveAspectRatio="xMidYMid meet">
        
        {/* ARROW HEAD DEFS */}
        <defs>
          <marker id="arrowBase" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={lineColor} />
          </marker>
          <marker id="arrowGlow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={glowColor} />
          </marker>
          <marker id="arrowGlowPurple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8B5CF6" />
          </marker>
          <marker id="arrowGlowRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f85149" />
          </marker>
        </defs>

        {/* STATIC BASE PATHS WITH ARROWHEADS */}
        <path d={paths.p1} {...lineProps} /> 
        <path d={paths.p2} {...lineProps} /> 
        <path d={paths.p3} {...lineProps} /> 
        <path d={paths.p4} {...lineProps} /> 
        <path d={paths.p5} {...lineProps} /> 
        <path d={paths.p6} {...lineProps} /> 
        <path d={paths.p7} {...lineProps} /> 
        <path d={paths.p8} {...lineProps} /> 
        
        {/* LONG SPANNING ARROWS */}
        <path d={paths.p_inv_ai} {...lineProps} strokeDasharray="5,5" opacity="0.4"/> 
        <path d={paths.p_lptn_ai} {...lineProps} strokeDasharray="5,5" opacity="0.4"/> 

        {/* GLOWING ANIMATED FLOW LINES (Shooting particles) */}
        <g stroke={glowColor} strokeWidth="4" fill="none" className="drop-shadow-[0_0_8px_rgba(88,166,255,0.9)] z-10">
          <motion.path d={paths.p1} markerEnd="url(#arrowGlow)" {...particleDefaults} />
          <motion.path d={paths.p2} markerEnd="url(#arrowGlow)" {...particleDefaults} transition={{...particleDefaults.transition, delay: 0.2}} />
          <motion.path d={paths.p3} markerEnd="url(#arrowGlow)" {...particleDefaults} transition={{...particleDefaults.transition, delay: 0.2}} />
          <motion.path d={paths.p4} markerEnd="url(#arrowGlow)" {...particleDefaults} transition={{...particleDefaults.transition, delay: 0.4}} />
          <motion.path d={paths.p5} markerEnd="url(#arrowGlow)" {...particleDefaults} transition={{...particleDefaults.transition, delay: 0.4}} />
          
          <motion.path d={paths.p7} markerEnd="url(#arrowGlow)" {...particleDefaults} transition={{...particleDefaults.transition, delay: 0.6}} />
          
          <motion.path d={paths.p6} stroke="#f85149" markerEnd="url(#arrowGlowRed)" {...particleDefaults} transition={{...particleDefaults.transition, delay: 0.6}} />
          <motion.path d={paths.p8} stroke="#8B5CF6" strokeWidth="5" markerEnd="url(#arrowGlowPurple)" {...particleDefaults} transition={{...particleDefaults.transition, delay: 0.8}} />

          {/* AI Observation Paths */}
          <motion.path d={paths.p_inv_ai} strokeDasharray="10,10" {...drawDefaults} transition={{...drawDefaults.transition, delay: 0.1, duration: 3}} />
          <motion.path d={paths.p_lptn_ai} strokeDasharray="10,10" {...drawDefaults} transition={{...drawDefaults.transition, delay: 0.5, duration: 2}} />
        </g>

        {/* NODES USING FOREIGN OBJECTS */}
        <foreignObject x="20" y="205" width="160" height="90"><NodeHTML icon={Activity} label="Sensor Data" value={`V:${data.V} I:${data.I}`} /></foreignObject>
        <foreignObject x="240" y="205" width="160" height="90"><NodeHTML icon={Settings} label="Physics Extract" /></foreignObject>
        <foreignObject x="460" y="60" width="160" height="90"><NodeHTML icon={Thermometer} label="LPTN Thermal" /></foreignObject>
        <foreignObject x="460" y="350" width="160" height="90"><NodeHTML icon={Magnet} label="Flux Observer" value={`${data.omega} RPM`} /></foreignObject>
        <foreignObject x="680" y="205" width="160" height="90"><NodeHTML icon={GitMerge} label="EKF Fusion" value={`${data.T_base} °C`} /></foreignObject>
        <foreignObject x="680" y="380" width="160" height="90"><NodeHTML icon={BrainCircuit} label="AI Neural Net" isAi={true} aiLabel={data.ai_correction} /></foreignObject>
        <foreignObject x="900" y="205" width="160" height="90"><NodeHTML icon={Target} label="Final Estimate" value={`${data.T_final} °C`} isTarget={true} /></foreignObject>
      </svg>
    </div>
  )
}
