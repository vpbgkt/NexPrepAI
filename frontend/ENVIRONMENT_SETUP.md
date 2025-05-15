# Environment Setup

To set up the environment files for development:

1. Copy `environment.template.ts` to create your own `environment.ts` and `environment.prod.ts`
2. Update the Firebase API key and other sensitive values

```bash
# From the frontend directory
cp src/environments/environment.template.ts src/environments/environment.ts
cp src/environments/environment.template.ts src/environments/environment.prod.ts
```

Then edit the files to add your API keys. These files are gitignored to prevent exposing sensitive keys.

## Authentication Configuration

The NexPrep application uses the following authentication methods:
- Email/Password authentication
- Google Sign-In

The Phone Authentication method has been removed from the application to avoid Firebase SMS verification costs.

## Firebase Configuration

Your environment files should include Firebase configuration like this:

```typescript
export const environment = {
  production: false, // Set to true for environment.prod.ts
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "yourproject.firebaseapp.com",
    projectId: "yourproject",
    storageBucket: "yourproject.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
  }
};
```

## Important Security Notes

- Never commit API keys or sensitive information to the repository
- Always use environment variables in production environments
- Restrict your API keys in the Google Cloud Console to specific domains
- Make sure Phone Authentication is disabled in your Firebase Console
