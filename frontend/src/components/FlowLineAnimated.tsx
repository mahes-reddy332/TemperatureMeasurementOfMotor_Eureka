import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface FlowLineAnimatedProps {
  pathData: string
  color?: string
  glowColor?: string
  markerEnd?: string
  animated?: boolean
  delay?: number
  duration?: number
  showParticles?: boolean
  numParticles?: number
  intensity?: number
}

export default function FlowLineAnimated({
  pathData,
  color = '#58a6ff',
  glowColor = '#58a6ff',
  markerEnd = 'url(#arrowGlow)',
  animated = true,
  delay = 0,
  duration = 2,
  showParticles = true,
  numParticles = 3,
  intensity = 1
}: FlowLineAnimatedProps) {
  
  // Generate particle positions along the path
  const particles = useMemo(() => {
    return Array.from({ length: numParticles }).map((_, i) => ({
      id: i,
      delay: (i / numParticles) * 1.5 + delay
    }))
  }, [numParticles, delay])

  const particleVariants = {
    initial: { pathLength: 0, pathOffset: 0, opacity: 0 },
    animate: {
      pathLength: [0, 0.2, 0.2, 0],
      pathOffset: [0, 0, 0.8, 1],
      opacity: [0, intensity, intensity, 0],
      transition: {
        duration,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  }

  return (
    <>
      {/* Static base path */}
      <path
        d={pathData}
        stroke={color}
        strokeWidth="3"
        fill="none"
        opacity="0.3"
      />

      {/* Animated glow layer (faster, thicker) */}
      {animated && (
        <motion.path
          d={pathData}
          stroke={glowColor}
          strokeWidth="5"
          fill="none"
          markerEnd={markerEnd}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: [0, 1],
            opacity: [0, 0.6, 0]
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'linear',
            delay
          }}
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor})`
          }}
        />
      )}

      {/* Particle burst effects */}
      {showParticles && animated && (
        <g stroke={glowColor} strokeWidth="4" fill="none">
          {particles.map(particle => (
            <motion.path
              key={particle.id}
              d={pathData}
              markerEnd={markerEnd}
              initial="initial"
              animate="animate"
              variants={particleVariants}
              transition={{
                ...particleVariants.animate.transition,
                delay: particle.delay
              }}
              style={{
                filter: `drop-shadow(0 0 12px ${glowColor})`
              }}
            />
          ))}
        </g>
      )}
    </>
  )
}
