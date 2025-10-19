# Streak System Documentation

## How Streaks Work

The streak system tracks consecutive days of learning activity in Pamoja. Here's how it works:

### Streak Calculation Rules

1. **Starting a Streak**: A streak begins when a user completes their first challenge of the day
2. **Continuing a Streak**: A streak continues when a user completes challenges on consecutive days
3. **Streak Reset**: A streak resets to 0 if a user misses more than 1 day of activity

### Implementation Details

#### Daily Progress Tracking
- Each day's activity is tracked in the `dailyProgress` collection
- Key fields: `challengesCompleted`, `correctAnswers`, `xpEarned`, `streakActive`
- The `streakActive` flag prevents double-counting streak increments

#### Streak Validation
- **On Login**: `validateUserStreak()` checks if streak should be reset due to inactivity
- **On Challenge Completion**: `updateUserStreak()` increments streak for daily activity

#### Grace Period
- Users have a 2-day grace period before streak resets completely
- Missing 1 day: Streak can restart from day 1
- Missing 2+ days: Streak resets to 0

### Functions

#### `updateUserStreak(userId: string)`
- Called after completing challenges
- Checks yesterday's activity to determine streak continuation
- Updates user profile with new streak value
- Marks daily progress as streak-active

#### `validateUserStreak(userId: string)`  
- Called on user login/authentication
- Resets streak if user has been inactive too long
- Considers yesterday's activity for streak validation

### Database Schema

#### Users Collection
```typescript
{
  id: string;
  streak: number;
  lastActivity: Timestamp;
  // ... other fields
}
```

#### Daily Progress Collection
```typescript
{
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  challengesCompleted: number;
  streakActive: boolean;
  // ... other fields
}
```

## Testing Streak Functionality

1. **Complete challenges** on consecutive days to build a streak
2. **Skip a day** and return - streak should restart from 1
3. **Skip 2+ days** and return - streak should reset to 0
4. Check the dashboard to see streak updates in real-time

## Troubleshooting

- **Streak not updating**: Check browser console for database operation logs
- **Streak resets unexpectedly**: Verify `lastActivity` timestamps in user profile
- **Double counting**: Ensure `streakActive` flag is properly set in daily progress