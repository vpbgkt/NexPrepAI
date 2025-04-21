
# NexPrep - Question Entry Documentation

## ✅ API Endpoint  
**POST /api/questions/add**  
🔒 Requires: `admin` role token

---

## 🧾 Sample JSON Body

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
  "branch": "680573210a74f2e09e6e9dc9",
  "subject": "680575049333272a7de5475d",
  "topic": "6805e1accd6cddfe4342d024",
  "subtopic": "6805e1adcd6cddfe4342d027",
  "examType": "68057e61c5a0370f7ba0a403",
  "difficulty": "Easy",
  "marks": 4,
  "explanation": "Gravity at sea level is approximately 9.8 m/s².",
  "explanations": [
    {
      "type": "text",
      "label": "Basic",
      "content": "Gravity is a pull force towards Earth."
    },
    {
      "type": "video",
      "label": "Watch this",
      "content": "https://youtube.com/xyz"
    }
  ],
  "askedIn": [
    { "examName": "NEET", "year": 2022 }
  ],
  "status": "active",
  "version": 1
}
```

---

## 🧠 Field Explanation

| Field           | Type       | Required | Description |
|------------------|------------|----------|-------------|
| `questionText`   | `String`   | ✅ Yes   | Main question |
| `options[]`      | `Array`    | ✅ Yes   | At least one with `text` and `isCorrect` |
| `correctOptions` | `Array`    | ✅ Yes   | Matching texts of correct options |
| `branch`         | `ObjectId` | ✅ Yes   | Valid Mongo ObjectId |
| `subject`        | `ObjectId` | ✅ Yes   | Must belong to given branch |
| `topic`          | `ObjectId` | ✅ Yes   | Must belong to subject |
| `subtopic`       | `ObjectId` | ✅ Yes   | Must belong to topic |
| `examType`       | `ObjectId` | ✅ Yes   | e.g., NEET, AIIMS, JEE |
| `difficulty`     | `String`   | ✅ Yes   | One of `Easy`, `Medium`, `Hard` |
| `marks`          | `Number`   | ✅ Yes   | Default: `4` |
| `explanation`    | `String`   | Optional | Short plain explanation |
| `explanations[]` | `Array`    | Optional | List of detailed content (text, video, pdf, image) |
| `askedIn[]`      | `Array`    | Optional | Previous exam references `{examName, year}` |
| `status`         | `String`   | Optional | Default: `"active"` |
| `version`        | `Number`   | Optional | Default: `1` |

---

## 🔐 Notes

- **IDs must be actual MongoDB ObjectIds**.
- `correctOptions` should contain **option text** (not index).
- `explanations` allow different types:
  - `"type": "text"` – written explanation
  - `"type": "video"` – YouTube or video link
  - `"type": "pdf"` – PDF URL
  - `"type": "image"` – image link or base64
