import { useState, useEffect } from 'react'
import './App.css'
import TrajectoryVisualizer from './components/TrajectoryVisualizer'
import Leaderboard from './components/Leaderboard'

function App() {
  
  // Initialize currentView based on URL hash
  const getInitialView = () => {
    const hash = window.location.hash.slice(1) // Remove the '#'
    if (hash === 'leaderboard') return 'leaderboard'
    if (hash === 'trajectory-visualizer') return 'trajectory-visualizer'
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
              <img src={`${import.meta.env.BASE_URL}cmu_lti_logo_sm.jpg`} alt="CMU LTI" className="lti-logo" />
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
            <button onClick={() => navigateTo('leaderboard')} className={`nav-link ${currentView === 'leaderboard' ? 'active' : ''}`}>Leaderboard</button>
            <button onClick={() => navigateTo('trajectory-visualizer')} className={`nav-link ${currentView === 'trajectory-visualizer' ? 'active' : ''}`}>Visualizer</button>
            <a href="https://github.com/LeiLiLab/susvibes-leaderboard" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>GitHub</a>
          </div>
        </div>
      </nav>

      {/* Update Notification */}
      <div className="update-notification">
        <div className="notification-container">
          <span className="notification-badge">NEW</span>
          <span className="notification-text">
            SusVibes benchmark for evaluating Vibe Coding agents on real-world tasks with functional correctness and security metrics.
          </span>
        </div>
      </div>

      {/* Conditional Content Rendering */}
      {currentView === 'home' ? (
        <>
          {/* Hero Section */}
          <section className="hero">
            <div className="hero-container-vertical">
              <div className="hero-content-vertical">
                <div className="hero-title-section">
                  <h1 className="hero-main-title">
                    <span className="tau-symbol">SusVibes</span>
                  </h1>
                </div>
                
                <div className="hero-image-section">
                  <img src={`${import.meta.env.BASE_URL}example.jpg`} alt="Sample SusVibes Tasks" className="trajectory-image" />
                </div>
                
                <div className="hero-description-section">
                  <p className="hero-description">
                  An agent is started inside a docker environment and tasked with adding a feature to an existing code base. 
                  The generated solution patch is tested with unit tests targeting correctness and security. 
                  </p>
                  <div className="hero-actions">
                    <div className="button-row">
                      <a href="https://github.com/LeiLiLab/susvibes" target="_blank" rel="noopener noreferrer">
                        <button className="btn-primary">View on GitHub</button>
                      </a>
                      <button onClick={() => navigateTo('leaderboard')} className="btn-secondary">
                        View Leaderboard
                      </button>
                      <a href="https://github.com/LeiLiLab/susvibes-leaderboard/blob/main/README.md" target="_blank" rel="noopener noreferrer">
                        <button className="btn-secondary">Submit Results</button>
                      </a>
                    </div>
                    <div className="button-row">
                      <a href="https://arxiv.org/abs/2512.03262" target="_blank" rel="noopener noreferrer">
                        <button className="btn-secondary">Read Paper</button>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

      {/* News Section */}
      <section className="news">
        <div className="container">
          <div className="news-block">
            <div className="news-header">
              <h3>Recent News</h3>
            </div>
            
            <div className="news-content">
              <div className="news-list">
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
        </div>
      </section>

        </>
      ) : currentView === 'leaderboard' ? (
        <Leaderboard />
      ) : currentView === 'trajectory-visualizer' ? (
        <TrajectoryVisualizer />
      ) : null}

      {/* Simple Footer */}
      <footer className="simple-footer">
        <div className="container">
          <p>
            For questions or feedback, contact{' '}
            <a href="mailto:victor@sierra.ai" className="footer-email">
              victor@sierra.ai
            </a>
            {' '}or{' '}
            <a href="mailto:ben.s@sierra.ai" className="footer-email">
              ben.s@sierra.ai
            </a>
          </p>
        </div>
      </footer>

    </div>
  )
}

export default App
