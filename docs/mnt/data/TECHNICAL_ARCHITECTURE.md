# 🔧 NexPrep - Technical Architecture Documentation

## 🏗️ System Architecture

NexPrep implements a modern three-tier architecture designed for scalability, maintainability, and performance.

### **Architecture Diagram**
```
┌─────────────────┐    ┌─────────────────┐
│   Student App   │    │   Admin Panel   │
│   (Angular 19)  │    │   (Angular 19)  │
│   Port: 4200    │    │   Port: 4201    │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │ HTTP/HTTPS + JWT
         ┌─────────────────────────────┐
         │     Backend API Server      │
         │    (Node.js + Express)      │
         │        Port: 5000           │
         └─────────────────────────────┘
                     │
         ┌─────────────────────────────┐
         │      MongoDB Database       │
         │    (Mongoose ODM)           │
         └─────────────────────────────┘
```

---

## 🎯 Core Components

### **1. Frontend Applications**

#### **Student Portal (`/frontend`)**
- **Technology**: Angular 19 + TypeScript
- **Key Features**:
  - Exam player with real-time progress saving
  - Multi-language support (English/Hindi)
  - Performance analytics dashboard
  - Responsive design for mobile/desktop
- **Key Components**:
  - `ExamPlayerComponent`: Advanced test-taking interface
  - `StudentDashboardComponent`: Performance overview
  - `ReviewComponent`: Detailed answer review
  - `LeaderboardComponent`: Competitive rankings

#### **Admin Panel (`/admin-panel`)**
- **Technology**: Angular 19 + TypeScript
- **Key Features**:
  - Question bank management with rich editor
  - Test series creation with advanced options
  - Analytics dashboard with charts
  - User management and permissions
- **Key Components**:
  - `BuildPaperComponent`: Test series creation
  - `QuestionListComponent`: Question management
  - `AnalyticsComponent`: Performance insights
  - `HomeComponent`: Admin dashboard

### **2. Backend API Server (`/backend`)**

#### **Core Architecture**
```
backend/
├── 🔌 server.js              # Application entry point
├── 📋 controllers/           # Business logic layer
├── 🛣️ routes/               # API endpoint definitions
├── 🗃️ models/               # MongoDB data models
├── 🔒 middleware/           # Authentication & validation
├── 🔧 services/             # Business services
├── 🛠️ utils/               # Utility functions
└── ⚙️ config/              # Configuration files
```

#### **Key Controllers**
- `authController.js`: User authentication and authorization
- `testSeriesController.js`: Test series management
- `testAttemptController.js`: Test execution and grading
- `questionController.js`: Question CRUD operations
- `analyticsController.js`: Performance analytics
- `hierarchyController.js`: Educational hierarchy management

#### **Authentication & Security**
- **JWT-based Authentication**: Stateless token-based auth
- **Role-based Access Control**: Admin/Student permissions
- **Firebase Integration**: Social authentication support
- **CORS Configuration**: Cross-origin request handling
- **Input Validation**: Comprehensive data validation

### **3. Database Layer (MongoDB)**

#### **Data Models & Relationships**
```
User
├── TestAttempt (1:N)
├── RewardTransaction (1:N)
└── Authentication data

TestSeries
├── TestAttempt (1:N)
├── Sections (embedded)
└── Question references

Question
├── Hierarchical classification
├── Multiple translations
└── Analytics metadata

Educational Hierarchy:
Branch → Subject → Topic → SubTopic
```

---

## 🔄 Data Flow Architecture

### **Test Execution Flow**
```
1. Student Login → JWT Token Generation
2. Test Selection → Series Validation & Cooldown Check
3. Test Start → Question Generation & Randomization
4. Real-time Progress → Auto-save (30s) + Manual Save
5. Test Submit → Grading & Analytics Calculation
6. Results Display → Performance Insights Generation
```

### **Question Management Flow**
```
1. Admin Login → Role Verification
2. Question Creation → Validation & Hierarchy Assignment
3. CSV Import → Bulk Processing & Error Handling
4. Test Series Creation → Question Pool Management
5. Analytics Collection → Performance Tracking
```

---

## 🎯 Advanced Features Implementation

### **1. Exam Player Architecture**

#### **Real-time Progress Saving**
```typescript
// Auto-save every 30 seconds
setInterval(() => {
  this.saveProgressInternal(false);
}, 30000);

// Manual save with user feedback
triggerManualSave(): void {
  this.saveProgressInternal(true);
}
```

#### **Multi-language Support**
```typescript
// Dynamic language switching
changeLanguage(lang: 'en' | 'hi'): void {
  this.currentLanguage = lang;
  this.sections.forEach(section => {
    section.questions.forEach(question => {
      const { questionText, options } = 
        this.getTranslatedContentForQuestion(
          question.translations, lang
        );
      question.displayQuestionText = questionText;
      question.displayOptions = options;
    });
  });
}
```

#### **Question Navigation & State Management**
```typescript
// Global question indexing
getGlobalIndex(sectionIdx: number, questionIdx: number): number {
  let globalIndex = 0;
  for (let i = 0; i < sectionIdx; i++) {
    globalIndex += this.sections[i].questions.length;
  }
  return globalIndex + questionIdx;
}

// Question status determination
getQuestionStatus(sIdx: number, qIdx: number): string {
  // Returns: 'answered' | 'marked-for-review' | 'unanswered' | 'not-visited'
}
```

### **2. Test Series Management**

#### **Dynamic Question Pool**
```javascript
// Question pool with randomization
const processedSections = sections.map(section => ({
  ...section,
  questions: selectRandomQuestions(
    section.questionPool, 
    section.questionsToSelectFromPool
  )
}));
```

#### **Variant Support**
```javascript
// Multi-variant test support
const variants = [
  { code: 'A', sections: [...] },
  { code: 'B', sections: [...] }
];
```

### **3. Analytics Engine**

#### **Performance Calculations**
```javascript
// Real-time analytics
const analytics = {
  accuracy: (correctAnswers / totalAnswers) * 100,
  timePerQuestion: totalTime / totalQuestions,
  subjectWisePerformance: calculateSubjectAnalytics(),
  difficultyAnalysis: analyzeDifficultyPatterns(),
  improvementSuggestions: generateRecommendations()
};
```

---

## 🔒 Security Implementation

### **Authentication Security**
```javascript
// JWT token verification
const authenticate = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
```

### **Role-based Authorization**
```javascript
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access Denied" });
    }
    next();
  };
};
```

### **Input Validation & Sanitization**
- MongoDB injection prevention
- XSS protection through input sanitization
- File upload validation and size limits
- Rate limiting for API endpoints

---

## 📊 Performance Optimizations

### **Frontend Optimizations**
- **Lazy Loading**: Route-based code splitting
- **OnPush Change Detection**: Optimized Angular change detection
- **Virtual Scrolling**: For large question lists
- **Caching**: HTTP response caching with interceptors

### **Backend Optimizations**
- **Database Indexing**: Optimized queries with proper indexes
- **Aggregation Pipelines**: Efficient data processing
- **Connection Pooling**: MongoDB connection optimization
- **Response Compression**: Gzip compression for API responses

### **Database Design**
```javascript
// Optimized indexes
Question.index({ 
  branch: 1, subject: 1, topic: 1, subtopic: 1, examType: 1 
});
TestAttempt.index({ student: 1, series: 1, status: 1 });
User.index({ email: 1 }, { unique: true });
```

---

## 🚀 Scalability Considerations

### **Horizontal Scaling**
- Stateless API design for load balancing
- MongoDB replica sets for read scaling
- CDN integration for static assets
- Microservices architecture ready

### **Vertical Scaling**
- Efficient memory usage with streaming
- Database connection pooling
- Optimized aggregation queries
- Caching strategies implementation

---

## 🔧 Development & Deployment

### **Development Environment**
```bash
# Backend development
npm run dev  # Nodemon with hot reload

# Frontend development
ng serve --host 0.0.0.0 --port 4200

# Database
mongod --dbpath ./data/db
```

### **Production Considerations**
- Environment variable management
- SSL/TLS certificate configuration
- Database backup strategies
- Monitoring and logging implementation
- Error tracking and alerting

---

## 📈 Monitoring & Analytics

### **System Monitoring**
- API response times and error rates
- Database query performance
- User session analytics
- System resource usage

### **Business Analytics**
- Test completion rates
- Question difficulty analysis
- User engagement metrics
- Performance trend analysis

---

*Technical Architecture v2.0*
*Last Updated: May 29, 2025*
