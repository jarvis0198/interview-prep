# Interview Prep

A full-stack AI-powered interview preparation platform. Upload your resume, get AI feedback, practice with generated questions, and track your study progress — all tied to your personal account.

---

## Features

- **Resume Management** — Upload PDF/DOCX or paste text; multiple resumes supported
- **AI Resume Scoring** — Get a score and detailed feedback on your resume
- **AI Suggestions** — Section-by-section improvement suggestions powered by LLM
- **Question Generator** — Generate interview questions based on your resume and target role
- **Company Questions** — Browse real interview questions by company from GitHub datasets
- **Chat with Resume** — RAG-powered chatbot that answers questions grounded in your resume content
- **Study Guide** — Curated DSA/CS topics with difficulty tags, GeeksforGeeks links, and per-user progress tracking
- **Auth** — JWT-based registration/login; all data is scoped per user

---

## Tech Stack

### Backend
- **Java 21** + **Spring Boot 3.2**
- **Spring Security** + **JWT** (jjwt 0.12.3)
- **PostgreSQL** + **pgvector** (RAG embeddings)
- **Spring Data JPA** (Hibernate)
- **Apache PDFBox** (PDF parsing)
- **Apache POI** (DOCX parsing)
- **Groq API** (LLM — llama-3.3-70b) or **Anthropic Claude**
- **OpenAI Embeddings** (text-embedding-3-small)

### Frontend
- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Axios**
- **React Router v6**
- **Lucide React** (icons)
- **ReactMarkdown**

---

## Project Structure

```
interview-prep/
├── backend/                  # Spring Boot API
│   ├── src/main/java/com/interviewprep/
│   │   ├── controller/       # REST controllers
│   │   ├── service/          # Business logic
│   │   ├── entity/           # JPA entities
│   │   ├── repository/       # Spring Data repositories
│   │   ├── security/         # JWT filter, SecurityConfig
│   │   └── dto/              # Request/response DTOs
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   ├── application-prod.properties
│   │   └── vector_schema.sql
│   └── Dockerfile
├── frontend/                 # React + Vite app
│   ├── src/
│   │   ├── pages/            # Route-level components
│   │   ├── components/       # Reusable UI components
│   │   ├── services/api.ts   # Axios API client
│   │   ├── context/          # AuthContext
│   │   └── types/            # TypeScript types
│   └── vite.config.ts
├── railway.toml              # Railway deployment config
└── .gitignore
```

---

## Local Development

### Prerequisites
- Java 21
- Maven 3.9+
- Node.js 18+
- PostgreSQL with pgvector extension

### 1. Database setup

```bash
psql -U postgres -c "CREATE DATABASE interview_prep;"
psql -U postgres -d interview_prep -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 2. Backend

```bash
cd backend
mvn spring-boot:run
```

Backend runs on `http://localhost:8080`.

Set these environment variables (or edit `application.properties`):

| Variable | Description |
|---|---|
| `AI_PROVIDER` | `groq` or `claude` |
| `GROQ_API_KEY` | Groq API key (free at console.groq.com) |
| `ANTHROPIC_AUTH_TOKEN` | Anthropic API key (if using Claude) |

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to the backend automatically.

---

## Deployment

### Backend → Render

1. Create a **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set:
   - **Root Directory**: *(blank)*
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Build Context**: `.`
4. Add a **PostgreSQL** database on Render
5. Set environment variables:

| Variable | Value |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `JDBC_DATABASE_URL` | from Render PostgreSQL (change `postgresql://` → `jdbc:postgresql://`) |
| `JDBC_DATABASE_USERNAME` | from Render PostgreSQL |
| `JDBC_DATABASE_PASSWORD` | from Render PostgreSQL |
| `JWT_SECRET` | random 32+ char string |
| `AI_PROVIDER` | `groq` |
| `GROQ_API_KEY` | your Groq key |
| `FRONTEND_URL` | your Vercel URL |

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variable:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` |

4. Deploy

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/resumes` | List user's resumes |
| POST | `/api/resumes/upload` | Upload PDF/DOCX |
| POST | `/api/resumes/text` | Upload plain text |
| POST | `/api/resumes/:id/score` | AI resume score |
| POST | `/api/resumes/:id/suggestions` | AI suggestions |
| POST | `/api/questions/generate` | Generate interview questions |
| GET | `/api/questions/sessions` | List past sessions |
| GET | `/api/questions/github-companies` | List companies |
| GET | `/api/questions/github/:company` | Questions by company |
| POST | `/api/chat` | Chat with resume (RAG) |
| GET | `/api/study/progress` | Get study progress |
| POST | `/api/study/progress/toggle` | Toggle subtopic done/undone |
| POST | `/api/study/progress/reset` | Reset all progress |

All endpoints except `/api/auth/**` require `Authorization: Bearer <token>` header.

---

## Environment Variables Reference

### Backend

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `claude` | `claude` or `groq` |
| `ANTHROPIC_AUTH_TOKEN` | — | Anthropic API key |
| `ANTHROPIC_MODEL` | `claude-sonnet-latest` | Claude model ID |
| `GROQ_API_KEY` | — | Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model ID |
| `JWT_SECRET` | — | Base64 secret (min 32 chars) |
| `JWT_EXPIRATION_MS` | `86400000` | Token expiry (24h) |
| `FRONTEND_URL` | — | Allowed CORS origin |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | Backend base URL |
