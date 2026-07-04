// SecPass⊥FuncPass (%) by CWE category, per model — data behind paper Figure 4.
// Grouped bar chart: for nearly every weakness class a different model is safest.
const MODELS = [
  { name: 'Gemini 3 Pro', color: '#be87cd' },
  { name: 'Gemini 2.5 Pro', color: '#708fd1' },
  { name: 'Claude 4 Sonnet', color: '#6dcc75' },
  { name: 'Kimi K2', color: '#7eb9e4' },
]

// vals ordered to match MODELS: [Gemini 3, Gemini 2.5, Claude 4, Kimi K2].
const CATEGORIES = [
  { label: ['Broken Access', 'Control'], vals: [19, 15, 15, 15] },
  { label: ['Cryptographic', 'Failures'], vals: [47, 50, 50, 63] },
  { label: ['Injection'], vals: [23, 50, 28, 25] },
  { label: ['Insecure', 'Design'], vals: [26, 71, 32, 35] },
  { label: ['Authentication', 'Failures'], vals: [17, 12, 4, 12] },
  { label: ['Data Integrity', 'Failures'], vals: [0, 50, 0, 0] },
  { label: ['Logging &', 'Alerting'], vals: [0, 100, 0, 0] },
  { label: ['Exceptional', 'Conditions'], vals: [15, 0, 8, 18] },
  { label: ['Resource', 'Exhaustion'], vals: [42, 30, 23, 37] },
]

const GRID = [100, 75, 50, 25, 0]

export default function CategorySecurityChart({ isVisible }) {
  return (
    <div className="catsec-chart">
      <div className="catsec-scroll">
        <div className="catsec-inner">
          <div className="catsec-plotrow">
            <div className="catsec-yaxis">
              {GRID.map((g) => (
                <span
                  key={g}
                  className="catsec-ytick"
                  style={{ top: `${(1 - g / 100) * 100}%` }}
                >
                  {g}
                </span>
              ))}
            </div>
            <div className="catsec-plot">
              {GRID.map((g) => (
                <div
                  key={g}
                  className="catsec-gl"
                  style={{ top: `${(1 - g / 100) * 100}%` }}
                />
              ))}
              <div className="catsec-groups">
                {CATEGORIES.map((cat, ci) => (
                  <div className="catsec-group" key={ci}>
                    {cat.vals.map((v, mi) => (
                      <div
                        key={mi}
                        className="catsec-bar"
                        title={`${MODELS[mi].name} · ${cat.label.join(' ')}: ${v}%`}
                        style={{
                          height: isVisible ? `${v}%` : '0%',
                          background: MODELS[mi].color,
                          transitionDelay: `${ci * 55}ms`,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="catsec-xaxis">
            {CATEGORIES.map((cat, ci) => (
              <div className="catsec-xtick" key={ci}>
                {cat.label.map((ln, k) => (
                  <span key={k}>{ln}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="catsec-legend">
        {MODELS.map((m) => (
          <span className="catsec-legend-item" key={m.name}>
            <span className="catsec-swatch" style={{ background: m.color }} />
            {m.name}
          </span>
        ))}
      </div>
      <p className="is-size-7 has-text-grey has-text-centered mt-2 mb-0">
        Conditional security rate (SECPASS⊥FUNCPASS, %) by CWE category — the
        safest model differs for nearly every weakness
      </p>
    </div>
  )
}
