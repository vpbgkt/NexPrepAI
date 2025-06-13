# 📚 NexPrepAI - Complete Project Overview

## 🎯 Project Description

NexPrepAI is a comprehensive online examination and test preparation platform designed for students preparing for competitive exams like NEET, JEE, AIIMS, GATE, and other entrance examinations. The platform provides a complete ecosystem for mock tests, question practice, performance analytics, and comprehensive exam preparation.

## 🏗️ Architecture Overview

NexPrepAI follows a modern three-tier architecture with clear separation of concerns:

### **Frontend Applications (2)**
- **Student Portal** (`/frontend`) - Angular 19 SPA for students
- **Admin Panel** (`/admin-panel`) - Angular 19 SPA for administrators

### **Backend API** (`/backend`) - Node.js + Express + MongoDB
- RESTful API with JWT authentication
- Role-based access control (admin/student)
- Comprehensive test engine with real-time features
- Advanced analytics and reporting system

### **Database** - MongoDB with Mongoose ODM
- Hierarchical question organization
- Complex test series management
- User progress tracking and analytics

---

## 🚀 Key Features

### **For Students**
- 📝 **Mock Test Engine**: Comprehensive test-taking experience with timer, navigation, and progress saving
- 🎯 **Question Practice**: Subject-wise and topic-wise question practice
- 📊 **Performance Analytics**: Detailed performance insights and progress tracking
- 🏆 **Leaderboards**: Public and private leaderboards for competitive learning
- 📱 **Multi-language Support**: English and Hindi language support
- 🔄 **Test Resume**: Resume interrupted tests from where you left off
- 🎁 **Rewards System**: Points and rewards for active participation

### **For Administrators**
- ➕ **Question Management**: Add, edit, and organize questions with rich content
- 📋 **Test Series Creation**: Create complex test series with sections and variants
- 📈 **Analytics Dashboard**: Comprehensive analytics for questions and test performance
- 👥 **User Management**: Manage student accounts and permissions
- 📤 **CSV Import/Export**: Bulk question import and data export capabilities
- 🏗️ **Hierarchy Management**: Manage educational hierarchy (branches, subjects, topics)

### **Advanced Features**
- 🔀 **Question Randomization**: Dynamic question pools and randomized test generation
- ⏱️ **Real-time Progress Saving**: Auto-save functionality with manual save options
- 🎨 **Customizable Test Formats**: Multiple question types and marking schemes
- 🔒 **Secure Authentication**: JWT-based auth with Firebase integration
- 📊 **Advanced Analytics**: Question-level analytics and performance insights
- 🎯 **Adaptive Testing**: Intelligent question selection based on performance

---

## 📁 Project Structure

```
NexPrepAI/
├── 📱 frontend/                 # Student Portal (Angular 19)
│   ├── src/app/
│   │   ├── components/          # UI Components
│   │   ├── services/            # API Services
│   │   ├── guards/              # Route Guards
│   │   └── models/              # TypeScript Models
│   └── package.json
│
├── 🔧 admin-panel/              # Admin Portal (Angular 19)
│   ├── src/app/
│   │   ├── components/          # Admin UI Components
│   │   ├── services/            # Admin API Services
│   │   └── guards/              # Admin Route Guards
│   └── package.json
│
├── 🖥️ backend/                  # API Server (Node.js + Express)
│   ├── controllers/             # Business Logic
│   ├── models/                  # MongoDB Models
│   ├── routes/                  # API Routes
│   ├── middleware/              # Authentication & Validation
│   ├── services/                # Business Services
│   └── utils/                   # Utility Functions
│
└── 📚 docs/                     # Project Documentation
    └── mnt/data/                # Detailed Documentation
```

---

## 🛠️ Technology Stack

### **Frontend Stack**
- **Framework**: Angular 19 with TypeScript
- **UI/UX**: Angular Material, Custom SCSS
- **State Management**: RxJS + Services
- **Charts**: Chart.js with ng2-charts
- **Build Tool**: Angular CLI with Webpack

### **Backend Stack**
- **Runtime**: Node.js (LTS)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + Firebase Admin SDK
- **API Documentation**: Swagger/OpenAPI
- **File Processing**: CSV parsing, PDF generation

### **DevOps & Tools**
- **Version Control**: Git with structured branching
- **Package Management**: npm
- **Development**: Nodemon, Angular CLI dev server
- **API Testing**: Postman collections included
- **Code Quality**: TypeScript strict mode, ESLint

---

## 🎯 Target Users

### **Primary Users**
1. **Students** preparing for competitive exams (NEET, JEE, GATE, etc.)
2. **Educational Administrators** managing test content and analytics
3. **Coaching Institutes** providing online test platforms

### **Use Cases**
- **Mock Test Practice**: Full-length mock exams with real exam simulation
- **Chapter-wise Practice**: Targeted practice for specific subjects/topics
- **Performance Tracking**: Monitor progress and identify weak areas
- **Competitive Learning**: Leaderboards and peer comparison
- **Content Management**: Create and manage large question banks

---

## 🔧 Setup & Development

### **Prerequisites**
- Node.js (v18+ recommended)
- MongoDB (local or cloud)
- Angular CLI (v19)
- Git

### **Quick Start**
```bash
# Clone repository
git clone https://github.com/vpbgkt/NexPrepAI.git
cd NexPrepAI

# Backend setup
cd backend
npm install
cp .env.sample .env  # Configure environment variables
npm run dev

# Frontend setup (new terminal)
cd ../frontend
npm install
ng serve

# Admin panel setup (new terminal)
cd ../admin-panel
npm install
ng serve --port 4201
```

### **Environment Configuration**
- MongoDB URI and JWT secret in backend `.env`
- Firebase configuration for authentication
- CORS settings for frontend-backend communication

---

## 📊 Performance Metrics

### **Scalability**
- Supports 1000+ concurrent test sessions
- Handles 100,000+ questions in the database
- Real-time progress saving without performance impact

### **Reliability**
- Auto-save functionality prevents data loss
- Resume test feature for interrupted sessions
- Comprehensive error handling and validation

---

## 🚀 Future Roadmap

### **Upcoming Features**
- 📱 Mobile application (React Native)
- 🤖 AI-powered question recommendation
- 📹 Video solutions integration
- 🎯 Adaptive difficulty adjustment
- 🌍 Multi-tenant architecture for coaching institutes

### **Planned Improvements**
- Enhanced analytics with machine learning insights
- Real-time collaborative features
- Advanced reporting and certification
- Integration with external learning management systems

---

## 👥 Contributing

We welcome contributions from the community! Please see our contributing guidelines for:
- Code style and standards
- Testing requirements
- Pull request process
- Issue reporting

---

## 📞 Support & Contact

For technical support, feature requests, or collaboration:
- **Developer**: Vishal Prajapat (@vpbgkt)
- **GitHub**: [NexPrepAI Repository](https://github.com/vpbgkt/NexPrepAI)
- **Documentation**: `/docs/mnt/data/` directory

---

*Last Updated: May 29, 2025*
*Version: 2.0.0*
