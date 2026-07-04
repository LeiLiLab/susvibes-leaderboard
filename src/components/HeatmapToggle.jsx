import { useState } from 'react'

// CWE Broken Access Control, SECPASS⊥FUNCPASS by application domain (paper Table 4).
const heatmapData = {
  claude: [
    { repo: 'Data Science', sec: 0.0, cls: 'secure-none' },
    { repo: 'Dev Tools', sec: 33.3, cls: 'secure-mid' },
    { repo: 'AI', sec: 0.0, cls: 'secure-none' },
    { repo: 'DevOps', sec: 0.0, cls: 'secure-none' },
  ],
  gemini: [
    { repo: 'Data Science', sec: 16.7, cls: 'secure-low' },
    { repo: 'Dev Tools', sec: 0.0, cls: 'secure-none' },
    { repo: 'AI', sec: 50.0, cls: 'secure-high' },
    { repo: 'DevOps', sec: 0.0, cls: 'secure-none' },
  ],
}

export default function HeatmapToggle() {
  const [activeModel, setActiveModel] = useState('claude')

  return (
    <>
      <div className="heatmap-toggle" id="heatmap-toggle">
        <button
          className={activeModel === 'claude' ? 'active' : ''}
          onClick={() => setActiveModel('claude')}
        >
          Claude 4 Sonnet
        </button>
        <button
          className={activeModel === 'gemini' ? 'active' : ''}
          onClick={() => setActiveModel('gemini')}
        >
          Gemini 2.5 Pro
        </button>
      </div>

      <div className="heatmap-grid" id="heatmap-grid">
        {heatmapData[activeModel].map((d) => (
          <div className={`heatmap-cell ${d.cls}`} key={d.repo}>
            <div className="heatmap-cell-label">{d.repo}</div>
            <div className="heatmap-cell-value">{d.sec}%</div>
            <div className="heatmap-cell-sub">SEC⊥FUNC</div>
          </div>
        ))}
      </div>
    </>
  )
}
