# SusVibes Leaderboard Web Interface

**Live site:** https://leililab.github.io/susvibes-leaderboard/

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)

### Installation & Setup

1. **Navigate to the leaderboard directory**
   ```bash
   cd susvibes-leaderboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to `http://localhost:5173` (or the URL shown in your terminal)
   - The application will automatically reload when you make changes

## 📊 Submitting to the Leaderboard

We welcome community submissions! The leaderboard now accepts model evaluation results through pull requests.

### How to Submit

1. **Evaluate your model** using [SusVibes](https://github.com/LeiLiLab/susvibes)
2. **Create a JSON submission** following our schema (see `public/submissions/schema.json`)
3. **Submit a pull request** with your results file and trajectory links for verification

### Quick Example

```json
{
  "model_name": "My-Model-v1.0",
  "agent_framework": "My-Agent-Framework",
  "model_organization": "My Organization",
  "submitting_organization": "My Organization",
  "submission_date": "2025-01-15",
  "contact_info": {
    "email": "contact@myorg.com",
    "name": "Research Team"
  },
  "trajectories_available": true,
  "references": [
    {
      "title": "Model Technical Paper",
      "url": "https://arxiv.org/abs/2401.00000",
      "type": "paper"
    },
    {
      "title": "Model Documentation",
      "url": "https://docs.example.com/model",
      "type": "documentation"
    }
  ],
  "results": {
    "python": {
      "func_pass_1": 50.0,
      "sec_pass_1": 10.0,
      "cost": 0.025
    }
  },
  "methodology": {
    "evaluation_date": "2025-01-10",
    "susvibes_version": "v0.0",
    "agent_framework": "My-Agent-Framework",
    "verification": {
      "modified_prompts": false,
      "omitted_questions": true,
      "details": "Only evaluated Pass@1 for all domains"
    }
  }
}
```

### 🔍 Verification System

The leaderboard now includes a verification system to ensure result quality:

- **✅ Verified submissions** have trajectory data, use standard prompts, and complete all evaluations
- **⚠️ Unverified submissions** are marked with caution icons and may have missing data or modified methodologies
- Click on any model name to see detailed verification status and methodology information

### 📚 Model References

Each submission can include links to papers, documentation, and other resources about the model. This helps researchers access relevant information directly from the leaderboard. References are displayed in the model detail view with categorized badges for easy identification.

📋 **See [docs/SUBMISSION_GUIDE.md](docs/SUBMISSION_GUIDE.md) for complete submission instructions.**

## 📚 Documentation

| Doc | What it covers |
|-----|----------------|
| [docs/SUBMISSION_GUIDE.md](docs/SUBMISSION_GUIDE.md) | How to submit results via pull request (standard & custom). |
| [docs/TRAJECTORY_FORMAT.md](docs/TRAJECTORY_FORMAT.md) | The trajectory / submission file format (the single source of truth). |
| [maintenance/README.md](maintenance/README.md) | Data migration & maintenance scripts for the submission data (scaffold→format converters live in the SusVibes eval harness). |

## 🔧 Development

### Project Structure
```
src/
├── components/                  # React components
│   ├── Leaderboard.jsx          #   model performance leaderboard
│   ├── TrajectoryVisualizer.jsx #   trajectory / dataset explorer
│   ├── BlogContent.jsx          #   interactive paper/blog page
│   └── ...                      #   Carousel, ExploitViewer, VulnerabilityGame, etc.
├── assets/                      # logos, css
├── App.jsx                      # app shell + hash routing (home/blog/leaderboard/visualizer)
└── main.jsx                     # entry point

public/
├── submissions/                 # all submissions (loaded via manifest.json)
│   ├── manifest.json            #   list of displayed submission directories
│   ├── schema.json              #   submission.json JSON schema
│   └── <DIR>/                   #   submission.json + trajectories/
└── datasets/                    # susvibes_dataset.jsonl

maintenance/                      # submission-data migration & maintenance scripts
docs/                            # SUBMISSION_GUIDE.md, TRAJECTORY_FORMAT.md
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This is a modified version of [tau2-bench](https://github.com/sierra-research/tau2-bench) by [Sierra Research](https://github.com/sierra-research).

## Acknowledgments

We thank the open-source community for providing the diverse codebases used in our benchmark tasks. We also thank the [Sierra Research](https://github.com/sierra-research) for their work on [tau2-bench](https://github.com/sierra-research/tau2-bench).