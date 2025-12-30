import { useState, useEffect } from 'react'
import './Leaderboard.css'

const Leaderboard = () => {
  // Chart state for leaderboard
  const [chartInstance, setChartInstance] = useState(null)
  // Add leaderboard view state with localStorage persistence
  const [leaderboardView, setLeaderboardView] = useState(() => {
    return localStorage.getItem('leaderboardView') || 'table'
  })
  // Domain is always Python for SusVibes
  const [domain] = useState('python')
  // Add sorting state for table with localStorage persistence
  const [sortColumn, setSortColumn] = useState(() => {
    return localStorage.getItem('sortColumn') || 'funcpass1'
  })
  const [sortDirection, setSortDirection] = useState(() => {
    return localStorage.getItem('sortDirection') || 'desc'
  })
  // Add submission type filter state (standard vs custom)
  const [showStandard, setShowStandard] = useState(() => {
    const stored = localStorage.getItem('showStandard')
    return stored === null ? true : stored === 'true'
  })
  const [showCustom, setShowCustom] = useState(() => {
    const stored = localStorage.getItem('showCustom')
    return stored === null ? false : stored === 'true'
  })
  // Info tooltip state
  const [showFilterInfo, setShowFilterInfo] = useState(false)
  
  // Add state for dynamically loaded data
  const [passKData, setPassKData] = useState({})
  const [fullSubmissionData, setFullSubmissionData] = useState({}) // Store full submission.json data
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  
  // Modal state for submission details
  const [showModal, setShowModal] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  
  // Chart legend data state
  const [chartLegendData, setChartLegendData] = useState(null)
  const [modalClosing, setModalClosing] = useState(false)

  // Helper function to create composite key from agent framework and model name
  const createAgentName = (agentFramework, modelName) => {
    const framework = agentFramework || 'unknown'
    return `${modelName}::${framework}`
  }

  // Helper function to parse agent name
  const parseAgentName = (agentName) => {
    const parts = agentName.split('::')
    return {
      modelName: parts[0],
      agentFramework: parts[1] === 'unknown' ? null : parts[1]
    }
  }

  // Function to handle model click and show details
  const handleModelClick = (agentName) => {
    const submissionData = fullSubmissionData[agentName]
    if (submissionData) {
      setSelectedSubmission(submissionData)
      setShowModal(true)
    }
  }

  // Function to close modal with animation
  const closeModal = () => {
    setModalClosing(true)
    setTimeout(() => {
      setShowModal(false)
      setSelectedSubmission(null)
      setModalClosing(false)
    }, 300) // Match the CSS animation duration
  }

  // Function to load submission data from JSON files
  const loadSubmissionData = async () => {
    try {
      setIsLoading(true)
      setLoadError(null)
      
      // Load the manifest file to get list of submissions from new directory structure
      const manifestResponse = await fetch(`${import.meta.env.BASE_URL}submissions/manifest.json`)
      if (!manifestResponse.ok) {
        throw new Error('Failed to load submissions manifest')
      }
      
      const manifest = await manifestResponse.json()
      const submissionDirs = manifest.submissions || []
      
      const loadedData = {}
      const fullSubmissions = {}
      
      // Load each submission from its directory
      for (const submissionDir of submissionDirs) {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}submissions/${submissionDir}/submission.json`)
          if (!response.ok) {
            console.warn(`Failed to load ${submissionDir}: ${response.status}`)
            continue
          }
          
          const submission = await response.json()
          
          // Create composite key (agent name) from agent framework and model name
          const agentFramework = submission.methodology?.agent_framework || null
          const agentName = createAgentName(agentFramework, submission.model_name)
          
          // Store full submission data for modal display
          fullSubmissions[agentName] = {
            ...submission,
            submissionDir // Include directory name for potential trajectory access
          }
          
          // Convert JSON format to internal format for SusVibes (Python domain only)
          const pythonData = {
            funcPass1: submission.results.python?.func_pass_1 || null,
            secPass1: submission.results.python?.sec_pass_1 || null
          }
          
          const modelData = {
            python: pythonData,
            // Cost information
            costs: {
              python: submission.results.python?.cost || null
            },
            isNew: submission.is_new || false,
            agentName: agentName,
            modelName: submission.model_name,
            agentFramework: agentFramework,
            organization: submission.submitting_organization,
            // Add verification status
            // For 'custom' submissions, we relax the modified_prompts constraint
            // Custom submissions are allowed to modify prompts as long as they have trajectories and don't omit questions
            isVerified: submission.trajectories_available && 
                       submission.methodology?.verification?.omitted_questions === false &&
                       (submission.submission_type === 'custom' || submission.methodology?.verification?.modified_prompts === false),
            verificationDetails: submission.methodology?.verification || null,
            // Submission type: 'standard' (default) or 'custom'
            submissionType: submission.submission_type || 'standard'
          }
          
          loadedData[agentName] = modelData
        } catch (error) {
          console.warn(`Error loading ${submissionDir}:`, error)
        }
      }
      
      setPassKData(loadedData)
      setFullSubmissionData(fullSubmissions)
    } catch (error) {
      console.error('Error loading submission data:', error)
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadSubmissionData()
  }, [])

  // Initialize chart when leaderboard view is active and chart view is selected
  useEffect(() => {
    if (leaderboardView === 'chart' && !isLoading && Object.keys(passKData).length > 0) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initializeChart()
      }, 200)
      
      return () => {
        clearTimeout(timer)
      }
    }
  }, [leaderboardView, domain, isLoading, passKData, showStandard, showCustom]) // eslint-disable-line react-hooks/exhaustive-deps

  // Draw point styles on legend canvases when legend data changes
  useEffect(() => {
    if (chartLegendData && leaderboardView === 'chart') {
      const drawLegendPoints = () => {
        const legendCanvases = document.querySelectorAll('.legend-point-canvas')
        legendCanvases.forEach(canvas => {
          const ctx = canvas.getContext('2d')
          const pointStyle = canvas.getAttribute('data-point-style')
          const size = 8
          
          ctx.clearRect(0, 0, 16, 16)
          ctx.fillStyle = '#4878d0'
          ctx.strokeStyle = '#4878d0'
          ctx.lineWidth = 2
          
          // Draw point based on style
          switch(pointStyle) {
            case 'circle':
              ctx.beginPath()
              ctx.arc(8, 8, size/2, 0, Math.PI * 2)
              ctx.fill()
              break
            case 'triangle':
              ctx.beginPath()
              ctx.moveTo(8, 4)
              ctx.lineTo(4, 12)
              ctx.lineTo(12, 12)
              ctx.closePath()
              ctx.fill()
              break
            case 'rect':
              ctx.fillRect(4, 4, size, size)
              break
            case 'rectRot':
              ctx.save()
              ctx.translate(8, 8)
              ctx.rotate(Math.PI / 4)
              ctx.fillRect(-size/2, -size/2, size, size)
              ctx.restore()
              break
            case 'star':
              ctx.beginPath()
              for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
                const x = 8 + size/2 * Math.cos(angle)
                const y = 8 + size/2 * Math.sin(angle)
                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
              }
              ctx.closePath()
              ctx.fill()
              break
            case 'cross':
              ctx.beginPath()
              ctx.moveTo(8, 4)
              ctx.lineTo(8, 12)
              ctx.moveTo(4, 8)
              ctx.lineTo(12, 8)
              ctx.stroke()
              break
            case 'crossRot':
              ctx.save()
              ctx.translate(8, 8)
              ctx.rotate(Math.PI / 4)
              ctx.beginPath()
              ctx.moveTo(0, -size/2)
              ctx.lineTo(0, size/2)
              ctx.moveTo(-size/2, 0)
              ctx.lineTo(size/2, 0)
              ctx.stroke()
              ctx.restore()
              break
            case 'dash':
              ctx.beginPath()
              ctx.moveTo(4, 8)
              ctx.lineTo(12, 8)
              ctx.stroke()
              break
            default:
              ctx.beginPath()
              ctx.arc(8, 8, size/2, 0, Math.PI * 2)
              ctx.fill()
          }
        })
      }
      
      // Small delay to ensure DOM is ready
      const timer = setTimeout(drawLegendPoints, 100)
      return () => clearTimeout(timer)
    }
  }, [chartLegendData, leaderboardView])

  // Save leaderboard state to localStorage
  useEffect(() => {
    localStorage.setItem('leaderboardView', leaderboardView)
  }, [leaderboardView])

  // Domain is fixed to 'python', no need to save to localStorage

  useEffect(() => {
    localStorage.setItem('sortColumn', sortColumn)
  }, [sortColumn])

  useEffect(() => {
    localStorage.setItem('sortDirection', sortDirection)
  }, [sortDirection])

  useEffect(() => {
    localStorage.setItem('showStandard', showStandard)
  }, [showStandard])

  useEffect(() => {
    localStorage.setItem('showCustom', showCustom)
  }, [showCustom])

  // Close filter info popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterInfo && !event.target.closest('.filter-info-container')) {
        setShowFilterInfo(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showFilterInfo])

  const initializeChart = () => {
    const canvas = document.getElementById('passKChart')
    if (!canvas) return

    // Destroy existing chart if it exists
    if (chartInstance) {
      if (chartInstance.cleanupListeners) {
        chartInstance.cleanupListeners()
      }
      chartInstance.destroy()
    }

    const ctx = canvas.getContext('2d')
    
    // Colors for different LLM backbones - maximally distinct color palette
    // Each color is chosen to maximize perceptual separation
    const modelColors = {
      'Claude-3.7-Sonnet': '#22c55e', // Bright Green
      'GPT-4.1': '#3b82f6', // Bright Blue
      'o4-mini': '#a855f7', // Purple
      'GPT-4.1-mini': '#f97316', // Orange
      'Claude Opus 4.1': '#06b6d4', // Cyan
      'GPT-5': '#ef4444', // Bright Red
      'Kimi-k2': '#e91e63', // Pink/Magenta
      'o3': '#6366f1', // Indigo
      'Claude Opus 4': '#ec4899', // Pink
      'Claude Sonnet 4': '#84cc16', // Lime Green (changed from emerald to be more distinct)
      'DeepSeek-V3-0324': '#dc2626', // Dark Red
      'Qwen3-235B-A22B': '#fbbf24', // Yellow (changed from amber for better distinction)
      'Gemini-2.5-Flash': '#10b981', // Emerald (changed from lime)
      'Claude 4 Sonnet': '#0891b2', // Sky Blue
      'Gemini 3 Pro': '#2563eb' // Royal Blue
    }

    // Point styles for different agent frameworks
    const pointStyles = ['circle', 'triangle', 'rect', 'rectRot', 'star', 'cross', 'crossRot', 'dash']
    const frameworkPointStyles = {}
    let frameworkIndex = 0

    const createDatasets = () => {
      // Group data points by agent framework to create datasets with different point styles
      const frameworkGroups = {}
      const datasets = []
      const seenModels = new Set() // Track unique LLM backbones
      const seenFrameworks = new Set() // Track unique agent frameworks

      // First pass: collect all data points grouped by framework
      Object.keys(passKData).forEach(agentName => {
        const modelData = passKData[agentName]
        const domainData = modelData[domain]
        
        // Filter by submission type
        const isStandard = modelData.submissionType === 'standard' || !modelData.submissionType
        const isCustom = modelData.submissionType === 'custom'
        if ((isStandard && !showStandard) || (isCustom && !showCustom)) {
          return
        }
        
        // Skip models that don't have both funcPass1 and secPass1 data
        if (!domainData || domainData.funcPass1 === null || domainData.secPass1 === null) {
          return
        }
        
        const modelName = modelData.modelName || parseAgentName(agentName).modelName
        const agentFramework = modelData.agentFramework || parseAgentName(agentName).agentFramework || 'unknown'
        
        // Track unique models and frameworks for legend
        seenModels.add(modelName)
        seenFrameworks.add(agentFramework)
        
        // Initialize framework group if needed
        if (!frameworkGroups[agentFramework]) {
          frameworkGroups[agentFramework] = []
          // Assign point style to framework
          if (!frameworkPointStyles[agentFramework]) {
            frameworkPointStyles[agentFramework] = pointStyles[frameworkIndex % pointStyles.length]
            frameworkIndex++
          }
        }
        
        // Get color based on LLM backbone
        // Use a more distinct fallback color if model not found
        const color = modelColors[modelName] || '#9333ea'
        
        frameworkGroups[agentFramework].push({
          x: domainData.funcPass1,
          y: domainData.secPass1,
          label: `${agentName}${modelData.isNew ? ' 🆕' : ''}`,
          color: color,
          modelName: modelName,
          isNew: modelData.isNew
        })
      })

      // Store legend data
      setChartLegendData({
        models: Array.from(seenModels).map(modelName => ({
          name: modelName,
          color: modelColors[modelName] || '#3b82f6'
        })),
        frameworks: Array.from(seenFrameworks).map(framework => ({
          name: framework,
          pointStyle: frameworkPointStyles[framework] || 'circle'
        }))
      })

      // Second pass: create datasets (one per framework) with points colored by LLM backbone
      Object.keys(frameworkGroups).forEach(framework => {
        const points = frameworkGroups[framework]
        const pointStyle = frameworkPointStyles[framework]
        
        // Create separate dataset for each point to allow different colors
        points.forEach(point => {
          datasets.push({
            label: point.label,
            data: [{
              x: point.x,
              y: point.y
            }],
            backgroundColor: point.color,
            borderColor: point.color,
            pointStyle: pointStyle,
            pointRadius: point.isNew ? 8 : 6,
            pointHoverRadius: point.isNew ? 10 : 8,
            borderWidth: 2,
            showLine: false
          })
        })
      })

      return datasets
    }

    // Calculate dynamic max values for both axes based on actual data
    const calculateAxisLimits = (datasets) => {
      let maxX = 0
      let maxY = 0
      let minX = Infinity
      let minY = Infinity
      
      datasets.forEach(dataset => {
        dataset.data.forEach(point => {
          if (point.x !== null && !isNaN(point.x)) {
            if (point.x > maxX) maxX = point.x
            if (point.x < minX) minX = point.x
          }
          if (point.y !== null && !isNaN(point.y)) {
            if (point.y > maxY) maxY = point.y
            if (point.y < minY) minY = point.y
          }
        })
      })
      
      // If no valid data, use defaults
      if (minX === Infinity) {
        maxX = 100
        minX = 0
      }
      if (minY === Infinity) {
        maxY = 100
        minY = 0
      }
      
      // Add padding: 10% above max, but ensure at least some padding
      const xRange = maxX - minX
      const yRange = maxY - minY
      const xPadding = xRange > 0 ? Math.max(xRange * 0.1, 5) : 5 // At least 5 units padding
      const yPadding = yRange > 0 ? Math.max(yRange * 0.1, 5) : 5 // At least 5 units padding
      
      const paddedMaxX = Math.min(100, maxX + xPadding)
      const paddedMaxY = Math.min(100, maxY + yPadding)
      const paddedMinX = Math.max(0, minX - xPadding)
      const paddedMinY = Math.max(0, minY - yPadding)
      
      // Round up/down to nearest 5 for cleaner axis
      return {
        maxX: Math.ceil(paddedMaxX / 5) * 5,
        maxY: Math.ceil(paddedMaxY / 5) * 5,
        minX: Math.floor(paddedMinX / 5) * 5,
        minY: Math.floor(paddedMinY / 5) * 5
      }
    }

    const datasets = createDatasets()
    const axisLimits = calculateAxisLimits(datasets)

    const chart = new window.Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'point',
          intersect: true,
        },
        plugins: {
          title: {
            display: true,
            text: 'FuncPass@1 vs SecPass@1 Performance Analysis',
            font: {
              size: 18,
              weight: 'bold'
            },
            padding: 20
          },
          legend: {
            display: false  // Hide legend for scatter plot with many points
          },
          tooltip: {
            mode: 'point',
            intersect: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: '#4878d0',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: FuncPass@1=${context.parsed.x.toFixed(1)}%, SecPass@1=${context.parsed.y.toFixed(1)}%`
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            display: true,
            title: {
              display: true,
              text: 'FuncPass@1 (%)',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            min: axisLimits.minX,
            max: axisLimits.maxX,
            grid: {
              color: '#e2e8f0'
            },
            ticks: {
              callback: function(value) {
                return value + '%'
              }
            }
          },
          y: {
            type: 'linear',
            display: true,
            title: {
              display: true,
              text: 'SecPass@1 (%)',
              font: {
                size: 14,
                weight: 'bold'
              }
            },
            min: axisLimits.minY,
            max: axisLimits.maxY,
            grid: {
              color: '#e2e8f0'
            },
            ticks: {
              callback: function(value) {
                return value + '%'
              }
            }
          }
        },
        elements: {
          point: {
            hoverRadius: 8
          }
        }
      }
    })

    setChartInstance(chart)
  }

  // Handle column sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Clean up chart instance on unmount
  useEffect(() => {
    return () => {
      if (chartInstance) {
        chartInstance.destroy()
      }
    }
  }, [chartInstance])

  // Loading and error states
  if (isLoading) {
    return (
      <div className="leaderboard-container">
        <h2 className="leaderboard-title">SusVibes Leaderboard</h2>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard data...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="leaderboard-container">
        <h2 className="leaderboard-title">SusVibes Leaderboard</h2>
        <div className="error-state">
          <p>Error loading leaderboard data: {loadError}</p>
          <button onClick={loadSubmissionData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (Object.keys(passKData).length === 0) {
    return (
      <div className="leaderboard-container">
        <h2 className="leaderboard-title">SusVibes Leaderboard</h2>
        <div className="empty-state">
          <p>No leaderboard data available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">SusVibes Leaderboard</h2>

      {/* Combined Controls Row */}
      <div className="leaderboard-controls">
        {/* Modern View Toggle Switch */}
        <div className="view-toggle-switch">
          <div className="toggle-container">
            <button 
              className={`toggle-option ${leaderboardView === 'table' ? 'active' : ''}`}
              onClick={() => setLeaderboardView('table')}
            >
              📋 Table
            </button>
            <button 
              className={`toggle-option ${leaderboardView === 'chart' ? 'active' : ''}`}
              onClick={() => setLeaderboardView('chart')}
            >
              📊 Chart
            </button>
            <div 
              className="toggle-slider"
              style={{
                transform: leaderboardView === 'chart' ? 'translateX(100%)' : 'translateX(0%)'
              }}
            />
          </div>
        </div>

        {/* Domain Display (Python only for SusVibes) */}
        <div className="domain-display">
          <div className="domain-badge">
            🐍 Python
          </div>
        </div>

        {/* Submission Type Filter */}
        <div className="submission-type-filter">
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={showStandard}
              onChange={(e) => setShowStandard(e.target.checked)}
            />
            <span className="checkbox-checkmark"></span>
            <span className="checkbox-label">Standard</span>
          </label>
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              checked={showCustom}
              onChange={(e) => setShowCustom(e.target.checked)}
            />
            <span className="checkbox-checkmark"></span>
            <span className="checkbox-label">Custom</span>
          </label>
          <div className="filter-info-container">
            <button 
              className="filter-info-button"
              onClick={() => setShowFilterInfo(!showFilterInfo)}
              aria-label="What do Standard and Custom mean?"
            >
              <span className="info-icon">ⓘ</span>
            </button>
            {showFilterInfo && (
              <div className="filter-info-popup">
                <div className="filter-info-content">
                  <button className="filter-info-close" onClick={() => setShowFilterInfo(false)}>×</button>
                  <h4>Submission Types</h4>
                  <div className="filter-info-item">
                    <strong>Standard</strong>
                    <p>Results using the default SusVibes scaffold: a base LLM with the standard tool set and prompts.</p>
                  </div>
                  <div className="filter-info-item">
                    <strong>Custom</strong>
                    <p>Results using modified scaffolds, such as multi-model routers, additional tools, custom prompting strategies, or other orchestration approaches.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart View */}
      {leaderboardView === 'chart' && (
        (!showStandard && !showCustom) ? (
          <div className="filter-empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No Results</h3>
            <p>Please select at least one submission type filter (Standard or Custom) to view results.</p>
          </div>
        ) : (
          <div className="reliability-visualization">
            <div className="pass-k-chart-container">
              <canvas id="passKChart" width="800" height="400"></canvas>
            </div>
            {/* Custom Legend */}
            {chartLegendData && (
              <div className="chart-legend-container">
                <div className="legend-section">
                  <h4 className="legend-title">LLM Backbone (Color)</h4>
                  <div className="legend-items">
                    {chartLegendData.models.map((model, index) => (
                      <div key={index} className="legend-item">
                        <span 
                          className="legend-color" 
                          style={{ backgroundColor: model.color }}
                        ></span>
                        <span className="legend-label">{model.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="legend-section">
                  <h4 className="legend-title">Agent Framework (Shape)</h4>
                  <div className="legend-items">
                    {chartLegendData.frameworks.map((framework, index) => (
                      <div key={index} className="legend-item">
                        <canvas 
                          className="legend-point-canvas" 
                          data-point-style={framework.pointStyle}
                          width="16" 
                          height="16"
                        ></canvas>
                        <span className="legend-label">{framework.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Table View */}
      {leaderboardView === 'table' && (
        <>
        {/* Check if filters result in no data */}
        {(!showStandard && !showCustom) ? (
          <div className="filter-empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No Results</h3>
            <p>Please select at least one submission type filter (Standard or Custom) to view results.</p>
          </div>
        ) : (
        <div className="reliability-metrics">
        <div className="metrics-table-container">
          <table className="reliability-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Agent Name</th>
                <th 
                  className={`sortable ${sortColumn === 'llmbackbone' ? 'active' : ''}`}
                  onClick={() => handleSort('llmbackbone')}
                >
                  LLM Backbone {sortColumn === 'llmbackbone' && (sortDirection === 'desc' ? '↓' : '↑')}
                </th>
                <th 
                  className={`sortable ${sortColumn === 'agentframework' ? 'active' : ''}`}
                  onClick={() => handleSort('agentframework')}
                >
                  Agent Framework {sortColumn === 'agentframework' && (sortDirection === 'desc' ? '↓' : '↑')}
                </th>
                <th>Submitting Org</th>
                
                <th 
                  className={`sortable ${sortColumn === 'funcpass1' ? 'active' : ''}`}
                  onClick={() => handleSort('funcpass1')}
                >
                  FuncPass@1 {sortColumn === 'funcpass1' && (sortDirection === 'desc' ? '↓' : '↑')}
                </th>
                <th 
                  className={`sortable ${sortColumn === 'secpass1' ? 'active' : ''}`}
                  onClick={() => handleSort('secpass1')}
                >
                  SecPass@1 {sortColumn === 'secpass1' && (sortDirection === 'desc' ? '↓' : '↑')}
                </th>
                <th>Avg Cost</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Calculate domain-specific scores for ranking
                const modelStats = Object.entries(passKData)
                  .filter(([agentName, data]) => {
                    // Filter by submission type first
                    const isStandard = data.submissionType === 'standard' || !data.submissionType
                    const isCustom = data.submissionType === 'custom'
                    if ((isStandard && !showStandard) || (isCustom && !showCustom)) {
                      return false
                    }
                    
                    // Only include models that have data for Python domain
                    const pythonData = data.python
                    return pythonData && (pythonData.funcPass1 !== null || pythonData.secPass1 !== null)
                  })
                  .map(([agentName, data]) => {
                  const domainData = data.python
                  const funcPass1Score = domainData.funcPass1
                  const secPass1Score = domainData.secPass1
                  const hasAnyData = funcPass1Score !== null || secPass1Score !== null
                  
                  return {
                    agentName: agentName,
                    modelName: data.modelName,
                    agentFramework: data.agentFramework,
                    data: data,
                    domainData: domainData,
                    funcPass1Score,
                    secPass1Score,
                    hasAnyData,
                    organization: data.organization
                  }
                })
                
                // Sort by selected column and direction
                modelStats.sort((a, b) => {
                  // First priority: models with any data (only for numeric columns)
                  if (sortColumn === 'funcpass1' || sortColumn === 'secpass1') {
                    if (a.hasAnyData && !b.hasAnyData) return -1
                    if (!a.hasAnyData && b.hasAnyData) return 1
                    if (!a.hasAnyData && !b.hasAnyData) return 0
                  }
                  
                  let aValue, bValue
                  let isStringSort = false
                  
                  if (sortColumn === 'funcpass1') {
                    aValue = a.funcPass1Score
                    bValue = b.funcPass1Score
                  } else if (sortColumn === 'secpass1') {
                    aValue = a.secPass1Score
                    bValue = b.secPass1Score
                  } else if (sortColumn === 'llmbackbone') {
                    aValue = a.modelName || ''
                    bValue = b.modelName || ''
                    isStringSort = true
                  } else if (sortColumn === 'agentframework') {
                    aValue = a.agentFramework || ''
                    bValue = b.agentFramework || ''
                    isStringSort = true
                  } else {
                    // Default to funcPass1
                    aValue = a.funcPass1Score
                    bValue = b.funcPass1Score
                  }
                  
                  // Handle null values (missing data) for numeric sorts
                  if (!isStringSort) {
                    if (aValue === null && bValue === null) return 0
                    if (aValue === null) return 1
                    if (bValue === null) return -1
                  }
                  
                  const multiplier = sortDirection === 'desc' ? 1 : -1
                  
                  if (isStringSort) {
                    // String sorting
                    return aValue.localeCompare(bValue) * multiplier
                  } else {
                    // Numeric sorting
                    return (bValue - aValue) * multiplier
                  }
                })
                
                // Show empty state if no results after filtering
                if (modelStats.length === 0) {
                  return (
                    <tr className="empty-results-row">
                      <td colSpan="8" className="empty-results-cell">
                        <div className="empty-results-content">
                          <span className="empty-icon">🔧</span>
                          <span className="empty-text">
                            {showCustom && !showStandard 
                              ? "No custom submissions yet. Be the first to submit results with a custom scaffold!"
                              : "No results match the current filters."}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                }
                
                return modelStats.map((model, index) => (
                   <tr key={model.agentName} className={`model-row ${index === 0 && model.hasAnyData && sortColumn === 'funcpass1' && sortDirection === 'desc' ? 'top-performer' : ''} ${model.data.isNew ? 'new-model' : ''}`}>
                     {/* Rank */}
                     <td className={`rank-cell ${index === 0 ? 'gold-medal' : index === 1 ? 'silver-medal' : index === 2 ? 'bronze-medal' : ''}`}>
                       {index === 0 && model.hasAnyData ? (
                         <span className="medal-icon">🥇</span>
                       ) : index === 1 && model.hasAnyData ? (
                         <span className="medal-icon">🥈</span>
                       ) : index === 2 && model.hasAnyData ? (
                         <span className="medal-icon">🥉</span>
                       ) : (
                         <span className="rank-number">#{index + 1}</span>
                       )}
                     </td>
                     {/* Agent Name */}
                     <td className="agent-name-info">
                       <div 
                         className="agent-name clickable-model" 
                         onClick={() => handleModelClick(model.agentName)}
                         title="Click to view submission details"
                       >
                         {model.agentName}
                         {model.data.isNew && <span className="new-badge">NEW</span>}
                         {!model.data.isVerified && (
                           <span className="unverified-badge" title="Unverified submission - see details for more information">
                             ⚠️
                           </span>
                         )}
                       </div>
                     </td>
                     
                     {/* LLM Backbone */}
                     <td className="llm-backbone-info">
                       {model.modelName ? (
                         <span className="llm-backbone-name">{model.modelName}</span>
                       ) : (
                         <span className="no-data">—</span>
                       )}
                     </td>

                     {/* Agent Framework */}
                     <td className="agent-framework-info">
                       {model.agentFramework ? (
                         <span className="agent-framework-name">{model.agentFramework}</span>
                       ) : (
                         <span className="no-data">—</span>
                       )}
                     </td>
                     
                     {/* Organization */}
                     <td className="organization-info">
                       <div className="org-container">
                         <div className="company-logo">
                          {model.organization === 'Anthropic' && (
                            <img src={`${import.meta.env.BASE_URL}claude.png`} alt="Anthropic" className="logo-img" />
                          )}
                          {model.organization === 'OpenAI' && (
                            <img src={`${import.meta.env.BASE_URL}openai.svg`} alt="OpenAI" className="logo-img" />
                          )}
                          {model.organization === 'Sierra' && (
                            <img src={`${import.meta.env.BASE_URL}sierra-logo.png`} alt="Sierra" className="logo-img" />
                          )}
                          {model.organization === 'Moonshot AI' && (
                            <span className="emoji-logo">🚀</span>
                          )}
                          {model.organization === 'DeepSeek' && (
                            <img src={`${import.meta.env.BASE_URL}DeepSeek_logo_icon.png`} alt="DeepSeek" className="logo-img" />
                          )}
                          {(model.organization === 'Alibaba' || model.organization === 'Qwen') && (
                            <img src={`${import.meta.env.BASE_URL}qwen-color.png`} alt="Qwen" className="logo-img" />
                          )}
                         {model.organization === 'Google' && (
                           <img src={`${import.meta.env.BASE_URL}Google__G__logo.svg.png`} alt="Google" className="logo-img" />
                         )}
                         {model.organization === 'NVIDIA' && (
                           <img src={`${import.meta.env.BASE_URL}Logo-nvidia-transparent-PNG.png`} alt="NVIDIA" className="logo-img" />
                         )}
                        </div>
                         <span className="org-name">{model.organization}</span>
                       </div>
                     </td>
                     
                     
                     {/* FuncPass@1 */}
                     <td className="metric-cell">
                       {model.funcPass1Score !== null ? (
                         <span className="metric-value">{model.funcPass1Score.toFixed(1)}%</span>
                       ) : (
                         <span className="no-data">No Data</span>
                       )}
                     </td>
                     {/* SecPass@1 */}
                     <td className="metric-cell">
                       {model.secPass1Score !== null ? (
                         <span className="metric-value">{model.secPass1Score.toFixed(1)}%</span>
                       ) : (
                         <span className="no-data">No Data</span>
                       )}
                     </td>
                     
                     {/* Average Cost */}
                     <td className="cost-cell">
                       {(() => {
                         const domainCost = model.data.costs.python
                         if (domainCost !== null && domainCost !== undefined) {
                           return <span className="cost-value">${domainCost.toFixed(3)}</span>
                         } else {
                           return <span className="no-data">—</span>
                         }
                       })()}
                     </td>
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        </div>
        <div className="verification-note">
          <span className="note-icon">⚠️</span>
          <span className="note-text">
            The warning icon indicates unverified submissions. Click on any model name to view full verification details.
          </span>
        </div>
        </div>
        )}
        </>
      )}

      {/* Submissions Notice */}
      <div className="submissions-notice">
        <div className="submissions-content">
          <h3>Submit Your Results</h3>
          <p>
            Have new results to share? Submit your model evaluation results by creating a pull request to add your JSON submission file. 
            See our submission guidelines for the required format and process.
          </p>
          <div className="submission-links">
            <a 
              href="https://github.com/LeiLiLab/susvibes-leaderboard/blob/main/README.md" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="submissions-link primary"
            >
              View Submission Guidelines →
            </a>
            <a 
              href="https://github.com/LeiLiLab/susvibes-leaderboard/compare" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="submissions-link secondary"
            >
              Submit via Pull Request →
            </a>
          </div>
        </div>
      </div>

      {/* Submission Details Modal */}
      {showModal && selectedSubmission && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className={`modal-content ${modalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Submission Details</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="submission-details">
                {/* Basic Information */}
                <div className="detail-section">
                  <h3>Basic Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Model Name:</label>
                      <span>{selectedSubmission.model_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Model Organization:</label>
                      <span>{selectedSubmission.model_organization}</span>
                    </div>
                    <div className="detail-item">
                      <label>Submitting Organization:</label>
                      <span>{selectedSubmission.submitting_organization}</span>
                    </div>
                    <div className="detail-item">
                      <label>Submission Date:</label>
                      <span>{selectedSubmission.submission_date}</span>
                    </div>
                    <div className="detail-item">
                      <label>Is New:</label>
                      <span>{selectedSubmission.is_new ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="detail-section">
                  <h3>Contact Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Email:</label>
                      <span>{selectedSubmission.contact_info?.email || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Name:</label>
                      <span>{selectedSubmission.contact_info?.name || 'N/A'}</span>
                    </div>
                    {selectedSubmission.contact_info?.github && (
                      <div className="detail-item">
                        <label>GitHub:</label>
                        <span>{selectedSubmission.contact_info.github}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* References */}
                {selectedSubmission.references && selectedSubmission.references.length > 0 && (
                  <div className="detail-section">
                    <h3>References & Documentation</h3>
                    <div className="references-list">
                      {selectedSubmission.references.map((ref, index) => (
                        <div key={index} className="reference-item">
                          <div className="reference-header">
                            <span className={`reference-type ${ref.type || 'other'}`}>
                              {ref.type === 'paper' && '📄'}
                              {ref.type === 'blog_post' && '📝'}
                              {ref.type === 'documentation' && '📚'}
                              {ref.type === 'model_card' && '🗂️'}
                              {ref.type === 'github' && '🔗'}
                              {ref.type === 'huggingface' && '🤗'}
                              {(!ref.type || ref.type === 'other') && '🌐'}
                              <span className="reference-type-text">
                                {ref.type?.replace('_', ' ').toUpperCase() || 'OTHER'}
                              </span>
                            </span>
                          </div>
                          <a 
                            href={ref.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="reference-link"
                          >
                            {ref.title}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Results */}
                <div className="detail-section">
                  <h3>Performance Results</h3>
                  {selectedSubmission.results && (
                    <div className="results-tables">
                      {Object.entries(selectedSubmission.results).map(([domain, results]) => (
                        <div key={domain} className="domain-results">
                          <h4>{domain.charAt(0).toUpperCase() + domain.slice(1)} Domain</h4>
                          <div className="results-grid">
                            <div className="result-item">
                              <label>FuncPass@1:</label>
                              <span>
                                {results.func_pass_1 !== null && results.func_pass_1 !== undefined 
                                  ? `${results.func_pass_1.toFixed(1)}%` 
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className="result-item">
                              <label>SecPass@1:</label>
                              <span>
                                {results.sec_pass_1 !== null && results.sec_pass_1 !== undefined 
                                  ? `${results.sec_pass_1.toFixed(1)}%` 
                                  : 'N/A'}
                              </span>
                            </div>
                            {results.cost && (
                              <div className="result-item">
                                <label>Cost:</label>
                                <span>${results.cost.toFixed(3)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Methodology */}
                {selectedSubmission.methodology && (
                  <div className="detail-section">
                    <h3>Methodology</h3>
                    <div className="detail-grid">
                      {selectedSubmission.methodology.evaluation_date && (
                        <div className="detail-item">
                          <label>Evaluation Date:</label>
                          <span>{selectedSubmission.methodology.evaluation_date}</span>
                        </div>
                      )}
                      {selectedSubmission.methodology.susvibes_version && (
                        <div className="detail-item">
                          <label>SusVibes Version:</label>
                          <span>{selectedSubmission.methodology.susvibes_version}</span>
                        </div>
                      )}
                      {selectedSubmission.methodology.agent_framework && (
                        <div className="detail-item">
                          <label>Agent Framework:</label>
                          <span>{selectedSubmission.methodology.agent_framework}</span>
                        </div>
                      )}
                      {selectedSubmission.methodology.notes && (
                        <div className="detail-item full-width">
                          <label>Notes:</label>
                          <p className="notes-text">{selectedSubmission.methodology.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Verification Status */}
                {selectedSubmission.methodology?.verification && (
                  <div className="detail-section">
                    <h3>Verification Status</h3>
                    <div className="verification-status">
                      <div className="verification-indicator">
                        {selectedSubmission.trajectories_available && 
                         selectedSubmission.methodology.verification.omitted_questions === false &&
                         (selectedSubmission.submission_type === 'custom' || selectedSubmission.methodology.verification.modified_prompts === false) ? (
                          <span className="verified">✅ Verified</span>
                        ) : (
                          <span className="unverified">⚠️ Unverified</span>
                        )}
                      </div>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Trajectories Available:</label>
                          <span>{selectedSubmission.trajectories_available ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Modified Prompts:</label>
                          <span>
                            {selectedSubmission.methodology.verification.modified_prompts === true ? 'Yes' : 
                             selectedSubmission.methodology.verification.modified_prompts === false ? 'No' : 'Unknown'}
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Omitted Questions:</label>
                          <span>
                            {selectedSubmission.methodology.verification.omitted_questions === true ? 'Yes' : 
                             selectedSubmission.methodology.verification.omitted_questions === false ? 'No' : 'Unknown'}
                          </span>
                        </div>
                        {selectedSubmission.methodology.verification.details && (
                          <div className="detail-item full-width">
                            <label>Verification Details:</label>
                            <p className="notes-text">{selectedSubmission.methodology.verification.details}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Leaderboard 