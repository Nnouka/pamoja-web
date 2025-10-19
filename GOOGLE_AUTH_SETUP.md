# Google Authentication Setup for Pamoja

## Firebase Console Configuration Required

To enable Google authentication, you need to configure it in your Firebase console:

### Step 1: Enable Google Authentication
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your Pamoja project
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Click **Enable**
6. Add your project's authorized domains:
   - `localhost` (for development)
   - Your production domain (e.g., `your-app.vercel.app`)
7. Click **Save**

### Step 2: Configure OAuth Consent Screen (if prompted)
1. You might be redirected to Google Cloud Console
2. Set up your OAuth consent screen with:
   - Application name: "Pamoja"
   - User support email: Your email
   - Developer contact email: Your email
3. Add scopes: email, profile, openid
4. Save and continue

### Step 3: Test the Integration
1. Start your development server: `npm run dev`
2. Navigate to `/login` or `/signup`
3. Click "Continue with Google"
4. Complete the Google sign-in flow

## What's Been Added

### Frontend Changes:
✅ **Firebase Configuration**: Added GoogleAuthProvider to Firebase setup
✅ **Auth Context**: Added `signInWithGoogle()` function
✅ **Login Page**: Added Google sign-in button with official Google branding
✅ **Signup Page**: Added Google sign-in option
✅ **User Experience**: Beautiful divider and consistent styling

### Features:
- **One-click authentication** with Google accounts
- **Automatic profile creation** for Google users
- **Consistent user experience** across email and Google auth
- **Error handling** for Google sign-in failures
- **Loading states** during authentication

## Security Notes:
- Google authentication is more secure than password-based auth
- Users don't need to remember passwords
- Firebase handles all OAuth complexity
- User profiles are automatically created in Firestore

## Next Steps:
1. Complete Firebase console setup above
2. Test Google authentication
3. Optionally configure additional providers (Facebook, Twitter, etc.)