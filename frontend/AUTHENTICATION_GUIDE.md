# NexPrep Authentication Documentation

This document provides comprehensive information about the authentication system in the NexPrep application.

## Available Authentication Methods

The NexPrep application currently supports the following authentication methods:

1. **Email/Password Authentication**
   - Traditional authentication using an email address and password
   - Managed by Firebase Authentication and synced with our backend

2. **Google Sign-In**
   - OAuth 2.0 based authentication using Google accounts
   - Additional scopes: profile, email
   - Forces account selection even if already signed in

## Authentication Flow

### Email/Password Authentication Flow

1. User enters email and password on the login page
2. App calls `AuthService.login()` which sends credentials to backend API
3. Backend validates credentials and returns JWT token and user info
4. App stores token in localStorage and updates authentication state
5. User is redirected to appropriate dashboard based on role

### Google Sign-In Flow

1. User clicks the "Sign in with Google" button
2. App calls `FirebaseAuthService.googleSignIn()` which opens Google sign-in popup
3. After successful Google authentication:
   - Firebase `onAuthStateChanged` event is triggered
   - App obtains Firebase ID token
   - Token is sent to backend for validation/registration via `/firebase-signin` endpoint
   - Backend returns app-specific JWT token and user info
   - App stores token in localStorage and updates authentication state
4. User is redirected to appropriate dashboard based on role

## Authentication Services

### AuthService

Handles traditional authentication and manages application authentication state.

Key methods:
- `login(email, password)`: Traditional login
- `handleFirebaseLogin(token, user)`: Processes successful Firebase authentication
- `logout()`: Logs out user and clears credentials
- `isLoggedIn()`: Checks if user is authenticated
- `getRole()`: Returns user's role

### FirebaseAuthService

Manages Firebase-based authentication methods.

Key methods:
- `googleSignIn()`: Initiates Google authentication
- `signOutFirebase()`: Signs out from Firebase
- `getCurrentUser()`: Returns current Firebase user
- `isLoggedIn()`: Observable that reflects Firebase auth state
- `getIdToken()`: Gets Firebase ID token

## Security Considerations

1. **Token Storage**: Authentication tokens are stored in localStorage
2. **Session Management**: Both Firebase and app-specific tokens are managed
3. **Role-Based Access**: Navigation and features are restricted based on user role
4. **Automatic Logout**: Users are logged out when Firebase authentication expires

## Best Practices for Authentication

1. Always verify token validity on the backend for protected routes
2. Keep Firebase configuration secure and never expose API keys in client-side code
3. Use HTTPS for all authentication communication
4. Implement proper error handling for authentication failures
5. Validate user input to prevent common attacks like XSS and CSRF

## Troubleshooting

If users experience authentication issues:

1. Check if token is present in localStorage
2. Verify Firebase authentication state
3. Check browser console for authentication errors
4. Ensure backend authentication endpoints are working
5. Clear browser cache and cookies if necessary
