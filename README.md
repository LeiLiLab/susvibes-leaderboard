# SusVibes Leaderboard Web Interface

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
    "susvibes_version": "v1.0",
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

📋 **See `SUBMISSION_GUIDE.md` for complete submission instructions**

## 🔧 Development

### Project Structure
```
src/
├── components/          # React components
│   ├── DocsContent.jsx     # Documentation content display
│   ├── DocsContent.css     # Documentation styling
│   ├── Leaderboard.jsx     # Model performance leaderboard
│   ├── Leaderboard.css     # Leaderboard styling
│   ├── Results.jsx         # Results dashboard
│   ├── Results.css         # Results styling
│   ├── TrajectoryVisualizer.jsx  # Trajectory exploration
│   └── TrajectoryVisualizer.css  # Trajectory visualizer styling
├── assets/             # Static assets and data
│   ├── data/              # Research data and benchmark results
│   ├── arXiv-2506.07982v1/  # Paper content and figures
│   └── *.png, *.svg       # Logo images and icons
├── App.jsx             # Main application component
├── App.css             # Main application styling
├── index.css           # Global styles
└── main.jsx           # Application entry point

public/
├── data/               # CSV files and cost information
├── task-data/          # Domain-specific tasks and policies
├── trajectory-data/    # Model execution trajectories
└── *.png, *.svg       # Public assets
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This is a modified version of [tau2-bench](https://github.com/sierra-research/tau2-bench) by [Sierra Research](https://github.com/sierra-research).

## Acknowledgments

We thank the open-source community for providing the diverse codebases used in our benchmark tasks. We also thank the [Sierra Research](https://github.com/sierra-research) for their work on [tau2-bench](https://github.com/sierra-research/tau2-bench).