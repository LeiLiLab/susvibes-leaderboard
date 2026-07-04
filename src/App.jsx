import { useState, useEffect } from 'react'
import './App.css'
import TrajectoryVisualizer from './components/TrajectoryVisualizer'
import Leaderboard from './components/Leaderboard'
import BlogContent from './components/BlogContent'
import ImageLightbox from './components/ImageLightbox'

function App() {

  // Initialize currentView based on URL hash
  const getInitialView = () => {
    const hash = window.location.hash.slice(1) // Remove the '#'
    if (hash === 'leaderboard') return 'leaderboard'
    if (hash === 'trajectory-visualizer') return 'trajectory-visualizer'
    if (hash === 'blog') return 'blog'
    // Redirect deprecated routes to home
    if (hash === 'results' || hash === 'docs') {
      window.history.replaceState(null, '', '#home')
      return 'home'
    }
    return 'home'
  }

  const [currentView, setCurrentView] = useState(getInitialView())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Handle navigation with URL updates
  const navigateTo = (view) => {
    setCurrentView(view)
    setMobileMenuOpen(false) // Close mobile menu when navigating
    if (view === 'home') {
      window.history.pushState(null, '', '#home')
    } else if (view === 'leaderboard') {
      window.history.pushState(null, '', '#leaderboard')
    } else if (view === 'trajectory-visualizer') {
      window.history.pushState(null, '', '#trajectory-visualizer')
    } else if (view === 'blog') {
      window.history.pushState(null, '', '#blog')
    }
  }

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }



  // Listen for browser back/forward button clicks and handle mobile menu
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      if (hash === 'leaderboard') {
        setCurrentView('leaderboard')
      } else if (hash === 'trajectory-visualizer') {
        setCurrentView('trajectory-visualizer')
      } else if (hash === 'blog') {
        setCurrentView('blog')
      } else if (hash === 'results' || hash === 'docs') {
        // Redirect deprecated routes to home
        window.history.replaceState(null, '', '#home')
        setCurrentView('home')
      } else {
        setCurrentView('home')
      }
    }

    const handlePopState = () => {
      handleHashChange()
    }

    // Close mobile menu when clicking outside
    const handleClickOutside = (event) => {
      if (mobileMenuOpen && !event.target.closest('.nav-container')) {
        setMobileMenuOpen(false)
      }
    }

    // Listen to events
    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('popstate', handlePopState)
    document.addEventListener('click', handleClickOutside)

    // Set initial URL if none exists
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#home')
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [mobileMenuOpen])

  return (
    <div className="App">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-main" onClick={() => navigateTo('home')}>
              <span className="tau-symbol">SusVibes</span>
            </div>
            <a href="https://leililab.github.io/" target="_blank" rel="noopener noreferrer" className="logo-attribution">
              <img src={`${import.meta.env.BASE_URL}logos/logo_cmu_lti.jpg`} alt="CMU LTI" className="lti-logo" />
              <span className="from-text">from Lei Li Lab</span>
            </a>
          </div>
          <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className={`nav-links ${mobileMenuOpen ? '' : 'mobile-hidden'}`}>
            <button onClick={() => navigateTo('home')} className={`nav-link ${currentView === 'home' ? 'active' : ''}`}>Overview</button>
            <button onClick={() => navigateTo('blog')} className={`nav-link ${currentView === 'blog' ? 'active' : ''}`}>Blog</button>
            <button onClick={() => navigateTo('leaderboard')} className={`nav-link ${currentView === 'leaderboard' ? 'active' : ''}`}>Leaderboard</button>
            <button onClick={() => navigateTo('trajectory-visualizer')} className={`nav-link ${currentView === 'trajectory-visualizer' ? 'active' : ''}`}>Visualizer</button>
            <a href="https://github.com/LeiLiLab/susvibes" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>GitHub</a>
          </div>
        </div>
      </nav>

      {/* Update Notification */}
      <div className="update-notification">
        <div className="notification-container">
          <span className="notification-badge">SusVibes</span>
          <span className="notification-text">
             Evaluating Vibe Coding agents on real-world tasks with functional correctness and security metrics.
          </span>
        </div>
      </div>

      {/* Conditional Content Rendering */}
      {currentView === 'home' ? (
        <>
          {/* Hero: title, then news (below title / above buttons), then image+description, then button-row */}
          <section className="hero hero-with-news">
            <div className="hero-container-vertical">
              <div className="hero-content-vertical">
                <div className="hero-title-section">
                  <h1 className="hero-main-title">
                    <span className="tau-symbol">SusVibes</span>
                  </h1>
                </div>

                {/* Left: image + description + buttons. Right: Recent News */}
                <div className="hero-news-row">
                  <div className="hero-left-column">
                    <div className="hero-image-section">
                      <ImageLightbox
                        src={`${import.meta.env.BASE_URL}images/task_overview.webp`}
                        alt="A SusVibes feature-request task: the vibe-coding agent adds a feature to a codebase in a sandboxed execution environment, and the solution patch is tested with human-written functional and security tests."
                        className="hero-figure"
                      />
                      <p className="hero-image-caption">
                        A SusVibes Task: a vibe-coding agent adds a requested feature to a codebase, and its solution patch is judged by functional and security tests. <span className="hero-image-zoom-hint">Click to zoom.</span>
                      </p>
                    </div>
                  </div>
                  <aside className="news-sidebar">
                    <div className="news-block news-block-narrow">
                      <div className="news-header">
                        <h3>Recent News</h3>
                      </div>
                      <div className="news-content">
                        <div className="news-list">
                          <a href="https://openreview.net/forum?id=qG8g00zRZa" target="_blank" rel="noopener noreferrer" className="news-item">
                            <div className="news-icon">🎓</div>
                            <div className="news-text">
                              <strong>SusVibes accepted at ICML 2026 and will be presented in Seoul!</strong>
                              <span>Jul 9, 2026</span>
                            </div>
                            <div className="news-arrow">→</div>
                          </a>
                          <a href="#blog" className="news-item">
                            <div className="news-icon">✨</div>
                            <div className="news-text">
                              <strong>See our blog post with interactive visualization of the SusVibes benchmark!</strong>
                              <span>Feb 23, 2026</span>
                            </div>
                            <div className="news-arrow">→</div>
                          </a>
                          <a href="#leaderboard" className="news-item">
                            <div className="news-icon">🆕</div>
                            <div className="news-text">
                              <strong>Updated results for GLM 4.7 Flash on our SusVibes benchmark!</strong>
                              <span>Feb 16, 2026</span>
                            </div>
                            <div className="news-arrow">→</div>
                          </a>
                          <a href="#leaderboard" className="news-item">
                            <div className="news-icon">🆕</div>
                            <div className="news-text">
                              <strong>Updated results for Gemini 3.0 Pro and Gemini CLI on our SusVibes benchmark!</strong>
                              <span>Feb 3, 2026</span>
                            </div>
                            <div className="news-arrow">→</div>
                          </a>
                          <a href="https://github.com/LeiLiLab/susvibes-leaderboard" target="_blank" rel="noopener noreferrer" className="news-item">
                            <div className="news-icon">🎉</div>
                            <div className="news-text">
                              <strong>SusVibes leaderboard released: Check whether your Vibe Coding agent is safe!</strong>
                              <span>December 29, 2025</span>
                            </div>
                            <div className="news-arrow">→</div>
                          </a>
                          <a href="https://github.com/LeiLiLab/susvibes" target="_blank" rel="noopener noreferrer" className="news-item">
                            <div className="news-icon">📊</div>
                            <div className="news-text">
                              <strong>SusVibes benchmark released!</strong>
                              <span>Dec 2, 2025</span>
                            </div>
                            <div className="news-arrow">→</div>
                          </a>
                          <a href="https://arxiv.org/abs/2512.03262" target="_blank" rel="noopener noreferrer" className="news-item">
                            <div className="news-icon">📝</div>
                            <div className="news-text">
                              <strong>Is Vibe Coding Safe? Benchmarking Vulnerability of Agent-Generated Code in Real-World Tasks</strong>
                              <span>Dec 2, 2025</span>
                            </div>
                            <div className="news-arrow">→</div>
                          </a>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="hero-actions">
                  <a href="https://github.com/LeiLiLab/susvibes" target="_blank" rel="noopener noreferrer">
                    <button className="btn-secondary">View on GitHub</button>
                  </a>
                  <button onClick={() => navigateTo('leaderboard')} className="btn-secondary">
                    View Leaderboard
                  </button>
                  <a href="https://github.com/LeiLiLab/susvibes-leaderboard/blob/main/README.md" target="_blank" rel="noopener noreferrer">
                    <button className="btn-secondary">Submit Results</button>
                  </a>
                  <a href="https://openreview.net/pdf?id=qG8g00zRZa" target="_blank" rel="noopener noreferrer">
                    <button className="btn-secondary">Read Paper</button>
                  </a>
                  <button onClick={() => navigateTo('blog')} className="btn-secondary">
                    Read Blog Post
                  </button>
                </div>
              </div>
            </div>
          </section>

        </>
      ) : currentView === 'leaderboard' ? (
        <Leaderboard />
      ) : currentView === 'trajectory-visualizer' ? (
        <TrajectoryVisualizer />
      ) : currentView === 'blog' ? (
        <div className="container blog-content-wrapper">
          <BlogContent />
        </div>
      ) : null}

      {/* Simple Footer */}
      <footer className="simple-footer">
        <div className="container">
          <p>
            For questions or feedback, contact{' '}
            <a href="mailto:songwen.zhao@columbia.edu" className="footer-email">
              songwen.zhao@columbia.edu
            </a>
            {' '}or{' '}
            <a href="mailto:danqingw@cs.cmu.edu" className="footer-email">
              danqingw@cs.cmu.edu
            </a>
          </p>
          {currentView === 'blog' && (
            <p className="simple-footer-attribution">
              This website is based on the{' '}
              <a href="https://github.com/nerfies/nerfies.github.io" target="_blank" rel="noopener noreferrer" className="footer-email">
                Nerfies
              </a>{' '}
              template. Blog content adapted from the{' '}
              <a href="https://arxiv.org/abs/2512.03262" target="_blank" rel="noopener noreferrer" className="footer-email">
                SusVibes paper
              </a>
              .
            </p>
          )}
        </div>
      </footer>

    </div>
  )
}

export default App
