# 📚 NexPrep Backend API

NexPrep is a full-featured mock test and exam preparation platform designed for students in medical, engineering, and other competitive domains. This backend powers all core features — from test creation and submission to analytics and leaderboards.

---

## 🚀 Tech Stack

- **Node.js** + **Express**
- **MongoDB** with **Mongoose**
- **JWT-based Authentication**
- **Role-based Authorization (admin/student)**
- Optional: CSV import, cooldown logic, analytics, MathJax support

---

## 📦 Project Structure

backend/ ├── config/ # MongoDB config │ └── db.js │ ├── controllers/ # Business logic handlers │ ├── authController.js │ ├── questionController.js │ ├── testSeriesController.js │ └── testAttemptController.js │ ├── middleware/ # Token & role verification │ ├── authMiddleware.js │ └── verifyToken.js │ ├── models/ # MongoDB schema models │ ├── Question.js │ ├── Branch.js / Subject.js / Topic.js / SubTopic.js │ ├── TestSeries.js │ ├── TestAttempt.js │ └── ExamType.js │ ├── routes/ # API route handlers │ ├── auth.js │ ├── questions.js │ ├── tests.js │ ├── testSeries.js │ ├── examTypes.js │ ├── hierarchy.js │ └── subject/topic/subtopic.js │ ├── .env.sample # Sample environment variables ├── server.js # Entry point └── package.json



---

## ⚙️ Setup Instructions

```bash
# Clone the repo
git clone https://github.com/vpbgkt/NexPrep.git
cd NexPrep/backend

# Install dependencies
npm install

# Setup environment variables
cp .env.sample .env

# Start the development server
npm run dev
📝 Make sure MongoDB URI and JWT_SECRET are set in .env.

🔐 Authentication
Uses JWT Tokens in Authorization: Bearer <token> header

Roles: admin, student

📌 Key API Routes

Route	Method	Description
/api/auth/register	POST	Register a new user
/api/auth/login	POST	Login with credentials
/api/questions/upload	POST	Upload questions via CSV
/api/testSeries/create	POST	Create a mock test with or without sections
/api/tests/start	POST	Start a test (student)
/api/tests/:id/submit	POST	Submit and evaluate test
/api/tests/review/:id	GET	View submitted answers
/api/tests/leaderboard/:seriesId	GET	Top scorers per test
/api/testAttempts/me	GET	View student's past attempts
/api/tests/stats/me	GET	See performance summary

## ➕ Add Question API: /api/questions/add

Use this API to add a new question into NexPrep backend with full structure:

```json
{
  "questionText": "What is the acceleration due to gravity on Earth?",
  "options": [
    { "text": "9.8 m/s²", "isCorrect": true },
    { "text": "10 m/s²", "isCorrect": false },
    { "text": "9.2 m/s²", "isCorrect": false },
    { "text": "8.9 m/s²", "isCorrect": false }
  ],
  "correctOptions": ["9.8 m/s²"],
  "branch": "Medical",
  "subject": "Physics",
  "topic": "Mechanics",
  "subtopic": "Gravitation",
  "examType": "NEET",
  "difficulty": "Easy",
  "marks": 4,
  "explanation": "Gravity at sea level is approximately 9.8 m/s².",
  "explanations": [
    { "type": "text", "label": "Basic", "content": "Gravity is a pull force towards Earth." },
    { "type": "video", "label": "Watch this", "content": "https://youtube.com/xyz" }
  ],
  "askedIn": [{ "examName": "NEET", "year": 2022 }],
  "status": "active",
  "version": 1
}
```

`branch`, `subject`, `topic`, `subtopic`, and `examType` can be names, not ObjectIds—system will resolve and auto-create them if needed.

`correctOptions` should match exactly with the text of one or more entries in `options`.

`explanations` is an array supporting text, video, pdf, or image.

Response: 201 Created or appropriate error code.

🧠 Features
Dynamic question tagging (branch, subject, topic, subtopic)

Support for multiple correct answers

Sectioned mock papers

Cooldown timer for retakes (3 hours)

CSV import with auto-tagging

ExamType filters (e.g., NEET, AIIMS, GATE)

Per-question scoring and analytics

✅ To-Do Next
Global leaderboard

Adaptive difficulty test generator

PDF/export support

Razorpay/Stripe for mock purchases

Scorecard sharing via Email/WhatsApp

👥 Author
Vishal Prajapat
🔗 GitHub: @vpbgkt

📄 License
MIT License — feel free to use and expand it!
