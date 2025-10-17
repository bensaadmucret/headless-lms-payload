import React from 'react'

const TestButton: React.FC = () => {
  return (
    <div style={{ padding: '10px', backgroundColor: '#f0f0f0', margin: '10px 0' }}>
      <h3>🧪 Test Component - Import JSON/CSV</h3>
      <p>Si vous voyez ce message, les composants fonctionnent !</p>
      <button 
        onClick={() => alert('Interface d\'import JSON/CSV à venir')}
        style={{
          backgroundColor: '#10b981',
          color: 'white',
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        📥 Import JSON/CSV (Test)
      </button>
    </div>
  )
}

export default TestButton