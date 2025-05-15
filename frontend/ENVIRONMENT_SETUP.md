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

## Important Security Notes

- Never commit API keys or sensitive information to the repository
- Always use environment variables in production environments
- Restrict your API keys in the Google Cloud Console to specific domains
