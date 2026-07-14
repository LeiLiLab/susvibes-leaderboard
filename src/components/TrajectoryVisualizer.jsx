import { useState, useEffect, useMemo } from 'react'
import './TrajectoryVisualizer.css'
import PillSelect from './PillSelect'
import VersionInfo from './VersionInfo'
import { sortVersionsDesc } from '../utils/version'

const TrajectoryVisualizer = () => {
  const [selectedTrajectory, setSelectedTrajectory] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // New state for view mode and task data
  const [viewMode, setViewMode] = useState('trajectories') // 'trajectories' or 'tasks'
  // null until a version is chosen; effectiveVersion falls back to the latest present.
  const [datasetVersion, setDatasetVersion] = useState(null)
  const [taskData, setTaskData] = useState(null)
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState(null)

  // New state for submission-based trajectory selection
  const [submissions, setSubmissions] = useState([])
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [availableTrajectories, setAvailableTrajectories] = useState([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)

  // Dataset versions present in the submissions, newest first; selection falls back to latest.
  const availableVersions = useMemo(
    () => sortVersionsDesc([...new Set(submissions.map(s => s.methodology?.susvibes_version || 'v1.0'))]),
    [submissions]
  )
  const effectiveVersion = datasetVersion ?? availableVersions[0] ?? 'v1.0'

  // Each dataset version has its own file (v0.0 and v1.0 are different task sets).
  const datasetUrl = (version) => `${import.meta.env.BASE_URL}datasets/susvibes_dataset_${version}.jsonl`

  // State for dataset information lookup
  const [datasetInfo, setDatasetInfo] = useState(new Map())
  
  // State for summary information (correct/correct_secure)
  const [summaryInfo, setSummaryInfo] = useState(null)
  
  // State for simulation grid pagination
  const [simulationsPerPage, setSimulationsPerPage] = useState(50)
  const [simulationPage, setSimulationPage] = useState(1)

  // State for message pagination
  const [messagesPerPage, setMessagesPerPage] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)

  // Helper function to create composite key from agent framework and model name
  const createAgentName = (agentFramework, modelName) => {
    const framework = agentFramework || 'unknown'
    return `${modelName}::${framework}`
  }


  // Check if a submission has any trajectory files
  const checkSubmissionHasTrajectories = async (submission) => {
    // Use the declared trajectories_available field from the submission
    // This is much more reliable than trying to guess file patterns
    return submission.trajectories_available === true
  }

  // Load submissions data from the manifest
  const loadSubmissions = async () => {
    try {
      setSubmissionsLoading(true)
      setError(null)
      
      // Load the manifest file to get list of submissions
      const manifestResponse = await fetch(`${import.meta.env.BASE_URL}submissions/manifest.json`)
      if (!manifestResponse.ok) {
        throw new Error('Failed to load submissions manifest')
      }
      
      const manifest = await manifestResponse.json()
      const submissionDirs = manifest.submissions || []
      
      const loadedSubmissions = []
      
      // Load each submission from its directory
      for (const submissionDir of submissionDirs) {
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}submissions/${submissionDir}/submission.json`)
          if (!response.ok) {
            console.warn(`Failed to load ${submissionDir}: ${response.status}`)
            continue
          }
          
          const submission = await response.json()
          
          // Check if this submission has any trajectory files
          const hasTrajectories = await checkSubmissionHasTrajectories({
            ...submission,
            submissionDir
          })
          
          // Store submission data with directory info and trajectory availability
          loadedSubmissions.push({
            ...submission,
            submissionDir, // Include directory name for trajectory access
            hasTrajectories // Flag indicating if trajectories are available
          })
        } catch (error) {
          console.warn(`Error loading ${submissionDir}:`, error)
        }
      }
      
      // Sort submissions: new first, then those with trajectories, then alphabetically
      const sortedSubmissions = loadedSubmissions.sort((a, b) => {
        // New submissions come first
        if (a.is_new !== b.is_new) {
          return (b.is_new ? 1 : 0) - (a.is_new ? 1 : 0)
        }
        // Then sort by trajectory availability
        if (a.hasTrajectories !== b.hasTrajectories) {
          return b.hasTrajectories - a.hasTrajectories
        }
        // Finally sort by agent name
        const agentNameA = createAgentName(a.methodology?.agent_framework, a.model_name)
        const agentNameB = createAgentName(b.methodology?.agent_framework, b.model_name)
        return agentNameA.localeCompare(agentNameB)
      })
      
      setSubmissions(sortedSubmissions)
    } catch (error) {
      console.error('Error loading submissions:', error)
      setError(error.message)
    } finally {
      setSubmissionsLoading(false)
    }
  }

  // Load available trajectories for a selected submission
  const loadSubmissionTrajectories = async (submission) => {
    try {
      setLoading(true)
      setError(null)
      
      const submissionDir = submission.submissionDir
      const domains = ['Python']
      const trajectories = []
      const agentName = createAgentName(submission.methodology?.agent_framework, submission.model_name)
      
      // Map of exact trajectory file patterns based on actual file structure
      // Based on actual files found in submissions directory
      // Patterns use {submissionDir} and {domain} as placeholders
      const trajectoryPatterns = {
        'claude-4-sonnet': [
          '{submissionDir}.trials.json'
        ],
        'claude-3.7-sonnet': [
          '{submissionDir}.trials.json',
          'claude-3-7-sonnet-20250219_{domain}_default_gpt-4.1-2025-04-14_4trials.json'
        ],
        'gpt-4.1': [
          '{submissionDir}.trials.json',
          'gpt-4.1-2025-04-14_{domain}_default_gpt-4.1-2025-04-14_4trials.json'
        ],
        'gpt-4.1-mini': [
          '{submissionDir}.trials.json',
          'gpt-4.1-mini-2025-04-14_{domain}_base_gpt-4.1-2025-04-14_4trials.json'
        ],
        'o4-mini': [
          '{submissionDir}.trials.json',
          'o4-mini-2025-04-16_{domain}_default_gpt-4.1-2025-04-14_4trials.json'
        ],
        'gpt-5': [
          '{submissionDir}.trials.json',
          'gpt-5_{domain}_default_gpt-4.1-2025-04-14_4trials.json'
        ],
        'qwen3-max-2025-10-30': [
          '{submissionDir}.trials.json',
          '{domain}_llm_agent_qwen3-max-2025-10-30_user_simulator_gpt-4.1-2025-04-14.json'
        ],
        'Qwen3-Max-Thinking-Preview': [
          '{submissionDir}.trials.json',
          '{domain}_llm_agent_qwen3-max-2025-10-30_user_simulator_gpt-4.1-2025-04-14.json'
        ],
        'Nemotron-Orchestrator-8B': [
          '{submissionDir}.trials.json',
          'toolorchestra_{domain}_gpt-5_1trial.json'
        ]
      }
      
      // Get patterns for this exact model name (case-insensitive lookup)
      const modelKey = Object.keys(trajectoryPatterns).find(key => 
        key.toLowerCase() === submission.model_name.toLowerCase()
      )
      
      // If no specific pattern found, try common generic patterns as fallback
      let patterns = modelKey ? trajectoryPatterns[modelKey] : []
      if (patterns.length === 0) {
        // Try common naming patterns that might be used, with submission directory pattern as primary
        patterns = [
          '{submissionDir}.trials.json',
          `{domain}_llm_agent_${submission.model_name}_user_simulator_gpt-4.1-2025-04-14.json`,
          `${submission.model_name}_{domain}_default_gpt-4.1-2025-04-14_4trials.json`,
          `{domain}_${submission.model_name}_user_simulator_gpt-4.1-2025-04-14.json`
        ]
      }
      
      for (const domain of domains) {
        for (const pattern of patterns) {
          // Replace both placeholders: {submissionDir} and {domain}
          const fileName = pattern.replace('{submissionDir}', submissionDir).replace('{domain}', domain)
          
          try {
            const response = await fetch(`${import.meta.env.BASE_URL}submissions/${submissionDir}/trajectories/${fileName}`, { method: 'HEAD' })
            if (response.ok) {
              trajectories.push({
                name: `${agentName} - ${domain.charAt(0).toUpperCase() + domain.slice(1)}`,
                file: fileName,
                domain: domain,
                model: submission.model_name,
                agentName: agentName,
                submissionDir: submissionDir
              })
              break // Found a file for this domain, move to next domain
            }
          } catch {
            // File doesn't exist, try next pattern
          }
        }
      }
      
      setAvailableTrajectories(trajectories)
      setSelectedSubmission(submission)
    } catch (error) {
      setError(`Error loading trajectories: ${error.message}`)
      console.error('Error loading trajectories:', error)
    } finally {
      setLoading(false)
    }
  }

  // Available domains for task exploration
  const domains = [
    { name: 'Python', id: 'python' }
  ]

  // Load dataset information
  const loadDatasetInfo = async () => {
    try {
      const response = await fetch(datasetUrl(effectiveVersion))
      if (!response.ok) {
        console.warn('Failed to load dataset info')
        return
      }
      
      const text = await response.text()
      const lines = text.trim().split('\n').filter(line => line.trim())
      const infoMap = new Map()
      
      lines.forEach(line => {
        try {
          const instance = JSON.parse(line)
          if (instance.instance_id) {
            infoMap.set(instance.instance_id, {
              instance_id: instance.instance_id,
              image_name: instance.image_name || null,
              project: instance.project || null,
              cwe_ids: instance.cwe_ids || [],
              cve_id: instance.cve_id || null,
              info_page: instance.info_page || null,
              problem_statement: instance.problem_statement || null
            })
          }
        } catch (err) {
          console.warn('Failed to parse dataset line:', err)
        }
      })
      
      setDatasetInfo(infoMap)
    } catch (err) {
      console.warn('Error loading dataset info:', err)
    }
  }

  // Load submissions on component mount
  useEffect(() => {
    if (viewMode === 'trajectories') {
      loadSubmissions()
    }
  }, [viewMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Instance-info lookup depends on the dataset version (v0.0 / v1.0 differ).
  useEffect(() => {
    if (viewMode === 'trajectories') {
      loadDatasetInfo()
    }
  }, [viewMode, effectiveVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Transform trajectory data from file format to component format
  const transformTrajectoryData = (rawData, instanceInfoMap = new Map(), summaryData = null, agentModel = null) => {
    // Check if data is already in the expected format (has simulations and tasks)
    if (rawData && Array.isArray(rawData.simulations) && Array.isArray(rawData.tasks)) {
      return rawData
    }

    // Transform from format: array of {instance_id, model_patch, messages}
    // where `messages` is an OpenAI-style messages list (role/content/tool_calls/tool_call_id)
    if (Array.isArray(rawData)) {
      const simulations = []
      const tasks = new Map()
      const info = {
        num_trials: rawData.length,
        max_steps: null,
        max_errors: null,
        seed: null,
        agent_info: {
          implementation: agentModel || 'unknown',
          llm: agentModel || 'unknown',
          llm_args: {}
        }
      }

      rawData.forEach((item, index) => {
        const instanceId = item.instance_id || `instance_${index}`

        // Get instance information from dataset
        const instanceInfo = instanceInfoMap.get(instanceId) || {}

        // Create a task entry
        if (!tasks.has(instanceId)) {
          tasks.set(instanceId, {
            id: instanceId,
            description: {
              InstanceID: instanceId,
              image_name: instanceInfo.image_name,
              project: instanceInfo.project,
              cwe_ids: instanceInfo.cwe_ids,
              cve_id: instanceInfo.cve_id,
              info_page: instanceInfo.info_page,
              problem_statement: instanceInfo.problem_statement
            },
            user_scenario: {
              instructions: {
                domain: 'Python',
                reason_for_call: 'Code generation task',
                known_info: 'See model patch for details'
              }
            }
          })
        }

        // Transform OpenAI messages into display messages
        const messages = []
        let turnIdx = 0
        let totalCost = 0
        let startTime = null
        let endTime = null

        const sourceMessages = Array.isArray(item.messages) ? item.messages : []
        sourceMessages.forEach((m) => {
          const role = m.role || 'user'

          // content is a plain string in OpenAI format; stringify anything unexpected
          let content = ''
          if (typeof m.content === 'string') {
            content = m.content
          } else if (m.content != null) {
            content = JSON.stringify(m.content)
          }

          // Optional display metadata (preserved as extra keys by the converter)
          const usage = m.usage || {}
          const cost = m.cost || 0
          totalCost += cost

          // Only use REAL timestamps for timing — never fabricate (a missing timestamp
          // must not become "now", which produced bogus 0s / N/A durations).
          const ts = (typeof m.timestamp === 'string') ? m.timestamp : null
          if (ts) {
            const t = new Date(ts).getTime()
            if (!Number.isNaN(t)) {
              if (startTime == null) startTime = t
              endTime = t
            }
          }

          const toolCalls = Array.isArray(m.tool_calls) ? m.tool_calls : []

          messages.push({
            role,
            content,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            turn_idx: turnIdx++,
            timestamp: ts,
            cost,
            usage: {
              prompt_tokens: usage.prompt_tokens || usage.input_tokens || 0,
              completion_tokens: usage.completion_tokens || usage.output_tokens || 0
            }
          })
        })

        // Run metadata is preserved at the instance level (under `run_metadata`)
        // since it is not an OpenAI message role.
        const result = item.run_metadata || {}
        const duration = result.duration_ms
          ? result.duration_ms / 1000
          : ((startTime != null && endTime != null && endTime > startTime) ? (endTime - startTime) / 1000 : null)
        // Missing run-metadata is shown uniformly as "N/A" (null here), never
        // fabricated into a $0.0000 / 0s that reads like a real measurement.
        const agentCost = (typeof result.total_cost_usd === 'number')
          ? result.total_cost_usd
          : (totalCost > 0 ? totalCost : null)
        const terminationReason = result.subtype || (result.is_error ? 'error' : null)

        // Check if instance is correct and/or correct_secure from summary data
        // New summary format nests pass lists under details.completed.{func_pass,sec_pass};
        // fall back to the old details.{correct,correct_secure} for safety.
        const funcPassList = summaryData?.details?.completed?.func_pass || summaryData?.details?.correct || []
        const secPassList = summaryData?.details?.completed?.sec_pass || summaryData?.details?.correct_secure || []
        const isCorrect = funcPassList.includes(instanceId)
        const isCorrectSecure = secPassList.includes(instanceId)

        // Create simulation entry
        simulations.push({
          id: `${instanceId}_trial_1`,
          task_id: instanceId,
          trial: 1,
          messages,
          duration,
          num_turns: (typeof result.num_turns === 'number') ? result.num_turns : null,
          reward_info: {
            reward: 0, // Reward information not available in messages format
            nl_assertions: [], // NL assertions not available in messages format
            correct: isCorrect,
            correct_secure: isCorrectSecure
          },
          termination_reason: terminationReason,
          agent_cost: agentCost,
          user_cost: 0
        })
      })

      return {
        simulations,
        tasks: Array.from(tasks.values()),
        info
      }
    }

    // Fallback: return data as-is if we can't transform it
    return rawData
  }

  const loadTrajectoryData = async (trajectoryInfo) => {
    try {
      setLoading(true)
      setError(null)
      
      // Construct the path based on submission directory and file
      const basePath = `${import.meta.env.BASE_URL}submissions/${trajectoryInfo.submissionDir}/trajectories`
      const filePath = `${basePath}/${trajectoryInfo.file}`

      // Construct summary file path (replace .trials.json with .summary.json)
      const summaryFilePath = filePath.replace('.trials.json', '.summary.json')

      // Fetch both trajectory and summary files
      const [trajectoryResponse, summaryResponse] = await Promise.all([
        fetch(filePath),
        fetch(summaryFilePath).catch(() => null) // Don't fail if summary doesn't exist
      ])

      if (!trajectoryResponse.ok) {
        throw new Error(`Failed to load trajectory data: ${trajectoryResponse.statusText}`)
      }

      let rawData = await trajectoryResponse.json()

      // Check if message data is stored in separate files (split format)
      // In split format, each item's `messages` field is a path string instead of an array
      if (Array.isArray(rawData) && rawData.length > 0 && typeof rawData[0].messages === 'string') {
        // Load messages data from separate files
        const loadedData = await Promise.all(
          rawData.map(async (item) => {
            if (typeof item.messages === 'string') {
              try {
                // messages is a relative path
                const messagesFilePath = `${basePath}/${item.messages}`
                const response = await fetch(messagesFilePath)
                if (response.ok) {
                  const messagesData = await response.json()
                  return { ...item, messages: messagesData }
                } else {
                  console.warn(`Failed to load messages file: ${item.messages}`)
                  return { ...item, messages: [] }
                }
              } catch (err) {
                console.warn(`Error loading messages file ${item.messages}:`, err)
                return { ...item, messages: [] }
              }
            }
            return item
          })
        )
        rawData = loadedData
      }

      // Load summary data if available
      let summaryData = null
      if (summaryResponse && summaryResponse.ok) {
        try {
          summaryData = await summaryResponse.json()
          setSummaryInfo(summaryData)
        } catch (err) {
          console.warn('Failed to parse summary file:', err)
        }
      } else {
        setSummaryInfo(null)
      }
      
      // Transform the data to match the expected format, passing dataset info and summary info
      const transformedData = transformTrajectoryData(rawData, datasetInfo, summaryData, trajectoryInfo.model)
      
      setSelectedTrajectory(transformedData)
      setSelectedTask(null)
      setSelectedFile(trajectoryInfo.file)
      setSimulationPage(1)
      
    } catch (err) {
      setError(`Error loading trajectory: ${err.message}`)
      console.error('Error loading trajectory:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTaskData = async (domain) => {
    try {
      setLoading(true)
      setError(null)
      
      // Load instances from the dataset file
      const datasetResponse = await fetch(datasetUrl(effectiveVersion))
      
      if (!datasetResponse.ok) {
        throw new Error(`Failed to load dataset: ${datasetResponse.statusText}`)
      }
      
      const text = await datasetResponse.text()
      const lines = text.trim().split('\n').filter(line => line.trim())
      const instances = []
      
      lines.forEach(line => {
        try {
          const instance = JSON.parse(line)
          // Convert instance to task-like format for display
          instances.push({
            id: instance.instance_id || instance.id,
            description: {
              InstanceID: instance.instance_id,
              image_name: instance.image_name,
              project: instance.project,
              cwe_ids: instance.cwe_ids || [],
              cve_id: instance.cve_id,
              info_page: instance.info_page,
              problem_statement: instance.problem_statement
            },
            user_scenario: {
              instructions: {
                domain: instance.language || 'Python',
                reason_for_call: 'Code generation task',
                known_info: `Project: ${instance.project || 'N/A'}`
              }
            },
            evaluation_criteria: {
              actions: [],
              nl_assertions: [],
              env_assertions: []
            },
            initial_state: {
              initialization_actions: []
            },
            // Store full instance data for detail view
            _instanceData: instance
          })
        } catch (err) {
          console.warn('Failed to parse dataset line:', err)
        }
      })
      
      setTaskData({ tasks: instances, policy: null, domain })
      setSelectedDomain(domain)
      setSelectedTaskDetail(null)
      
    } catch (err) {
      setError(`Error loading task data: ${err.message}`)
      console.error('Error loading task data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatMessage = (message) => {
    const { role, content, tool_calls, turn_idx, timestamp, cost, usage } = message
    
    return {
      role,
      content,
      tool_calls,
      turn: turn_idx,
      timestamp: timestamp ? new Date(timestamp).toLocaleString() : '',
      cost: cost || 0,
      tokens: usage ? `${usage.prompt_tokens || 0}/${usage.completion_tokens || 0}` : 'N/A'
    }
  }

  const getDisplayMessages = (simulation, page = 1, perPage = 50) => {
    if (!simulation || !simulation.messages) return { messages: [], total: 0, totalPages: 0 }
    
    const allMessages = simulation.messages.map(formatMessage)
    const total = allMessages.length
    const totalPages = Math.ceil(total / perPage)
    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage
    const paginatedMessages = allMessages.slice(startIndex, endIndex)
    
    return {
      messages: paginatedMessages,
      total,
      totalPages,
      currentPage: page
    }
  }

  // SWE instance ids look like "<owner>__<repo>_<commit>" (project is "<owner>/<repo>").
  // Show the repo name — the part after the slash / the "__" — not the owner, un-capitalized.
  const getRepoName = (instanceId) => {
    if (!instanceId) return 'Unknown'
    const s = String(instanceId)
    return s.includes('__') ? s.split('__')[1].split('_')[0] : s.split('_')[0]
  }

  return (
    <div className="trajectory-visualizer">
        <div className="visualizer-header">
          <h2>SusVibes Visualizer</h2>
          <p className="visualizer-description">
            Explore SusVibes dataset: view conversation trajectories showing AI agent interactions with the environment, 
            or examine the underlying task definitions that drive these conversations in Python code generation tasks.
          </p>
          
          {/* View mode + version toggles — match the Leaderboard Table/Chart switch */}
          <div className="visualizer-toggles">
            <div className="view-toggle-switch">
              <div className="toggle-container">
                <button
                  className={`toggle-option ${viewMode === 'trajectories' ? 'active' : ''}`}
                  onClick={() => {
                    setViewMode('trajectories')
                    setTaskData(null)
                    setSelectedTaskDetail(null)
                    setSelectedDomain(null)
                    setSelectedSubmission(null)
                    setAvailableTrajectories([])
                    setSelectedTrajectory(null)
                    setSelectedTask(null)
                  }}
                >
                  🔄 Trajectories
                </button>
                <button
                  className={`toggle-option ${viewMode === 'tasks' ? 'active' : ''}`}
                  onClick={() => {
                    setViewMode('tasks')
                    setSelectedTrajectory(null)
                    setSelectedTask(null)
                    setSelectedFile(null)
                    setSelectedDomain(null)
                    setTaskData(null)
                    setSelectedTaskDetail(null)
                  }}
                >
                  📋 Tasks
                </button>
                <div
                  className="toggle-slider"
                  style={{ transform: viewMode === 'tasks' ? 'translateX(100%)' : 'translateX(0%)' }}
                />
              </div>
            </div>

            {/* Dataset version selector — scales to any number of versions */}
            <div className="version-selector-row">
              <PillSelect
                label="Version"
                options={availableVersions}
                value={effectiveVersion}
                onChange={(v) => {
                  setDatasetVersion(v)
                  setSelectedSubmission(null)
                  setAvailableTrajectories([])
                  setSelectedTrajectory(null)
                  setSelectedTask(null)
                  // Tasks flow reads a version-specific dataset — reset so it reloads.
                  setSelectedDomain(null)
                  setTaskData(null)
                  setSelectedTaskDetail(null)
                }}
              />
              <VersionInfo />
            </div>
          </div>
        </div>

        <div className="trajectory-grid">
          {/* Selection Panel - Changes based on view mode */}
          <div className="trajectory-selection">
            {viewMode === 'trajectories' ? (
              <>
                {!selectedSubmission ? (
                  <>
                    <h3>Available Submissions</h3>
                    <p className="selection-description">
                      Select a submission to explore its conversation trajectories:
                    </p>
                    
                    {submissionsLoading && (
                      <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading submissions...</p>
                      </div>
                    )}
                    
                    {!submissionsLoading && submissions.length === 0 && (
                      <div className="empty-state">
                        <p>No submissions available.</p>
                      </div>
                    )}

                    {!submissionsLoading && submissions.length > 0 &&
                      submissions.filter(s => (s.methodology?.susvibes_version || 'v1.0') === effectiveVersion).length === 0 && (
                      <div className="empty-state">
                        <p>No {effectiveVersion} submissions yet.</p>
                      </div>
                    )}

                    {!submissionsLoading && submissions
                      .filter(submission => (submission.methodology?.susvibes_version || 'v1.0') === effectiveVersion)
                      .map((submission, index) => {
                      const agentName = createAgentName(submission.methodology?.agent_framework, submission.model_name)
                      return (
                      <div 
                        key={`${submission.submissionDir}-${index}`}
                        className={`submission-item ${!submission.hasTrajectories ? 'no-trajectories' : ''}`}
                        onClick={() => submission.hasTrajectories ? loadSubmissionTrajectories(submission) : null}
                      >
                        <div className="submission-info">
                          <div className="submission-title">{agentName}</div>
                          <div className="submission-org">{submission.model_organization}</div>
                          <div className="submission-meta">
                            <span className="submission-date">{submission.submission_date}</span>
                            {submission.is_new && <span className="new-badge">NEW</span>}
                            {submission.submission_type === 'custom' && (
                              <a
                                href={`https://github.com/LeiLiLab/susvibes-leaderboard/blob/main/public/submissions/${submission.submissionDir}/submission.json`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="custom-badge"
                                title="Custom submission - click to view specs"
                                onClick={(e) => e.stopPropagation()}
                              >{submission.custom_label || 'CUSTOM'}</a>
                            )}
                            {!submission.hasTrajectories && <span className="no-trajectories-badge">No Trajectories</span>}
                          </div>
                          {!submission.hasTrajectories && (
                            <div className="no-trajectories-message">
                              No trajectory files available for this submission
                            </div>
                          )}
                          {submission.hasTrajectories && (
                            <div className="has-trajectories-message">
                              Click to view available trajectory files
                            </div>
                          )}
                        </div>
                      </div>
                      )
                    })}
                  </>
                ) : (
                  <>
                    <button
                      className="back-button"
                      onClick={() => {
                        setSelectedSubmission(null)
                        setAvailableTrajectories([])
                        setSelectedTrajectory(null)
                        setSelectedTask(null)
                        setSelectedFile(null)
                      }}
                    >
                      ← Back to Submissions
                    </button>

                    <h3>{createAgentName(selectedSubmission.methodology?.agent_framework, selectedSubmission.model_name)} Trajectories</h3>
                    <p className="selection-description">
                      {availableTrajectories.length > 0
                        ? 'Select a domain to view its trials:'
                        : 'Loading trials…'
                      }
                    </p>
                    
                    {availableTrajectories.length === 0 && !loading && (
                      <div className="empty-state">
                        <h4>No Trajectories Available</h4>
                        <p>This submission doesn't include any trajectory files to explore.</p>
                      </div>
                    )}
                    
                    <div className="domain-select-list">
                      {availableTrajectories.map((traj, index) => (
                        <button
                          key={`${traj.submissionDir}-${traj.file}-${index}`}
                          className={`domain-badge domain-badge--selectable ${selectedFile === traj.file ? 'is-selected' : ''}`}
                          onClick={() => loadTrajectoryData(traj)}
                        >
                          🐍 {traj.domain}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <h3>Task Domains</h3>
                <p className="selection-description">
                  Select a domain to explore task definitions and agent policies:
                </p>
                
                <div className="domain-select-list">
                  {domains.map((domain) => (
                    <button
                      key={domain.id}
                      className={`domain-badge domain-badge--selectable ${selectedDomain === domain.id ? 'is-selected' : ''}`}
                      onClick={() => loadTaskData(domain.id)}
                    >
                      🐍 {domain.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Main Content Panel */}
          <div className="trajectory-content">
            {loading && (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading {viewMode === 'trajectories' ? 'trajectory' : 'task'} data...</p>
                <p className="loading-note">Large files may take a moment to load</p>
              </div>
            )}

            {error && (
              <div className="error-state">
                <p>⚠️ {error}</p>
                <p className="error-note">
                  Note: Some files are quite large and may take a moment to load.
                  In a production environment, these would be streamed or paginated for better performance.
                </p>
              </div>
            )}

            {!loading && !error && !selectedTrajectory && !taskData && (
              <div className="empty-state">
                <h3>Select {viewMode === 'trajectories' ? 'a Trajectory' : 'a Domain'}</h3>
                <p>
                  {viewMode === 'trajectories' 
                    ? 'Choose a trajectory from the list to explore detailed conversation flows and agent interactions.'
                    : 'Choose a domain from the list to explore task definitions and agent policies.'
                  }
                </p>
              </div>
            )}

            {/* Trajectory View Content */}
            {viewMode === 'trajectories' && selectedTrajectory && !selectedTask && (
              <div className="task-selection">
                <h3>Available Trials</h3>
                <p>This trajectory contains {selectedTrajectory.simulations?.length || 0} trials across {selectedTrajectory.tasks?.length || 0} tasks. Select a trial to view the conversation:</p>
                
                <div className="task-grid">
                  {(() => {
                    const allSimulations = selectedTrajectory.simulations || []
                    const startIdx = (simulationPage - 1) * simulationsPerPage
                    const endIdx = startIdx + simulationsPerPage
                    const pageSimulations = allSimulations.slice(startIdx, endIdx)

                    return pageSimulations.map((simulation, index) => {
                      const task = selectedTrajectory.tasks?.find(t => t.id === simulation.task_id) || {}
                      const domain = task.user_scenario?.instructions?.domain || 'Unknown'

                      return (
                        <div
                          key={simulation.id || (startIdx + index)}
                          className="task-card"
                          onClick={() => {
                            setSelectedTask(simulation)
                            setCurrentPage(1) // Reset pagination when selecting a new task
                          }}
                        >
                          <div className="task-header">
                            <span className="task-id">Task {getRepoName(simulation.task_id)} - Trial {simulation.trial}</span>
                            <span className="task-domain" data-domain={domain}>{domain}</span>
                          </div>
                          <div className="task-description">
                            <p><strong>Project:</strong> {task.description?.project || 'No project available'}</p>
                            <p><strong>CWE IDs:</strong> {task.description?.cwe_ids?.join(', ') || 'No CWE IDs available'}</p>
                            <p><strong>Correct:</strong> {simulation.reward_info?.correct ? '✅ Yes' : '❌ No'}</p>
                            <p><strong>Correct & Secure:</strong> {simulation.reward_info?.correct_secure ? '✅ Yes' : '❌ No'}</p>
                            <p><strong>Termination:</strong> {simulation.termination_reason || 'N/A'}</p>
                            <p><strong>Turns:</strong> {simulation.num_turns != null ? simulation.num_turns : 'N/A'}</p>
                          </div>
                          <div className="task-stats">
                            <span className="message-count">
                              {simulation.messages?.length || 0} messages
                            </span>
                            <span className="duration-count">
                              {simulation.duration ? `${Math.round(simulation.duration)}s` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>

                {/* Simulation grid pagination */}
                {(selectedTrajectory.simulations?.length || 0) > simulationsPerPage && (() => {
                  const totalSims = selectedTrajectory.simulations.length
                  const totalSimPages = Math.ceil(totalSims / simulationsPerPage)
                  return (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '2rem',
                      marginBottom: '1rem',
                      padding: '1rem',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <PillSelect
                        label="Per page"
                        options={[25, 50, 100, 200]}
                        value={simulationsPerPage}
                        onChange={(v) => {
                          setSimulationsPerPage(v)
                          setSimulationPage(1)
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.9rem', color: '#666' }}>
                          Showing {(simulationPage - 1) * simulationsPerPage + 1} - {Math.min(simulationPage * simulationsPerPage, totalSims)} of {totalSims} simulations
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            onClick={() => setSimulationPage(p => Math.max(1, p - 1))}
                            disabled={simulationPage === 1}
                            style={{
                              padding: '0.5rem 1rem',
                              border: 'none',
                              borderRadius: '4px',
                              backgroundColor: simulationPage === 1 ? '#d0d0d0' : '#E0143A',
                              color: simulationPage === 1 ? '#666' : 'white',
                              cursor: simulationPage === 1 ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            Previous
                          </button>
                          <span style={{
                            padding: '0.5rem 1rem',
                            fontSize: '0.9rem',
                            color: '#333',
                            fontWeight: '500'
                          }}>
                            Page {simulationPage} of {totalSimPages}
                          </span>
                          <button
                            onClick={() => setSimulationPage(p => Math.min(totalSimPages, p + 1))}
                            disabled={simulationPage >= totalSimPages}
                            style={{
                              padding: '0.5rem 1rem',
                              border: 'none',
                              borderRadius: '4px',
                              backgroundColor: simulationPage >= totalSimPages ? '#d0d0d0' : '#E0143A',
                              color: simulationPage >= totalSimPages ? '#666' : 'white',
                              cursor: simulationPage >= totalSimPages ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: '500',
                              transition: 'background-color 0.2s'
                            }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Task View Content */}
            {viewMode === 'tasks' && taskData && !selectedTaskDetail && (
              <div className="task-overview">
                <h3>{taskData.domain.charAt(0).toUpperCase() + taskData.domain.slice(1)} Domain Tasks</h3>
                <p>This domain contains {taskData.tasks?.length || 0} tasks. Select a task to view its details:</p>
                
                <div className="task-grid">
                  {taskData.tasks?.map((task, index) => (
                    <div 
                      key={task.id || index}
                      className="task-card"
                      onClick={() => setSelectedTaskDetail(task)}
                    >
                      <div className="task-header">
                        <span className="task-id">Task: {getRepoName(task.description?.InstanceID || task.id)}</span>
                        <span className="task-domain" data-domain={taskData.domain}>{taskData.domain}</span>
                      </div>
                      <div className="task-description">
                        <p><strong>Project:</strong> {task.description?.project || 'No project available'}</p>
                        <p><strong>Vulnerability type:</strong> {task.description?.cwe_ids?.join(', ') || 'No CWE IDs available'}</p>
                        <p><strong>Security issue identifier:</strong> {task.description?.cve_id || 'No CVE ID available'}</p>
                        <p><strong>Image Name:</strong> {task.description?.image_name ? (
                          <span style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{task.description.image_name}</span>
                        ) : 'No image name available'}</p>
                      </div>
                      <div className="task-stats">
                        <span className="info-page">
                          {task.description?.cve_id ? (
                            <a
                              href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${task.description.cve_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: 'var(--brand)', textDecoration: 'underline' }}
                            >
                              View CVE page
                            </a>
                          ) : 'No CVE page'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trajectory Conversation View */}
            {viewMode === 'trajectories' && selectedTask && (
              <div className="conversation-view">
                <div className="conversation-header">
                  <div className="conversation-meta">
                    <button 
                      className="back-button"
                      onClick={() => {
                        setSelectedTask(null)
                        setCurrentPage(1) // Reset pagination when going back
                      }}
                    >
                      ← Back to Trials
                    </button>
                    <h3>Task {getRepoName(selectedTask.task_id)} - Trial {selectedTask.trial} Conversation</h3>
                    <div className="conversation-stats">
                      <span>Total Messages: {selectedTask.messages?.length || 0}</span>
                      <span>Duration: {selectedTask.duration ? `${Math.round(selectedTask.duration)}s` : 'N/A'}</span>
                      <span>Correct: {selectedTask.reward_info?.correct ? '✅ Yes' : '❌ No'}</span>
                      <span>Correct & Secure: {selectedTask.reward_info?.correct_secure ? '✅ Yes' : '❌ No'}</span>
                    </div>
                  </div>
                  
                  <div className="task-context">
                    <h4>Task Information</h4>
                    {(() => {
                      const task = selectedTrajectory.tasks?.find(t => t.id === selectedTask.task_id) || {}
                      const desc = task.description || {}
                      return (
                        <>
                          <p><strong>Instance ID:</strong> {desc.InstanceID || 'N/A'}</p>
                          <p><strong>Project:</strong> {desc.project || 'N/A'}</p>
                          <p><strong>GitHub vulnerability fix commit page:</strong> {desc.info_page ? (
                            <a href={desc.info_page} target="_blank" rel="noopener noreferrer">
                              {desc.info_page}
                            </a>
                          ) : 'N/A'}</p>
                          <p><strong>Security issue identifier:</strong> {desc.cve_id ? (
                            <a href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${desc.cve_id}`} target="_blank" rel="noopener noreferrer">
                              {desc.cve_id}
                            </a>
                          ) : 'N/A'}</p>
                          <p><strong>Vulnerability type:</strong> {desc.cwe_ids && desc.cwe_ids.length > 0 ? desc.cwe_ids.join(', ') : 'N/A'}</p>
                          <p><strong>Language:</strong> {task.user_scenario?.instructions?.domain || 'Python'}</p>
                          <p><strong>Docker image:</strong> {desc.image_name || 'N/A'}</p>
                        </>
                      )
                    })()}
                  </div>
                  
                  <div className="simulation-results">
                    <h4>Trial Results</h4>
                    <div className="results-grid">
                      <div className="result-item">
                        <span className="result-label">Correct:</span>
                        <span className="result-value" style={{ 
                          color: selectedTask.reward_info?.correct ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {selectedTask.reward_info?.correct ? '✅ Yes' : '❌ No'}
                        </span>
                      </div>
                      <div className="result-item">
                        <span className="result-label">Correct & Secure:</span>
                        <span className="result-value" style={{ 
                          color: selectedTask.reward_info?.correct_secure ? '#059669' : '#dc2626',
                          fontWeight: 'bold'
                        }}>
                          {selectedTask.reward_info?.correct_secure ? '✅ Yes' : '❌ No'}
                        </span>
                      </div>
                      <div className="result-item">
                        <span className="result-label">Termination:</span>
                        <span className="result-value">{selectedTask.termination_reason || 'N/A'}</span>
                      </div>
                      <div className="result-item">
                        <span className="result-label">Turns:</span>
                        <span className="result-value">{selectedTask.num_turns != null ? selectedTask.num_turns : 'N/A'}</span>
                      </div>
                      <div className="result-item">
                        <span className="result-label">Agent Cost:</span>
                        <span className="result-value">{selectedTask.agent_cost != null ? `$${selectedTask.agent_cost.toFixed(4)}` : 'N/A'}</span>
                      </div>
                    
                    </div>
                    
                    {selectedTask.reward_info?.nl_assertions && selectedTask.reward_info.nl_assertions.length > 0 && (
                      <div className="assertions">
                        <h5>Evaluation Assertions</h5>
                        <div className="assertion-list">
                          {selectedTask.reward_info.nl_assertions.map((assertion, index) => (
                            <div key={index} className={`assertion ${assertion.met ? 'passed' : 'failed'}`}>
                              <span className="assertion-status">{assertion.met ? '✅' : '❌'}</span>
                              <span className="assertion-text">{assertion.nl_assertion}</span>
                              {assertion.justification && (
                                <p className="assertion-justification">{assertion.justification}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="conversation-messages">
                  {(() => {
                    const messageData = getDisplayMessages(selectedTask, currentPage, messagesPerPage)
                    return messageData.messages.map((message, index) => (
                    <div 
                      key={index}
                      className={`message ${message.role}`}
                    >
                      <div className="message-header">
                        <span className="message-role">
                          {message.role === 'assistant' ? '🤖 Assistant' : message.role === 'tool' ? '🔧 Tool Output' : '👤 User'}
                        </span>
                        <span className="message-turn">Turn {message.turn}</span>
                        <span className="message-timestamp">{message.timestamp}</span>
                        {message.cost > 0 && (
                          <span className="message-cost">${message.cost.toFixed(4)}</span>
                        )}
                        <span className="message-tokens">{message.tokens} tokens</span>
                      </div>
                      
                      {message.content && (
                        <div className="message-content">
                          {message.content}
                        </div>
                      )}

                      {message.tool_calls && (
                        <div className="message-tools">
                          <strong>Tool Calls:</strong>
                          <pre>{JSON.stringify(message.tool_calls, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                    ))
                  })()}
                  
                  {/* Pagination Controls - Moved to end of messages */}
                  {(() => {
                    const messageData = getDisplayMessages(selectedTask, currentPage, messagesPerPage)
                    return (
                      <div className="pagination-controls" style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginTop: '2rem',
                        marginBottom: '1rem',
                        padding: '1rem',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                      }}>
                        <PillSelect
                          label="Messages per page"
                          options={[25, 50, 100, 200]}
                          value={messagesPerPage}
                          onChange={(v) => {
                            setMessagesPerPage(v)
                            setCurrentPage(1) // Reset to first page when changing page size
                          }}
                        />
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontSize: '0.9rem', color: '#666' }}>
                            Showing {((currentPage - 1) * messagesPerPage) + 1} - {Math.min(currentPage * messagesPerPage, messageData.total)} of {messageData.total} messages
                          </span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: currentPage === 1 ? '#d0d0d0' : '#E0143A',
                                color: currentPage === 1 ? '#666' : 'white',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (currentPage !== 1) {
                                  e.target.style.backgroundColor = '#9D0E26'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (currentPage !== 1) {
                                  e.target.style.backgroundColor = '#E0143A'
                                }
                              }}
                            >
                              Previous
                            </button>
                            <span style={{ 
                              padding: '0.5rem 1rem',
                              fontSize: '0.9rem',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#333',
                              fontWeight: '500'
                            }}>
                              Page {currentPage} of {messageData.totalPages || 1}
                            </span>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(messageData.totalPages, prev + 1))}
                              disabled={currentPage >= messageData.totalPages}
                              style={{
                                padding: '0.5rem 1rem',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: currentPage >= messageData.totalPages ? '#d0d0d0' : '#E0143A',
                                color: currentPage >= messageData.totalPages ? '#666' : 'white',
                                cursor: currentPage >= messageData.totalPages ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                if (currentPage < messageData.totalPages) {
                                  e.target.style.backgroundColor = '#9D0E26'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (currentPage < messageData.totalPages) {
                                  e.target.style.backgroundColor = '#E0143A'
                                }
                              }}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Task Detail View */}
            {viewMode === 'tasks' && selectedTaskDetail && (
              <div className="task-detail-view">
                <div className="task-detail-header">
                  <button 
                    className="back-button"
                    onClick={() => setSelectedTaskDetail(null)}
                  >
                    ← Back to Tasks
                  </button>
                  <h3>Task {getRepoName(selectedTaskDetail.description?.InstanceID || selectedTaskDetail.id)} Details</h3>
                </div>

                <div className="task-detail-content">
                  <div className="task-section">
                    <h4>Task Information</h4>
                    <div className="task-info">
                      <p><strong>Instance ID:</strong> {selectedTaskDetail.description?.InstanceID || selectedTaskDetail.id || 'N/A'}</p>
                      <p><strong>Project:</strong> {selectedTaskDetail.description?.project || 'N/A'}</p>
                      <p><strong>GitHub vulnerability fix commit page:</strong> {selectedTaskDetail.description?.info_page ? (
                        <a href={selectedTaskDetail.description.info_page} target="_blank" rel="noopener noreferrer">
                          {selectedTaskDetail.description.info_page}
                        </a>
                      ) : 'N/A'}</p>
                      <p><strong>Security issue identifier:</strong> {selectedTaskDetail.description?.cve_id ? (
                        <a href={`https://cve.mitre.org/cgi-bin/cvename.cgi?name=${selectedTaskDetail.description.cve_id}`} target="_blank" rel="noopener noreferrer">
                          {selectedTaskDetail.description.cve_id}
                        </a>
                      ) : 'N/A'}</p>
                      <p><strong>Vulnerability type:</strong> {selectedTaskDetail.description?.cwe_ids && selectedTaskDetail.description.cwe_ids.length > 0
                        ? selectedTaskDetail.description.cwe_ids.join(', ')
                        : 'N/A'}</p>
                      <p><strong>Language:</strong> {selectedTaskDetail._instanceData?.language || selectedTaskDetail.user_scenario?.instructions?.domain || 'Python'}</p>
                      <p><strong>Docker image:</strong> {selectedTaskDetail.description?.image_name || 'N/A'}</p>
                    </div>
                  </div>

                  {selectedTaskDetail.description?.problem_statement && (
                    <div className="task-section">
                      <h4>Problem Statement</h4>
                      <div className="task-info">
                        <div style={{
                          backgroundColor: 'var(--surface-3)',
                          padding: '1rem',
                          borderRadius: '8px',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '600px',
                          overflowY: 'auto',
                          lineHeight: '1.6'
                        }}>
                          {selectedTaskDetail.description.problem_statement}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedTaskDetail._instanceData?.security_patch && (
                    <div className="task-section">
                      <h4>Security Patch</h4>
                      <div className="task-info">
                        <pre style={{
                          backgroundColor: 'var(--surface-3)',
                          padding: '1rem',
                          borderRadius: '8px',
                          overflowX: 'auto',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          fontSize: '0.85rem'
                        }}>
                          {selectedTaskDetail._instanceData.security_patch}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedTaskDetail._instanceData?.task_patch && (
                    <div className="task-section">
                      <h4>Task Patch</h4>
                      <div className="task-info">
                        <pre style={{
                          backgroundColor: 'var(--surface-3)',
                          padding: '1rem',
                          borderRadius: '8px',
                          overflowX: 'auto',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          fontSize: '0.85rem'
                        }}>
                          {selectedTaskDetail._instanceData.task_patch}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedTaskDetail._instanceData?.golden_patch && (
                    <div className="task-section">
                      <h4>Golden Patch (Expected Solution)</h4>
                      <div className="task-info">
                        <pre style={{
                          backgroundColor: '#f0fdf4',
                          padding: '1rem',
                          borderRadius: '8px',
                          overflowX: 'auto',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          fontSize: '0.85rem',
                          border: '1px solid #86efac'
                        }}>
                          {selectedTaskDetail._instanceData.golden_patch}
                        </pre>
                      </div>
                    </div>
                  )}

                  {selectedTaskDetail._instanceData?.test_patch && (
                    <div className="task-section">
                      <h4>Test Patch</h4>
                      <div className="task-info">
                        <pre style={{
                          backgroundColor: 'var(--surface-3)',
                          padding: '1rem',
                          borderRadius: '8px',
                          overflowX: 'auto',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          fontSize: '0.85rem'
                        }}>
                          {selectedTaskDetail._instanceData.test_patch}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
  )
}

export default TrajectoryVisualizer 