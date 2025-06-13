
# 📚 NexPrepAI - Question Entry Documentation

## ✅ Primary API Endpoints  

### **Individual Question Upload**
**POST /api/questions/add**  
🔒 Requires: `admin` role token

### **CSV Bulk Import**
**POST /api/questions/import-csv**  
🔒 Requires: `admin` role token  
📄 Format: Array of formatted question objects

---

## 🧾 Sample JSON Body (Individual Upload)

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
      "label": "Basic Concept",
      "content": "Gravity is a fundamental force that pulls objects toward Earth's center."
    },
    {
      "type": "video",
      "label": "Visual Explanation",
      "content": "https://youtube.com/physics-gravity-demo"
    },
    {
      "type": "pdf",
      "label": "Study Material",
      "content": "https://resources.nexprepai.com/physics/gravity.pdf"
    }
  ],
  "askedIn": [
    { "examName": "NEET", "year": 2022 },
    { "examName": "JEE Advanced", "year": 2023 }
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

## 📤 CSV Bulk Import Format

For bulk uploads, use the **CSV Import** endpoint with properly formatted data:

```json
[
  {
    "questionText": "What is the speed of light?",
    "options": "3×10⁸ m/s|3×10⁶ m/s|3×10⁷ m/s|3×10⁹ m/s",
    "correctOptions": "3×10⁸ m/s",
    "explanation": "Speed of light in vacuum is a fundamental constant.",
    "difficulty": "Medium",
    "marks": 4,
    "branch": "Engineering",
    "subject": "Physics",
    "topic": "Optics",
    "subtopic": "Wave Properties",
    "examType": "JEE",
    "explanations": "[{\"type\":\"text\",\"label\":\"Formula\",\"content\":\"c = 2.998 × 10⁸ m/s\"}]",
    "askedIn": "[{\"examName\":\"JEE Advanced\",\"year\":2023}]",
    "status": "active",
    "version": 1
  }
]
```

## 🛠️ Question Management APIs

### **Get All Questions**
```http
GET /api/questions/all
Authorization: Bearer {jwt_token}
```

### **Filter Questions**
```http
GET /api/questions/filter?branch={branchId}&subject={subjectId}&difficulty=Easy
Authorization: Bearer {jwt_token}
```

### **Update Question**
```http
PUT /api/questions/{questionId}
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### **Delete Question**
```http
DELETE /api/questions/{questionId}
Authorization: Bearer {jwt_token}
```

---

## 🔐 Authentication & Authorization

- **Required Role**: `admin` or `superadmin`
- **Header**: `Authorization: Bearer {jwt_token}`
- **Token Source**: Login via `/api/auth/login`

### **Admin Login Example**
```json
POST /api/auth/login
{
  "email": "admin@nexprepai.com",
  "password": "admin_password"
}
```

---

## 🧠 Field Details & Validation

| Field           | Type       | Required | Validation | Description |
|------------------|------------|----------|------------|-------------|
| `questionText`   | `String`   | ✅ Yes   | Non-empty  | Main question content |
| `options[]`      | `Array`    | ✅ Yes   | Min 1 option | Answer choices with `text` and `isCorrect` |
| `correctOptions` | `Array`    | ✅ Yes   | Must match option text | Correct answer references |
| `branch`         | `ObjectId/String` | ✅ Yes | Valid ID or name | Educational branch |
| `subject`        | `ObjectId/String` | ✅ Yes | Valid ID or name | Subject under branch |
| `topic`          | `ObjectId/String` | ✅ Yes | Valid ID or name | Topic under subject |
| `subtopic`       | `ObjectId/String` | ✅ Yes | Valid ID or name | Subtopic under topic |
| `examType`       | `ObjectId/String` | ✅ Yes | Valid ID or code | Exam category |
| `difficulty`     | `String`   | ✅ Yes   | `Easy\|Medium\|Hard` | Question difficulty level |
| `marks`          | `Number`   | ✅ Yes   | Positive integer | Points for correct answer |
| `explanation`    | `String`   | Optional | Max 500 chars | Brief explanation |
| `explanations[]` | `Array`    | Optional | Valid JSON | Detailed explanations |
| `askedIn[]`      | `Array`    | Optional | Valid JSON | Historical exam references |
| `status`         | `String`   | Optional | `active\|inactive` | Question availability |
| `version`        | `Number`   | Optional | Positive integer | Question version number |

---

## 📝 Notes & Best Practices

- **Auto-Resolution**: Entity names (branch, subject, etc.) are automatically resolved to ObjectIds or created if not found
- **Option Matching**: `correctOptions` must exactly match option text (case-sensitive)
- **Explanation Types**: Support for `text`, `video`, `pdf`, and `image` content
- **Bulk Operations**: CSV import supports up to 1000 questions per request
- **Validation**: All fields are validated server-side with detailed error reporting
- **Audit Trail**: All question operations are logged with creator/updater information

---

**Last Updated**: May 29, 2025  
**API Version**: v1.0  
**Documentation**: [Complete API Reference](./API_DOCUMENTATION.md)
