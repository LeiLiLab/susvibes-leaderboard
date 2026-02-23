import { useState, useRef, useEffect } from 'react'
import './BlogContent.css'
import '../assets/css/bulma-scoped.css'
import '../assets/css/custom.css'
import VulnerabilityGame from './VulnerabilityGame'
import ExploitViewer from './ExploitViewer'
import Carousel from './Carousel'
import HeatmapToggle from './HeatmapToggle'
import ScrollAnimatedSection from './ScrollAnimatedSection'
import { useLightbox } from './ImageLightbox'

const BASE = import.meta.env.BASE_URL

/* ── Carousel slide data for Section 3 ───────────────────────────── */
const mitigationSlides = [
  {
    image: `${BASE}images/figure 4.png`,
    alt: 'Heatmap of Generic vs Oracle Setting outcomes',
    caption: (
      <>
        <strong>Figure 4.</strong> Transition matrix of evaluation outcomes from
        generic to oracle setting. Rows denote the outcome under generic and
        columns denote that under oracle. Each cell reports the percentage of all
        tasks that transition from the row outcome to the column outcome.
      </>
    ),
  },
  {
    image: `${BASE}images/figure 6.png`,
    alt: 'Adaptive Verification Pipeline detail',
    caption: (
      <>
        <strong>Figure 6.</strong> Verification pipeline where SUSVIBES's feature
        mask and the task are generated, verified, and adaptively adjusted. In
        detail, (i) an initial mask is generated on the vulnerable commit before
        the security fix, i.e., masking out a feature from its vulnerable
        implementation; (ii) a task description is generated to describe the
        functionality of this masked implementation; (iii) a verifier agent is
        used to check whether the generated task description covers all lines of
        feature implementation plus the security fixes, by linking each code line
        to a requirement in the description. If any line in the secure
        implementation is not mentioned by the task description, it will go back
        to step (i) to regenerate a larger mask; otherwise, the task description
        and the mask will be returned.
      </>
    ),
  },
  {
    image: `${BASE}images/figure 7.png`,
    alt: 'Venn diagrams of vulnerability blind spots across models and agents',
    caption: (
      <>
        <strong>Figure 7.</strong> Distributions of the CWEs each model or
        framework is able to avoid with over 25% pass rate. This rate is assessed
        on the intersection of correctly-solved instances. The areas in the Venn
        diagram approximately represent the proportions
      </>
    ),
  },
]

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
        <code ref={bibtexRef}>{`@article{zhao2025susvibes,
  title={Is Vibe Coding Safe? Benchmarking Vulnerability of Agent-Generated Code in Real-World Tasks},
  author={Zhao, Songwen and Wang, Danqing and Zhang, Kexun and Luo, Jiaxuan and Li, Zhuo and Li, Lei},
  journal={arXiv preprint arXiv:2512.03262},
  year={2025}
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
                <p
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
                  <sup>1</sup>
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
                    <sup>1,3</sup>,
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

                <div className="is-size-6 publication-authors">
                  <span className="author-block">
                    <a href="mailto:danqingw@cs.cmu.edu">
                      {'{'} danqingw, kexunz, leili {'}'}@cs.cmu.edu
                    </a>
                  </span>
                  <br />
                  <span className="author-block">
                    <a href="mailto:sz3296@columbia.edu">
                      sz3296@columbia.edu
                    </a>
                  </span>
                </div>

                <div className="column has-text-centered">
                  <div className="publication-links">
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
              src={`${BASE}images/task4-1.jpg`}
              alt="SusVibes Example"
            />

            <div className="teaser-stats mt-5">
              <div className="teaser-stat-col">
                <p>Functional Solutions</p>
                <div className="stat-number has-text-success">61.0%</div>
                <p className="is-size-7">Code works as intended</p>
              </div>
              <div className="teaser-arrow">
                <i className="fas fa-arrow-right fa-2x" />
              </div>
              <div className="teaser-stat-col">
                <p>Secure Solutions</p>
                <div className="stat-number has-text-danger">10.5%</div>
                <p className="is-size-7">But contains critical vulnerabilities</p>
              </div>
            </div>

            <h2 className="subtitle has-text-centered mt-4">
              <span className="dnerf">SusVibes</span> reveals that while AI
              agents can write working code, <strong>over 80%</strong> of it is
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
                  benchmark of 200 feature-request software engineering tasks
                  from real-world open-source projects. We evaluate multiple
                  coding agents (SWE-Agent, OpenHands, Claude Code).
                  Disturbingly, all agents perform poorly in security. Although{' '}
                  <strong>61%</strong> of solutions from SWE-Agent with{' '}
                  <strong>Claude 4 Sonnet</strong> are functionally correct, only{' '}
                  <strong>10.5%</strong> are secure.
                </p>
                <p>
                  Our findings, benchmarked across{' '}
                  <strong>Claude 4 Sonnet</strong>,{' '}
                  <strong>Gemini 2.5 Pro</strong>, and{' '}
                  <strong>Kimi K2</strong>, raise serious concerns about the
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
                  SusVibes is designed to mimic real-world "vibe coding"
                  scenarios. Unlike previous benchmarks that focus on single
                  files or functions, SusVibes operates at the{' '}
                  <strong>repository level</strong>.
                </p>
                <ul>
                  <li>
                    <strong>200 Tasks</strong> derived from 108 open-source
                    projects (Django, Flask, etc.).
                  </li>
                  <li>
                    <strong>77 CWE Types</strong> (Common Weakness Enumerations)
                    covered.
                  </li>
                  <li>
                    <strong>150k+ Lines of Code</strong> context per task on
                    average.
                  </li>
                </ul>

                <div className="has-text-centered my-4">
                  <img
                    src={`${BASE}images/figure 2.png`}
                    alt="Domain Coverage"
                  />
                </div>

                <h3 className="title is-4 mt-4">
                  Methodology: The "Masking" Pipeline
                </h3>
                <p>
                  The benchmark was constructed using a novel pipeline to ensure
                  realism:
                </p>
                <ol>
                  <li>
                    <strong>Mining</strong>: The authors collected over 20,000
                    open-source vulnerability-fixing commits over the past 10
                    years from existing datasets (ReposVul and MoreFixes),
                    filtering to ~3,000 Python projects using Python ≥3.7. They
                    further filtered to commits that modify tests, ensuring each
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
                    <strong>Masking</strong>: They reverted to the preceding
                    commit C<sub>−1</sub> (the vulnerable version) and used
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
                        src={`${BASE}images/tmp_2-1.jpg`}
                        alt="Verification Pipeline"
                      />
                    </div>
                  </li>
                  <li>
                    <strong>Execution Environment</strong>: SWE-Agent was used to
                    automatically build Docker images for all 108 repositories by
                    consulting existing container configurations, CI/CD
                    pipelines, and documentation. This massive engineering feat
                    allows SusVibes to run in <em>executable</em> real-world
                    containers. Test validation ensures: (i) the masked commit C
                    <sup>M</sup>
                    <sub>−1</sub> fails both functional and security tests; (ii)
                    the vulnerable commit C<sub>−1</sub> passes functional but
                    fails security tests; and (iii) the fixed commit C<sub>0</sub>{' '}
                    passes both.
                  </li>
                </ol>
                <p>
                  This setup (visualized in Figure 2 of the paper) perfectly
                  isolates the "Vibe Coding" behavior: the agent implements a
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
              flaws. Test your skills against real examples found in the study.
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
                  the highest functional pass rate (61%), it was prone to
                  insecurity. In contrast, <strong>Gemini 2.5 Pro</strong> proved
                  to be the most secure model <em>conditionally</em>—when it
                  solves a task, it's less likely to introduce a vulnerability.
                  However, it struggles with complex functional requirements.
                </p>
                <p>
                  <strong>Kimi K2</strong> sits in the middle, balancing
                  capability and caution better than Claude but not reaching
                  Gemini's safety peaks. Notably, <strong>OpenHands</strong> was
                  generally more secure than SWE-Agent across all models.
                </p>
                <div className="chart-bar-container">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: '61%',
                      background: 'var(--secondary-color)',
                    }}
                  >
                    Functional: 61%
                  </div>
                </div>
                <div className="chart-bar-container">
                  <div
                    className="chart-bar-fill"
                    style={{
                      width: '10.5%',
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
                    Secure: 10.5%
                  </span>
                </div>
                <p className="is-size-7 has-text-grey">
                  * Results for SWE-Agent + Claude 4 Sonnet.{' '}
                  <strong className="has-text-danger">
                    82.8% of the working code generated was insecure.
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
              <h3 className="title is-4">3. Failed Mitigation Strategies</h3>
              <div className="content">
                <p>
                  Beyond the default generic security reminder ("Make sure to
                  follow best security practices..."), the authors investigated
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
                    <strong>Oracle CWE</strong>: Providing the agent with the
                    ground-truth CWE that the task targets and explicitly asking
                    it to avoid that vulnerability type.
                  </li>
                </ul>
                <p>
                  Surprisingly,{' '}
                  <strong>
                    neither strategy improved the number of secure solutions
                  </strong>
                  . Self-selection dropped FUNCPASS from 61.0% to 52.5% (−8.5 pp)
                  while SECPASS fell from 10.5% to 9.5%. Even providing the oracle
                  CWE only maintained SECPASS at 10.5% while reducing FUNCPASS to
                  56.0% (−5.5 pp). The agents became{' '}
                  <strong>"over-defensive"</strong>—obsessing over security checks
                  to the point where they broke the actual feature logic or
                  mishandled functional edge cases.
                </p>
                <p>
                  This is caused by two competing trends when giving agents extra
                  security prompts: <strong>(1)</strong> The prompts improve the
                  agent's ability to defend against security risks, turning some
                  previously insecure solutions into secure ones; but{' '}
                  <strong>(2)</strong> the prompts cause previously correct
                  solutions to regress to incorrect, as agents overly focus on
                  security and omit functional edge cases. The net effect is that
                  the second trend dominates, leading to an overall performance
                  drop.
                </p>
                <Carousel slides={mitigationSlides} id="mitigation" />
              </div>

              {/* Section 4 */}
              <h3 className="title is-4">
                4. Complementary Blind Spots Across Models
              </h3>
              <div className="content">
                <p>
                  To compare security awareness independently of coding ability,
                  the authors define <strong>SECPASS⊥FUNCPASS</strong>: the
                  security rate on <em>only</em> the tasks all models solve
                  correctly.
                </p>

                <ScrollAnimatedSection className="blind-spot-bars" id="blind-spot-bars">
                  {(isVisible) => (
                    <>
                      <div className="bar-row">
                        <span className="bar-label">Gemini 2.5 Pro</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill bar-gold"
                            style={{ width: isVisible ? '55%' : '0%' }}
                          >
                            27.6%
                          </div>
                        </div>
                      </div>
                      <div className="bar-row">
                        <span className="bar-label">Kimi K2</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill bar-silver"
                            style={{ width: isVisible ? '41%' : '0%' }}
                          >
                            20.7%
                          </div>
                        </div>
                      </div>
                      <div className="bar-row">
                        <span className="bar-label">Claude 4 Sonnet</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill bar-bronze"
                            style={{ width: isVisible ? '34%' : '0%' }}
                          >
                            17.2%
                          </div>
                        </div>
                      </div>
                      <p className="is-size-7 has-text-grey has-text-centered mt-3 mb-0">
                        Conditional security rate (SECPASS⊥FUNCPASS, %) — OpenHands
                        framework
                      </p>
                    </>
                  )}
                </ScrollAnimatedSection>

                <div className="section-takeaway">
                  <strong>
                    58% of CWE blind spots were unique to specific models
                  </strong>{' '}
                  — different LLMs are cautious about entirely different
                  vulnerability types. Switching models doesn't guarantee safety;
                  it merely <strong>rotates the risk surface</strong>.
                </div>
              </div>

              {/* Section 5 */}
              <h3 className="title is-4">
                5. Same CWE, Different Outcomes
              </h3>
              <div className="content">
                <p>
                  Even within the same CWE, security outcomes differ wildly across
                  repositories. Toggle between models to compare:
                </p>
                <HeatmapToggle />
                <p className="is-size-7 has-text-grey has-text-centered mt-0 mb-2">
                  Security rate (SECPASS⊥FUNCPASS, %) per repository — SWE-Agent
                </p>
                <div className="section-takeaway">
                  Claude 4 Sonnet achieves 58.8% functionality on Django but{' '}
                  <strong>0% conditional security</strong>, while Gemini manages{' '}
                  <strong>100% security</strong> despite lower functionality.
                  Coding ability and security awareness are independent
                  capabilities.
                </div>
              </div>

              {/* Section 6 */}
              <h3 className="title is-4">
                6. Can Smarter Models Close the Gap?
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
                                style={{ width: isVisible ? '69%' : '0%' }}
                              >
                                +95%
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
                                style={{ width: isVisible ? '41%' : '0%' }}
                              >
                                +57%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="comparison-delta positive">
                          ↑ 95%
                          <br />
                          <span className="tiny">↑ 57%</span>
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
                                style={{ width: isVisible ? '97%' : '0%' }}
                              >
                                +149%
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
                                style={{ width: isVisible ? '5%' : '0%' }}
                              >
                                +6%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="comparison-delta positive">
                          ↑ 149%
                          <br />
                          <span className="tiny">↑ 6%</span>
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
                                style={{ width: isVisible ? '86%' : '0%' }}
                              >
                                +130%
                              </div>
                            </div>
                          </div>
                          <div className="comparison-bar-wrap">
                            <span className="comparison-bar-tag sec-tag">
                              SEC
                            </span>
                            <div className="comparison-bar-track">
                              <div
                                className="comparison-bar-fill sec-bar-flat"
                                style={{ width: isVisible ? '2%' : '0%' }}
                              >
                                ±0%
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="comparison-delta flat">
                          ↑ 130%
                          <br />
                          <span className="flat">±0%</span>
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
                  Functionality improves by <strong>up to +149%</strong>, but
                  security gains are <strong>negligible or zero</strong>. More
                  intelligence alone is not sufficient for secure code.
                </div>
              </div>

              {/* Section 7 */}
              <h3 className="title is-4">
                7. CWE Identification: Can Agents Even Recognize the Risk?
              </h3>
              <div className="content">
                <p>
                  In the self-selection setting, agents were asked to identify
                  relevant CWEs before coding. On average, agents selected{' '}
                  <strong>7.5 CWEs</strong> per task — against a ground truth of
                  just <strong>1.06</strong>. This means agents cast a very wide
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
                        target={7.5}
                        decimals={1}
                        label="CWEs selected<br/>(per task, avg)"
                        isVisible={isVisible}
                      />
                      <StatCounterCard
                        target={1.06}
                        decimals={2}
                        label="Actual CWEs<br/>(ground truth)"
                        style={{ color: 'var(--primary-color)' }}
                        isVisible={isVisible}
                      />
                    </>
                  )}
                </ScrollAnimatedSection>

                <p>
                  But does this shotgun approach work? The paper measures{' '}
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
                        target={73.7}
                        colorClass="ring-green"
                        valueLabel="73.7%"
                        label="Recall"
                        sublabel="The true CWE was found<br/>~3 out of 4 times"
                        isVisible={isVisible}
                      />
                    </>
                  )}
                </ScrollAnimatedSection>

                <p>
                  There is a clear signal: solutions that end up being secure have
                  significantly higher recall (0.737 vs 0.609 for insecure
                  solutions), suggesting that correctly identifying the right CWE
                  does help produce secure code. However, even the best recall is
                  only 73.7% — meaning agents still miss the target CWE{' '}
                  <strong>over a quarter of the time</strong>, even after selecting
                  7× more CWEs than necessary.
                </p>

                <div className="section-takeaway">
                  Agents <strong>hedge by selecting many CWEs</strong>, most
                  irrelevant (~10% precision). Even then, they still miss the
                  target CWE over a quarter of the time. Current coding agents
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
                  Security awareness <strong>cannot be bolted on</strong> via
                  prompting — it must be treated as a{' '}
                  <strong>first-class training objective</strong>.
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
                  achieves 61% functionality but leaves over 80% of working code
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
                  The finding that 80%+ of functionally correct agent-generated
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

      {/* ── Blog Template Footer ─────────────────────────────────── */}
      <div className="blog-template-footer">
        <p>
          This website is based on the{' '}
          <a href="https://github.com/nerfies/nerfies.github.io">Nerfies</a>{' '}
          template. Content adapted from the{' '}
          <a href="https://arxiv.org/abs/2512.03262">SusVibes paper</a>.
        </p>
      </div>
    </div>
  )
}
