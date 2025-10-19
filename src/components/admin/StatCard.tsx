import React from 'react'

interface StatCardProps {
  value: number
  label: string
  color: string
}

export const StatCard: React.FC<StatCardProps> = ({ value, label, color }) => {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: 'var(--theme-elevation-100)',
      borderRadius: '4px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '18px', fontWeight: '600', color }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--theme-text-dim)' }}>
        {label}
      </div>
    </div>
  )
}