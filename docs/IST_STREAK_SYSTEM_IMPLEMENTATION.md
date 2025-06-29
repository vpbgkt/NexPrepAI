# IST-Based Streak System Implementation

## Overview
The NexPrep application now uses **Indian Standard Time (IST)** for all streak calculations, ensuring consistent and fair streak counting regardless of the user's physical location or timezone.

## Key Features

### ✅ IST Time Zone Handling
- All streak calculations use IST (UTC+5:30) as the reference timezone
- Prevents timezone-related inconsistencies for users traveling or using VPNs
- Ensures fair competition in leaderboards and streak challenges

### ✅ Single Daily Increment
- **Login streaks**: Increment only once per IST day, not per login session
- **Study streaks**: Increment only once per IST day, not per study session
- **Weekly streaks**: Use IST week boundaries (Sunday to Saturday)

### ✅ Robust Day Boundary Detection
- Uses IST day boundaries (00:00:00 to 23:59:59 IST) for all calculations
- Properly handles midnight crossings and edge cases
- Consistent behavior across different user locations

## Implementation Details

### Core IST Functions

#### `getCurrentIndianTime()`
Returns current date/time adjusted to IST:
```javascript
static getCurrentIndianTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  return new Date(utc + istOffset);
}
```

#### `toIndianTime(date)`
Converts any date to IST:
```javascript
static toIndianTime(date) {
  if (!date) return null;
  const inputDate = new Date(date);
  const utc = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(utc + istOffset);
}
```

#### `isSameDayIST(date1, date2)`
Checks if two dates are the same IST day:
```javascript
static isSameDayIST(date1, date2) {
  if (!date1 || !date2) return false;
  const day1IST = this.getStartOfDayIST(date1);
  const day2IST = this.getStartOfDayIST(date2);
  return day1IST.getTime() === day2IST.getTime();
}
```

#### `areConsecutiveDaysIST(date1, date2)`
Checks if two dates are consecutive IST days:
```javascript
static areConsecutiveDaysIST(date1, date2) {
  if (!date1 || !date2) return false;
  const day1IST = this.getStartOfDayIST(date1);
  const day2IST = this.getStartOfDayIST(date2);
  const diffTime = Math.abs(day2IST - day1IST);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}
```

### Streak Logic

#### Login Streaks
**File**: `backend/services/streakService.js` → `handleDailyLogin()`

- Triggered during user authentication (login/signup)
- Uses IST to determine if user already logged in today
- Increments streak only for consecutive IST days
- Awards points and bonuses based on streak length
- Prevents multiple increments on same IST day

**Key Logic**:
```javascript
// Check if already logged in today (IST)
if (lastLoginDate && this.isSameDayIST(lastLoginDate, todayIST)) {
  return { alreadyLoggedToday: true, pointsEarned: 0 };
}

// Calculate streak
if (this.areConsecutiveDaysIST(lastLoginDate, todayIST)) {
  user.currentStreak = (user.currentStreak || 0) + 1;
} else {
  user.currentStreak = 1; // Start fresh
}
```

#### Study Streaks
**File**: `backend/services/streakService.js` → `handleStudyActivity()`

- Triggered when user submits test answers
- Uses IST to determine if user already studied today
- Increments study streak only for consecutive IST days
- Awards points and bonuses based on study streak length
- Prevents multiple increments on same IST day

**Key Logic**:
```javascript
// Check if already studied today (IST)
if (lastStudyDate && this.isSameDayIST(lastStudyDate, todayIST)) {
  return { alreadyStudiedToday: true, pointsEarned: 0 };
}

// Calculate study streak
if (this.areConsecutiveDaysIST(lastStudyDate, todayIST)) {
  user.studyStreak = (user.studyStreak || 0) + 1;
} else {
  user.studyStreak = 1; // Start fresh
}
```

#### Weekly Streaks
**File**: `backend/services/streakService.js` → `updateWeeklyStreak()`

- Uses IST week boundaries (Sunday 00:00 IST to Saturday 23:59 IST)
- Increments weekly streak for consecutive weeks of activity
- Awards bonus points for sustained weekly activity

## Integration Points

### Authentication Controller
**File**: `backend/controllers/authController.js`

Both email/password login and Firebase authentication call:
```javascript
const loginReward = await StreakService.handleDailyLogin(user._id);
```

### Test Submission Controller
**File**: `backend/controllers/testAttemptController.js`

After successful test submission:
```javascript
const studyStreak = await StreakService.handleStudyActivity(userId);
```

### Streak Statistics
**File**: `backend/services/streakService.js` → `getStreakStats()`

Returns comprehensive streak information using IST calculations:
- Current login streak (active/inactive based on IST)
- Current study streak (active/inactive based on IST)
- Total login/study days
- Streak milestone information

## Testing

### Test Scenarios Covered
1. **Multiple logins same IST day**: Only first login increments streak
2. **Cross-midnight logins**: Proper IST day boundary handling
3. **Timezone travel**: Consistent behavior regardless of user location
4. **Consecutive day detection**: Accurate IST-based consecutive day logic
5. **Streak break and recovery**: Proper reset and restart logic

### Test Files
- `backend/test-streak.js`: Basic IST function tests
- `backend/debug-streak.js`: IST conversion debugging
- `backend/test-scenarios.js`: Comprehensive real-world scenarios

## Benefits

### For Users
- **Fair competition**: All users measured by same timezone standard
- **Consistent behavior**: Streaks work the same regardless of travel/VPN
- **Predictable timing**: Clear 24-hour IST periods for streak maintenance
- **No gaming**: Cannot exploit timezone differences for multiple daily bonuses

### For Application
- **Data consistency**: All streak data normalized to IST
- **Simplified logic**: Single timezone reference for all calculations
- **Audit trail**: Clear logging with IST timestamps
- **Scalability**: Works globally without timezone complexity

## Logging and Debugging

All streak operations include comprehensive logging:
```javascript
console.log(`🕒 Login streak check for user ${userId}:`, {
  currentTimeIST: todayIST.toISOString(),
  lastLoginDate: lastLoginDate ? lastLoginDate.toISOString() : 'Never',
  isSameDayIST: lastLoginDate ? this.isSameDayIST(lastLoginDate, todayIST) : false
});
```

Logs include:
- IST timestamps for all operations
- Streak calculation details
- Points awarded with breakdown
- Consecutive day analysis
- Same day detection results

## Future Enhancements

### Potential Improvements
1. **Streak notifications**: Remind users to maintain streaks
2. **Streak analytics**: Advanced insights into user engagement patterns
3. **Custom streak goals**: Allow users to set personal streak targets
4. **Streak recovery**: Grace periods for technical issues
5. **Advanced bonuses**: More sophisticated reward tiers

### Monitoring
- Track streak distribution across user base
- Monitor for unusual patterns or potential issues
- Analyze user engagement correlation with streak features
- Performance monitoring of IST calculations

## Conclusion

The IST-based streak system provides a robust, fair, and consistent foundation for user engagement through daily login and study habits. The implementation ensures that all users compete on equal terms regardless of their physical location or timezone, while preventing exploitation of timezone differences for gaming the system.

The system is thoroughly tested, well-documented, and includes comprehensive logging for ongoing monitoring and debugging.
