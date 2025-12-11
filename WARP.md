# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands

### Root frontend (Vite + React)
- `npm install` – Install frontend dependencies at the repo root.
- `npm run dev` – Start the Vite dev server for the React app (check terminal output for the exact URL).
- `npm run build` – Build the production bundle to `dist/`.
- `npm run preview` – Preview the production build locally.
- `npm run lint` – Run ESLint over the frontend source.

The README (`README.md`) contains end‑user documentation and a more guided "Quick Start"; prefer to keep it as the primary source for onboarding and feature descriptions.

### Firebase emulators and deployment (from repo root)
- `firebase login` – Authenticate with the Firebase CLI.
- `firebase emulators:start` – Start all configured Firebase emulators locally.
- `firebase deploy` – Deploy hosting, functions, and Firestore configuration.
- `firebase deploy --only hosting` – Deploy the frontend only.
- `firebase deploy --only functions` – Deploy Cloud Functions only.
- `firebase deploy --only firestore` – Deploy Firestore rules and indexes only.

### Cloud Functions projects
There are two Firebase Functions packages in this repo:
- `functions/` – Original Cloud Functions project.
- `quizverse-functions/` – Newer Cloud Functions project with ESLint configured.

From inside either directory (`cd functions` or `cd quizverse-functions`):
- `npm install` – Install functions dependencies.
- `npm run build` – Compile TypeScript to `lib/`.
- `npm run build:watch` – Watch and recompile on changes.
- `npm run serve` – Build and start the Firebase Functions emulator (`firebase emulators:start --only functions`).
- `npm run shell` – Start the Firebase Functions shell for local invocation.
- `npm run deploy` – Deploy only the functions defined in that directory.
- `npm run logs` – Stream Cloud Functions logs.
- `npm run lint` – (only in `quizverse-functions/`) Lint the functions codebase.

### Tests
No test scripts are currently defined in the root `package.json` or functions packages, so there is no standard command for running a full test suite or a single test. If tests are added, prefer to expose them via `npm test` or explicit `npm run test:*` scripts so agents can invoke them directly.

## Architecture overview

This project is a real-time quiz platform: a React single-page application (SPA) built with Vite and Tailwind CSS, backed by Firebase Authentication, Firestore, and Cloud Functions.

### Application shell and routing
- `src/main.jsx` mounts the React app and imports global styles.
- `src/App.jsx` wraps the router with the three core context providers (`AuthProvider`, `QuizProvider`, `ToastProvider`).
- Routing is handled via `react-router-dom` with key routes:
  - `/` → landing/home experience.
  - `/create` → quiz creation flow.
  - `/join` → join by quiz code.
  - `/quiz/:quizId` → live quiz room (full-screen experience without navbar).
  - `/shared/:shareId` → view a quiz shared via link.
  - `/my-quizzes` → list of quizzes created by the current user.
  - `/diagnostic` → Firebase connectivity diagnostic UI.

### Core state management (contexts)
All cross-cutting state is centralized in React Contexts under `src/contexts/`, consumed via custom hooks:
- `AuthContext` / `useAuth` (`src/contexts/AuthContext.jsx`)
  - Wraps Firebase Auth to support Google sign‑in, email/password sign‑up & sign‑in, email verification, password reset, and a guest mode.
  - Tracks `currentUser`, loading states, and email‑verification status; exposes helpers like `signInWithGoogle`, `signUpWithEmail`, `signInWithEmail`, `resetPassword`, `refreshUser`, `signInAsGuest`, and `signOut`.
- `QuizContext` / `useQuiz` (`src/contexts/QuizContext.jsx`)
  - Owns the quiz lifecycle: creation, joining, starting, progressing questions, submitting answers, and ending a quiz.
  - Interacts with Firestore collections such as `quizzes` and `quizzes/{quizId}/players` to:
    - Create quiz documents with metadata and default fields (`status`, `currentQuestion`, etc.).
    - Add players to a quiz with join timestamps.
    - Record answers, compute per‑answer scores (including time bonuses), and persist cumulative player scores.
    - Derive and update an in‑memory leaderboard from stored player data.
- `ToastContext` / `useToast` (`src/contexts/ToastContext.jsx`)
  - Maintains an in‑memory queue of toast notifications and exposes helpers (`success`, `error`, `warning`, `info`).
  - `src/components/ToastContainer.jsx` renders the queued toasts.

When implementing new cross‑cutting behavior, favor extending the relevant context (and associated hooks) rather than pushing more state into individual pages.

### Firebase configuration, reliability, and diagnostics
- `src/firebase/config.js`
  - Initializes the Firebase app and exports `auth` and `db` for use throughout the codebase.
  - Defines a central `withRetry(operation, maxRetries, delay)` wrapper and `handleFirestoreError` helper to encapsulate network‑related failures (offline, QUIC protocol issues, ad‑blocker interference) and apply exponential backoff.
  - Exposes `testFirebaseConnection()` which writes a Firestore test document and is used by the diagnostic tooling.
- `src/utils/firebaseDebug.js`
  - Provides a `FirebaseDebugger` class and singleton `firebaseDebugger` for more detailed diagnostics: network reachability checks, Firestore write/read tests, error classification (e.g., `ERR_BLOCKED_BY_CLIENT`, `ERR_QUIC_PROTOCOL_ERROR`, `permission-denied`), and retry utilities.
  - Exposes `safeFirestoreOperation(operation, context)` which wraps an operation in the debugger's retry logic and prints structured troubleshooting suggestions when failures persist.
- `src/components/FirebaseDiagnostic.jsx`
  - Renders the `/diagnostic` page used for debugging environment‑specific Firebase issues.
  - Invokes `testFirebaseConnection` and `firebaseDebugger.generateDiagnosticReport()` and surfaces high‑level status, error details, and suggested remediation steps.

For new Firestore‑touching utilities or services, prefer routing calls through `withRetry` or `safeFirestoreOperation` so network behavior and error messaging remain consistent.

### Domain services and Firestore data model
The app factors Firestore access into focused service modules under `src/services/`:
- `QuizzesService.js`
  - Provides `listHostedQuizzes(uid, max)` that queries `quizzes` by `createdBy` and `createdAt`.
  - Includes a fallback path when the required composite index is missing, with client‑side sorting and clear console guidance to create the index.
- `DraftsService.js`
  - Manages per‑user quiz drafts under `users/{uid}/drafts` with helpers to save, update, list, fetch, and delete drafts.
- `QuizSharingService.js`
  - Stores share‑link metadata in a `quiz_shares` collection and wires it to quizzes or drafts:
    - `generateShareLink` creates a new `quiz_shares/{shareId}` document.
    - `getSharedQuiz` resolves a share ID to either a draft (`drafts`) or a finalized quiz (`quizzes`), incrementing access counts.
    - `createQuizCopy` clones shared quiz data into a new draft document for editing.
    - `getUserShareLinks` and `deactivateShareLink` manage a user's active share links.
    - `generateShareURL` builds a browser‑accessible URL for a given share ID.
- `QuizStatisticsService.js`
  - Owns aggregated analytics in a `quizStatistics` collection with subcollections:
    - `quizStatistics/{quizId}` – summary document (participants, total answers, etc.).
    - `quizStatistics/{quizId}/questions` – per‑question stats (answer distribution, correct/incorrect counts, response time aggregates).
    - `quizStatistics/{quizId}/answers` – per‑answer event log.
    - `quizStatistics/{quizId}/participants` – participant‑level engagement metadata.
  - Provides methods to initialize statistics for new quizzes, record answers, and ensure participant documents stay in sync.

When adding new Firestore behavior, use or extend these services rather than accessing collections directly from components or pages.

### Analytics and real-time insights
- `src/hooks/useQuizStatistics.js`
  - Subscribes to `quizzes/{quizId}/players` to compute live answer distributions and leaderboards on the client.
  - Derives metrics such as participation rate, average score, and top performers, and exposes convenience getters like `getQuestionStats`, `getParticipationRate`, and `getAverageScore`.
- Chart and analytics components under `src/components/charts/` (e.g., `AccuracyChart.jsx`, `OptionDistributionChart.jsx`, `QuizDashboard.jsx`, `QuizSummary.jsx`, `RealTimeLeaderboard.jsx`)
  - Consume data from `useQuizStatistics` and the services to render visual dashboards using `react-chartjs-2` and `chart.js`.

### Pages and UI components
- Pages under `src/pages/` (`Home`, `CreateQuiz`, `JoinQuiz`, `QuizRoom`, `SharedQuiz`, `MyQuizzes`) orchestrate flows by combining context APIs, services, hooks, and UI components.
- Reusable UI primitives and layout pieces live under `src/components/` (navigation, logos, toast container, diagnostic tools, and charts).
- Styling is driven primarily by Tailwind CSS utility classes with some custom animation and design‑system configuration in `tailwind.config.js`.

When implementing new user flows, follow the existing pattern:
- Add or extend a service for Firestore access.
- Expose cross‑page behavior via a context or dedicated hook.
- Build page‑level components that compose services, contexts, and shared UI components rather than embedding data‑access logic directly in views.
