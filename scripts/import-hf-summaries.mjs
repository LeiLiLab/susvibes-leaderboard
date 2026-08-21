import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generatePublicData } from './generate-public-data.mjs'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const sourceRoot = path.resolve(
  repoRoot,
  process.argv[2] || '../agent-security/data/trajectory/susvibes'
)
const submissionsRoot = path.join(repoRoot, 'public', 'submissions')
const manifestPath = path.join(submissionsRoot, 'manifest.json')
const submissionDate = '2026-08-21'
const hfRoot =
  'https://huggingface.co/datasets/dqwang122/safevibe-data/blob/main/trajectory/susvibes'

const contactInfo = {
  email: 'brxx122@gmail.com',
  name: 'Danqing Wang',
  github: 'dqwang122'
}

const runs = [
  {
    source: 'claude_code/generic/claude-opus48',
    slug: 'claude-opus-4.8_claude-code_default_2026-08-21',
    modelName: 'Claude Opus 4.8',
    modelOrganization: 'Anthropic',
    agentFramework: 'Claude Code'
  },
  {
    source: 'codex/generic/codex-gpt55',
    slug: 'gpt-5.5_codex-cli_default_2026-08-21',
    modelName: 'GPT-5.5',
    modelOrganization: 'OpenAI',
    agentFramework: 'Codex CLI'
  },
  {
    source: 'copilot-claude48/generic/claude-opus-4.8',
    slug: 'claude-opus-4.8_github-copilot_default_2026-08-21',
    modelName: 'Claude Opus 4.8',
    modelOrganization: 'Anthropic',
    agentFramework: 'GitHub Copilot'
  },
  {
    source: 'copilot-gpt5.5/generic/copilot',
    slug: 'gpt-5.5_github-copilot_default_2026-08-21',
    modelName: 'GPT-5.5',
    modelOrganization: 'OpenAI',
    agentFramework: 'GitHub Copilot'
  },
  {
    source: 'copilot-mai/generic/mai-code-1-flash-internal',
    slug: 'mai-code-1-flash-internal_github-copilot_default_2026-08-21',
    modelName: 'MAI Code 1 Flash Internal',
    modelOrganization: 'Microsoft',
    agentFramework: 'GitHub Copilot'
  },
  {
    source: 'mini-swe-gpt55/generic/openai__gpt-5.5',
    slug: 'gpt-5.5_mini-swe-agent_default_2026-08-21',
    modelName: 'GPT-5.5',
    modelOrganization: 'OpenAI',
    agentFramework: 'mini-SWE-agent'
  },
  {
    source:
      'mini-swe-m3/generic/openai____data__users__shared__models__MiniMaxAI__MiniMax-M3-MXFP8',
    slug: 'minimax-m3-mxfp8_mini-swe-agent_default_2026-08-21',
    modelName: 'MiniMax M3 (MXFP8)',
    modelOrganization: 'MiniMax',
    agentFramework: 'mini-SWE-agent'
  },
  {
    source: 'mini-swe-mai/generic/openai__mai-code-1-flash-internal',
    slug: 'mai-code-1-flash-internal_mini-swe-agent_default_2026-08-21',
    modelName: 'MAI Code 1 Flash Internal',
    modelOrganization: 'Microsoft',
    agentFramework: 'mini-SWE-agent'
  },
  {
    source:
      'mini-swe-minimax27/generic/openai____data__users__shared__models__MiniMaxAI__MiniMax-M2.7',
    slug: 'minimax-m2.7_mini-swe-agent_default_2026-08-21',
    modelName: 'MiniMax M2.7',
    modelOrganization: 'MiniMax',
    agentFramework: 'mini-SWE-agent'
  },
  {
    source: 'mini-swe-qwen35/generic/openai__Qwen__Qwen3.5-35B-A3B',
    slug: 'qwen3.5-35b-a3b_mini-swe-agent_default_2026-08-21',
    modelName: 'Qwen3.5-35B-A3B',
    modelOrganization: 'Qwen',
    agentFramework: 'mini-SWE-agent'
  },
  {
    source: 'pi_gpt55/generic/gpt-5.5',
    slug: 'gpt-5.5_pi-cli_default_2026-08-21',
    modelName: 'GPT-5.5',
    modelOrganization: 'OpenAI',
    agentFramework: 'Pi CLI'
  },
  {
    source: 'pi_mai/generic/claude-opus-4.8',
    slug: 'claude-opus-4.8_pi-cli_default_2026-08-21',
    modelName: 'Claude Opus 4.8',
    modelOrganization: 'Anthropic',
    agentFramework: 'Pi CLI'
  },
  {
    source: 'pi_mai/generic/mai-code-1-flash-internal',
    slug: 'mai-code-1-flash-internal_pi-cli_default_2026-08-21',
    modelName: 'MAI Code 1 Flash Internal',
    modelOrganization: 'Microsoft',
    agentFramework: 'Pi CLI'
  },
  {
    source:
      'swe-claude48/generic/default_backticks__openai--claude-opus-4.8__t-0.00__p-1.00__c-0.00___susvibes.run_evaluation_generic_instances',
    slug: 'claude-opus-4.8_swe-agent_default_2026-08-21',
    modelName: 'Claude Opus 4.8',
    modelOrganization: 'Anthropic',
    agentFramework: 'SWE-agent'
  },
  {
    source:
      'swe-gpt55/generic/default_backticks__openai--gpt-5.5_2026-04-24__t-0.00__p-None__c-0.00___susvibes.run_evaluation_generic_instances',
    slug: 'gpt-5.5_swe-agent_default_2026-08-21',
    modelName: 'GPT-5.5',
    modelOrganization: 'OpenAI',
    agentFramework: 'SWE-agent'
  }
]

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function roundOne(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 10
}

function normalizeSummary(summary) {
  const details = summary.details || {}
  const normalized = {
    num_candidates: summary.num_instances,
    num_submitted: summary.num_submitted_instances,
    num_empty_model_patch: summary.num_no_patch,
    num_model_patch_errors: summary.num_model_patch_errors,
    num_indeterminate: summary.num_errors || 0,
    func_pass: summary.correct_ratio,
    sec_pass: summary.correct_secure_ratio,
    details: {
      empty_model_patch: details.no_patch || [],
      model_patch_error: details.model_patch_error || [],
      indeterminate: details.error || [],
      completed: {
        func_pass: details.correct || [],
        sec_pass: details.correct_secure || []
      }
    }
  }

  if (summary.num_hacked !== undefined) {
    normalized.num_reward_hack_removed = summary.num_hacked
    normalized.reward_hack_criterion = summary.hacked_criterion
    normalized.details.reward_hack_removed = details.hacked || []
  }

  return normalized
}

function selectSummary(sourceDir) {
  const dehackedPath = path.join(sourceDir, 'summary_dehacked.json')
  if (fs.existsSync(dehackedPath)) {
    return { filePath: dehackedPath, fileName: 'summary_dehacked.json' }
  }

  const summaryPath = path.join(sourceDir, 'summary.json')
  if (!fs.existsSync(summaryPath)) {
    throw new Error(`Missing summary in ${sourceDir}`)
  }
  return { filePath: summaryPath, fileName: 'summary.json' }
}

const generatedSlugs = []

for (const run of runs) {
  const sourceDir = path.join(sourceRoot, run.source)
  const selected = selectSummary(sourceDir)
  const rawSummary = readJson(selected.filePath)

  if (rawSummary.num_instances !== 186) {
    throw new Error(
      `${run.source} has ${rawSummary.num_instances} tasks; expected the v1.0 total of 186`
    )
  }

  const usedDehackedSummary = selected.fileName === 'summary_dehacked.json'
  const submissionDir = path.join(submissionsRoot, run.slug)
  const summaryFileName = `${run.slug}.summary.json`
  const sourceUrl = `${hfRoot}/${run.source}/${selected.fileName}`
  const trajectoriesUrl = `${hfRoot}/${run.source}`
  const notes = usedDehackedSummary
    ? 'Scores imported from the SafeVibe Hugging Face dehacked summary. Reward-hack-contaminated instances remain in the denominator and are excluded from the pass lists.'
    : 'Scores imported from the SafeVibe Hugging Face summary.'

  const submission = {
    model_name: run.modelName,
    model_organization: run.modelOrganization,
    submitting_organization: 'SafeVibe Team',
    submission_date: submissionDate,
    submission_type: 'standard',
    contact_info: contactInfo,
    is_new: true,
    trajectories_available: false,
    references: [
      {
        title: `SafeVibe SusVibes ${selected.fileName}`,
        url: sourceUrl,
        type: 'huggingface'
      },
      {
        title: 'SafeVibe SusVibes trajectories',
        url: trajectoriesUrl,
        type: 'huggingface'
      },
      {
        title: 'SusVibes',
        url: 'https://github.com/LeiLiLab/susvibes',
        type: 'github'
      }
    ],
    results: {
      python: {
        func_pass_1: roundOne(rawSummary.correct_ratio),
        sec_pass_1: roundOne(rawSummary.correct_secure_ratio),
        cost: null
      }
    },
    methodology: {
      susvibes_version: 'v1.0',
      agent_framework: run.agentFramework,
      notes,
      verification: {
        modified_prompts: false,
        omitted_questions: false,
        trajectories_url: trajectoriesUrl,
        details:
          'Complete 186-task v1.0 summary imported from SafeVibe. Full trajectories are available in the linked Hugging Face dataset.'
      }
    }
  }

  writeJson(path.join(submissionDir, 'submission.json'), submission)
  writeJson(
    path.join(submissionDir, 'trajectories', summaryFileName),
    normalizeSummary(rawSummary)
  )
  generatedSlugs.push(run.slug)

  console.log(
    `${run.modelName} / ${run.agentFramework}: ` +
      `${submission.results.python.func_pass_1.toFixed(1)} FuncPass, ` +
      `${submission.results.python.sec_pass_1.toFixed(1)} SecPass` +
      (usedDehackedSummary ? ' (dehacked)' : '')
  )
}

const manifest = readJson(manifestPath)
manifest.submissions = [
  ...manifest.submissions.filter((slug) => !generatedSlugs.includes(slug)),
  ...generatedSlugs
]
manifest.last_updated = `${submissionDate}T00:00:00Z`
writeJson(manifestPath, manifest)

console.log(`Updated manifest with ${generatedSlugs.length} imported submissions.`)
generatePublicData()
