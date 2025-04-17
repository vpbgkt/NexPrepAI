```markdown
# 📚 NexPrep — Self‑Hosted Mock‑Exam Platform

A full‑stack solution for creating, managing and taking test‑series/mock‑exams  
— built with **Node + Express / MongoDB** on the backend and two **Angular** front‑ends:

* **Admin Panel** (`admin‑panel/`) – for question entry, CSV import, hierarchy & paper builder  
* **Student App** (`frontend/`)  – for login, test‑taking, timer, results _(work in progress)_

---

## ✨ Core Features

| Area | Details |
|------|---------|
| **Hierarchical bank** | Branch → Subject → Topic → Subtopic (dynamic CRUD) |
| **Question model** | Unlimited options, multi‑correct, difficulty, **marks per question**, image/Math support |
| **CSV bulk import** | Arbitrary `option1..optionN`, `correctOptions`, `marks`, auto‑creates hierarchy nodes |
| **JWT auth** | Roles: `admin`, `student` |
| **TestSeries (paper)** | Fixed set of question IDs, duration, total & negative marks, `examType` tag |
| **Random practice** | `$sample` aggregation can build ad‑hoc practice tests |
| **Cloning** | `POST /api/testSeries/clone/:id` duplicates a paper in one click |
| **Student attempts** | `TestAttempt` schema records answers, auto‑scores on submit |
| **Analytics (roadmap)** | Section‑wise stats, accuracy per question, leaderboards |

---

## 🗂️ Repo Layout

```
NexPrep/
├─ backend/                 # Express + Mongoose API
│   ├─ models/              # Branch.js, Subject.js, Topic.js, Subtopic.js, Question.js …
│   ├─ controllers/         # authController.js, testSeriesController.js …
│   ├─ routes/              # /auth, /questions, /testSeries, /tests, /submit …
│   ├─ middleware/          # verifyToken.js
│   ├─ config/db.js         # Mongo connection helper
│   └─ server.js            # App bootstrap
├─ admin-panel/             # Angular 17 standalone (Admin UI)
│   └─ src/app/             # components/, services/, models/
└─ frontend/                # Angular (Student UI – optional, WIP)
```

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
cp .env.sample .env            # set MONGO_URI & JWT_SECRET
npm install
npm run dev                    # nodemon on :5000
```

### 2. Admin Panel

```bash
cd admin-panel
npm install
ng serve                       # Angular dev server on :4200
```

Open **http://localhost:4200** → log in with an admin user (see `/api/auth/register`).

---

## 🔑 Environment Variables (`backend/.env`)

```env
MONGO_URI=mongodb://localhost/nexprep
JWT_SECRET=supersecret
PORT=5000
```

---

## ⚙️ Important API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| **POST** | `/api/auth/login` | Admin/Student login → `{ token }` |
| **POST** | `/api/questions/import-csv` | Upload CSV of questions |
| **POST** | `/api/testSeries/create` | Create fixed paper (body includes `questions` array) |
| **GET**  | `/api/testSeries` | List all papers (admin view) |
| **POST** | `/api/testSeries/clone/:id` | Duplicate a paper |
| **POST** | `/api/tests/start` | Student starts an attempt |
| **POST** | `/api/submit` | Student submits answers |
| **GET**  | `/api/results/:attemptId` | Detailed score sheet |

All protected routes require `Authorization: Bearer <jwt>`.

---

## 🛣 Roadmap

1. **Section builder** inside TestSeries (Paper I / II, Physics/Chemistry…)  
2. **Exam windows & attempt limits**  
3. **Student Angular app** with timer, review flags, PWA offline cache  
4. Image upload (S3/MinIO) & MathJax rendering  
5. Stripe/Razorpay payments for premium mocks  
6. Analytics dashboard: average, percentile, weak‑topic heatmap  
7. CI/CD with Docker Compose + GitHub Actions

---

## 🤝 Contributing

PRs welcome! Please lint with ESLint / Prettier and follow Angular & Node best practices.

---

## 📝 License

MIT — © 2025 NexPrep
```
