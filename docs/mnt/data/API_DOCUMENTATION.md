# 🚀 NexPrep - Complete API Documentation

## 📋 API Overview

NexPrep provides a comprehensive RESTful API built with Node.js and Express, offering endpoints for authentication, test management, question operations, and analytics.

**Base URL**: `http://localhost:5000/api`  
**Authentication**: JWT Bearer Token  
**Content-Type**: `application/json`

---

## 🔐 Authentication

### **Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "student123",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "role": "student",
  "referralCodeInput": "REF123" // Optional
}
```

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "username": "student123",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  }
}
```

### **Login User**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### **Firebase Social Authentication**
```http
POST /api/auth/firebase-signin
Content-Type: application/json

{
  "firebaseToken": "firebase_id_token_here",
  "referralCodeInput": "REF123" // Optional for new users
}
```

---

## 📝 Question Management

### **Add Question**
```http
POST /api/questions/add
Authorization: Bearer {jwt_token}
Content-Type: application/json

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
    {
      "type": "text",
      "label": "Basic Explanation",
      "content": "Detailed explanation here..."
    },
    {
      "type": "video",
      "label": "Video Solution",
      "content": "https://youtube.com/watch?v=example"
    }
  ],
  "askedIn": [
    { "examName": "NEET", "year": 2023 }
  ],
  "status": "active",
  "version": 1
}
```

**Response (201 Created):**
```json
{
  "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
  "questionText": "What is the acceleration due to gravity on Earth?",
  "options": [...],
  "branch": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "name": "Medical"
  },
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### **Get All Questions**
```http
GET /api/questions/all
Authorization: Bearer {jwt_token}
```

### **Filter Questions**
```http
GET /api/questions/filter?branch=Medical&subject=Physics&difficulty=Easy
Authorization: Bearer {jwt_token}
```

### **Update Question**
```http
PUT /api/questions/{questionId}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "questionText": "Updated question text",
  "difficulty": "Medium"
}
```

### **Delete Question**
```http
DELETE /api/questions/{questionId}
Authorization: Bearer {jwt_token}
```

---

## 📋 Test Series Management

### **Create Test Series**
```http
POST /api/testSeries/create
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "title": "NEET Mock Test 1",
  "duration": 180,
  "mode": "practice",
  "type": "Practice_Exam",
  "year": 2024,
  "maxAttempts": 3,
  "family": "64f8a1b2c3d4e5f6a7b8c9d3",
  "stream": "64f8a1b2c3d4e5f6a7b8c9d4",
  "paper": "64f8a1b2c3d4e5f6a7b8c9d5",
  "randomizeSectionOrder": false,
  "sections": [
    {
      "title": "Physics",
      "order": 1,
      "questionsToSelectFromPool": 25,
      "questionPool": [
        "64f8a1b2c3d4e5f6a7b8c9d6",
        "64f8a1b2c3d4e5f6a7b8c9d7"
      ]
    },
    {
      "title": "Chemistry", 
      "order": 2,
      "questions": [
        "64f8a1b2c3d4e5f6a7b8c9d8",
        "64f8a1b2c3d4e5f6a7b8c9d9"
      ]
    }
  ]
}
```

### **Get All Test Series**
```http
GET /api/testSeries
Authorization: Bearer {jwt_token}
```

### **Clone Test Series**
```http
POST /api/testSeries/clone/{seriesId}
Authorization: Bearer {jwt_token}
```

### **Update Test Series**
```http
PUT /api/testSeries/{seriesId}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "title": "Updated Test Title",
  "duration": 200,
  "maxAttempts": 5
}
```

---

## ✏️ Test Attempts

### **Start Test**
```http
POST /api/tests/start
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "seriesId": "64f8a1b2c3d4e5f6a7b8c9da"
}
```

**Response (200 OK):**
```json
{
  "attemptId": "64f8a1b2c3d4e5f6a7b8c9db",
  "sections": [
    {
      "title": "Physics",
      "questions": [
        {
          "questionInstanceKey": "q_0_0",
          "question": {
            "_id": "64f8a1b2c3d4e5f6a7b8c9d6",
            "questionText": "Question text here...",
            "options": [...]
          },
          "marks": 4
        }
      ]
    }
  ],
  "timeLeft": 10800,
  "seriesTitle": "NEET Mock Test 1"
}
```

### **Save Progress**
```http
POST /api/tests/{attemptId}/save
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "responses": [
    {
      "questionInstanceKey": "q_0_0",
      "selected": "9.8 m/s²",
      "visitedAt": "2024-01-15T10:30:00.000Z",
      "lastModifiedAt": "2024-01-15T10:35:00.000Z",
      "timeSpent": 300,
      "attempts": 2,
      "flagged": false,
      "confidence": "medium"
    }
  ],
  "timeLeft": 10500
}
```

### **Submit Test**
```http
POST /api/tests/{attemptId}/submit
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "responses": [
    {
      "questionInstanceKey": "q_0_0", 
      "selected": "9.8 m/s²",
      "timeSpent": 300,
      "attempts": 2,
      "flagged": false
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "attemptId": "64f8a1b2c3d4e5f6a7b8c9db",
  "score": 85,
  "maxScore": 100,
  "percentage": 85.0,
  "correctAnswers": 21,
  "totalQuestions": 25,
  "timeTakenSeconds": 7200,
  "submittedAt": "2024-01-15T12:30:00.000Z"
}
```

### **Get Test Progress**
```http
GET /api/tests/{seriesId}/progress
Authorization: Bearer {jwt_token}
```

### **Review Test Attempt**
```http
GET /api/tests/{attemptId}/review
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**
```json
{
  "attempt": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9db",
    "score": 85,
    "percentage": 85.0,
    "sections": [
      {
        "title": "Physics",
        "questions": [
          {
            "question": {
              "_id": "64f8a1b2c3d4e5f6a7b8c9d6",
              "questionText": "Question text...",
              "options": [
                {
                  "text": "9.8 m/s²",
                  "isCorrect": true
                }
              ],
              "explanation": "Detailed explanation..."
            },
            "userAnswer": "9.8 m/s²",
            "isCorrect": true,
            "earned": 4,
            "timeSpent": 300
          }
        ]
      }
    ]
  }
}
```

### **Get My Test Attempts**
```http
GET /api/tests/my-attempts
Authorization: Bearer {jwt_token}
```

---

## 🏆 Leaderboards & Analytics

### **Get Leaderboard for Test Series**
```http
GET /api/tests/leaderboard/{seriesId}
```

**Response (200 OK):**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "studentId": "64f8a1b2c3d4e5f6a7b8c9dc",
      "displayName": "John Doe",
      "score": 95,
      "maxScore": 100,
      "percentage": 95.0,
      "submittedAt": "2024-01-15T12:30:00.000Z",
      "timeTakenSeconds": 6300
    }
  ],
  "title": "NEET Mock Test 1"
}
```

### **Get Student Statistics**
```http
GET /api/tests/stats/me
Authorization: Bearer {jwt_token}
```

### **Get Performance Analytics**
```http
GET /api/tests/{attemptId}/analytics
Authorization: Bearer {jwt_token}
```

### **Get Study Recommendations**
```http
GET /api/tests/{attemptId}/recommendations
Authorization: Bearer {jwt_token}
```

---

## 🎯 Dashboard & User Profile

### **Get Student Dashboard**
```http
GET /api/dashboard/me
Authorization: Bearer {jwt_token}
```

**Response (200 OK):**
```json
{
  "totalTests": 15,
  "averagePercentage": 78.5,
  "bestPerformance": {
    "score": 95,
    "percentage": 95.0,
    "testTitle": "NEET Mock Test 5"
  },
  "recentAttempts": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9db",
      "series": {
        "title": "NEET Mock Test 1"
      },
      "percentage": 85.0,
      "submittedAt": "2024-01-15T12:30:00.000Z"
    }
  ],
  "improvementSuggestions": [
    "Focus on Organic Chemistry topics",
    "Practice more Physics numerical problems"
  ]
}
```

### **Get User Profile**
```http
GET /api/users/profile/me
Authorization: Bearer {jwt_token}
```

### **Update User Profile**
```http
PUT /api/users/profile/me
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "John Updated Doe",
  "displayName": "Johnny",
  "phone": "+91-9876543210"
}
```

---

## 🏗️ Hierarchy Management

### **Get Branches**
```http
GET /api/hierarchy/branch
Authorization: Bearer {jwt_token}
```

### **Create Branch**
```http
POST /api/hierarchy/branch
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "Engineering"
}
```

### **Get Subjects by Branch**
```http
GET /api/hierarchy/subject?branchId={branchId}
Authorization: Bearer {jwt_token}
```

### **Create Subject**
```http
POST /api/hierarchy/subject
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "Mathematics",
  "branchId": "64f8a1b2c3d4e5f6a7b8c9d2"
}
```

### **Get Topics by Subject**
```http
GET /api/hierarchy/topic?subjectId={subjectId}
Authorization: Bearer {jwt_token}
```

### **Get SubTopics by Topic**
```http
GET /api/hierarchy/subtopic?topicId={topicId}
Authorization: Bearer {jwt_token}
```

---

## 💰 Rewards System

### **Get User Reward Dashboard**
```http
GET /api/rewards/dashboard
Authorization: Bearer {jwt_token}
```

### **Get Available Rewards**
```http
GET /api/rewards/available
Authorization: Bearer {jwt_token}
```

### **Redeem Reward**
```http
POST /api/rewards/redeem
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "rewardId": "64f8a1b2c3d4e5f6a7b8c9dd",
  "quantity": 1
}
```

### **Get Transaction History**
```http
GET /api/rewards/transactions
Authorization: Bearer {jwt_token}
```

---

## 📊 Analytics (Admin)

### **Get Question Analytics**
```http
GET /api/analytics/questions
Authorization: Bearer {jwt_token}
```

### **Get Series Analytics**
```http
GET /api/analytics/series/{seriesId}
Authorization: Bearer {jwt_token}
```

### **Export Attempts CSV**
```http
GET /api/analytics/series/{seriesId}/attempts.csv
Authorization: Bearer {jwt_token}
```

---

## 🔍 CSV Import/Export

### **Upload Questions via CSV**
```http
POST /api/questions/upload
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

file: questions.csv
```

**CSV Format:**
```csv
questionText,options,correctOptions,explanation,difficulty,marks,branch,subject,topic,subtopic,examType
"Sample question?","Option1|Option2|Option3|Option4","Option1","Explanation here","Easy",4,"Medical","Physics","Mechanics","Gravitation","NEET"
```

---

## ⚡ Real-time Features

### **Auto-save Progress** (Frontend handles this)
- Automatically saves progress every 30 seconds
- Manual save with user feedback
- Resume test functionality

### **Timer Management**
- Server-side time validation
- Grace period handling
- Automatic submission on timeout

---

## 🚨 Error Responses

### **Common Error Codes**

**401 Unauthorized:**
```json
{
  "message": "Unauthorized - Invalid or missing token"
}
```

**403 Forbidden:**
```json
{
  "message": "Forbidden: Access Denied - Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "message": "Test series not found"
}
```

**400 Bad Request:**
```json
{
  "message": "Validation error",
  "errors": [
    "Question text is required",
    "At least one correct option must be provided"
  ]
}
```

**500 Internal Server Error:**
```json
{
  "message": "Server error",
  "error": "Detailed error message for debugging"
}
```

---

## 🎯 Rate Limiting & Best Practices

### **Rate Limits**
- Authentication endpoints: 5 requests per minute per IP
- Question upload: 1 request per minute per user
- General API: 100 requests per minute per user

### **Best Practices**
- Always include `Authorization` header for protected endpoints
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Handle errors gracefully with retry mechanisms
- Implement client-side caching for frequently accessed data
- Use pagination for large datasets

---

## 🔧 API Testing

Import the provided Postman collection for comprehensive API testing:
- `NexPrep-Postman-FULL.json`: Complete API collection
- `NexPrep-Postman-Environment.json`: Environment variables

---

*API Documentation v2.0*  
*Last Updated: May 29, 2025*
