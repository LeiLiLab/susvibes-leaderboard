const submissionCache = new Map()

async function fetchSubmissionEntries(baseUrl) {
  try {
    const indexResponse = await fetch(`${baseUrl}submissions/index.json`)
    if (indexResponse.ok) {
      const index = await indexResponse.json()
      return index.submissions || []
    }
  } catch {
    // Fall through to the manifest for older deployments.
  }

  const manifestResponse = await fetch(`${baseUrl}submissions/manifest.json`)
  if (!manifestResponse.ok) {
    throw new Error('Failed to load submissions manifest')
  }

  const manifest = await manifestResponse.json()
  const entries = await Promise.all(
    (manifest.submissions || []).map(async submissionDir => {
      try {
        const response = await fetch(
          `${baseUrl}submissions/${submissionDir}/submission.json`
        )
        if (!response.ok) {
          console.warn(`Failed to load ${submissionDir}: ${response.status}`)
          return null
        }

        return {
          ...await response.json(),
          submissionDir
        }
      } catch (error) {
        console.warn(`Error loading ${submissionDir}:`, error)
        return null
      }
    })
  )

  return entries.filter(Boolean)
}

export function loadSubmissionEntries(baseUrl) {
  if (!submissionCache.has(baseUrl)) {
    const request = fetchSubmissionEntries(baseUrl).catch(error => {
      submissionCache.delete(baseUrl)
      throw error
    })
    submissionCache.set(baseUrl, request)
  }

  return submissionCache.get(baseUrl)
}
