# QuizVerseDeepMind

QuizVerseDeepMind is a real-time quiz and learning platform built with React,
Firebase, and an AI-assisted practice workflow. Users can create quizzes,
share them, host live sessions, join with a code, compete on synchronized
leaderboards, and practice generated question sets with immediate feedback.

The repository is the AI-enhanced evolution of the original QuizVerse
application. It combines a Firebase-backed multiplayer product with a
separate Node.js service for AI question generation.

## Product capabilities

### Quiz creation and sharing

- Create quizzes with multiple-choice, true/false, and short-answer questions
- Configure quiz titles, descriptions, question settings, and time limits
- Save drafts and continue editing later
- Share quizzes using generated share links
- View and manage quizzes created by the current user

### Live multiplayer sessions

- Join a quiz with a share code
- Support authenticated users and guest participants
- Synchronize quiz-room state through Firestore listeners
- Track answers, scores, progress, and session state in real time
- Display a live leaderboard and end-of-session results
- Present responsive question, timer, and progress interfaces

### AI practice

The `Practice With AI` flow creates a focused learning session from a subject,
topic, difficulty, question count, question types, and learning goal. It
supports:

- AI-generated practice questions
- Practice sessions with immediate answer feedback
- Explanations and session summaries
- Progress tracking during a session
- Booster sessions based on weak topics from a summary
- Demo mode when the AI backend is not configured

The repository also includes an `AIQuizGenerator` component for generating
question sets from quiz configuration.

### Analytics and learning insights

- Session summaries and score breakdowns
- Accuracy and answer-distribution charts
- Question-level progress indicators
- Quiz dashboards and real-time leaderboard views
- Firebase-backed statistics and analytics helpers

## System architecture

```text
React/Vite web application
        |
        +--> Firebase Authentication
        |
        +--> Firestore
        |      ├── quizzes and drafts
        |      ├── shared quizzes
        |      ├── live sessions and answers
        |      └── statistics and leaderboards
        |
        +--> Firebase Cloud Functions
        |
        +--> AI practice service (optional)
               Node.js + Express + Mistral API
```

The main frontend is a Vite application. Firebase provides authentication,
real-time data synchronization, database rules, indexes, and server-side
functions. The optional AI service runs separately from the frontend and
keeps the Mistral API key on the server.

## Repository layout

```text
.
├── src/
│   ├── components/          # Quiz UI, AI generation, charts, feedback
│   ├── contexts/            # Auth, quiz, and toast state
│   ├── hooks/               # Practice sessions and quiz statistics
│   ├── pages/               # Home, create, join, room, sharing, practice
│   ├── services/            # Quiz, draft, sharing, and analytics services
│   ├── firebase/            # Firebase client configuration
│   └── utils/                # Diagnostics and chart helpers
├── ai-backend/
│   ├── server.mjs           # Optional Express/Mistral question service
│   └── readme.md
├── functions/src/index.ts   # Firebase Functions implementation
├── quizverse-functions/     # Additional Functions package/configuration
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore query indexes
├── FIREBASE_SETUP.md        # Firebase configuration guide
├── FIREBASE_TROUBLESHOOTING.md
├── REALTIME_ANALYTICS.md    # Analytics data and deployment notes
├── deploy.md                # Hosting and Functions deployment
└── netlify.toml             # Netlify build configuration
```

## Technology

### Frontend

- React 18
- Vite
- React Router
- Firebase Web SDK
- Tailwind CSS
- Framer Motion
- Lucide React
- Chart.js

### Backend services

- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions
- Firebase security rules and composite indexes
- Node.js and Express for the optional AI backend
- Mistral API for AI question generation

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- A Firebase project for authentication and Firestore-backed features
- A Mistral API key only if AI generation is enabled

### Install and run the frontend

```bash
git clone https://github.com/Tanishpanchal1/QuizVerseDeepMind.git
cd QuizVerseDeepMind
npm install
npm run dev
```

Vite starts the development server and prints the local URL.

### Configure Firebase

1. Create or select a Firebase project.
2. Enable Google Authentication and the required sign-in providers.
3. Create a Firestore database.
4. Configure the client values used by `src/firebase/config.js`.
5. Review and deploy `firestore.rules` and `firestore.indexes.json`.

The repository includes setup and troubleshooting guides:

- [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md)
- [`FIREBASE_TROUBLESHOOTING.md`](FIREBASE_TROUBLESHOOTING.md)

Do not commit production credentials or service-account files.

### Run the optional AI backend

```bash
cd ai-backend
npm install
```

Create an environment file based on `ai-backend/.env.example` and provide the
Mistral credentials/configuration required by the service:

```env
MISTRAL_API_KEY=replace-this-value
MISTRAL_MODEL_ID=mistral-tiny
PORT=5000
```

Start the service with the command defined in `ai-backend/package.json`.
Keep this service server-side; never expose `MISTRAL_API_KEY` in the Vite
client bundle.

## Common user flows

### Create a quiz

1. Sign in or continue with the supported guest flow.
2. Open **Create Quiz**.
3. Enter quiz metadata and add questions.
4. Select question types, answers, and timing options.
5. Save the quiz or publish/share it.

### Host or join a live quiz

1. Open a quiz room or use a shared quiz code.
2. Participants join with a display name.
3. The room synchronizes questions and answers through Firestore.
4. Scores, progress, and the leaderboard update as the session runs.

### Practice with AI

1. Open **Practice**.
2. Choose a subject, topic, difficulty, count, types, and learning goal.
3. Start the generated session.
4. Submit answers to receive feedback and explanations.
5. Review the summary and optionally start a targeted booster session.

## Build and deployment

Build the frontend with:

```bash
npm run build
npm run preview
```

The repository includes configuration for Firebase Hosting and Netlify. The
deployment guide covers:

- Firebase client configuration
- Firestore rules and indexes
- Cloud Functions deployment
- Static frontend hosting
- Environment variables

See [`deploy.md`](deploy.md) for the deployment flow.

## Available scripts

From the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production frontend build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

The Firebase Functions packages have their own package scripts and dependency
configuration.

## Security and operational notes

- Firestore access is governed by `firestore.rules`; review the rules before
  deploying.
- Required Firestore indexes are declared in `firestore.indexes.json`.
- AI provider credentials belong only in the server-side AI backend.
- Firebase service-account credentials must remain outside the frontend bundle.
- Verify Firebase project IDs and hosting targets before deploying.

## Project status

QuizVerseDeepMind is a working application prototype with a substantial
frontend, Firebase integration, live quiz flows, analytics components, and
AI-assisted practice/generation paths. The optional AI service and Firebase
deployment require environment-specific configuration. Production readiness
depends on validating the configured Firebase project, security rules,
provider quotas, and deployment environment.

## License

No license has currently been declared for this repository.
