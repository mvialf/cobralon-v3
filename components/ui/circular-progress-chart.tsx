import React from 'react'

interface CircularProgressChartProps {
  percentage: number
}

/**
 * Gráfico circular de progreso (donut chart) con porcentaje
 *
 * **IMPORTANTE:** Este componente usa variables CSS del sistema `capture-*`
 * para garantizar compatibilidad con capturas de imagen (CaptureDialog).
 *
 * Colores utilizados:
 * - Círculo de fondo: `var(--capture-border)` (gris sutil)
 * - Círculo de progreso: `var(--capture-blue)` (azul)
 * - Texto porcentaje: `text-capture-foreground` (texto oscuro)
 *
 * @example
 * ```tsx
 * <CircularProgressChart percentage={75} />
 * ```
 *
 * @see {@link /components/custom/capture-dialog} Sistema de captura de imágenes
 * @see {@link /app/globals.css} Variables CSS capture-* (líneas 68-76)
 */
const CircularProgressChart: React.FC<CircularProgressChartProps> = ({ percentage }) => {
  const circumference = 2 * Math.PI * 50 // Fixed radius of 50 for the circle
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        {/* Círculo de fondo (gris sutil) */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="var(--capture-border)"
          strokeWidth="10"
        />
        {/* Círculo de progreso (azul) */}
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="var(--capture-blue)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-capture-foreground">
        {percentage}%
      </span>
    </div>
  )
}

export default CircularProgressChart
