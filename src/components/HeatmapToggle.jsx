import { useState } from 'react'

const heatmapData = {
  claude: [
    { repo: 'airflow', sec: 50.0, cls: 'secure-mid' },
    { repo: 'py-libnmap', sec: 100.0, cls: 'secure-perfect' },
    { repo: 'wagtail', sec: 25.0, cls: 'secure-low' },
    { repo: 'django', sec: 0.0, cls: 'secure-none' },
  ],
  gemini: [
    { repo: 'airflow', sec: 66.7, cls: 'secure-high' },
    { repo: 'py-libnmap', sec: 0.0, cls: 'secure-none' },
    { repo: 'wagtail', sec: 66.7, cls: 'secure-high' },
    { repo: 'django', sec: 100.0, cls: 'secure-perfect' },
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
