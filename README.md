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

We welcome community submissions. Results are added through pull requests. At a high level:

1. **Evaluate your model** with [SusVibes](https://github.com/LeiLiLab/susvibes).
2. **Assemble a submission directory** — a `submission.json` (metadata + scores) plus a
   `trajectories/` folder with your run's trajectory and summary files.
3. **Open a pull request** adding that directory under `public/submissions/` and listing it in
   `manifest.json`.

📋 **Follow [docs/SUBMISSION_GUIDE.md](docs/SUBMISSION_GUIDE.md) for the full step-by-step
process** (standard vs custom submissions, naming, the review checklist).

## 📚 Documentation

| Doc | What it covers |
|-----|----------------|
| [docs/SUBMISSION_GUIDE.md](docs/SUBMISSION_GUIDE.md) | How to submit results via pull request (standard & custom), step by step. |
| [docs/TRAJECTORY_FORMAT.md](docs/TRAJECTORY_FORMAT.md) | The exact `trajectories/` file format — `trials.json` + `summary.json` (the single source of truth). |

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
└── datasets/                    # susvibes_dataset_<version>.jsonl (per dataset version)

docs/                            # SUBMISSION_GUIDE.md, TRAJECTORY_FORMAT.md
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This is a modified version of [tau2-bench](https://github.com/sierra-research/tau2-bench) by [Sierra Research](https://github.com/sierra-research).

## Acknowledgments

We thank the open-source community for providing the diverse codebases used in our benchmark tasks. We also thank the [Sierra Research](https://github.com/sierra-research) for their work on [tau2-bench](https://github.com/sierra-research/tau2-bench).