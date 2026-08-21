import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(scriptPath), '..')
const submissionsRoot = path.join(repoRoot, 'public', 'submissions')
const datasetsRoot = path.join(repoRoot, 'public', 'datasets')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value, pretty = false) {
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(value, null, pretty ? 2 : undefined)}\n`
  )
}

function generateSubmissionIndex() {
  const manifest = readJson(path.join(submissionsRoot, 'manifest.json'))
  const submissions = manifest.submissions.map(submissionDir => ({
    ...readJson(path.join(submissionsRoot, submissionDir, 'submission.json')),
    submissionDir
  }))

  writeJson(
    path.join(submissionsRoot, 'index.json'),
    {
      last_updated: manifest.last_updated,
      submissions
    },
    true
  )

  return submissions.length
}

function generateDatasetMetadata() {
  const datasetFiles = fs.readdirSync(datasetsRoot)
    .filter(fileName => /^susvibes_dataset_v.+\.jsonl$/.test(fileName))

  return datasetFiles.map(fileName => {
    const sourcePath = path.join(datasetsRoot, fileName)
    const metadata = fs.readFileSync(sourcePath, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const instance = JSON.parse(line)
        return {
          instance_id: instance.instance_id,
          image_name: instance.image_name || null,
          project: instance.project || null,
          cwe_ids: instance.cwe_ids || [],
          cve_id: instance.cve_id || null,
          info_page: instance.info_page || null,
          problem_statement: instance.problem_statement || null,
          language: instance.language || 'Python'
        }
      })

    const outputName = fileName.replace('.jsonl', '.metadata.json')
    const outputPath = path.join(datasetsRoot, outputName)
    writeJson(outputPath, metadata)

    return {
      fileName: outputName,
      instances: metadata.length,
      bytes: fs.statSync(outputPath).size
    }
  })
}

export function generatePublicData() {
  const submissionCount = generateSubmissionIndex()
  const datasets = generateDatasetMetadata()

  console.log(`Generated submission index with ${submissionCount} entries.`)
  datasets.forEach(dataset => {
    console.log(
      `Generated ${dataset.fileName}: ${dataset.instances} instances, ${dataset.bytes} bytes.`
    )
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  generatePublicData()
}
