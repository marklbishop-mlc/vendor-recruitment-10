# Agent Guidelines & Rules

This document outlines the strict guidelines and rules that all AI coding agents must adhere to when working on this repository. These constraints ensure long-term stability, codebase isolation, and clean collaborations.

---

## 1. TypeScript Strictness
* **No `any` Type**: Avoid `any` under all circumstances.
* **Explicit Types**: Always define explicit interfaces, types, or use `unknown` with explicit type narrowing/type guards.
* **Specific Objects**: Use specific key-value shapes like `Record<string, unknown>` instead of loose object types.

## 2. React Hook Hygiene
* **State & Effects Loop Prevention**: Never read a state variable directly inside a `useEffect` and list it as a dependency when calling `setState` on that same variable. Always use functional updates:
  ```typescript
  // DO NOT:
  useEffect(() => {
    setCount(count + 1);
  }, [count]);

  // DO:
  useEffect(() => {
    setCount((prev) => prev + 1);
  }, []);
  ```
* **Dependency Array Completeness**: Always include all component-scoped values (props, state, memoized values) in hook dependency arrays. Wrap functions in `useCallback` when passing them into effects.
* **Render-Phase Ref Access**: Never access `ref.current` during the render phase. Use **callback refs** for side effects that need to access DOM elements during render/mount.

## 3. Code Cleanliness & Pivots
* **Clean Cleanup**: If you experiment with a feature or technical approach and decide to pivot/abandon it, you must **completely revert** those changes across all affected files.
* **No Leftovers**: Do not leave commented-out code, dummy data structures, dead functions, or unused UI elements from experimental phases.

## 4. Agent Git Workflow
* **No Commits on Master/Main**: AI agents must **NEVER** work or commit directly on the `master` or `main` branches.
* **Sync & Branch Workflow**:
  1. At the start of a task or conversation, run:
     ```bash
     npm run git:start
     # (or git checkout master && git pull origin master)
     ```
  2. Create and switch to a new feature branch:
     ```bash
     git checkout -b feature/[task-name]
     ```
  3. Complete your coding and verification.
  4. Commit changes on the feature branch.
  5. Push the feature branch to GitHub.
  6. Instruct the user to open a Pull Request.

## 5. Dependency Management
* **No Forced Audits**: Never run `npm audit fix --force` without careful file-by-file review, as it can inadvertently break backend dependencies and disrupt other shared components.

## 6. Deployment Isolation (CRITICAL)
* **Shared Firebase Environment**: The GCP/Firebase project `in-house-dev-mlc` is shared with other active applications. A blanket `firebase deploy` is strictly prohibited.
* **Targeted Deployments Only**: Always use targeted deployment flags to guarantee we do not touch or overwrite other apps:
  ```bash
  # Deployment command MUST specify hosting target and functions codebase:
  firebase deploy --only hosting:mlc-vendor-recruitment,functions:mlc-vendor-recruitment
  ```

## 7. Firestore Rules Safety (CRITICAL)
* **Explicit Array Configuration**: In `firebase.json`, you must always use the explicit array syntax to bind rules files to database targets:
  ```json
  "firestore": [
    {
      "database": "mlc-vendor-recruitment-db",
      "rules": "firestore.rules"
    }
  ]
  ```
* **Shared/Monolithic Rule Audits**: If managing shared rules, never overwrite them blindly. Before deploying rules, check the active rules on Firebase using tools/consoles, and ensure that other applications' rules (e.g., `aibridge_*`, `sessions`, `audioJobs`, `memoq_projects`) remain completely intact. 
* **Comment Headers**: Separate rules using clear header blocks (e.g., `// [App Name] Rules`) and only edit your designated section.

## 8. Cross-Project Logging / GCP Service Accounts
* **Preserve Service Accounts**: When defining or modifying Cloud Functions, preserve explicit `serviceAccount` parameters if they rely on cross-project IAM permissions (such as GCP Logs Viewer, cross-database access, etc.).
