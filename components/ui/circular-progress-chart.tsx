import React from 'react'

interface CircularProgressChartProps {
  percentage: number
}

const CircularProgressChart: React.FC<CircularProgressChartProps> = ({ percentage }) => {
  const circumference = 2 * Math.PI * 50 // Fixed radius of 50 for the circle
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="currentColor"
          className="text-gray-300"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-gray-800">
        {percentage}%
      </span>
    </div>
  )
}

export default CircularProgressChart
