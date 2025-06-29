# Leaderboard Button in Review Page

## Overview
Added a "Go to Leaderboard" button in the review exam page that only appears when leaderboards are enabled for the specific test series.

## Implementation Details

### Backend Changes
- Updated `testAttemptController.js` in the `getEnhancedReview` method:
  - Added `enablePublicLeaderboard` field to the series population query
  - Included complete series information in the review response

### Frontend Changes
- Updated `review.component.ts`:
  - Added `isLeaderboardEnabled` and `seriesId` properties
  - Updated `EnhancedReviewData` interface to include series information
  - Added `goToLeaderboard()` method for navigation
  - Extract leaderboard configuration from review data

- Updated `review.component.html`:
  - Added leaderboard button next to the PDF download button
  - Button only shows when `isLeaderboardEnabled` is true
  - Uses Tailwind CSS classes for styling

## Features
- **Conditional Display**: Button only appears when `enablePublicLeaderboard` is true for the test series
- **Direct Navigation**: Clicking the button navigates to `/leaderboard/:seriesId`
- **Consistent UI**: Styled to match the existing design with yellow/gold theme appropriate for leaderboards
- **Responsive**: Works on all screen sizes alongside existing buttons

## Usage
1. Students complete a test
2. Navigate to the review page
3. If leaderboards are enabled for that test, a "🏆 Leaderboard" button appears
4. Clicking the button takes them to the leaderboard for that specific test series

## Route
The leaderboard button navigates to: `/leaderboard/:seriesId`
