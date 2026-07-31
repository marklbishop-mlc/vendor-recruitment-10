# MLC Vendor Recruitment Application

This repository contains the foundation and source code for the **MLC Vendor Recruitment** application.

---

## 🛠 Tech Stack
* **Frontend**: React + Vite + TypeScript
* **Styling**: Tailwind CSS v4 + Lucide React
* **Router & Layout**: React Router DOM with structured `<ProtectedRoute>` layout
* **Animations**: Framer Motion
* **Backend**: Firebase Cloud Functions (Node 20 + TypeScript)
* **Database & Auth**: Firebase Authentication & Firestore (Isolated Named Database)

---

## ⚠️ CRITICAL: Firebase Deployment & Database Isolation

This project is deployed to the shared `in-house-dev-mlc` Firebase project. To prevent breaking other live applications in the same project:

1. **Deployments**: Never run `firebase deploy` without targets. Pushes must be targeted specifically to our codebase:
   ```bash
   npm run deploy:all
   # Maps to: firebase deploy --only hosting:mlc-vendor-recruitment,functions:mlc-vendor-recruitment
   ```
2. **Database Isolation**: All operations must target the named Firestore database `mlc-vendor-recruitment-db`. In client SDK code, initialize firestore using:
   ```typescript
   import { getFirestore } from 'firebase/firestore';
   const db = getFirestore(app, import.meta.env.VITE_FIRESTORE_DB_NAME);
   ```
3. **Firestore Rules**: Rules must use the array mapping configuration in `firebase.json` to prevent overwriting other databases.
4. **Agent Rules**: All AI agents working on this repository must read and adhere to the guidelines in [.agents/AGENTS.md](file:///.agents/AGENTS.md).

---

## 🤝 Git Collaboration Workflow

To ensure stability, we enforce strict local and server-side rules. **Direct pushes to `master` are blocked via Husky hook protections.**

### Working on a Feature:
1. **Sync repository**: Before writing any code, sync your local copy with the latest code from master:
   ```bash
   npm run git:start
   ```
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/[your-feature-name]
   ```
3. **Commit & Verify**: Husky hooks will automatically validate types, run lints, and perform security scans before allowing commits or pushes:
   * **Pre-commit**: Runs `npm run check:all` (static TS validation & linting).
   * **Pre-push**: Ensures you are not pushing to `master`/`main` and runs high-severity vulnerability audits (`npm audit --audit-level=high`).
4. **Push & Pull Request**: Push your branch to GitHub and open a Pull Request (PR) to merge into `master`.

---

## 🚀 Scripts

Orchestrate the app and functions directories from the root:

* `npm run install:all`: Installs all dependencies for both `/app` and `/functions`.
* `npm run dev`: Runs the React application locally in development mode.
* `npm run build`: Compiles both `/app` and `/functions` for production.
* `npm run check:all`: Performs TypeScript checks and linting on both packages.
* `npm run deploy:all`: Securely builds and deploys to our targeted Firebase configs.
* `npm run git:start`: Standard sync workflow command (checks out master and pulls updates).
* `npm run git:sync`: Simple utility to add, commit, and push changes on active feature branches.
