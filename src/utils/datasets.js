const metadataCache = new Map()
const fullDatasetCache = new Map()

function cacheRequest(cache, key, requestFactory) {
  if (!cache.has(key)) {
    const request = requestFactory().catch(error => {
      cache.delete(key)
      throw error
    })
    cache.set(key, request)
  }
  return cache.get(key)
}

export function loadDatasetMetadata(baseUrl, version) {
  const key = `${baseUrl}:${version}`
  return cacheRequest(metadataCache, key, async () => {
    const response = await fetch(
      `${baseUrl}datasets/susvibes_dataset_${version}.metadata.json`
    )
    if (!response.ok) {
      throw new Error(`Failed to load ${version} dataset metadata`)
    }
    return response.json()
  })
}

export function loadFullDataset(baseUrl, version) {
  const key = `${baseUrl}:${version}`
  return cacheRequest(fullDatasetCache, key, async () => {
    const response = await fetch(
      `${baseUrl}datasets/susvibes_dataset_${version}.jsonl`
    )
    if (!response.ok) {
      throw new Error(`Failed to load ${version} dataset`)
    }

    const text = await response.text()
    return text.trim().split('\n').filter(Boolean).map(JSON.parse)
  })
}
