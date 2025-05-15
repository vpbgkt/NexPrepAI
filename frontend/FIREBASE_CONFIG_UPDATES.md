# Firebase Configuration Updates Needed

After removing phone authentication from the NexPrep codebase, please make these changes in the Firebase Console:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project "nexprepauth"
3. In the left menu, go to "Authentication"
4. Click on the "Sign-in method" tab
5. Find "Phone" in the list of providers and make sure it's disabled
6. If it's enabled, click on it and toggle the switch to "Disabled", then save

This will ensure no accidental use of the Phone Authentication service, preventing any unexpected charges.
