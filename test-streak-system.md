# Streak Counter and Daily Login Reward System - Test Guide

## Overview
The streak counter and daily login reward system has been successfully implemented in the NexPrep exam platform. This document provides testing steps to verify the functionality.

## System Components

### Backend Components
1. **User Model Enhancement** (`backend/models/User.js`)
   - Added study streak fields: `studyStreak`, `longestStudyStreak`, `lastStudyDate`, `totalStudyDays`
   - Existing login streak fields maintained for compatibility

2. **Streak Service** (`backend/services/streakService.js`)
   - Tracks both login and study streaks independently
   - Awards 5 points for daily login
   - Awards 10 points for daily study activity
   - Calculates streak bonuses at milestones

3. **Streak Controller** (`backend/controllers/streakController.js`)
   - Provides endpoints for streak statistics and milestones
   - Supports leaderboard with both streak types

4. **Test Attempt Integration** (`backend/controllers/testAttemptController.js`)
   - Automatically triggers study streak logic when tests are submitted
   - Returns detailed streak information in response

### Frontend Components
1. **Streak Service** (`frontend/src/app/services/streak.service.ts`)
   - TypeScript interfaces for streak data
   - API communication methods

2. **Rewards Dashboard** (`frontend/src/app/components/rewards-dashboard/rewards-dashboard.component.ts`)
   - "Streaks & Goals" tab showing both login and study streaks
   - Visual progress bars for milestone achievements
   - Motivational messages based on streak status

## API Endpoints

### Available Endpoints
- `GET /api/streak/stats` - Get user streak statistics
- `GET /api/streak/milestones` - Get streak milestones and rewards
- `GET /api/streak/leaderboard` - Get streak leaderboard
- `POST /api/streak/daily-login` - Manually trigger daily login (testing)
- `POST /api/streak/study-activity` - Manually trigger study activity (testing)
- `POST /api/streak/reset` - Reset streaks (admin/testing)

## Testing Steps

### 1. Test Daily Login Streak
```bash
# Backend API test (using curl or Postman)
POST http://localhost:5000/api/streak/daily-login
Authorization: Bearer [your-jwt-token]
```

Expected Result:
- User earns 5 points
- Login streak increments by 1
- `lastLoginDate` updated to current date

### 2. Test Study Streak
```bash
# Backend API test
POST http://localhost:5000/api/streak/study-activity
Authorization: Bearer [your-jwt-token]
```

Expected Result:
- User earns 10 points
- Study streak increments by 1
- `lastStudyDate` updated to current date

### 3. Test Automatic Study Streak (via Test Submission)
1. Navigate to any exam/test in the frontend
2. Answer at least one question
3. Submit the test
4. Check the response for streak information

Expected Result:
- Study streak automatically triggered
- Points awarded for study activity
- Streak milestones checked and bonuses awarded if applicable

### 4. Test Frontend Display
1. Open http://localhost:4200
2. Navigate to Rewards Dashboard
3. Click on "Streaks & Goals" tab

Expected Features:
- Display of current login and study streaks
- Progress toward next milestones
- Visual streak status icons
- Motivational messages
- Milestone achievement tracking

### 5. Test Streak Statistics API
```bash
GET http://localhost:5000/api/streak/stats
Authorization: Bearer [your-jwt-token]
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "currentLoginStreak": 5,
    "longestLoginStreak": 10,
    "totalLoginDays": 25,
    "currentStudyStreak": 3,
    "longestStudyStreak": 7,
    "totalStudyDays": 15,
    "loginStreakActive": true,
    "studyStreakActive": true,
    "canEarnLoginBonus": false,
    "canEarnStudyBonus": false,
    "lastLoginDate": "2024-01-15T10:30:00.000Z",
    "lastStudyDate": "2024-01-15T14:20:00.000Z"
  }
}
```

## Reward System

### Point Awards
- **Daily Login**: 5 points
- **Daily Study**: 10 points (answering at least 1 question)

### Milestone Bonuses
- **Login Streaks**: 7 days (+25 pts), 30 days (+100 pts), etc.
- **Study Streaks**: 7 days (+50 pts), 30 days (+200 pts), etc.

### Streak Rules
1. **Login Streak**: Must login within 24 hours of last login
2. **Study Streak**: Must answer at least 1 question within 24 hours of last study activity
3. **Streak Reset**: If 24+ hours pass without activity, streak resets to 0
4. **Bonus Eligibility**: Can only earn each daily bonus once per day

## Frontend Features

### Streaks & Goals Tab
- **Overview Cards**: Display current login and study streaks
- **Milestone Progress**: Visual progress bars showing advancement toward next milestone
- **Achievement Status**: Check marks for completed milestones
- **Motivational Messages**: Dynamic messages based on streak performance
- **Tips Section**: Guidance on maintaining and building streaks

### Integration Points
- **Rewards Dashboard**: Central hub for all streak and reward information
- **Test Submission**: Automatic streak tracking when tests are completed
- **User Feedback**: Real-time notifications of streak achievements and point awards

## Troubleshooting

### Common Issues
1. **Streaks not updating**: Ensure backend server is running and API endpoints are accessible
2. **Frontend not displaying data**: Check browser console for errors and verify API responses
3. **Points not awarded**: Verify user authentication and check streak eligibility rules

### Debug Information
- Backend logs show streak calculations and point awards
- Frontend console shows API call results
- Database can be queried directly to verify user streak fields

## Future Enhancements
1. **Push Notifications**: Remind users to maintain streaks
2. **Social Features**: Share streak achievements with friends
3. **Advanced Milestones**: More complex achievement conditions
4. **Streak Recovery**: Allow users to recover broken streaks with points/rewards
