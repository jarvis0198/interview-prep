# Interview Prep Platform — Full Technical Documentation

> Last updated: 2026-07-24 (latest: code persistence, practice mode, history search, DSA mock interview layout)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Database Design](#5-database-design)
6. [Backend — Deep Dive](#6-backend--deep-dive)
   - 6.1 [Entry Point](#61-entry-point)
   - 6.2 [Security Layer](#62-security-layer)
   - 6.3 [Controllers](#63-controllers)
   - 6.4 [Services](#64-services)
   - 6.5 [Entities & Repositories](#65-entities--repositories)
   - 6.6 [DTOs](#66-dtos)
   - 6.7 [Configuration](#67-configuration)
7. [Frontend — Deep Dive](#7-frontend--deep-dive)
   - 7.1 [Entry Point & Routing](#71-entry-point--routing)
   - 7.2 [Auth Context](#72-auth-context)
   - 7.3 [API Client](#73-api-client)
   - 7.4 [Pages](#74-pages)
   - 7.5 [Components](#75-components)
   - 7.6 [TypeScript Types](#76-typescript-types)
8. [AI & RAG Pipeline](#8-ai--rag-pipeline)
9. [Complete API Reference](#9-complete-api-reference)
10. [Environment Variables](#10-environment-variables)
11. [Local Development Setup](#11-local-development-setup)
12. [Deployment Guide](#12-deployment-guide)
13. [Rate Limiting](#13-rate-limiting)
14. [Data Flow Diagrams](#14-data-flow-diagrams)

---

## 1. Project Overview

**Interview Prep** is a full-stack AI-powered interview preparation platform. It allows users to:

- Upload or build their resume in multiple formats (PDF, DOCX, plain text, JSON, key-value, or from a URL)
- Get an AI-generated score and section-by-section suggestions on their resume
- Generate tailored interview questions (OA + Interview rounds) for any company
- Run mock interview sessions by round type (Behavioral, Technical, DSA, System Design, HR, Role-Specific)
- Chat with their resume using a RAG (Retrieval-Augmented Generation) pipeline
- Browse real LeetCode questions by company fetched live from GitHub
- Match their resume against a job description
- Track study progress across a curated DSA/CS topic guide
- Manage multiple resumes and view historical prep sessions

All data is strictly scoped per authenticated user via JWT tokens.

---

## 2. Architecture Overview

```
┌───────────────────────────────────────────────────────┐
│                     Browser (React)                    │
│  Vite + React 18 + TypeScript + Tailwind + Axios       │
│  Deployed on Vercel                                    │
└────────────────────────┬──────────────────────────────┘
                         │ HTTPS /api/*
                         │ (JWT Bearer token on every request)
┌────────────────────────▼──────────────────────────────┐
│                  Spring Boot Backend                   │
│  Java 17 · Spring Boot 3.2 · Spring Security          │
│  Deployed on Render (Docker) / Railway                 │
│                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Controllers │→ │  Services    │→ │  Repositories│  │
│  └─────────────┘  └──────┬───────┘  └──────┬───────┘  │
│                          │                 │           │
│                    ┌─────▼──────┐   ┌──────▼────────┐ │
│                    │ AI Layer   │   │  PostgreSQL    │ │
│                    │GroqService │   │  + pgvector    │ │
│                    └─────┬──────┘   └───────────────┘ │
└──────────────────────────┼────────────────────────────┘
                           │
           ┌───────────────┴────────────────┐
           │                                │
    ┌──────▼──────┐               ┌─────────▼────────┐
    │ Anthropic   │               │  Groq API        │
    │ Claude API  │               │  (llama-3.3-70b) │
    └─────────────┘               └──────────────────┘
           +
    ┌──────▼──────┐
    │ OpenAI      │
    │ Embeddings  │
    │ (via proxy) │
    └─────────────┘
```

The frontend is a **Single Page Application** that communicates exclusively through `/api/*` REST endpoints. In local dev, Vite's proxy forwards `/api` to `localhost:8080`. In production, the `VITE_API_URL` env var points directly to the backend.

---

## 3. Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Java | 17 (JVM target) | Runtime language |
| Spring Boot | 3.2.5 | Application framework |
| Spring Security | (via Boot) | Authentication/authorization |
| Spring Data JPA | (via Boot) | ORM / database access |
| Spring JDBC | (via Boot) | Native SQL for vector queries |
| Hibernate | (via Boot) | JPA implementation |
| PostgreSQL | latest | Primary database |
| pgvector | 0.1.6 (JDBC) | Vector similarity search |
| JJWT | 0.12.3 | JWT generation/validation |
| Apache PDFBox | 3.0.2 | PDF text extraction |
| Apache POI | 5.2.5 | DOCX text extraction |
| Lombok | (via Boot) | Boilerplate reduction |
| Jackson | (via Boot) | JSON serialization |
| Spring Boot Actuator | (via Boot) | Health check endpoint |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.4.5 | Type safety |
| Vite | 5.3.1 | Build tool / dev server |
| React Router | 6.23.1 | Client-side routing |
| Axios | 1.7.2 | HTTP client |
| Tailwind CSS | 3.4.4 | Utility-first styling |
| Lucide React | 0.396.0 | Icon library |
| React Markdown | 9.0.1 | Render LLM markdown responses |
| React Dropzone | 14.2.3 | Drag-and-drop file uploads |
| Monaco Editor | 4.7.0 | In-browser code editor |
| clsx | 2.1.1 | Conditional class names |

---

## 4. Project Structure

```
interview-prep/
├── .env.example                     # Environment variable template
├── .gitignore
├── railway.toml                     # Railway deployment config
├── setup.sh                         # One-command setup script
├── start.sh                         # One-command start script
├── vercel.json                      # Root-level Vercel config
│
├── backend/
│   ├── Dockerfile                   # Multi-stage Docker build
│   ├── pom.xml                      # Maven project descriptor
│   └── src/main/
│       ├── java/com/interviewprep/
│       │   ├── InterviewPrepApplication.java     # @SpringBootApplication entry
│       │   ├── config/
│       │   │   ├── CorsConfig.java               # CORS filter bean
│       │   │   └── RateLimitFilter.java          # Per-user/IP rate limiter
│       │   ├── controller/
│       │   │   ├── AuthController.java           # /api/auth/**
│       │   │   ├── ChatController.java           # /api/chat
│       │   │   ├── CodeRunnerController.java     # /api/code/run
│       │   │   ├── GlobalExceptionHandler.java   # @RestControllerAdvice
│       │   │   ├── KnowledgeBaseController.java  # /api/kb/**
│       │   │   ├── QuestionController.java       # /api/questions/**
│       │   │   ├── ResumeController.java         # /api/resumes/**
│       │   │   └── StudyProgressController.java  # /api/study/**
│       │   ├── dto/
│       │   │   ├── AuthResponse.java
│       │   │   ├── BuildResumeRequest.java
│       │   │   ├── GenerateQuestionsRequest.java
│       │   │   ├── GenerateQuestionsResponse.java
│       │   │   ├── LoginRequest.java
│       │   │   ├── MockInterviewRequest.java
│       │   │   ├── QuestionDto.java
│       │   │   ├── RegisterRequest.java
│       │   │   ├── ResumeScoreResponse.java
│       │   │   ├── ResumeSuggestionResponse.java
│       │   │   └── SessionSummaryDto.java
│       │   ├── entity/
│       │   │   ├── PrepSession.java              # Interview session aggregate
│       │   │   ├── Question.java                 # Individual question
│       │   │   ├── Resume.java                   # Resume document
│       │   │   ├── User.java                     # User + UserDetails
│       │   │   └── VectorDocument.java           # pgvector row
│       │   ├── repository/
│       │   │   ├── PrepSessionRepository.java
│       │   │   ├── QuestionRepository.java
│       │   │   ├── ResumeRepository.java
│       │   │   └── UserRepository.java
│       │   ├── security/
│       │   │   ├── JwtAuthFilter.java            # OncePerRequestFilter
│       │   │   ├── JwtUtil.java                  # Token generate/validate
│       │   │   └── SecurityConfig.java           # SecurityFilterChain
│       │   └── service/
│       │       ├── CompanyGithubService.java     # GitHub CSV fetcher + cache
│       │       ├── CompanyKnowledgeService.java  # Company KB vector search
│       │       ├── EmbeddingService.java         # OpenAI embeddings
│       │       ├── ExternalDataFetcher.java      # HTTP fetch utility
│       │       ├── ExternalKnowledgeSeeder.java  # Seeds external KB on startup
│       │       ├── GroqService.java              # AI chat (Claude or Groq)
│       │       ├── QuestionService.java          # Question generation logic
│       │       ├── ResumeChatService.java        # RAG chat over resume
│       │       ├── ResumeService.java            # Resume CRUD + AI scoring
│       │       ├── TipsKnowledgeService.java     # Tips KB vector search
│       │       └── VectorStoreService.java       # pgvector store/query
│       └── resources/
│           ├── application.properties            # Local dev config
│           ├── application-prod.properties       # Production config
│           └── vector_schema.sql                 # pgvector table + indexes
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vercel.json                              # SPA rewrite rules
    └── vite.config.ts                           # Dev proxy config
    └── src/
        ├── main.tsx                             # React DOM root
        ├── App.tsx                              # Router + route definitions
        ├── index.css                            # Tailwind base styles
        ├── vite-env.d.ts
        ├── context/
        │   └── AuthContext.tsx                  # Global auth state
        ├── services/
        │   └── api.ts                           # Axios instance + all API calls
        ├── types/
        │   └── index.ts                         # All TypeScript interfaces
        ├── data/
        │   └── studyGuide.ts                    # Static DSA topic tree
        ├── pages/
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── HomePage.tsx
        │   ├── ResumePage.tsx
        │   ├── QuestionsPage.tsx
        │   ├── HistoryPage.tsx
        │   ├── ChatPage.tsx
        │   ├── AccountPage.tsx
        │   ├── StudyGuidePage.tsx
        │   ├── CompanyQuestionsPage.tsx
        │   ├── JdMatchPage.tsx
        │   ├── MockInterviewPage.tsx
        │   ├── MockInterviewSetupPage.tsx
        │   ├── FlashcardsPage.tsx
        │   └── ProgressPage.tsx
        └── components/
            ├── CodeRunner.tsx
            ├── ErrorBoundary.tsx
            ├── ProtectedRoute.tsx
            ├── Skeleton.tsx
            ├── layout/
            │   └── Layout.tsx
            ├── questions/
            │   └── QuestionCard.tsx
            └── resume/
                ├── AISuggestions.tsx
                ├── BuildResumeModal.tsx
                ├── ResumeEditor.tsx
                ├── ResumeScorer.tsx
                ├── ResumeSelector.tsx
                ├── ResumeTemplates.tsx
                ├── ResumeUploader.tsx
                └── TemplatePreview.tsx
```

---

## 5. Database Design

### Tables (auto-managed by Hibernate DDL + vector_schema.sql)

#### `users`

| Column | Type | Constraints |
|---|---|---|
| id | BIGSERIAL | PRIMARY KEY |
| username | VARCHAR(50) | UNIQUE, NOT NULL |
| email | VARCHAR(100) | UNIQUE, NOT NULL |
| password | TEXT | NOT NULL (BCrypt hash) |
| created_at | TIMESTAMP | auto-set on insert |

#### `user_study_progress`

| Column | Type | Constraints |
|---|---|---|
| user_id | BIGINT | FK → users.id |
| subtopic_id | VARCHAR(100) | completed topic key |

This is a `@ElementCollection` join table — each row is one completed subtopic for one user.

#### `resumes`

| Column | Type | Constraints |
|---|---|---|
| id | BIGSERIAL | PRIMARY KEY |
| user_id | BIGINT | FK → users.id |
| content | TEXT | NOT NULL (extracted text) |
| original_filename | VARCHAR | nullable |
| title | VARCHAR(100) | nullable |
| score | INTEGER | nullable, set after scoring |
| score_feedback | TEXT | nullable |
| template_name | VARCHAR | nullable |
| created_at | TIMESTAMP | auto-set |
| updated_at | TIMESTAMP | auto-updated |

#### `prep_sessions`

| Column | Type | Constraints |
|---|---|---|
| id | BIGSERIAL | PRIMARY KEY |
| company_name | VARCHAR | NOT NULL |
| target_role | VARCHAR | nullable |
| resume_id | BIGINT | FK → resumes.id |
| created_at | TIMESTAMP | auto-set |

#### `questions`

| Column | Type | Constraints |
|---|---|---|
| id | BIGSERIAL | PRIMARY KEY |
| type | VARCHAR | ENUM: OA \| INTERVIEW |
| category | VARCHAR | e.g. "DSA", "Behavioral" |
| question_text | TEXT | NOT NULL |
| difficulty | VARCHAR | Easy \| Medium \| Hard |
| hint | TEXT | nullable |
| solution | TEXT | nullable, lazy-generated |
| notes | TEXT | nullable, user-editable |
| test_cases | TEXT | nullable, JSON array |
| session_id | BIGINT | FK → prep_sessions.id |

#### `vector_documents`

| Column | Type | Constraints |
|---|---|---|
| id | BIGSERIAL | PRIMARY KEY |
| doc_type | VARCHAR(50) | QUESTION \| COMPANY_KB \| TIPS_KB \| RESUME_CHUNK \| EXTERNAL_KB |
| source_id | BIGINT | nullable FK to source entity |
| content | TEXT | NOT NULL |
| metadata | JSONB | arbitrary key-value pairs |
| embedding | vector(1536) | OpenAI text-embedding-3-small |
| created_at | TIMESTAMPTZ | auto-set |

**Indexes:**
- `idx_vector_docs_type` on `doc_type`
- `idx_vector_docs_source` on `source_id`
- `idx_vector_docs_embed` — IVFFlat cosine similarity index (lists=50)

### Entity Relationships

```
User (1) ──── (*) Resume (1) ──── (*) PrepSession (1) ──── (*) Question
  |
  └── user_study_progress (ElementCollection)

VectorDocument (standalone — linked by doc_type + source_id, not FK)
```

---

## 6. Backend — Deep Dive

### 6.1 Entry Point

**`InterviewPrepApplication.java`**

Standard `@SpringBootApplication` class. Spring Boot auto-configures all beans, JPA, security, and web MVC.

---

### 6.2 Security Layer

#### `JwtUtil` — Token Management

Handles all JWT operations using JJWT 0.12.3:

- **`generateToken(username)`** — creates a signed JWT with `sub=username`, `iat=now`, `exp=now+expirationMs` (default 24h). Signs with HMAC-SHA256 using a Base64-decoded secret key.
- **`extractUsername(token)`** — parses and verifies the token, returns the subject claim.
- **`validateToken(token)`** — returns `true` if the token is valid and not expired; catches all `JwtException` variants.

The JWT secret is read from `jwt.secret` property (Base64-encoded, minimum 32 chars for 256-bit key).

#### `JwtAuthFilter` — Request Authentication

Extends `OncePerRequestFilter`. On each request:

1. Reads the `Authorization: Bearer <token>` header
2. Calls `JwtUtil.validateToken(token)`
3. Extracts username and loads the `User` entity from the database
4. Sets a `UsernamePasswordAuthenticationToken` into `SecurityContextHolder`

This makes the `User` entity directly injectable in controllers via `@AuthenticationPrincipal User user`.

#### `SecurityConfig` — Filter Chain

- **Session policy:** `STATELESS` (no server-side sessions, JWT only)
- **CSRF:** disabled (not needed for JWT/stateless APIs)
- **Public routes:** `/api/auth/**` and `/actuator/health` — all others require authentication
- **Filter order:** `JwtAuthFilter` → `RateLimitFilter` → Spring's built-in filters
- **Password encoding:** BCrypt

#### `RateLimitFilter` — API Protection

Applied only to AI-heavy endpoints to prevent abuse:

| Endpoint | Method | Rate Limited |
|---|---|---|
| `/api/questions/generate` | POST | Yes |
| `/api/resumes/{id}/score` | POST | Yes |
| `/api/resumes/{id}/suggestions` | POST | Yes |
| `/api/chat` | POST | Yes |

**Limit:** 10 requests per 60-second sliding window per user (identified by JWT token prefix) or IP address. Returns HTTP 429 with JSON error on breach.

#### `CorsConfig`

Reads `cors.allowed-origins` (comma-separated) from properties and registers a `CorsFilter` for all `/api/**` paths. Allows all headers, credentials, and the standard HTTP methods.

---

### 6.3 Controllers

#### `AuthController` — `/api/auth`

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/register` | No | Creates user, returns JWT + user info |
| POST | `/login` | No | Authenticates, returns JWT + user info |
| GET | `/me` | Yes | Returns current user info (no token in response) |
| POST | `/change-password` | Yes | Validates current password, sets new BCrypt hash |

**Register validation:** checks username and email uniqueness before saving. Immediately returns a JWT so the user is logged in after registration.

**Login:** delegates to Spring's `AuthenticationManager` which uses `DaoAuthenticationProvider` + BCrypt comparison.

---

#### `ResumeController` — `/api/resumes`

All endpoints require authentication. The authenticated user is passed to the service layer for ownership enforcement.

| Method | Path | Description |
|---|---|---|
| POST | `/upload` | Upload PDF/DOCX/text file (multipart/form-data) |
| POST | `/text` | Submit plain text content |
| POST | `/build` | Build resume from mode+input via AI |
| GET | `/` | List all resumes for current user |
| GET | `/{id}` | Get single resume by ID |
| PUT | `/{id}` | Replace resume content (clears score) |
| PATCH | `/{id}/template` | Set template name |
| PATCH | `/{id}/title` | Set display title |
| DELETE | `/{id}` | Delete resume |
| POST | `/{id}/score` | AI resume scoring (rate limited) |
| POST | `/{id}/suggestions` | AI section-by-section suggestions (rate limited) |
| POST | `/{id}/jd-match` | Match resume vs job description |

---

#### `QuestionController` — `/api/questions`

| Method | Path | Description |
|---|---|---|
| POST | `/generate` | Generate OA + Interview questions for a company |
| POST | `/mock-interview` | Generate questions for a specific round type |
| GET | `/sessions` | List all prep sessions for current user |
| GET | `/session/{sessionId}` | Get all questions in a session |
| DELETE | `/sessions/{sessionId}` | Delete a session (ownership checked) |
| POST | `/{questionId}/solution` | Get or generate AI solution |
| POST | `/{questionId}/test-cases` | Get or generate test cases |
| POST | `/{questionId}/feedback` | Get AI feedback on a user's answer |
| PATCH | `/{questionId}/notes` | Save user notes on a question |
| GET | `/github-companies` | Get list of supported companies |
| GET | `/github/{company}` | Get LeetCode questions for a company |

---

#### `ChatController` — `/api/chat`

| Method | Path | Description |
|---|---|---|
| POST | `/` | Ask a question grounded in resume content (RAG) |

Request body: `{ "resumeId": number | null, "question": string }`
Response: `{ "answer": string }`

---

#### `StudyProgressController` — `/api/study`

| Method | Path | Description |
|---|---|---|
| GET | `/progress` | Return set of completed subtopic IDs |
| POST | `/progress/toggle` | Toggle a subtopic done/undone |
| POST | `/progress/reset` | Clear all progress |

Progress is stored directly on the `User` entity as an `@ElementCollection` (no separate service layer needed).

---

#### `CodeRunnerController` — `/api/code`

| Method | Path | Description |
|---|---|---|
| POST | `/run` | Proxy code execution to Piston API |

Forwards the request body directly to `https://emkc.org/api/v2/piston/execute` and returns the response. Supports any language Piston supports (Python, Java, JavaScript, C++, etc.).

---

#### `KnowledgeBaseController` — `/api/kb`

| Method | Path | Description |
|---|---|---|
| POST | `/company` | Add a company interview pattern to vector KB |
| POST | `/tips` | Add an interview tip to vector KB |

These endpoints seed the RAG knowledge base with custom content. They are not rate-limited or user-scoped (intended for admin/seeding use).

---

### 6.4 Services

#### `GroqService` — AI Provider Abstraction

The central AI service. Despite the name, it supports **two providers** controlled by `ai.provider` property:

**Claude (Anthropic) mode** (`ai.provider=claude`):
- Calls `POST {claudeBaseUrl}/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`
- Body: `{ model, max_tokens: 4096, system, messages: [{role: "user", content}] }`
- Parses `response.content[0].text`

**Groq mode** (`ai.provider=groq`):
- Calls `POST {groqBaseUrl}/v1/chat/completions` (OpenAI-compatible)
- Headers: `Authorization: Bearer {groqApiKey}`
- Body: `{ model, max_tokens: 4096, messages: [{role: "system"}, {role: "user"}] }`
- Parses `response.choices[0].message.content`

Single method: `chat(systemPrompt, userMessage) → String`

---

#### `ResumeService` — Resume Management

**File parsing:**
- `.pdf` → Apache PDFBox `PDFTextStripper`
- `.docx`/`.doc` → Apache POI `XWPFDocument`, iterates paragraphs
- Anything else → raw bytes as string

**After any save/update:** calls `resumeChatService.indexResume(saved)` to re-embed the resume into pgvector.

**`score(id, user)`:**
1. Builds a system prompt instructing the LLM to return JSON: `{ score, feedback, strengths[], improvements[] }`
2. Calls `GroqService.chat()`
3. Extracts JSON via `extractJson()` (finds first `{` to last `}`)
4. Persists `score` and `scoreFeedback` back onto the `Resume` entity
5. Returns `ResumeScoreResponse`

**`suggestions(id, user)`:**
1. System prompt requests JSON: `{ sectionSuggestions: { contact[], summary[], experience[], skills[], education[], projects[] }, overallTip }`
2. Returns `ResumeSuggestionResponse`

**`matchJobDescription(id, jobDescription, user)`:**
1. System prompt requests JSON: `{ score, summary, matchedSkills[], missingSkills[], matchedKeywords[], suggestions[] }`
2. Scores 0-100 with clear band descriptions in the prompt
3. Returns raw `Map<String, Object>`

**`buildResume(req, user)`:**
Supports 5 modes:
- `text` — natural language description → formatted resume
- `json` — JSON object → formatted resume
- `keyvalue` — key=value pairs → formatted resume
- `regex` — extract info from raw unstructured text
- `url` — fetches URL content via HTTP, strips HTML tags, passes to LLM

---

#### `QuestionService` — Question Generation

**`generateQuestions(req, user)`** — the core generation flow:

1. Fetches user's resume by ID (ownership enforced)
2. Creates and saves a `PrepSession`
3. Fetches RAG context from `CompanyKnowledgeService` (company interview patterns)
4. Fetches past questions context from vector store (avoids repetition)
5. Launches **two parallel `CompletableFuture`** calls:
   - `generateOAQuestions` → 8 questions (4 DSA, 2 SQL, 1 System Design, 1 Aptitude)
   - `generateInterviewQuestions` → 10 questions (4 Technical, 3 Behavioral STAR, 2 Role-Specific, 1 HR)
6. Both futures join (blocks until both complete)
7. Saves all questions to the DB
8. Indexes all questions into the vector store for future deduplication
9. Returns `GenerateQuestionsResponse`

**`generateMockInterview(req, user)`** — generates a focused round:

Round types and question counts:
- `Behavioral` — 8 STAR-format questions
- `Technical` — 8 algorithm/code/system internals questions
- `DSA` — 8 full problem statements with I/O examples
- `System Design` — 6 design questions (senior engineer level)
- `HR` — 8 screening questions
- `Role-Specific` — 8 questions based on candidate's resume experience
- Default/mixed — 10 questions across all categories

**`getSolution(questionId)`** — lazy generation:
- Returns cached solution if already generated
- Otherwise calls AI with structured markdown format: Approach, Solution (with code), Complexity, Key Points
- Persists and returns

**`getTestCases(questionId)`** — lazy generation:
- Returns cached test cases if already generated
- Otherwise calls AI to generate exactly 5 test cases as JSON array with `id`, `input`, `expectedOutput`, `description`
- Persists and returns

**`getFeedback(questionId, userAnswer)`** — real-time feedback:
- Calls AI with the question + user's answer
- Returns structured markdown: Score (X/10), What You Got Right, What Could Be Better, Model Answer

---

#### `ResumeChatService` — RAG Chat

**`indexResume(resume)`:**
1. Deletes all existing `RESUME_CHUNK` documents for this resume's ID
2. Splits resume content on 2+ consecutive newlines (paragraph-level chunking)
3. Skips chunks shorter than 20 characters
4. Calls `VectorStoreService.store()` for each chunk with metadata `{ resumeId }`

**`chat(resumeId, question, user)`:**
1. Calls `VectorStoreService.similaritySearch(question, "RESUME_CHUNK", 5)` — top-5 similar chunks
2. Filters to only chunks belonging to the requested resume
3. Also retrieves top-2 `EXTERNAL_KB` chunks for industry knowledge
4. Builds a prompt with resume excerpts + external context
5. Returns LLM answer string

If no relevant chunks are found, returns a descriptive "not found" message.

---

#### `EmbeddingService` — Vector Generation

Calls OpenAI `text-embedding-3-small` to produce 1536-dimensional float vectors.

- Truncates input to 8000 characters to stay within token limits
- Endpoint: `{openai.api.base-url}/v1/embeddings`
- **Fallback:** if the API is unreachable, computes a deterministic n-gram hash embedding (bigram character-level, L2-normalized). This allows the app to function without embeddings, though search quality degrades.

---

#### `VectorStoreService` — pgvector Operations

Uses Spring `JdbcTemplate` for all vector operations (not JPA — pgvector types aren't natively supported by Hibernate in this version).

**`store(docType, sourceId, content, metadata)`:**
- Embeds content via `EmbeddingService`
- Serializes metadata to JSON
- Converts float[] to `[f1,f2,...,f1536]` string literal
- Inserts into `vector_documents` with `?::vector` cast

**`similaritySearch(query, docType, topK)`:**
- Embeds query
- Uses cosine distance: `embedding <=> ?::vector`
- Returns `1 - cosine_distance` as score (1.0 = identical, 0.0 = orthogonal)
- Filtered by `doc_type`

**`similaritySearchAny(query, topK)`:**
- Same as above but searches across all doc types

**`deleteBySourceId(docType, sourceId)`:**
- Used when re-indexing a resume (clears old chunks before writing new ones)

---

#### `CompanyGithubService` — LeetCode Company Questions

Fetches real company-wise LeetCode problems from the GitHub repo `hxu296/leetcode-company-wise-problems-2022`.

- **CSV format:** `problem_link,problem_name,num_occur`
- **Cache:** in-memory `ConcurrentHashMap` with 12-hour TTL per company
- **Sorting:** by `num_occur` descending (most frequently asked first), then re-ranked
- **Company list:** 187 hardcoded company names matching CSV filenames in the GitHub repo. The list is hardcoded (not fetched via GitHub API) to avoid GitHub API rate limits on the shared Render IP (60 req/hr unauthenticated). CSV fetches themselves use `raw.githubusercontent.com` which has no rate limit.

---

#### `CompanyKnowledgeService` & `TipsKnowledgeService`

Both services wrap `VectorStoreService` to provide RAG context:

- `CompanyKnowledgeService.getRelevantContext(company, role, n)` — fetches top-n `COMPANY_KB` documents semantically similar to `company + role`
- `TipsKnowledgeService.getTipsForContext(context, n)` — fetches top-n `TIPS_KB` documents

Both are injected into `QuestionService` to enrich generation prompts with company-specific interview patterns and general interview tips.

---

### 6.5 Entities & Repositories

#### `User` implements `UserDetails`

Implementing `UserDetails` directly on the entity means the `User` object itself can be injected by Spring Security. Key decisions:
- `isAccountNonExpired`, `isAccountNonLocked`, `isCredentialsNonExpired`, `isEnabled` all return `true` — no account management complexity
- `getAuthorities()` returns empty list — no role-based access control needed
- `studyProgress` is `FetchType.EAGER` — always loaded with the user (small set)

#### `Resume`

- `sessions` field is `@JsonIgnore` — prevents circular serialization
- `score` and `scoreFeedback` are nullable — only set after scoring
- Updating content via `update()` clears score (`setScore(null)`) since old score is stale

#### `PrepSession`

- `@JsonProperty("resumeId")` on `getResumeId()` — exposes the FK as a flat field in JSON without loading the full resume
- `questions` is `@JsonIgnore` — questions are loaded separately via their own endpoint

#### `Question`

- `solution`, `testCases`, `notes` are all nullable TEXT columns — populated lazily on demand
- `QuestionType` enum: `OA` (Online Assessment) vs `INTERVIEW`

#### `VectorDocument`

- `metadata` uses `@JdbcTypeCode(SqlTypes.JSON)` for JSONB column
- No JPA relationship to resumes/questions — linked only by convention via `doc_type` + `source_id`

#### Repositories

All extend `JpaRepository`. Notable custom methods:

```java
// ResumeRepository
List<Resume> findByUser(User user);
Optional<Resume> findByIdAndUser(Long id, User user);  // ownership enforcement

// PrepSessionRepository
List<PrepSession> findByResumeUserOrderByCreatedAtDesc(User user);  // sessions for user
Optional<PrepSession> findByIdWithUser(Long id);  // for delete ownership check

// QuestionRepository
List<Question> findBySessionId(Long sessionId);
List<Question> findBySessionIdAndType(Long sessionId, Question.QuestionType type);
long countBySessionIdAndType(Long sessionId, Question.QuestionType type);  // for SessionSummaryDto

// UserRepository
boolean existsByUsername(String username);
boolean existsByEmail(String email);
Optional<User> findByUsername(String username);
```

---

### 6.6 DTOs

All DTOs are Java records (immutable value objects):

| DTO | Fields | Used In |
|---|---|---|
| `AuthResponse` | token, id, username, email | Auth endpoints response |
| `LoginRequest` | username, password | POST /login |
| `RegisterRequest` | username, email, password | POST /register |
| `GenerateQuestionsRequest` | resumeId, companyName, targetRole | POST /questions/generate |
| `GenerateQuestionsResponse` | sessionId, oaQuestions[], interviewQuestions[] | Question generation response |
| `MockInterviewRequest` | resumeId, companyName, targetRole, roundType | POST /questions/mock-interview |
| `QuestionDto` | All question fields + sessionId | Question responses |
| `SessionSummaryDto` | id, companyName, targetRole, resumeId, createdAt, oaCount, interviewCount | GET /questions/sessions |
| `ResumeScoreResponse` | score, feedback, strengths[], improvements[] | POST /resumes/{id}/score |
| `ResumeSuggestionResponse` | sectionSuggestions{}, overallTip | POST /resumes/{id}/suggestions |
| `BuildResumeRequest` | mode, input | POST /resumes/build |

`QuestionDto.from(Question q)` is a static factory method that maps the entity to the DTO, avoiding direct entity serialization.

---

### 6.7 Configuration

#### `application.properties` (local dev)

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/interview_prep
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.jpa.hibernate.ddl-auto=update           # Auto-creates/updates tables
spring.sql.init.mode=always                    # Runs vector_schema.sql on startup
cors.allowed-origins=http://localhost:5173
ai.provider=${AI_PROVIDER:claude}              # Override with env var
claude.api.base-url=${ANTHROPIC_BASE_URL:https://api.anthropic.com}
openai.api.base-url=http://localhost:6655/openai  # Local proxy for embeddings
```

#### `application-prod.properties`

Activated by `SPRING_PROFILES_ACTIVE=prod`. Key differences:
- Database from `JDBC_DATABASE_URL` env var (Railway/Render format)
- HikariCP connection pool: max 10 connections, 30s timeout
- `ai.provider` defaults to `groq` in prod
- All log levels set to `WARN`
- Actuator health endpoint enabled (for Railway health checks)

---

## 7. Frontend — Deep Dive

### 7.1 Entry Point & Routing

**`main.tsx`** — mounts `<App />` inside `<BrowserRouter>` using `ReactDOM.createRoot`.

**`App.tsx`** — defines the full route tree:

```
/login          → LoginPage         (public)
/register       → RegisterPage      (public)
/* (protected)  → Layout wraps all:
  /             → HomePage
  /resume       → ResumePage
  /questions/:sessionId → QuestionsPage
  /history      → HistoryPage
  /chat         → ChatPage
  /account      → AccountPage
  /study        → StudyGuidePage
  /companies    → CompanyQuestionsPage
  /jd-match     → JdMatchPage
  /mock/:sessionId → MockInterviewPage
  /mock-interview  → MockInterviewSetupPage
  /flashcards   → FlashcardsPage
  /progress     → ProgressPage
```

`ProtectedRoute` checks `AuthContext` — if not authenticated, redirects to `/login`.

`Layout` wraps all authenticated pages with the navigation sidebar.

---

### 7.2 Auth Context

**`AuthContext.tsx`** provides global authentication state using React Context + `localStorage`.

State:
- `user: User | null` — parsed user object
- `token: string | null` — JWT string
- `isLoading: boolean` — true while hydrating from localStorage

On mount (`useEffect`), attempts to restore session from `localStorage` keys `auth_token` and `auth_user`.

**`login(token, user)`** — persists both to localStorage and updates state.

**`logout()`** — clears localStorage, resets state, and redirects to `/login`.

The Axios interceptor (in `api.ts`) handles 401 responses globally by calling the same localStorage-clear + redirect logic.

---

### 7.3 API Client

**`api.ts`** creates a single Axios instance with:
- `baseURL`: `VITE_API_URL` env var or `/api` (proxied by Vite in dev)
- Request interceptor: injects `Authorization: Bearer {token}` from localStorage on every request
- Response interceptor: on 401, clears auth and redirects to `/login`

Exported API modules:

#### `authApi`
- `register(username, email, password)` → `AuthResponse`
- `login(username, password)` → `AuthResponse`
- `me()` → `AuthResponse`
- `changePassword(currentPassword, newPassword)` → `{ message }`

#### `resumeApi`
- `upload(file: File)` → `Resume` (multipart)
- `uploadText(content)` → `Resume`
- `build(mode, input)` → `Resume`
- `getAll()` → `Resume[]`
- `getById(id)` → `Resume`
- `update(id, content)` → `Resume`
- `updateTemplate(id, templateName)` → `Resume`
- `updateTitle(id, title)` → `Resume`
- `delete(id)` → void
- `score(id)` → `ResumeScoreResponse`
- `getSuggestions(id)` → `ResumeSuggestionResponse`
- `matchJd(id, jobDescription)` → `JdMatchResponse`

#### `questionsApi`
- `generate(req)` → `GenerateQuestionsResponse`
- `generateMockInterview(resumeId, companyName, targetRole, roundType)` → `{ sessionId, roundType }`
- `getBySession(sessionId)` → `Question[]`
- `getSolution(questionId)` → `Question`
- `getTestCases(questionId)` → `Question`
- `updateNotes(questionId, notes)` → `Question`
- `getFeedback(questionId, userAnswer)` → `{ feedback }`
- `getSessions()` → `PrepSession[]`
- `deleteSession(sessionId)` → void
- `getGithubCompanies()` → `string[]`
- `getGithubQuestions(company)` → `GithubQuestion[]`

#### `chatApi`
- `send(resumeId, question)` → `{ answer }`

#### `studyApi`
- `getProgress()` → `string[]`
- `toggle(subtopicId)` → `string[]`
- `reset()` → `string[]`

---

### 7.4 Pages

| Page | Route | Description |
|---|---|---|
| `LoginPage` | `/login` | Username + password login form |
| `RegisterPage` | `/register` | New account registration |
| `HomePage` | `/` | Dashboard with quick-action cards |
| `ResumePage` | `/resume` | Full resume manager: upload, edit, score, suggest, templates |
| `QuestionsPage` | `/questions/:sessionId` | View OA + Interview questions, get solutions, run code, take notes |
| `HistoryPage` | `/history` | List all past prep sessions, delete sessions |
| `ChatPage` | `/chat` | RAG-powered chat interface grounded in resume |
| `AccountPage` | `/account` | View account info, change password |
| `StudyGuidePage` | `/study` | DSA topic tree with progress tracking |
| `CompanyQuestionsPage` | `/companies` | Browse LeetCode questions by company |
| `JdMatchPage` | `/jd-match` | Paste JD + select resume, get match analysis |
| `MockInterviewSetupPage` | `/mock-interview` | Configure and launch a mock interview session |
| `MockInterviewPage` | `/mock/:sessionId` | Answer questions one-by-one, get AI feedback |
| `FlashcardsPage` | `/flashcards` | Flashcard-style review of questions |
| `ProgressPage` | `/progress` | Visual study progress dashboard |

---

### 7.5 Components

#### Layout (`components/layout/Layout.tsx`)
The persistent shell around all authenticated pages. Contains the navigation sidebar with links to all routes. Renders `children` in the main content area.

#### `ProtectedRoute`
Reads `isLoading` and `user` from `AuthContext`. Shows a loading spinner during hydration. Redirects to `/login` if unauthenticated. Otherwise renders `children`.

#### `ErrorBoundary`
React class component that catches render-time errors and shows a friendly fallback UI instead of a blank screen.

#### `Skeleton`
Loading placeholder component. Renders gray animated blocks matching the shape of the content being loaded.

#### `CodeRunner`
Embeds a Monaco Editor (VS Code's editor engine) for code input. Sends code to `/api/code/run` (which proxies to Piston API). Displays stdout/stderr output. Supports multiple languages.

#### Resume Components

| Component | Purpose |
|---|---|
| `ResumeUploader` | Drag-and-drop or click-to-upload PDF/DOCX/text files using `react-dropzone` |
| `ResumeEditor` | Full-text editor for viewing and editing resume content |
| `ResumeScorer` | Displays AI score (0-100), feedback paragraph, strengths, and improvements |
| `AISuggestions` | Renders section-by-section suggestions grouped by section name |
| `ResumeSelector` | Dropdown/list to choose between multiple resumes |
| `ResumeTemplates` | Visual template picker with live preview |
| `TemplatePreview` | Renders a resume in the selected visual template format |
| `BuildResumeModal` | Modal with tabs for each build mode (text, JSON, key-value, regex, URL) |

#### Question Components

| Component | Purpose |
|---|---|
| `QuestionCard` | Single question display with expandable hint, solution, test cases, notes, and code runner |

---

### 7.6 TypeScript Types

Defined in `src/types/index.ts`:

```typescript
User             { id, username, email }
AuthResponse     { token, id, username, email }
Resume           { id, content, originalFilename?, title?, score?, scoreFeedback?, templateName?, createdAt, updatedAt }
ResumeSuggestionResponse  { sectionSuggestions: Record<string, string[]>, overallTip }
PrepSession      { id, companyName, targetRole?, resumeId, createdAt, oaCount?, interviewCount? }
Question         { id, type, category, questionText, difficulty?, hint?, solution?, notes?, testCases?, sessionId }
ResumeScoreResponse       { score, feedback, strengths[], improvements[] }
GenerateQuestionsRequest  { resumeId, companyName, targetRole? }
GenerateQuestionsResponse { sessionId, oaQuestions[], interviewQuestions[] }
JdMatchResponse           { score, summary, matchedSkills[], missingSkills[], matchedKeywords[], suggestions[] }
GithubQuestion            { title, url, occurrences, rank }
```

---

## 8. AI & RAG Pipeline

### AI Provider Selection

The system selects between Claude (Anthropic) and Groq (llama-3.3-70b) at runtime based on the `ai.provider` property. All prompts flow through `GroqService.chat(systemPrompt, userMessage)`.

### Prompting Strategy

All prompts follow a consistent pattern:
- **System prompt** — defines the AI's role, output format (always JSON for structured data, markdown for human-readable), and constraints
- **User message** — provides the actual data (resume content, company name, question text)
- **JSON extraction** — `extractJson()` / `extractJsonArray()` strips markdown code fences that LLMs sometimes wrap around JSON

### RAG Architecture

```
User Question
     │
     ▼
EmbeddingService.embed(question)
     │
     ▼
VectorStoreService.similaritySearch(question, "RESUME_CHUNK", 5)
     │
     ▼ (filter by resumeId)
Top-5 most relevant resume paragraphs
     │
     ▼
VectorStoreService.similaritySearch(question, "EXTERNAL_KB", 2)
     │
     ▼
Top-2 relevant industry knowledge chunks
     │
     ▼
GroqService.chat(system, resumeContext + externalContext + question)
     │
     ▼
Answer string
```

### Resume Indexing Flow

```
Resume uploaded/updated
     │
     ▼
VectorStoreService.deleteBySourceId("RESUME_CHUNK", resumeId)
     │
     ▼
Split content on \n{2,}  (paragraph boundaries)
     │
     ▼
For each paragraph (>20 chars):
  EmbeddingService.embed(paragraph)
     │
     ▼
  VectorStoreService.store("RESUME_CHUNK", resumeId, paragraph, {resumeId})
```

### Question Generation RAG

When generating questions, the system enriches the prompt with:
1. **Company patterns** — from `COMPANY_KB` vector store (past interview patterns for that company)
2. **Past questions** — from `QUESTION` vector store (to avoid repeating questions already in the DB)
3. **Tips** — from `TIPS_KB` vector store (relevant interview preparation tips)

After generation, new questions are indexed back into the `QUESTION` store, building a self-improving knowledge base over time.

---

## 9. Complete API Reference

All endpoints (except `/api/auth/**` and `/actuator/health`) require:
```
Authorization: Bearer <jwt_token>
```

### Auth Endpoints

```
POST /api/auth/register
Body: { username, email, password }
Response: { token, id, username, email }

POST /api/auth/login
Body: { username, password }
Response: { token, id, username, email }

GET /api/auth/me
Response: { token: null, id, username, email }

POST /api/auth/change-password
Body: { currentPassword, newPassword }
Response: { message }
```

### Resume Endpoints

```
GET /api/resumes
Response: Resume[]

POST /api/resumes/upload
Body: multipart/form-data { file }
Response: Resume

POST /api/resumes/text
Body: { content: string }
Response: Resume

POST /api/resumes/build
Body: { mode: "text"|"json"|"keyvalue"|"regex"|"url", input: string }
Response: Resume

GET /api/resumes/{id}
Response: Resume

PUT /api/resumes/{id}
Body: { content: string }
Response: Resume (score cleared)

PATCH /api/resumes/{id}/template
Body: { templateName: string }
Response: Resume

PATCH /api/resumes/{id}/title
Body: { title: string }
Response: Resume

DELETE /api/resumes/{id}
Response: 204 No Content

POST /api/resumes/{id}/score          [RATE LIMITED]
Response: { score, feedback, strengths[], improvements[] }

POST /api/resumes/{id}/suggestions    [RATE LIMITED]
Response: { sectionSuggestions: {contact, summary, experience, skills, education, projects}, overallTip }

POST /api/resumes/{id}/jd-match
Body: { jobDescription: string }
Response: { score, summary, matchedSkills[], missingSkills[], matchedKeywords[], suggestions[] }
```

### Question Endpoints

```
POST /api/questions/generate          [RATE LIMITED]
Body: { resumeId, companyName, targetRole? }
Response: { sessionId, oaQuestions[], interviewQuestions[] }

POST /api/questions/mock-interview
Body: { resumeId, companyName, targetRole, roundType }
Response: { sessionId, roundType }

GET /api/questions/sessions
Response: SessionSummaryDto[]  [{ id, companyName, targetRole?, resumeId, createdAt, oaCount, interviewCount }]

GET /api/questions/session/{sessionId}
Response: Question[]

DELETE /api/questions/sessions/{sessionId}
Response: 204 No Content

POST /api/questions/{questionId}/solution
Response: Question (with solution populated)

POST /api/questions/{questionId}/test-cases
Response: Question (with testCases JSON populated)

POST /api/questions/{questionId}/feedback
Body: { userAnswer: string }
Response: { feedback: string (markdown) }

PATCH /api/questions/{questionId}/notes
Body: { notes: string }
Response: Question

GET /api/questions/github-companies
Response: string[]

GET /api/questions/github/{company}
Response: GithubQuestion[]  [{ title, url, occurrences, rank }]
```

### Chat Endpoint

```
POST /api/chat                        [RATE LIMITED]
Body: { resumeId: number|null, question: string }
Response: { answer: string }
```

### Study Progress Endpoints

```
GET /api/study/progress
Response: string[]  (set of completed subtopic IDs)

POST /api/study/progress/toggle
Body: { subtopicId: string }
Response: string[]  (updated set)

POST /api/study/progress/reset
Response: []
```

### Code Runner Endpoint

```
POST /api/code/run
Body: Piston API execute body  { language, version, files: [{content}], stdin? }
Response: Piston API execute response
```

### Knowledge Base Endpoints

```
POST /api/kb/company
Body: { company: string, pattern: string }
Response: 200 OK

POST /api/kb/tips
Body: { category: string, tip: string }
Response: 200 OK
```

### Health Check

```
GET /actuator/health
Response: { status: "UP" }
```

---

## 10. Environment Variables

### Backend

| Variable | Default | Required | Description |
|---|---|---|---|
| `AI_PROVIDER` | `claude` | No | `claude` or `groq` |
| `ANTHROPIC_AUTH_TOKEN` | — | If using Claude | Anthropic API key |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | No | Override for proxy |
| `ANTHROPIC_MODEL` | `claude-sonnet-latest` | No | Claude model ID |
| `GROQ_API_KEY` | — | If using Groq | Groq API key |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | No | Groq model ID |
| `JWT_SECRET` | (hardcoded dev key) | **Yes in prod** | Base64 secret, min 32 chars |
| `JWT_EXPIRATION_MS` | `86400000` (24h) | No | Token TTL in milliseconds |
| `FRONTEND_URL` | — | **Yes in prod** | Comma-separated CORS origins |
| `SPRING_PROFILES_ACTIVE` | — | Yes in prod | Set to `prod` |
| `JDBC_DATABASE_URL` | — | Yes in prod | `jdbc:postgresql://...` |
| `JDBC_DATABASE_USERNAME` | — | Yes in prod | DB username |
| `JDBC_DATABASE_PASSWORD` | — | Yes in prod | DB password |

### Frontend

| Variable | Default | Required | Description |
|---|---|---|---|
| `VITE_API_URL` | `/api` | Yes in prod | Full URL to backend: `https://your-backend.com/api` |

---

## 11. Local Development Setup

### Prerequisites

- Java 17+
- Maven 3.9+
- Node.js 18+
- PostgreSQL with pgvector extension

### Step 1: Database

```bash
psql -U postgres -c "CREATE DATABASE interview_prep;"
psql -U postgres -d interview_prep -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

The `vector_schema.sql` runs automatically on startup (`spring.sql.init.mode=always`) — no manual table creation needed.

### Step 2: Environment

Create a `.env` file or set shell variables:

```bash
export AI_PROVIDER=groq
export GROQ_API_KEY=your_groq_api_key
# OR
export AI_PROVIDER=claude
export ANTHROPIC_AUTH_TOKEN=your_anthropic_key
```

### Step 3: Backend

```bash
cd /Users/i775913/interview-prep/backend
mvn spring-boot:run
# Starts on http://localhost:8080
```

### Step 4: Frontend

```bash
cd /Users/i775913/interview-prep/frontend
npm install
npm run dev
# Starts on http://localhost:5173
# /api/* is proxied to localhost:8080 automatically via vite.config.ts
```

### Notes

- Hibernate DDL auto-creates/updates all tables except `vector_documents` (handled by `vector_schema.sql`)
- The OpenAI embedding endpoint defaults to `http://localhost:6655/openai` in local dev — if no proxy is running, `EmbeddingService` falls back to the n-gram hash embedding automatically
- The JWT secret in `application.properties` is hardcoded for dev — **always override with a strong secret in production**

---

## 12. Deployment Guide

### Backend → Render (Docker)

1. Create a **Web Service** on [render.com](https://render.com)
2. Connect GitHub repository
3. Set:
   - **Root Directory:** *(blank — Dockerfile is in backend/)*
   - **Dockerfile Path:** `backend/Dockerfile`
   - **Docker Build Context:** `.` (root of repo)
4. Create a **PostgreSQL** database on Render and enable the pgvector extension
5. Set environment variables (see Section 10)

The Dockerfile uses a two-stage build:
- Stage 1: `maven:3.9-eclipse-temurin-21` — runs `mvn package -DskipTests`
- Stage 2: `eclipse-temurin:21-jre` — copies the fat JAR and runs it

Port 8080 is exposed. Railway's `railway.toml` configures the same setup for Railway deployments.

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Framework preset: **Vite**
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`
5. Deploy

`frontend/vercel.json` contains SPA rewrite rules to redirect all routes to `index.html` (required for React Router's client-side routing).

---

## 13. Rate Limiting

`RateLimitFilter` applies a sliding-window rate limit of **10 requests per 60 seconds** to AI-heavy endpoints.

**Rate-limited endpoints:**
- `POST /api/questions/generate`
- `POST /api/resumes/{id}/score`
- `POST /api/resumes/{id}/suggestions`
- `POST /api/chat`

**Key assignment:**
1. If a `Bearer` token is present → key = first 40 chars of the token (user-scoped)
2. Otherwise → key = `X-Forwarded-For` header or `remoteAddr` (IP-scoped)

**On breach:** HTTP 429 with `{ "message": "Too many requests. Please wait a minute before trying again." }`

The window resets when the current time is 60+ seconds past the window start, not on a fixed schedule.

---

## 14. Data Flow Diagrams

### Question Generation Flow

```
Frontend                 Backend                     AI / DB
   │                        │                            │
   │─ POST /questions/generate ──────────────────────→  │
   │                        │                            │
   │                        ├─ getById(resumeId) ───────→ DB
   │                        │←──────────────────── Resume│
   │                        │                            │
   │                        ├─ companyKB.getContext() ──→ pgvector
   │                        │←── company patterns ───────│
   │                        │                            │
   │                        ├─ vectorStore.search() ────→ pgvector
   │                        │←── past questions ─────────│
   │                        │                            │
   │                        ├─ CompletableFuture (OA) ──→ GroqService
   │                        ├─ CompletableFuture (INT) ─→ GroqService
   │                        │                            │
   │                        │←── OA questions JSON ──────│
   │                        │←── Interview Qs JSON ──────│
   │                        │                            │
   │                        ├─ saveAll(questions) ──────→ DB
   │                        ├─ indexQuestions() ────────→ pgvector
   │                        │                            │
   │←─ GenerateQuestionsResponse ───────────────────────│
```

### Resume RAG Chat Flow

```
Frontend                  Backend                    pgvector / AI
   │                         │                            │
   │─ POST /chat ────────────→                            │
   │  { resumeId, question }  │                            │
   │                          │                            │
   │                          ├─ embed(question) ─────────→ OpenAI
   │                          │←── float[1536] ────────────│
   │                          │                            │
   │                          ├─ search("RESUME_CHUNK", 5) → pgvector
   │                          │←── top-5 chunks ────────────│
   │                          │                            │
   │                          ├─ filter by resumeId        │
   │                          │                            │
   │                          ├─ search("EXTERNAL_KB", 2) → pgvector
   │                          │←── 2 industry chunks ───────│
   │                          │                            │
   │                          ├─ GroqService.chat() ───────→ Claude/Groq
   │                          │←── answer string ───────────│
   │                          │                            │
   │←─ { answer } ────────────│
```

### Auth Flow

```
Browser                  Backend                        DB
   │                        │                            │
   │─ POST /auth/login ─────→                            │
   │  { username, password } │                            │
   │                         ├─ authManager.authenticate()│
   │                         ├─ findByUsername() ────────→ users table
   │                         │←── User entity ────────────│
   │                         ├─ BCrypt.matches()          │
   │                         ├─ jwtUtil.generateToken()   │
   │←─ { token, id, ... } ───│                            │
   │                         │                            │
   │  (subsequent requests)  │                            │
   │─ GET /api/resumes ──────→                            │
   │  Authorization: Bearer  │                            │
   │                         ├─ JwtAuthFilter             │
   │                         ├─ validateToken()           │
   │                         ├─ extractUsername()         │
   │                         ├─ findByUsername() ────────→ users table
   │                         │←── User entity ────────────│
   │                         ├─ SecurityContextHolder.set()│
   │                         ├─ controller method runs    │
   │←─ [Resume, ...] ────────│
```

---

## 15. File-by-File Explanation

This section walks through every source file in the project and explains exactly what it does, what state it manages, what it renders or exposes, and how it connects to the rest of the system.

---

### BACKEND FILES

---

#### `InterviewPrepApplication.java`
**Path:** `backend/src/main/java/com/interviewprep/InterviewPrepApplication.java`

The application entry point. Annotated with `@SpringBootApplication` which enables auto-configuration, component scanning, and Spring Boot startup. Contains only the `main()` method that calls `SpringApplication.run()`. No logic lives here — it simply bootstraps the entire Spring context.

---

#### `config/CorsConfig.java`
**Path:** `backend/src/main/java/com/interviewprep/config/CorsConfig.java`

Defines the CORS policy for the entire API. Reads `cors.allowed-origins` from `application.properties` (comma-separated list of allowed frontend URLs). Registers a `CorsFilter` bean that applies to all `/api/**` paths. Allows all headers, credentials, and the HTTP methods: GET, POST, PUT, PATCH, DELETE, OPTIONS.

In local dev: allows `http://localhost:5173`.
In production: allows the `FRONTEND_URL` environment variable value.

---

#### `config/RateLimitFilter.java`
**Path:** `backend/src/main/java/com/interviewprep/config/RateLimitFilter.java`

A `OncePerRequestFilter` that protects AI-heavy endpoints from abuse. Maintains an in-memory `ConcurrentHashMap` of sliding-window counters keyed by user token (first 40 chars of Bearer token) or IP address.

**Rate-limited endpoints:**
- `POST /api/questions/generate`
- `POST /api/resumes/{id}/score`
- `POST /api/resumes/{id}/suggestions`
- `POST /api/chat`

Limit: 10 requests per 60-second window. Returns HTTP 429 on breach. Only POST requests to the specific paths are counted — GET requests pass through freely. This filter runs after `JwtAuthFilter` in the chain so the user token is available for key resolution.

---

#### `controller/AuthController.java`
**Path:** `backend/src/main/java/com/interviewprep/controller/AuthController.java`

Handles all authentication endpoints at `/api/auth`. Four operations:

1. **`POST /register`** — validates uniqueness of username and email, BCrypt-hashes the password, saves the new `User`, and immediately returns a JWT so the user is logged in after registration.
2. **`POST /login`** — delegates to Spring's `AuthenticationManager` which internally calls `DaoAuthenticationProvider` and BCrypt comparison. On success, returns a new JWT.
3. **`GET /me`** — returns the currently authenticated user's info (no token in response — used to rehydrate the frontend session).
4. **`POST /change-password`** — validates the current password, enforces a minimum length of 6 for the new password, saves the new BCrypt hash.

All endpoints except `/me` and `/change-password` are publicly accessible (no auth required).

---

#### `controller/ResumeController.java`
**Path:** `backend/src/main/java/com/interviewprep/controller/ResumeController.java`

REST controller for all resume operations at `/api/resumes`. Every method receives `@AuthenticationPrincipal User user` injected by Spring Security — this is the full `User` entity loaded from the DB by `JwtAuthFilter`. The user is passed down to `ResumeService` which uses it for ownership enforcement (`findByIdAndUser`).

Key endpoints:
- **`POST /upload`** — accepts `multipart/form-data` with a `file` parameter. Delegates parsing (PDF/DOCX/text) to `ResumeService.uploadFile()`.
- **`POST /build`** — accepts `{ mode, input }` for AI-assisted resume construction.
- **`POST /{id}/score`** and **`POST /{id}/suggestions`** — trigger AI analysis. Both are rate-limited.
- **`POST /{id}/jd-match`** — compares resume against a pasted job description.
- **`PATCH /{id}/template`** and **`PATCH /{id}/title`** — lightweight updates that don't reset the AI score.
- **`PUT /{id}`** — full content replacement; calls `ResumeService.update()` which clears the cached score.

---

#### `controller/QuestionController.java`
**Path:** `backend/src/main/java/com/interviewprep/controller/QuestionController.java`

REST controller at `/api/questions`. Wires two services: `QuestionService` (business logic) and `CompanyGithubService` (GitHub data fetching).

Key design decisions:
- `POST /generate` creates a new `PrepSession` and runs two parallel AI calls, returning both OA and Interview question sets in one response.
- `POST /mock-interview` creates a session for a specific round type (Behavioral, Technical, DSA, etc.).
- `POST /{id}/solution` and `POST /{id}/test-cases` are lazy — they return cached data if available, only calling the AI on the first request.
- `DELETE /sessions/{sessionId}` enforces ownership: confirms the session belongs to the authenticated user before deleting.
- `GET /github-companies` and `GET /github/{company}` are passthrough to `CompanyGithubService` with 12-hour in-memory caching.

---

#### `controller/ChatController.java`
**Path:** `backend/src/main/java/com/interviewprep/controller/ChatController.java`

Single endpoint: `POST /api/chat`. Accepts `{ resumeId, question }`. Validates that `question` is not blank. Delegates to `ResumeChatService.chat()` which performs the full RAG pipeline and returns an answer string. Rate-limited.

---

#### `controller/StudyProgressController.java`
**Path:** `backend/src/main/java/com/interviewprep/controller/StudyProgressController.java`

Manages the study progress `Set<String>` stored directly on the `User` entity (as an `@ElementCollection`). Three endpoints under `/api/study`:

- **`GET /progress`** — returns the user's current set of completed subtopic IDs.
- **`POST /progress/toggle`** — adds or removes a single subtopic ID from the set, then saves the user.
- **`POST /progress/reset`** — clears the entire set.

No separate service layer is needed — the logic is simple enough to live in the controller.

---

#### `controller/CodeRunnerController.java`
**Path:** `backend/src/main/java/com/interviewprep/controller/CodeRunnerController.java`

A thin proxy at `POST /api/code/run`. Forwards the request body directly to the Piston code execution API at `https://emkc.org/api/v2/piston/execute` and returns its response. The frontend sends language, version, code, and stdin — the backend just forwards it. On error from Piston, returns HTTP 502 with a JSON error. This proxy exists to avoid CORS issues calling Piston directly from the browser.

---

#### `controller/KnowledgeBaseController.java`
**Path:** `backend/src/main/java/com/interviewprep/controller/KnowledgeBaseController.java`

Admin/seeding endpoints at `/api/kb`:
- **`POST /company`** — adds a company interview pattern to the `COMPANY_KB` vector store.
- **`POST /tips`** — adds an interview tip to the `TIPS_KB` vector store.

These are not rate-limited or user-scoped. They are intended for seeding the RAG knowledge base with curated content that enriches question generation.

---

#### `controller/GlobalExceptionHandler.java`
**Path:** `backend/src/main/java/com/interviewprep/controller/GlobalExceptionHandler.java`

Annotated with `@RestControllerAdvice`. Catches unhandled `RuntimeException` and any other exception that escapes the service layer, returning a consistent JSON error response with an appropriate HTTP status code instead of Spring's default HTML error page.

---

#### `entity/User.java`
**Path:** `backend/src/main/java/com/interviewprep/entity/User.java`

JPA entity mapped to the `users` table. Implements Spring Security's `UserDetails` interface directly — this means the `User` object itself is used as the authentication principal throughout the app. It can be injected in any controller via `@AuthenticationPrincipal User user`.

Key fields:
- `id` — auto-generated primary key
- `username` — unique, max 50 chars
- `email` — unique, max 100 chars
- `password` — BCrypt hash
- `createdAt` — auto-set on insert
- `studyProgress` — `Set<String>` stored in `user_study_progress` join table, `FetchType.EAGER` (always loaded with the user)

All `UserDetails` account-status methods return `true` — no account locking or expiry logic is implemented.

---

#### `entity/Resume.java`
**Path:** `backend/src/main/java/com/interviewprep/entity/Resume.java`

JPA entity for the `resumes` table. Uses Lombok `@Data` for getters/setters.

Key fields:
- `content` — full extracted text of the resume (TEXT column)
- `originalFilename` — preserved from the uploaded file
- `title` — user-assigned display name
- `score` / `scoreFeedback` — nullable, populated after AI scoring
- `templateName` — which visual template is active
- `sessions` — `@OneToMany` to `PrepSession`, marked `@JsonIgnore` to prevent circular serialization

When content is updated via `ResumeService.update()`, `score` and `scoreFeedback` are explicitly cleared to `null` so the stale score doesn't persist.

---

#### `entity/PrepSession.java`
**Path:** `backend/src/main/java/com/interviewprep/entity/PrepSession.java`

Represents one question generation session (one run of the question generator). Each session is tied to a specific resume and company.

Key fields:
- `companyName` — the target company
- `targetRole` — optional role string (also used to encode round type for mock interviews, e.g. `"[DSA] Software Engineer"`)
- `resume` — `@ManyToOne` to `Resume`, `@JsonIgnore` in serialization
- `questions` — `@OneToMany` to `Question`, `@JsonIgnore`
- `getResumeId()` — annotated `@JsonProperty("resumeId")` to expose the FK as a flat field without loading the full resume

---

#### `entity/Question.java`
**Path:** `backend/src/main/java/com/interviewprep/entity/Question.java`

Individual question within a session. Uses Lombok `@Data`.

Key fields:
- `type` — `QuestionType` enum: `OA` (Online Assessment) or `INTERVIEW`
- `category` — e.g. "DSA", "Behavioral", "System Design", "HR"
- `questionText` — the full question text (TEXT)
- `difficulty` — Easy / Medium / Hard
- `hint` — optional hint text from initial generation
- `solution` — nullable TEXT, lazily generated on first request
- `testCases` — nullable JSON array string, lazily generated
- `notes` — user-editable free text, auto-saved from the frontend

---

#### `entity/VectorDocument.java`
**Path:** `backend/src/main/java/com/interviewprep/entity/VectorDocument.java`

JPA entity for the `vector_documents` table. Stores text chunks alongside their vector embeddings for semantic search.

Key fields:
- `docType` — string discriminator: QUESTION, COMPANY_KB, TIPS_KB, RESUME_CHUNK, EXTERNAL_KB
- `sourceId` — optional FK to the originating entity (resume ID, question ID, etc.)
- `content` — the text that was embedded
- `metadata` — `@JdbcTypeCode(SqlTypes.JSON)` JSONB field for arbitrary key-value pairs
- No actual `embedding` field on the JPA entity — the embedding column is managed via raw `JdbcTemplate` SQL since pgvector types aren't natively supported by Hibernate

---

#### `repository/UserRepository.java`
**Path:** `backend/src/main/java/com/interviewprep/repository/UserRepository.java`

Extends `JpaRepository<User, Long>`. Custom methods:
- `findByUsername(String)` — used by `JwtAuthFilter` and `UserDetailsService`
- `existsByUsername(String)` — uniqueness check during registration
- `existsByEmail(String)` — uniqueness check during registration

---

#### `repository/ResumeRepository.java`
**Path:** `backend/src/main/java/com/interviewprep/repository/ResumeRepository.java`

Extends `JpaRepository<Resume, Long>`. Custom methods:
- `findByUser(User)` — list all resumes belonging to a user
- `findByIdAndUser(Long, User)` — fetch a single resume with ownership enforcement (returns `Optional.empty()` if the resume belongs to a different user)

---

#### `repository/PrepSessionRepository.java`
**Path:** `backend/src/main/java/com/interviewprep/repository/PrepSessionRepository.java`

Extends `JpaRepository<PrepSession, Long>`. Custom methods:
- `findByResumeUserOrderByCreatedAtDesc(User)` — all sessions for a user, newest first (traverses `session → resume → user`)
- `findByIdWithUser(Long)` — fetch session with user loaded (used to verify ownership before deleting)

---

#### `repository/QuestionRepository.java`
**Path:** `backend/src/main/java/com/interviewprep/repository/QuestionRepository.java`

Extends `JpaRepository<Question, Long>`. Custom methods:
- `findBySessionId(Long)` — all questions in a session
- `findBySessionIdAndType(Long, QuestionType)` — questions filtered by type within a session
- `countBySessionIdAndType(Long, QuestionType)` — efficient count query used by `QuestionService.getAllSessions()` to populate `oaCount` and `interviewCount` in `SessionSummaryDto`

---

#### `dto/SessionSummaryDto.java`
**Path:** `backend/src/main/java/com/interviewprep/dto/SessionSummaryDto.java`

Record: `(Long id, String companyName, String targetRole, Long resumeId, LocalDateTime createdAt, long oaCount, long interviewCount)`.

Returned by `GET /api/questions/sessions` instead of the raw `PrepSession` entity. The `oaCount` and `interviewCount` fields are computed by `QuestionService.getAllSessions()` by calling `countBySessionIdAndType()` for each session. This allows the History page to display question type badges without a separate API call per session.

Static factory: `SessionSummaryDto.from(PrepSession s, long oaCount, long interviewCount)`.

---

#### `security/JwtUtil.java`
**Path:** `backend/src/main/java/com/interviewprep/security/JwtUtil.java`

Stateless utility component for JWT operations using JJWT 0.12.3.

- **`generateToken(username)`** — builds and signs a JWT with HMAC-SHA256. Claims: `sub=username`, `iat=now`, `exp=now+expirationMs`. The key is derived from the Base64-decoded `jwt.secret` property.
- **`extractUsername(token)`** — parses the token and returns the subject claim.
- **`validateToken(token)`** — tries to parse the token; returns `false` on any `JwtException` (expired, invalid signature, malformed).

---

#### `security/JwtAuthFilter.java`
**Path:** `backend/src/main/java/com/interviewprep/security/JwtAuthFilter.java`

`OncePerRequestFilter` that runs on every HTTP request. Reads `Authorization: Bearer <token>`, validates it via `JwtUtil`, loads the `User` entity from DB, and sets a `UsernamePasswordAuthenticationToken` into `SecurityContextHolder`. This makes `@AuthenticationPrincipal User user` work in all controllers. If no valid token is present, the filter passes the request through with no authentication set — Spring Security then denies it based on the security config.

---

#### `security/SecurityConfig.java`
**Path:** `backend/src/main/java/com/interviewprep/security/SecurityConfig.java`

Defines the Spring Security filter chain:
- **CSRF:** disabled (JWT is stateless — no need for CSRF protection)
- **Sessions:** `STATELESS` (no server-side HttpSession)
- **Public paths:** `/api/auth/**` and `/actuator/health`
- **All other paths:** require authenticated user
- **Filter order:** `JwtAuthFilter` runs before `UsernamePasswordAuthenticationFilter`; `RateLimitFilter` runs after `JwtAuthFilter`
- **Password encoder:** BCrypt (registered as a Spring bean)
- **AuthenticationManager:** provided by Spring's `AuthenticationConfiguration`

---

#### `service/GroqService.java`
**Path:** `backend/src/main/java/com/interviewprep/service/GroqService.java`

The central AI abstraction layer. Despite the name, it supports two providers controlled by `ai.provider`:

**Claude mode** — calls Anthropic's Messages API (`POST /v1/messages`) with headers `x-api-key` and `anthropic-version`. Parses `content[0].text` from the response.

**Groq mode** — calls the Groq Chat Completions API (`POST /v1/chat/completions`, OpenAI-compatible). Parses `choices[0].message.content`.

Single public method: `chat(systemPrompt, userMessage) → String`. All AI calls in the application flow through this one method. `max_tokens` is hardcoded to 4096 for all calls.

---

#### `service/ResumeService.java`
**Path:** `backend/src/main/java/com/interviewprep/service/ResumeService.java`

Business logic for all resume operations.

**File parsing:**
- PDF → Apache PDFBox `PDFTextStripper.getText()`
- DOCX/DOC → Apache POI `XWPFDocument`, iterates all paragraphs
- Other → raw bytes as UTF-8 string

**After every save** (upload, text, build, update) → calls `resumeChatService.indexResume()` to re-embed the resume into pgvector.

**`score()`** — prompts the AI to return structured JSON `{ score, feedback, strengths[], improvements[] }`. Uses `extractJson()` to strip any markdown wrapping. Persists the score and feedback back onto the `Resume` entity.

**`suggestions()`** — prompts the AI for section-by-section suggestions in JSON format. Returns a `ResumeSuggestionResponse` with a map of section names to suggestion lists.

**`matchJobDescription()`** — prompts the AI to compare the resume to a job description, scoring 0-100 and listing matched/missing skills and keywords.

**`buildResume()`** — supports 5 build modes: `text`, `json`, `keyvalue`, `regex`, `url`. The `url` mode fetches the target URL via HTTP, strips HTML tags (simple regex), truncates to 6000 chars, and passes the raw content to the AI.

**`extractJson()`** — strips any surrounding markdown by finding the first `{` and last `}` in the raw response. Prevents JSON parse failures when the LLM wraps its output in code fences.

---

#### `service/QuestionService.java`
**Path:** `backend/src/main/java/com/interviewprep/service/QuestionService.java`

The most complex service. Handles question generation, mock interview generation, lazy solution/test-case generation, feedback, and session management.

**`generateQuestions()`** — full flow:
1. Creates and saves a `PrepSession`
2. Fetches company-pattern RAG context from `CompanyKnowledgeService`
3. Fetches past questions context from vector store (for deduplication)
4. Launches two `CompletableFuture` calls in parallel — OA (8 questions) and Interview (10 questions) — halving generation time
5. Joins both futures
6. Saves all questions to DB
7. Indexes questions into vector store for future deduplication
8. Returns `GenerateQuestionsResponse`

**`generateMockInterview()`** — similar flow but single AI call for a focused round type. Encodes round type in `targetRole` (e.g. `"[DSA] Software Engineer"`).

**`buildMockSystemPrompt()`** — switch on `roundType` producing specialized system prompts for each of 6 round types + default mixed.

**`getSolution()`** — lazy: returns cached `solution` if non-null, otherwise calls AI with a markdown-formatted prompt, persists, and returns.

**`getTestCases()`** — lazy: returns cached `testCases` JSON if non-null, otherwise calls AI for exactly 5 test cases as a JSON array with `input`, `expectedOutput`, `description` per case.

**`getFeedback()`** — real-time: calls AI with the question + user's answer, returns markdown-formatted feedback with Score, Strengths, Improvements, and Model Answer.

**`getAllSessions(user)`** — fetches all sessions for the user ordered by `createdAt DESC`. For each session, runs two `countBySessionIdAndType` queries to populate `oaCount` and `interviewCount`, then maps to `SessionSummaryDto`.

**`deleteSession()`** — verifies the session belongs to the requesting user by traversing `session → resume → user` before deleting.

---

#### `service/ResumeChatService.java`
**Path:** `backend/src/main/java/com/interviewprep/service/ResumeChatService.java`

Implements the RAG pipeline for resume Q&A.

**`indexResume(resume)`:**
1. Deletes all existing `RESUME_CHUNK` vector documents for this resume ID
2. Splits content on `\n{2,}` (two or more newlines) to get paragraph-level chunks
3. Skips chunks shorter than 20 chars (headers, whitespace, etc.)
4. Embeds and stores each chunk with metadata `{ resumeId }`

**`chat(resumeId, question, user)`:**
1. Embeds the question and fetches top-5 similar `RESUME_CHUNK` documents
2. Filters to only chunks with matching `resumeId`
3. Also fetches top-2 `EXTERNAL_KB` documents for general industry context
4. Builds a system prompt defining the AI as a career coach
5. Passes resume excerpts + external context + question to `GroqService.chat()`
6. Returns the AI answer string

If no relevant chunks are found (resume not indexed, or resumeId not matching), returns a descriptive error message.

---

#### `service/EmbeddingService.java`
**Path:** `backend/src/main/java/com/interviewprep/service/EmbeddingService.java`

Generates 1536-dimensional float vectors using the OpenAI `text-embedding-3-small` model.

- Truncates input to 8000 chars to stay within token limits
- Calls `{openai.api.base-url}/v1/embeddings` with Bearer auth
- Parses `data[0].embedding` from the JSON response
- **Fallback:** if the API call fails (network error, proxy down), computes a deterministic bigram n-gram hash embedding — L2-normalized, same 1536 dimensions. This degrades search quality but keeps the app functional without an embedding proxy.

---

#### `service/VectorStoreService.java`
**Path:** `backend/src/main/java/com/interviewprep/service/VectorStoreService.java`

Manages all pgvector operations using `JdbcTemplate` (not JPA — pgvector's `vector` type needs native SQL casts).

**`store(docType, sourceId, content, metadata)`** — embeds the content, converts the float[] to a `[f1,f2,...]` string literal, inserts into `vector_documents` using `?::vector` PostgreSQL cast.

**`similaritySearch(query, docType, topK)`** — embeds the query, runs cosine distance search filtered by `doc_type`, returns top-K results ordered by `embedding <=> ?::vector` (ascending distance). Score is `1 - cosine_distance`.

**`similaritySearchAny(query, topK)`** — same but searches across all doc types.

**`deleteBySourceId(docType, sourceId)`** — deletes all documents matching both doc type and source ID. Used before re-indexing a resume.

**`hasDocType(docType)`** — check if any documents of a given type exist. Used by seeders.

**`SearchResult` record** — `(id, docType, sourceId, content, metadata, score)`.

---

#### `service/CompanyGithubService.java`
**Path:** `backend/src/main/java/com/interviewprep/service/CompanyGithubService.java`

Fetches real LeetCode company-wise question lists from the GitHub repo `hxu296/leetcode-company-wise-problems-2022`.

**CSV format:** `problem_link,problem_name,num_occur`

**Caching:** `ConcurrentHashMap<company, CacheEntry>` with 12-hour TTL. On cache hit, returns immediately. On miss, fetches and parses the CSV via `raw.githubusercontent.com` (no rate limits), sorts by `num_occur` descending, re-assigns ranks, and caches.

**`getCompanyList()`** — returns a hardcoded list of 187 company names matching the CSV filenames. This list is hardcoded (not fetched via the GitHub API) specifically to avoid GitHub API rate limits (60 req/hour unauthenticated) on the shared Render IP. The raw CSV fetches use `raw.githubusercontent.com` which bypasses the API rate limit entirely.

**`GithubQuestion` record** — `(title, url, occurrences, rank)`.

---

#### `service/CompanyKnowledgeService.java`
**Path:** `backend/src/main/java/com/interviewprep/service/CompanyKnowledgeService.java`

Wraps `VectorStoreService` for the `COMPANY_KB` document type. Two methods:
- **`addEntry(company, pattern)`** — stores a company interview pattern in the vector store
- **`getRelevantContext(company, role, n)`** — fetches top-n similar `COMPANY_KB` chunks for a given company + role query, concatenates them as a context string for question generation prompts

---

#### `service/TipsKnowledgeService.java`
**Path:** `backend/src/main/java/com/interviewprep/service/TipsKnowledgeService.java`

Same pattern as `CompanyKnowledgeService` but for `TIPS_KB` documents:
- **`addTip(category, tip)`** — stores a tip in the vector store
- **`getTipsForContext(context, n)`** — fetches top-n relevant tips for a query string, returns as concatenated text

---

#### `service/ExternalDataFetcher.java`
**Path:** `backend/src/main/java/com/interviewprep/service/ExternalDataFetcher.java`

HTTP utility service. Used by `CompanyGithubService` to fetch raw GitHub CSV content. Wraps `RestTemplate` with error handling and returns blank string on failure.

---

#### `service/ExternalKnowledgeSeeder.java`
**Path:** `backend/src/main/java/com/interviewprep/service/ExternalKnowledgeSeeder.java`

Runs on application startup. Checks if `EXTERNAL_KB` documents already exist via `VectorStoreService.hasDocType()`. If not, seeds the vector store with curated external knowledge (interview tips, industry patterns, best practices) so the RAG pipeline has useful context from the very first use.

---

#### `dto/AuthResponse.java`
Record: `(String token, Long id, String username, String email)`. Used in all auth endpoint responses. `token` is null in the `/me` response.

#### `dto/LoginRequest.java`
Record: `(String username, String password)`. `@Valid` enforced.

#### `dto/RegisterRequest.java`
Record: `(String username, String email, String password)`. `@Valid` enforced.

#### `dto/GenerateQuestionsRequest.java`
Record: `(Long resumeId, String companyName, String targetRole)`. `targetRole` is optional.

#### `dto/GenerateQuestionsResponse.java`
Record: `(Long sessionId, List<QuestionDto> oaQuestions, List<QuestionDto> interviewQuestions)`.

#### `dto/MockInterviewRequest.java`
Record: `(Long resumeId, String companyName, String targetRole, String roundType)`.

#### `dto/QuestionDto.java`
Mirrors the `Question` entity fields but includes `sessionId` and exposes a static factory `QuestionDto.from(Question q)`. Used to avoid direct entity serialization.

#### `dto/ResumeScoreResponse.java`
Record: `(int score, String feedback, List<String> strengths, List<String> improvements)`.

#### `dto/ResumeSuggestionResponse.java`
Record: `(Map<String, List<String>> sectionSuggestions, String overallTip)`. The map keys are section names (contact, summary, experience, skills, education, projects).

#### `dto/BuildResumeRequest.java`
Record: `(String mode, String input)`. Mode is one of: `text`, `json`, `keyvalue`, `regex`, `url`.

---

#### `resources/application.properties`
Local development configuration. Key settings:
- PostgreSQL on `localhost:5432/interview_prep`
- `spring.jpa.hibernate.ddl-auto=update` — Hibernate auto-creates/alters tables on startup
- `spring.sql.init.mode=always` — runs `vector_schema.sql` on every startup (idempotent `CREATE IF NOT EXISTS`)
- `cors.allowed-origins=http://localhost:5173` — Vite dev server
- `ai.provider` defaults to `claude` but can be overridden via `AI_PROVIDER` env var
- `openai.api.base-url=http://localhost:6655/openai` — assumes a local LLM proxy for embeddings

#### `resources/application-prod.properties`
Production overrides activated by `SPRING_PROFILES_ACTIVE=prod`:
- Database URL, username, password from env vars (`JDBC_DATABASE_*`)
- HikariCP pool: max 10 connections
- `ai.provider` defaults to `groq` in prod
- All log levels set to `WARN` to reduce noise
- Actuator health endpoint enabled for Railway/Render health checks

#### `resources/vector_schema.sql`
Creates the `vector_documents` table and three indexes:
- `idx_vector_docs_type` on `doc_type` — for filtered similarity searches
- `idx_vector_docs_source` on `source_id` — for `deleteBySourceId` and source-filtered queries
- `idx_vector_docs_embed` — IVFFlat cosine index with `lists=50` — enables approximate nearest-neighbor search at scale

All statements use `CREATE IF NOT EXISTS` — safe to run repeatedly on startup.

#### `backend/Dockerfile`
Two-stage build:
- **Stage 1** (`maven:3.9-eclipse-temurin-21`): copies `pom.xml`, runs `mvn dependency:go-offline` (caches deps layer), then copies `src/` and runs `mvn package -DskipTests`
- **Stage 2** (`eclipse-temurin:21-jre`): copies the fat JAR from Stage 1 and runs it. The JRE image is much smaller than the JDK build image.

Exposes port 8080.

---

### FRONTEND FILES

---

#### `frontend/src/main.tsx`
Application entry point. Creates the React DOM root on `document.getElementById('root')` and renders `<BrowserRouter><App /></BrowserRouter>`. Uses `React.StrictMode` for development warnings.

---

#### `frontend/src/App.tsx`
Defines the entire client-side route tree. Wraps all routes in `<AuthProvider>` for global auth state. Two public routes (`/login`, `/register`) are defined at the top level. All other routes are nested under a catch-all `/*` that wraps them in `<ProtectedRoute>` and `<Layout>`.

The nested `<Routes>` inside the protected area handles the 13 authenticated pages. Using nested routing this way means the `Layout` sidebar is rendered once and persists across page navigations without remounting.

---

#### `frontend/src/index.css`
Imports Tailwind CSS base, components, and utilities layers. Defines custom CSS classes (`.card`, `.btn-primary`, `.btn-secondary`, `.input`) used throughout the app as Tailwind `@layer components` utilities for consistent styling.

---

#### `frontend/src/context/AuthContext.tsx`
React Context providing global authentication state to the entire app.

**State:**
- `user: User | null` — the logged-in user object
- `token: string | null` — the JWT string
- `isLoading: boolean` — true while hydrating from localStorage on initial load

**Hydration:** on mount, reads `auth_token` and `auth_user` from localStorage and restores the session. This prevents a flash of unauthenticated state on page refresh.

**`login(token, user)`** — persists to localStorage and updates state.

**`logout()`** — clears localStorage, resets state, and redirects to `/login` via `window.location.href`.

**`useAuth()`** — custom hook that reads the context. Throws if called outside `AuthProvider`.

---

#### `frontend/src/services/api.ts`
Single Axios instance with base URL from `VITE_API_URL` env var (defaults to `/api` for Vite proxy in dev).

**Request interceptor:** attaches `Authorization: Bearer {token}` from localStorage to every outgoing request.

**Response interceptor:** on HTTP 401, clears localStorage and redirects to `/login`. This handles token expiry globally without requiring try/catch in every component.

**Exported API modules:** `authApi`, `resumeApi`, `questionsApi`, `chatApi`, `studyApi` — each grouping related endpoint calls as typed async functions that return Axios response promises.

---

#### `frontend/src/types/index.ts`
All TypeScript interfaces matching the backend DTOs and entities. Shared across the entire frontend. Key types: `User`, `AuthResponse`, `Resume`, `PrepSession`, `Question`, `ResumeScoreResponse`, `ResumeSuggestionResponse`, `GenerateQuestionsRequest`, `GenerateQuestionsResponse`, `JdMatchResponse`, `GithubQuestion`.

---

#### `frontend/src/data/studyGuide.ts`
Static data file — the full DSA/CS study guide topic tree. Contains an array of `Topic` objects, each with:
- `id`, `name`, `icon`, `color`
- `subtopics: Subtopic[]` — each with `id`, `name`, `difficulty`, `gfgUrl`, `tags[]`

This file is the single source of truth for the study guide content. Progress is tracked server-side by matching `subtopic.id` strings against the `user_study_progress` table.

---

#### `frontend/src/pages/LoginPage.tsx`
Login form with username and password fields. On submit, calls `authApi.login()`, stores the token and user via `AuthContext.login()`, and navigates to `/`. Shows inline error on invalid credentials. Includes a link to the register page.

---

#### `frontend/src/pages/RegisterPage.tsx`
Registration form with username, email, and password fields. On submit, calls `authApi.register()`, auto-logs in (register returns a JWT), and navigates to `/`. Shows inline error on duplicate username/email.

---

#### `frontend/src/pages/HomePage.tsx`
The main dashboard and question generation entry point.

**State:**
- `selectedResumeId` — which resume to use for generation
- `company` / `role` — target company and optional role input fields
- `loading` — shows spinner during generation (15-30s)
- `recentSessions` — last 3 sessions, fetched on mount and after generation

**Flow:** user selects resume → types company → clicks Generate → `questionsApi.generate()` is called → on success, navigates to `/questions/{sessionId}` with the response data in navigation state (so the questions page doesn't need to re-fetch).

Shows last 3 sessions with direct navigation links. "View all" links to History page.

---

#### `frontend/src/pages/ResumePage.tsx`
The most complex frontend page. Full resume management hub.

**State:**
- `resumes[]` — all user resumes loaded on mount
- `activeId` — which resume is currently selected
- `tab` — one of 5 tabs: `edit | preview | templates | suggestions | score`
- `editingTitle` / `titleDraft` — inline title editing state
- `showUpload` / `showBuild` — toggles for upload panel and AI build modal

**Tabs:** all 5 tab panels are mounted simultaneously but toggled with `className={tab === 'x' ? '' : 'hidden'}`. This preserves internal state (e.g. unsaved edits) when switching tabs without remounting.

**Resume sidebar:** lists all resumes by name (title → originalFilename → `Resume #{id}`). Shows score badge if scored. Active resume has highlighted styling.

**`updateInList(updated)`** — updates the specific resume in the array without refetching all. Called after any AI operation or edit.

**`handleBuilt(r)`** — after AI build, adds to list, selects, and switches to `preview` tab.

---

#### `frontend/src/pages/QuestionsPage.tsx`
Displays the questions for a specific session. Three-tier data loading strategy:

1. **Navigation state** — if the user just generated questions, `location.state` contains the full response. Used immediately and also cached in `sessionStorage`.
2. **sessionStorage cache** — survives tab switching within the same browser tab. Key: `questions_session_{id}`.
3. **API fetch** — fallback when navigating directly to the URL (e.g. from History). Fetches questions and separates them by `type === 'OA'` vs `type === 'INTERVIEW'`.

Two tabs: "Online Assessment" and "Interview", each showing a list of `QuestionCard` components.

---

#### `frontend/src/pages/HistoryPage.tsx`
Lists all prep sessions in reverse chronological order. Features:
- **Search bar** — filters sessions live by company name or target role
- Each session card shows company name, target role, date/time, and DSA/Interview question count badges (`oaCount` and `interviewCount` from `SessionSummaryDto`)
- Clicking the row navigates to `/questions/{id}`
- "Mock Interview" button navigates to `/mock/{id}`
- Delete button (hover-revealed) calls `questionsApi.deleteSession()` and removes from local state

Shows `SessionSkeleton` loading placeholder while fetching. Empty state prompts to generate first questions.

---

#### `frontend/src/pages/ChatPage.tsx`
Full-screen RAG chat interface.

**State:**
- `resumes[]` — all resumes for the selector dropdown
- `selectedId` — which resume to chat about
- `messages[]` — current conversation
- `historyRef` — `useRef<Record<number, Message[]>>` — persists conversation history per resume without triggering re-renders. When the user switches resumes, `messages` is restored from this ref.
- `bottomRef` — used for auto-scroll to latest message

**Suggested questions:** 6 pre-written questions shown on the empty state. Clicking one calls `send(text)` directly.

**Message rendering:** user messages are plain text; assistant messages are rendered with `ReactMarkdown` to support bold, lists, and code blocks from LLM responses.

**`send(text?)`** — accepts optional text parameter (for suggested questions) or reads from the input. Adds the user message optimistically, calls `chatApi.send()`, then adds the assistant response.

---

#### `frontend/src/pages/MockInterviewSetupPage.tsx`
Configuration page for starting a mock interview session.

**State:** `resumeId`, `company`, `role`, `selectedRound`, `loading`, `error`

**Round selector:** 6 round type cards in a 2-column grid, each with a color scheme, icon, description, and question count badge. Clicking selects the round.

**`handleStart()`** — calls `questionsApi.generateMockInterview()` and navigates to `/mock/{sessionId}` on success.

`canStart` is `true` only when all three required fields are filled (resume, company, round type).

---

#### `frontend/src/pages/MockInterviewPage.tsx`
The active mock interview experience. Shows **all** questions from a session (both `OA` and `INTERVIEW` types), presenting them one at a time.

**DSA question layout (Leetcode-style):** Questions with `type === 'OA'` or `category === 'DSA'` (legacy sessions) show a "DSA / Coding" badge and render `<CodeRunner hideTestCases />` always-open below the question text. No textarea, no Submit button, no timer — the user codes directly.

**Interview question layout:** Shows the 2-minute countdown timer, textarea for the written answer, and a Submit button that calls `questionsApi.getFeedback()`. AI feedback renders as markdown below after submission.

**State:**
- `questions[]` — all questions for the session
- `current` — index of the active question
- `answer` / `feedback` — current answer text and AI feedback (interview questions only)
- `answers: Record<index, {answer, feedback}>` — all submitted answers (allows reviewing previous questions)
- `timerActive` / `timeLeft` — countdown timer (120s, interview questions only)
- `done` — shows the completion screen

**Navigation:** Previous/Next buttons move between questions, restoring saved answers and feedback. On the last question, "Next" becomes "Finish" which sets `done=true`.

**Completion screen:** shows a trophy icon, answered count, and options to review answers or go back to History.

**Progress dots:** a row of colored dots (green = answered, primary = current, gray = not yet visited) in the header.

**Timer colors:** green > 60s, yellow 30–60s, red < 30s.

---

#### `frontend/src/pages/StudyGuidePage.tsx`
Interactive study guide with per-topic progress tracking.

**State:**
- `done: Set<string>` — set of completed subtopic IDs, loaded from server on mount
- `toggling: string | null` — ID of the subtopic currently being toggled (prevents double-clicks)
- `search`, `diffFilter`, `statusFilter` — filter controls

**`toggle(id)`** — optimistic update: immediately toggles the local Set, then calls `studyApi.toggle()`. On failure, rolls back the optimistic change.

**`filteredTopics`** — `useMemo` that filters the static `STUDY_GUIDE` data based on search text, difficulty filter, and done/todo status filter. Returns only topics that have at least one matching subtopic.

**`SubtopicRow`** — renders a single subtopic with a toggle button, name (strikethrough when done), difficulty badge, tags, and a GFG external link.

**`TopicCard`** — renders a collapsible topic section with a progress bar, percentage badge, and the list of `SubtopicRow` components. Shows a "Complete" trophy badge when all subtopics are done.

**Overall progress** — card at the top showing global percentage + per-topic mini progress bars.

---

#### `frontend/src/pages/CompanyQuestionsPage.tsx`
Two-panel layout for browsing company LeetCode questions.

**Left panel (company selector):**
- Search input to filter companies
- Toggle between "Top" (15 popular companies) and "All" (187 companies)
- Scrollable list of company buttons

**Right panel (questions table):**
- Shows questions sorted by frequency (most asked first)
- Frequency labels: Very High (≥20), High (≥10), Medium (≥5), Low (<5) with color coding
- **Practice button** — each row has a "Practice" toggle that opens an inline `<CodeRunner hideTestCases />` below the row. Only one row can be open at a time (opening a new row closes the previous one).
- "LC" link opens the LeetCode problem in a new tab
- Filter input to search within loaded questions

**`handleSelectCompany(company)`** — dedupes clicks on the already-selected company, clears previous questions and any open practice runner, calls `questionsApi.getGithubQuestions()`.

---

#### `frontend/src/pages/JdMatchPage.tsx`
Job description matching page. User selects a resume and pastes a job description. Calls `resumeApi.matchJd()` and displays:
- Match score (0-100) with color-coded badge
- Summary paragraph
- Matched skills, missing skills, matched keywords (as tag lists)
- Actionable suggestions

---

#### `frontend/src/pages/FlashcardsPage.tsx`
Flashcard-style review mode for questions from a selected session. Loads session questions and presents them one at a time in a flip-card UI. User can reveal the hint/solution and mark cards as known/unknown to skip them in future rounds.

---

#### `frontend/src/pages/ProgressPage.tsx`
Visual progress dashboard. Shows charts/graphs of study progress across topics, completed vs remaining subtopic counts, and possibly session history stats. Reads from `studyApi.getProgress()` and the static study guide data.

---

#### `frontend/src/pages/AccountPage.tsx`
Account settings page with two sections:

**Profile** — displays username and email (read-only).

**Change Password** — form with current password, new password, confirm password. Client-side validation: minimum 6 chars, passwords match. Calls `authApi.changePassword()`. Shows success/error inline messages. Auto-clears success message after 4 seconds.

**Session** — a "Sign out" button that calls `AuthContext.logout()`.

---

#### `frontend/src/components/layout/Layout.tsx`
The persistent navigation shell for all authenticated pages.

**Sidebar:** fixed-width (224px), sticky to the top. Contains:
- Logo/brand mark (`Brain` icon + "InterviewPrep")
- 10 `NavLink` items (active state highlighted via `isActive` class)
- Bottom section with account link (shows username) and sign-out button

Uses React Router's `NavLink` with `end={to === '/'}` for the home route to prevent it from matching all sub-routes.

`children` renders in the scrollable main content area (`flex-1`, `px-8 py-8`).

---

#### `frontend/src/components/ProtectedRoute.tsx`
Wrapper component that reads from `AuthContext`. Shows a loading spinner while `isLoading` is true (prevents redirect flash on page refresh). If `user` is null after loading, redirects to `/login`. Otherwise renders `children`.

---

#### `frontend/src/components/ErrorBoundary.tsx`
React class component with `componentDidCatch`. Catches rendering errors in the component tree below it. Renders a fallback "Something went wrong" UI with a "Try again" button. Wrapped around the root app to prevent blank screens on unexpected errors.

---

#### `frontend/src/components/Skeleton.tsx`
Loading placeholder components. Exports `QuestionSkeleton` and `SessionSkeleton` — animated gray pulsing blocks that match the shape of the real content. Used in `QuestionsPage` and `HistoryPage` while data is loading.

---

#### `frontend/src/components/questions/QuestionCard.tsx`
The most feature-rich component. Displays a single interview question with full interactive functionality.

**State:**
- `showHint` / `showSolution` / `showNotes` / `showCode` — expand/collapse toggles
- `solution` — initialized from `question.solution`, updated after lazy AI fetch
- `notes` — initialized from `question.notes`, auto-saved with 800ms debounce
- `loadingSolution` — spinner while fetching solution from AI
- `savingNotes` — "Saving..." indicator
- `done` — local visual done state (strikethrough + opacity)
- `copied` — copy-to-clipboard feedback

**`handleShowSolution()`** — if solution is already loaded (on the entity), shows it immediately. Otherwise calls `questionsApi.getSolution()`, updates local state and shows.

**`handleNotesChange(value)`** — updates notes state immediately (optimistic), then debounces the API call via a 800ms `setTimeout`. Previous timer is cleared on each keystroke. This prevents one API call per keystroke.

**Code runner** — shown for `OA` type questions or questions with `category === 'DSA'` (legacy sessions where DSA questions were stored with `type = INTERVIEW`). When all test cases pass, `onAllPassed` callback is triggered and a success banner is shown.

---

#### `frontend/src/components/CodeRunner.tsx`
Full in-browser coding environment. The most complex component.

**Supported languages:** Python, JavaScript, Java, C++, TypeScript, Go — each with a language-specific starter template.

**Props:**
- `questionId` — used as localStorage key for code persistence
- `questionText` — passed for context (unused in UI currently)
- `onAllPassed?` — callback fired when all test cases pass
- `hideTestCases?` — when `true`, hides the "Test Cases" tab and "Run Tests" button (used on Company Questions page and Mock Interview DSA questions where there are no server-side test cases)

**Code persistence:** code is saved to `localStorage` keyed by `code_runner_{questionId}_{langId}` on every keystroke. On mount, the saved code is restored. On language switch, the saved code for that language is restored (or the starter template if none saved). The reset button restores the starter template and saves it.

**State:**
- `lang` — selected language object
- `code` — Monaco editor content (persisted to localStorage)
- `testCases[]` — loaded from `questionsApi.getTestCases()` on mount (skipped when `hideTestCases=true`)
- `results: Record<caseId, CaseResult>` — per-test-case run results
- `tab` — `testcases | custom` (defaults to `custom` when `hideTestCases=true`)
- Custom input/output state

**`runAll()`** — iterates test cases sequentially, running each one via `POST /api/code/run`. Sets each case to `running` status immediately, then updates with `pass/fail/error` as results arrive. After all cases run, checks if all passed and calls `onAllPassed` callback.

**`runSingle(tc)`** — posts to `/api/code/run` (backend proxy to Piston API at `emkc.org`). Normalizes stdout (trims trailing newlines/whitespace) before comparing to expected output — this prevents false failures from trailing newline differences.

**`runCustom()`** — runs the code with user-provided stdin, shows raw stdout or error.

**Test case display:** each case shows status icon, description, execution time, and an expandable detail view with input, expected output, and (on failure) actual output. When all cases pass, a green "Submit" banner appears.

**Language switching** (`switchLang(l)`) — loads saved code for the new language (or starter template), clears results.

**Monaco options:** `vs-dark` theme, JetBrains Mono font, no minimap, word wrap on, 320px height.

---

#### `frontend/src/components/resume/ResumeUploader.tsx`
Drag-and-drop file upload using `react-dropzone`. Accepts PDF, DOCX, and plain text files. Shows a dashed drop zone with file type hints. On drop, calls `resumeApi.upload(file)` and passes the created resume to `onUploaded` callback. Also has a "Paste text" mode that shows a textarea for plain text input, which calls `resumeApi.uploadText()`.

---

#### `frontend/src/components/resume/ResumeEditor.tsx`
Textarea-based editor for viewing and editing raw resume content. Shows the full resume text. "Save" button calls `resumeApi.update()` and triggers `onSaved` callback with the updated resume. Shows a character count and last-updated timestamp.

---

#### `frontend/src/components/resume/ResumeScorer.tsx`
Triggers and displays AI resume scoring. Shows a "Get Score" button that calls `resumeApi.score()`. On success, displays:
- A large numeric score (0-100) with color coding (green/yellow/red)
- Feedback paragraph
- Strengths list (green checkmarks)
- Improvements list (orange suggestions)

If a cached score already exists on the resume, shows it immediately without re-calling the API.

---

#### `frontend/src/components/resume/AISuggestions.tsx`
Displays section-by-section improvement suggestions. "Get Suggestions" button calls `resumeApi.getSuggestions()`. Renders each section (contact, summary, experience, etc.) as a collapsible list of bullet-point suggestions. Has an "Apply to resume" button that passes suggestion text to `onApply` callback (which appends it to the resume content in `ResumePage`).

---

#### `frontend/src/components/resume/ResumeTemplates.tsx`
Template picker UI. Shows a grid of named template options (classic, modern, minimal, etc.). Clicking a template calls `resumeApi.updateTemplate()` and triggers `onUpdate` callback. The active template is highlighted.

---

#### `frontend/src/components/resume/TemplatePreview.tsx`
Renders the resume content styled according to the selected template. Parses the raw text content and applies different CSS layouts (e.g. single-column classic, two-column modern). Shows a "styled" preview of how the resume would look when printed or exported.

---

#### `frontend/src/components/resume/ResumeSelector.tsx`
Reusable dropdown/selector component used on `HomePage` and `MockInterviewSetupPage`. Fetches all resumes on mount and renders them as a select list. Calls `onSelect(id)` when the selection changes. Shows "No resumes — upload one first" empty state with a link to the resume page.

---

#### `frontend/src/components/resume/BuildResumeModal.tsx`
Modal dialog for AI-powered resume building. Five tabs, one per build mode:
- **Text** — textarea for natural-language description
- **JSON** — textarea for JSON object
- **Key-Value** — textarea for key=value pairs
- **Regex** — textarea for unstructured raw text
- **URL** — input for a web URL

Each tab has a "Build Resume" button that calls `resumeApi.build(mode, input)` and triggers `onCreated` callback. "Close" button or backdrop click calls `onClose`. Shows loading state during AI generation (can take 10-20 seconds).

---

#### `frontend/vite.config.ts`
Vite build configuration. Sets up the React plugin (`@vitejs/plugin-react`). In development, configures a server proxy:
```
/api → http://localhost:8080
```
This means all `api.ts` calls to `/api/*` are transparently forwarded to the Spring Boot backend during local development, avoiding CORS issues.

---

#### `frontend/vercel.json`
SPA rewrite rules for Vercel deployment:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
Without this, direct navigation to any route (e.g. `/resume`) would return a 404 from Vercel. The rewrite serves `index.html` for all paths, and React Router handles client-side routing.

---

#### `frontend/tailwind.config.js`
Tailwind CSS configuration. Defines:
- Content paths for tree-shaking: `./src/**/*.{ts,tsx}`
- Extended theme with a `primary` color scale (the app's main blue-indigo brand color)
- Any custom typography plugin settings for `prose` classes used in markdown rendering

---

#### `railway.toml`
Railway deployment configuration. Specifies:
- Build command: Docker build using `backend/Dockerfile`
- Start command: the JAR entrypoint
- Health check path: `/actuator/health`
- Port: 8080

---

#### `setup.sh` and `start.sh`
Convenience shell scripts:
- **`setup.sh`** — one-command setup: creates the PostgreSQL database, enables pgvector extension, installs frontend npm packages
- **`start.sh`** — starts both backend (`mvn spring-boot:run`) and frontend (`npm run dev`) concurrently

