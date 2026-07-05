import { useState, useRef, useEffect } from 'react'
import './BlogContent.css'
import '../assets/css/bulma-scoped.css'
import '../assets/css/custom.css'
import VulnerabilityGame from './VulnerabilityGame'
import ExploitViewer from './ExploitViewer'
import HeatmapToggle from './HeatmapToggle'
import CategorySecurityChart from './CategorySecurityChart'
import ScrollAnimatedSection from './ScrollAnimatedSection'
import { useLightbox } from './ImageLightbox'

const BASE = import.meta.env.BASE_URL

/* ── Animated counter hook ───────────────────────────────────────── */
function useAnimatedCounter(target, decimals, trigger) {
  const [value, setValue] = useState('0')
  const started = useRef(false)

  useEffect(() => {
    if (!trigger || started.current) return
    started.current = true
    const duration = 1500
    const start = performance.now()
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue((target * eased).toFixed(decimals))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [trigger, target, decimals])

  return value
}

/* ── Stat Counter Card ───────────────────────────────────────────── */
function StatCounterCard({ target, decimals = 0, label, style, isVisible }) {
  const value = useAnimatedCounter(target, decimals, isVisible)
  return (
    <div className="stat-counter-card">
      <div className="stat-counter-number" style={style}>
        {value}
      </div>
      <div
        className="stat-counter-label"
        dangerouslySetInnerHTML={{ __html: label }}
      />
    </div>
  )
}

/* ── Progress Ring ───────────────────────────────────────────────── */
function ProgressRing({ target, colorClass, valueLabel, label, sublabel, isVisible }) {
  const circumference = 314.16
  const offset = isVisible
    ? circumference * (1 - target / 100)
    : circumference

  return (
    <div className="progress-ring-card">
      <svg className="progress-ring-svg" viewBox="0 0 120 120">
        <circle className="progress-ring-bg" cx="60" cy="60" r="50" />
        <circle
          className={`progress-ring-fill ${colorClass}`}
          cx="60"
          cy="60"
          r="50"
          strokeDasharray="314.16"
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22,1,0.36,1)' }}
        />
        <text
          className="progress-ring-value"
          x="60"
          y="65"
          textAnchor="middle"
          transform="rotate(90 60 60)"
        >
          {valueLabel}
        </text>
      </svg>
      <div className="progress-ring-label">
        <strong>{label}</strong>
      </div>
      <div
        className="progress-ring-label"
        style={{ fontSize: '0.7rem', marginTop: '0.1rem' }}
        dangerouslySetInnerHTML={{ __html: sublabel }}
      />
    </div>
  )
}

/* ── BibTeX Section ──────────────────────────────────────────────── */
function BibtexSection() {
  const [copied, setCopied] = useState(false)
  const bibtexRef = useRef(null)

  const handleCopy = () => {
    const text = bibtexRef.current?.innerText || ''
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="bibtex-section has-text-centered">
      <h2 className="title">BibTeX</h2>
      <pre style={{ textAlign: 'left' }}>
        <code ref={bibtexRef}>{`@inproceedings{zhao2026is,
  title={Is Vibe Coding Safe? Benchmarking Vulnerability of Agent-Generated Code in Real-World Tasks},
  author={Songwen Zhao and Danqing Wang and Kexun Zhang and Jiaxuan Luo and Zhuo Li and Lei Li},
  booktitle={Forty-third International Conference on Machine Learning},
  year={2026},
  url={https://openreview.net/forum?id=qG8g00zRZa}
}`}</code>
      </pre>
      <button className="button is-small is-info mt-3" onClick={handleCopy}>
        <span className="icon">
          <i className="fas fa-copy" />
        </span>
        <span>Copy Citation</span>
      </button>
      {copied && (
        <p className="is-size-7 has-text-success mt-2">Copied to clipboard!</p>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ════════════════════════════════════════════════════════════════════ */
export default function BlogContent() {
  const { onClick: handleImageClick, overlay: lightboxOverlay } = useLightbox()

  return (
    <div className="blog-content" onClick={handleImageClick}>
      {lightboxOverlay}
      {/* ── Blog Hero ────────────────────────────────────────────── */}
      <section className="blog-hero">
        <div className="hero-body">
          <div className="b-container is-max-desktop">
            <div className="columns is-centered">
              <div className="column has-text-centered">
                <h1 className="title is-1 publication-title">
                  Is Vibe Coding Safe?
                </h1>
                <h2 className="subtitle is-3">
                  Benchmarking Vulnerability of Agent-Generated Code in
                  Real-World Tasks
                </h2>
                <div className="venue-badge">ICML 2026</div>
                <p
                  className="blog-credit"
                  style={{
                    color: 'grey',
                    fontSize: '1rem',
                    fontWeight: 'normal',
                    marginBottom: '0.5rem',
                  }}
                >
                  Blog made by{' '}
                  <a href="https://www.linkedin.com/in/raymondjiang0917/">
                    Raymond Jiang
                  </a>
                  <sup>1</sup> and{' '}
                  <a href="https://www.linkedin.com/in/songwen-zhao">
                    Songwen Zhao
                  </a>
                  <sup>1,2</sup>
                </p>

                <div className="is-size-5 publication-authors">
                  <span className="author-block">
                    <a href="https://www.linkedin.com/in/songwen-zhao">
                      Songwen Zhao
                    </a>
                    <sup>1,2</sup>,
                  </span>{' '}
                  <span className="author-block">
                    <a href="https://dqwang122.github.io/">Danqing Wang</a>
                    <sup>1</sup>,
                  </span>{' '}
                  <span className="author-block">
                    <a href="https://zkx06111.github.io/">Kexun Zhang</a>
                    <sup>1</sup>,
                  </span>{' '}
                  <span className="author-block">
                    <a href="https://www.linkedin.com/in/jiaxuan-luo-70780a327">
                      Jiaxuan Luo
                    </a>
                    <sup>3</sup>,
                  </span>{' '}
                  <span className="author-block">
                    <a href="https://www.linkedin.com/in/zhuo-li-4830a145">
                      Zhuo Li
                    </a>
                    <sup>4</sup>,
                  </span>{' '}
                  <span className="author-block">
                    <a href="https://lileicc.github.io/">Lei Li</a>
                    <sup>1</sup>
                  </span>
                </div>

                <div className="is-size-6 publication-authors">
                  <span className="author-block">
                    <sup>1</sup>Carnegie Mellon University, Language Technologies
                    Institute
                  </span>{' '}
                  <span className="author-block">
                    <sup>2</sup>Columbia University
                  </span>{' '}
                  <span className="author-block">
                    <sup>3</sup>Johns Hopkins University
                  </span>{' '}
                  <span className="author-block">
                    <sup>4</sup>HydroX AI
                  </span>
                </div>

                <div className="column has-text-centered">
                  <div className="publication-links">
                    <span className="link-block">
                      <a
                        href="https://openreview.net/pdf?id=qG8g00zRZa"
                        className="external-link button is-normal is-rounded is-dark"
                      >
                        <span className="icon">
                          <i className="fas fa-file-pdf" />
                        </span>
                        <span>Paper</span>
                      </a>
                    </span>
                    <span className="link-block">
                      <a
                        href="https://github.com/LeiLiLab/susvibes"
                        className="external-link button is-normal is-rounded is-dark"
                      >
                        <span className="icon">
                          <i className="fab fa-github" />
                        </span>
                        <span>GitHub</span>
                      </a>
                    </span>
                    <span className="link-block">
                      <a
                        href="https://arxiv.org/abs/2512.03262"
                        className="external-link button is-normal is-rounded is-dark"
                      >
                        <span className="icon">
                          <i className="ai ai-arxiv" />
                        </span>
                        <span>arXiv</span>
                      </a>
                    </span>
                    <span className="link-block">
                      <a
                        href="https://openreview.net/forum?id=qG8g00zRZa"
                        className="external-link button is-normal is-rounded is-dark"
                      >
                        <span className="icon">
                          <i className="fas fa-book-open" />
                        </span>
                        <span>OpenReview</span>
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Teaser / Core Insight ────────────────────────────────── */}
      <section className="teaser">
        <div className="b-container is-max-desktop">
          <div className="teaser-box has-text-centered">
            <img
              src={`${BASE}images/task_overview.webp`}
              alt="SusVibes Example"
              style={{ maxWidth: '600px', width: '100%' }}
            />

            <div className="teaser-stats mt-5">
              <div className="teaser-stat-col">
                <p>Functional Solutions</p>
                <div className="stat-number has-text-success">57.0%</div>
                <p className="is-size-7">Code works as intended</p>
              </div>
              <div className="teaser-arrow">
                <i className="fas fa-arrow-right fa-2x" />
              </div>
              <div className="teaser-stat-col">
                <p>Secure Solutions</p>
                <div className="stat-number has-text-danger">11.8%</div>
                <p className="is-size-7">But contains critical vulnerabilities</p>
              </div>
            </div>

            <h2 className="subtitle has-text-centered mt-4">
              <span className="dnerf">SusVibes</span> reveals that while AI
              agents can write working code, <strong>nearly 80%</strong> of it is
              insecure.
            </h2>
          </div>
        </div>
      </section>

      {/* ── Main Content Section ─────────────────────────────────── */}
      <section className="b-section">
        <div className="b-container is-max-desktop">
          {/* Abstract */}
          <div className="columns is-centered has-text-centered">
            <div className="column is-four-fifths">
              <h2 className="title is-3">Abstract</h2>
              <div className="content has-text-justified">
                <p>
                  Vibe coding is a new programming paradigm where human engineers
                  instruct LLM agents to complete complex coding tasks with
                  little supervision. Although increasingly adopted,{' '}
                  <strong>
                    are vibe coding outputs really safe to deploy in production?
                  </strong>
                </p>
                <p>
                  To answer this, we propose <strong>SusVibes</strong>, a
                  benchmark of 186 feature-request software engineering tasks
                  from real-world open-source projects. We evaluate 12 agentic
                  settings — three coding agents (SWE-Agent, OpenHands, Claude
                  Code) with four frontier models. Disturbingly, all agents
                  perform poorly in security. Although <strong>57%</strong> of
                  solutions from SWE-Agent with{' '}
                  <strong>Claude 4 Sonnet</strong> are functionally correct, only{' '}
                  <strong>11.8%</strong> are secure.
                </p>
                <p>
                  Our findings, benchmarked across{' '}
                  <strong>Claude 4 Sonnet</strong>,{' '}
                  <strong>Kimi K2</strong>, <strong>Gemini 2.5 Pro</strong>, and{' '}
                  <strong>Gemini 3 Pro</strong>, raise serious concerns about the
                  widespread adoption of vibe-coding in security-sensitive
                  applications.
                </p>
              </div>
            </div>
          </div>

          {/* The SusVibes Benchmark */}
          <div className="columns is-centered">
            <div className="column is-full-width">
              <h2 className="title is-3">The SusVibes Benchmark</h2>
              <div className="content has-text-justified">
                <p>
                  SusVibes is the first benchmark to test whether vibe coding
                  agents produce code that is not only functional but also secure.
                  Each task is a real feature request drawn from a genuine
                  open-source project, where a human developer once shipped a
                  vulnerable implementation that was later fixed by a security
                  patch. Three properties set it apart:
                </p>

                <div className="bench-stats">
                  <div className="bench-stat">
                    <span className="bench-stat-num bench-c-red">186</span>
                    <span className="bench-stat-lbl">tasks</span>
                  </div>
                  <div className="bench-stat">
                    <span className="bench-stat-num bench-c-gold">100</span>
                    <span className="bench-stat-lbl">repos</span>
                  </div>
                  <div className="bench-stat">
                    <span className="bench-stat-num bench-c-teal">79</span>
                    <span className="bench-stat-lbl">CWE</span>
                  </div>
                  <div className="bench-stat">
                    <span className="bench-stat-num bench-c-gray">10</span>
                    <span className="bench-stat-lbl">domains</span>
                  </div>
                </div>

                <div className="bench-cards">
                  <div className="bench-card bench-card-red">
                    <h4 className="bench-card-title bench-c-red">
                      Bigger Task at Repo-level
                    </h4>
                    <p className="bench-card-sub">
                      Real-World Security-Oriented
                    </p>
                    <span className="bench-card-badge">
                      Avg 175 edit lines · 236K context lines
                    </span>
                  </div>
                  <div className="bench-card bench-card-teal">
                    <h4 className="bench-card-title bench-c-teal">
                      Broadest Coverage
                    </h4>
                    <p className="bench-card-sub">
                      Diverse Security Risks &amp; Domains
                    </p>
                    <span className="bench-card-badge">
                      7× CWE coverage · 10 domains
                    </span>
                  </div>
                  <div className="bench-card bench-card-gold">
                    <h4 className="bench-card-title bench-c-gold">
                      Automatic Curation
                    </h4>
                    <p className="bench-card-sub">Extensible</p>
                    <span className="bench-card-badge">
                      More repos · new security issues
                    </span>
                  </div>
                </div>

                <h3 className="title is-4 mt-4">
                  Methodology: The "Masking" Pipeline
                </h3>
                <p>
                  The benchmark was constructed using a novel pipeline to ensure
                  realism. At a high level, we mine a vulnerability-fix commit,
                  harness its human-written functional and security tests, and mask
                  out the feature implementation to turn it back into a
                  feature-request task:
                </p>
                <div className="has-text-centered my-4">
                  <img
                    src={`${BASE}images/fig_curation.png`}
                    alt="SusVibes curation pipeline: mining, harnessing tests, and masking"
                    style={{ maxWidth: '680px', width: '100%' }}
                  />
                </div>
                <p>The pipeline runs in the following steps:</p>
                <ol>
                  <li>
                    <strong>Mining</strong>: We collected over 20,000
                    open-source vulnerability-fixing commits over the past 10
                    years from existing datasets (ReposVul and MoreFixes),
                    filtering to ~2,000 Python projects using Python ≥3.7. We
                    further filter to commits that modify tests, ensuring each
                    task has human-written security tests.
                  </li>
                  <li>
                    <strong>Harnessing Tests</strong>: For each
                    vulnerability-fixing commit C<sub>0</sub>, the changes are
                    separated into implementation changes P<sub>F</sub> and test
                    changes P<sub>T</sub>. The added tests from the fix commit
                    become security tests T<sub>secure</sub>, while existing
                    tests at the preceding commit C<sub>−1</sub> serve as
                    functionality tests T<sub>func</sub>.
                  </li>
                  <li>
                    <strong>Masking</strong>: We revert to the preceding
                    commit C<sub>−1</sub> (the vulnerable version) and use
                    SWE-Agent to create a minimal mask M that removes the feature
                    implementation. Critically, the mask is generated on C
                    <sub>−1</sub> (not on the fixed commit C<sub>0</sub>) to
                    ensure no information from the security fix leaks into the
                    task.
                  </li>
                  <li>
                    <strong>Task Description Generation</strong>: A second
                    SWE-Agent instance generates a feature request from the
                    masked code M and the repository, written in GitHub-issue
                    style without any security hints or implementation
                    instructions.
                  </li>
                  <li>
                    <strong>Adaptive Verification</strong>: A crucial
                    verification loop where a third SWE-Agent instance checks
                    line-by-line whether the generated task description covers
                    the full canonical implementation (including the security
                    fix). If any implementation line cannot be linked to a
                    requirement in the description, the pipeline goes back to
                    generate a larger mask. This loop repeats until the task
                    description matches the canonical implementation.
                    <div className="has-text-centered my-4 mb-5">
                      <img
                        src={`${BASE}images/fig_verification.png`}
                        alt="Adaptive verification stage"
                        style={{ maxWidth: '800px', width: '100%' }}
                      />
                    </div>
                  </li>
                  <li>
                    <strong>Execution Environment</strong>: SWE-Agent was used to
                    automatically build Docker images for all 100 repositories by
                    consulting existing container configurations, CI/CD
                    pipelines, and documentation. This massive engineering feat
                    allows SusVibes to run in <em>executable</em> real-world
                    containers. Test validation ensures: (i) the masked commit C
                    <sup>M</sup>
                    <sub>−1</sub> fails both functional and security tests; (ii)
                    the vulnerable commit C<sub>−1</sub> passes functional but
                    fails security tests; and (iii) the fixed commit C<sub>0</sub>{' '}
                    passes both. Finally, test quality is further verified and
                    augmented, checking for general security properties rather
                    than one specific implementation.
                  </li>
                </ol>
                <p>
                  This setup (illustrated above) perfectly
                  isolates the vibe coding behavior: the agent implements a
                  feature that <em>functionally</em> works (passes unit tests)
                  but may re-introduce the exact vulnerability the original
                  developer fixed.
                </p>
              </div>
            </div>
          </div>

          {/* ── Interactive Game ──────────────────────────────────── */}
          <div className="blog-section" id="game">
            <h2 className="title is-3 has-text-centered">
              Can YOU Spot the Vulnerability?
            </h2>
            <p className="subtitle has-text-centered">
              AI agents often write code that looks correct but hides dangerous
              flaws. Test your skills against real examples from SusVibes.
            </p>
            <VulnerabilityGame />
          </div>

          {/* ── Key Findings ─────────────────────────────────────── */}
          <div className="columns is-centered">
            <div className="column is-full-width">
              <h2 className="title is-3">Key Findings</h2>

              {/* Section 1 */}
              <h3 className="title is-4">
                1. Functionality ≠ Security &amp; Model Rankings
              </h3>
              <div className="content">
                <p>
                  We define <strong>SecPass</strong> as the strict intersection of
                  Functional Correctness and Security: a solution must work{' '}
                  <em>and</em> be safe.
                </p>
                <p>
                  While <strong>Claude 4 Sonnet</strong> (with SWE-Agent) achieved
                  the highest functional pass rate (57%), it was prone to
                  insecurity. In contrast, <strong>Gemini 2.5 Pro</strong> proved
                  to be the most secure model <em>conditionally</em>—when it
                  solves a task, it's least likely to introduce a vulnerability.
                  However, it struggles with complex functional requirements.
                </p>
                <p>
                  <strong>Kimi K2</strong> sits in the middle, balancing
                  capability and caution. <strong>Gemini 3 Pro</strong> more than
                  doubles Gemini 2.5 Pro's functional correctness, yet its
                  security barely improves—so it remains less secure than Gemini
                  2.5 Pro. Among frameworks, <strong>SWE-Agent</strong> was
                  generally the most secure, ahead of OpenHands and Claude Code.
                </p>
                <div className="chart-bar-container">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: '57%',
                      background: 'var(--secondary-color)',
                    }}
                  >
                    Functional: 57%
                  </div>
                </div>
                <div className="chart-bar-container">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: '11.8%',
                      background: 'var(--primary-color)',
                    }}
                  />
                  <span
                    style={{
                      marginLeft: '10px',
                      fontWeight: 'bold',
                      color: '#C41230',
                    }}
                  >
                    Secure: 11.8%
                  </span>
                </div>
                <p className="is-size-7 has-text-grey">
                  * Results for SWE-Agent + Claude 4 Sonnet.{' '}
                  <strong className="has-text-danger">
                    79.3% of the working code generated was insecure.
                  </strong>
                </p>
              </div>

              {/* Section 2 */}
              <h3 className="title is-4">2. Real-World Exploits</h3>
              <div className="content">
                <p>
                  The agents didn't just make theoretical mistakes. They
                  introduced exploitable vulnerabilities into popular frameworks.
                </p>
                <ExploitViewer />
              </div>

              {/* Section 3 */}
              <h3 className="title is-4">
                3. Complementary Blind Spots Across Models
              </h3>
              <div className="content">
                <p>
                  Using <strong>SECPASS⊥FUNCPASS</strong> — the security rate
                  measured on <em>only</em> the tasks all models solve correctly —
                  we can compare security awareness independently of coding
                  ability. Broken down by vulnerability category, no single model
                  is safest everywhere: each frontier model is the most cautious
                  on a <em>different</em> class of weakness.
                </p>

                <ScrollAnimatedSection className="catsec-wrap" id="catsec-chart">
                  {(isVisible) => (
                    <CategorySecurityChart isVisible={isVisible} />
                  )}
                </ScrollAnimatedSection>

                <div className="section-takeaway">
                  <strong>
                    Different models are cautious about entirely different
                    vulnerability types.
                  </strong>{' '}
                  Gemini 2.5 Pro is the most cautious on injection and insecure
                  design, Kimi K2 leads on cryptographic failures, and Gemini 3
                  Pro is safest on broken access control and resource exhaustion.
                  Strikingly, Claude 4 Sonnet — the strongest model on
                  functionality — tops <em>no</em> category on security. Switching
                  models doesn't guarantee safety; it merely{' '}
                  <strong>rotates the risk surface</strong>.
                </div>
              </div>

              {/* Section 4 */}
              <h3 className="title is-4">
                4. Same CWE, Different Outcomes
              </h3>
              <div className="content">
                <p>
                  Even within the same CWE (Broken Access Control), security
                  outcomes differ wildly across application domains. Toggle between
                  models to compare:
                </p>
                <HeatmapToggle />
                <p className="is-size-7 has-text-grey has-text-centered mt-0 mb-2">
                  Security rate (SECPASS⊥FUNCPASS, %) per application domain — CWE
                  Broken Access Control
                </p>
                <div className="section-takeaway">
                  For the same weakness, the security winner{' '}
                  <strong>flips by domain</strong>: Claude 4 Sonnet leads in
                  Developer Tools (33.3%), while Gemini 2.5 Pro leads in Data
                  Science (16.7%) and AI (50.0%). Coding ability and security
                  awareness are independent capabilities.
                </div>
              </div>

              {/* Section 5 */}
              <h3 className="title is-4">
                5. Can Smarter Models Close the Gap?
              </h3>
              <div className="content">
                <p>
                  Gemini 3 Pro dramatically improves functional correctness over
                  2.5 Pro. But does more intelligence mean more security?
                </p>

                <ScrollAnimatedSection
                  className="comparison-group"
                  id="comparison-bars"
                >
                  {(isVisible) => (
                    <>
                      {/* SWE-Agent */}
                      <div className="comparison-row">
                        <div className="comparison-label">SWE-Agent</div>
                        <div className="comparison-bars">
                          <div className="comparison-bar-wrap">
                            <span className="comparison-bar-tag func-tag">
                              FUNC
                            </span>
                            <div className="comparison-bar-track">
                              <div
                                className="comparison-bar-fill func-bar"
                                style={{ width: isVisible ? '60%' : '0%' }}
                              >
                                +103%
                              </div>
                            </div>
                          </div>
                          <div className="comparison-bar-wrap">
                            <span className="comparison-bar-tag sec-tag">
                              SEC
                            </span>
                            <div className="comparison-bar-track">
                              <div
                                className="comparison-bar-fill sec-bar"
                                style={{ width: isVisible ? '57%' : '0%' }}
                              >
                                +98%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="comparison-delta positive">
                          ↑ 103%
                          <br />
                          <span className="tiny">↑ 98%</span>
                        </div>
                      </div>
                      {/* OpenHands */}
                      <div className="comparison-row">
                        <div className="comparison-label">OpenHands</div>
                        <div className="comparison-bars">
                          <div className="comparison-bar-wrap">
                            <span className="comparison-bar-tag func-tag">
                              FUNC
                            </span>
                            <div className="comparison-bar-track">
                              <div
                                className="comparison-bar-fill func-bar"
                                style={{ width: isVisible ? '90%' : '0%' }}
                              >
                                +154%
                              </div>
                            </div>
                          </div>
                          <div className="comparison-bar-wrap">
                            <span className="comparison-bar-tag sec-tag">
                              SEC
                            </span>
                            <div className="comparison-bar-track">
                              <div
                                className="comparison-bar-fill sec-bar"
                                style={{ width: isVisible ? '19%' : '0%' }}
                              >
                                +33%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="comparison-delta positive">
                          ↑ 154%
                          <br />
                          <span className="tiny">↑ 33%</span>
                        </div>
                      </div>
                      {/* Claude Code */}
                      <div className="comparison-row">
                        <div className="comparison-label">Claude Code</div>
                        <div className="comparison-bars">
                          <div className="comparison-bar-wrap">
                            <span className="comparison-bar-tag func-tag">
                              FUNC
                            </span>
                            <div className="comparison-bar-track">
                              <div
                                className="comparison-bar-fill func-bar"
                                style={{ width: isVisible ? '100%' : '0%' }}
                              >
                                +171%
                              </div>
                            </div>
                          </div>
                          <div className="comparison-bar-wrap">
                            <span className="comparison-bar-tag sec-tag">
                              SEC
                            </span>
                            <div className="comparison-bar-track">
                              <div
                                className="comparison-bar-fill sec-bar"
                                style={{ width: isVisible ? '42%' : '0%' }}
                              >
                                +71%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="comparison-delta positive">
                          ↑ 171%
                          <br />
                          <span className="tiny">↑ 71%</span>
                        </div>
                      </div>
                    </>
                  )}
                </ScrollAnimatedSection>

                <p className="is-size-7 has-text-grey has-text-centered mt-0 mb-2">
                  Relative improvement from Gemini 2.5 Pro → 3 Pro. Bar width
                  represents relative change magnitude.
                </p>

                <div className="section-takeaway">
                  Functionality jumps by <strong>up to +171%</strong>, but
                  security lags far behind. Once you control for the larger
                  functional base (SECPASS⊥FUNCPASS), Gemini 3 Pro is actually{' '}
                  <strong>less secure overall than Gemini 2.5 Pro</strong>{' '}
                  (21.4% vs 30.4%). More intelligence alone is not sufficient for
                  secure code.
                </div>
              </div>

              {/* Section 6 */}
              <h3 className="title is-4">6. Failed Mitigation Strategies</h3>
              <div className="content">
                <p>
                  Beyond the default generic security reminder ("Make sure to
                  follow best security practices..."), we investigated
                  two additional mitigation strategies on SWE-Agent with Claude 4
                  Sonnet:
                </p>
                <ul>
                  <li>
                    <strong>Self-Selection</strong>: A 2-phase process where the
                    agent first identifies the most relevant CWE vulnerability
                    types from a provided list, then implements the code with
                    those risks in mind.
                  </li>
                  <li>
                    <strong>Oracle</strong>: Providing the agent with the
                    ground-truth CWE that the task targets and explicitly asking
                    it to avoid that vulnerability type.
                  </li>
                </ul>
                <p>
                  Surprisingly,{' '}
                  <strong>
                    neither strategy substantially mitigated the security problem
                  </strong>
                  . Both nudged a few more solutions to be secure, but at a real
                  cost to functionality. Self-selection dropped FuncPass from
                  57.0% to 50.0% (−7.0 pp) while only lifting SecPass from 11.8%
                  to 14.5% (+2.7 pp). Providing the oracle CWE raised SecPass to
                  15.1% (+3.3 pp) but still reduced FuncPass to 55.4% (−1.6 pp).
                </p>
                <p>
                  We hypothesize two competing trends behind these limited gains.{' '}
                  <strong>(1)</strong> Extra security prompts improve the agent's
                  ability to recognize and defend against risks, turning some
                  previously insecure solutions secure; but{' '}
                  <strong>(2)</strong> they also push the agent to over-focus on
                  security and omit functional edge cases, regressing previously
                  correct solutions to incorrect. When the second trend is strong
                  it cancels much of the first, so a strategy can raise the secure
                  fraction and yet still lower overall functional correctness.
                </p>
                <div className="has-text-centered my-4">
                  <img
                    src={`${BASE}images/fig_mitigation.png`}
                    alt="Two competing trends of security strategies across settings"
                    style={{ maxWidth: '460px', width: '100%' }}
                  />
                  <p className="is-size-7 has-text-grey mt-2 mb-0">
                    Two competing trends across settings: the securely-solved
                    fraction (green) and the once-correct-now-incorrect fraction
                    (red). Self-selection maximizes both; the oracle keeps the
                    security gain with far less regression.
                  </p>
                </div>
                <p>
                  This figure sharpens the contrast between the two strategies.
                  Measured on the tasks every setting solves,{' '}
                  <strong>self-selection is as secure as the oracle</strong> — its
                  secure fraction (green) is comparable to, even a touch above, the
                  oracle's — even though the oracle hands the agent the exact
                  ground-truth CWE to avoid. But self-selection pays for it with a
                  far larger regression spike (red), giving it the{' '}
                  <strong>largest functional drop</strong> of the two. The likely
                  reason it keeps pace with the oracle is that working out which
                  CWEs apply forces the agent to reason about the specific task
                  context, giving it a better-grounded sense of the real risk than
                  a CWE label handed to it out of context.
                </p>
              </div>

              {/* Section 7 */}
              <h3 className="title is-4">
                7. CWE Identification: Can Agents Even Recognize the Risk?
              </h3>
              <div className="content">
                <p>
                  In the self-selection setting, agents were asked to identify
                  relevant CWEs before coding. On average, agents selected{' '}
                  <strong>7.2 CWEs</strong> per task — against a ground truth of
                  just <strong>1.1</strong>. This means agents cast a very wide
                  net, tagging many vulnerability types in the hope of covering
                  the right one.
                </p>

                {/* Stat counters */}
                <ScrollAnimatedSection
                  className="stat-counters"
                  id="stat-counters"
                >
                  {(isVisible) => (
                    <>
                      <StatCounterCard
                        target={7.2}
                        decimals={1}
                        label="CWEs selected<br/>(per task, avg)"
                        isVisible={isVisible}
                      />
                      <StatCounterCard
                        target={1.1}
                        decimals={1}
                        label="Actual CWEs<br/>(ground truth)"
                        style={{ color: 'var(--primary-color)' }}
                        isVisible={isVisible}
                      />
                    </>
                  )}
                </ScrollAnimatedSection>

                <p>
                  But does this shotgun approach work? We measure{' '}
                  <strong>precision</strong> (what fraction of selected CWEs were
                  actually correct) and <strong>recall</strong> (whether the true
                  CWE was among those selected) for solutions that were both
                  functionally correct and secure:
                </p>

                {/* Progress rings */}
                <ScrollAnimatedSection
                  className="progress-rings"
                  id="progress-rings"
                >
                  {(isVisible) => (
                    <>
                      <ProgressRing
                        target={10}
                        colorClass="ring-red"
                        valueLabel="~10%"
                        label="Precision"
                        sublabel="Only ~1 in 10 selected CWEs<br/>was actually relevant"
                        isVisible={isVisible}
                      />
                      <ProgressRing
                        target={66.7}
                        colorClass="ring-green"
                        valueLabel="66.7%"
                        label="Recall"
                        sublabel="The true CWE was found<br/>~2 out of 3 times"
                        isVisible={isVisible}
                      />
                    </>
                  )}
                </ScrollAnimatedSection>

                <p>
                  There is a clear signal: solutions that end up being secure have
                  significantly higher recall (0.667 vs 0.561 for correct-but-insecure
                  solutions), suggesting that correctly identifying the right CWE
                  does help produce secure code. However, even the best recall is
                  only 66.7% — meaning agents still miss the target CWE{' '}
                  <strong>a third of the time</strong>, even after selecting
                  7× more CWEs than necessary.
                </p>

                <div className="section-takeaway">
                  Agents <strong>hedge by selecting many CWEs</strong>, most
                  irrelevant (~10% precision). Even then, they still miss the
                  target CWE about a third of the time. Current coding agents
                  have{' '}
                  <strong>
                    fundamental difficulty identifying security risks
                  </strong>{' '}
                  from task descriptions alone.
                </div>
              </div>

              {/* Section 8 */}
              <h3 className="title is-4">
                8. Security vs. Functionality: A Deeper Tension
              </h3>
              <div className="content">
                <p>
                  In agent-powered software engineering, agents make high-level
                  decisions about what to do (finding context files, checking
                  bugs, reviewing feedback) before implementing code. These
                  high-level decisions function as an "outline" that increases the
                  agent's freedom and sensitivity. This may explain why it is so
                  difficult to balance security and functionality, especially in
                  tasks that highly require both.
                </p>
                <p>
                  As a concrete example, SWE-Agent was given the same Wagtail
                  inspection task twice — once normally, and once with explicit
                  security instructions:
                </p>

                <ScrollAnimatedSection
                  className="step-counter-demo"
                  id="step-counter-demo"
                >
                  {(isVisible) => (
                    <>
                      <div className="step-counter-row success-row">
                        <div className="step-icon">🛡️</div>
                        <div className="step-details">
                          <div className="step-details-label">
                            Without security prompts
                          </div>
                          <div
                            className="step-details-bar"
                            style={{ display: 'flex' }}
                          >
                            <div
                              className="step-details-fill fill-green"
                              style={{
                                width: isVisible ? '100%' : '0%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#fff',
                              }}
                            >
                              81 steps on functionality
                            </div>
                          </div>
                          <div className="step-details-sub">
                            <span>Total: 81 steps</span>
                            <span>Correctly &amp; securely resolved</span>
                          </div>
                        </div>
                        <div className="step-result result-pass">✅ Passed</div>
                      </div>
                      <div className="step-counter-row fail-row">
                        <div className="step-icon">⚠️</div>
                        <div className="step-details">
                          <div className="step-details-label">
                            With security prompts
                          </div>
                          <div
                            className="step-details-bar"
                            style={{ display: 'flex' }}
                          >
                            <div
                              className="step-details-fill fill-red"
                              style={{
                                width: isVisible ? '89%' : '0%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#fff',
                                borderRadius: '4px 0 0 4px',
                              }}
                            >
                              72 steps on functionality
                            </div>
                            <div
                              className="step-sec-fill"
                              style={{
                                width: isVisible ? '5%' : '0%',
                                height: '100%',
                                background:
                                  'linear-gradient(90deg,#fbbf24,#d97706)',
                                borderRadius: '0 4px 4px 0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#fff',
                                transition:
                                  'width 1.5s cubic-bezier(0.22,1,0.36,1)',
                              }}
                            >
                              4
                            </div>
                          </div>
                          <div className="step-details-sub">
                            <span>
                              Total: 76 steps (72 func + 4 security)
                            </span>
                            <span>Failed functionality</span>
                          </div>
                        </div>
                        <div className="step-result result-fail">❌ Failed</div>
                      </div>
                    </>
                  )}
                </ScrollAnimatedSection>

                <p>
                  The agent spent <strong>4 steps on explicit security testing</strong>{' '}
                  but only 72 on functionality — 9 fewer than it needed. The
                  result: the agent <em>failed</em> the task entirely. The more
                  specific the security prompts, the larger the performance drops.
                  This suggests that security awareness cannot simply be
                  "bolted on" to existing agents via prompting.
                </p>

                <div className="section-takeaway">
                  Prompting alone appears <strong>insufficient</strong> to bolt
                  security onto existing agents — closing the gap likely calls for{' '}
                  <strong>better security strategies</strong>, with more rigorous
                  training and structured planning rather than security as an
                  afterthought.
                </div>
              </div>

              {/* Section 9 */}
              <h3 className="title is-4">9. Conclusion</h3>
              <div className="content">
                <p>
                  SusVibes reveals a persistent and disturbing gap in AI-powered
                  software development:{' '}
                  <strong>
                    agents frequently achieve functional correctness yet
                    systematically fail security checks on the same tasks
                  </strong>
                  . The best-performing combination (SWE-Agent + Claude 4 Sonnet)
                  achieves 57% functionality but leaves nearly 80% of working code
                  insecure.
                </p>
                <p>
                  Simple mitigation attempts — including security prompting, CWE
                  self-identification, or even providing the oracle CWE hints — do
                  not reliably close this gap. These strategies trigger a
                  counter-productive trade-off: improvements in security
                  recognition are overwhelmed by regressions in functional
                  correctness. Even next-generation models like Gemini 3 Pro,
                  despite massive functional improvements, show negligible
                  security gains.
                </p>
                <p>
                  The finding that nearly 80% of functionally correct agent-generated
                  code contains exploitable vulnerabilities has profound
                  implications for organizations deploying coding agents in
                  security-sensitive domains including authentication, data
                  handling, and infrastructure. These results caution against the
                  casual adoption of vibe coding and argue that{' '}
                  <strong>
                    security must be treated as a first-class objective
                  </strong>{' '}
                  — not an afterthought — for general-purpose coding agents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BibTeX ───────────────────────────────────────────────── */}
      <BibtexSection />
    </div>
  )
}
