# Environment Variables Setup

This app uses environment variables for API keys and configuration.

## Quick Setup

1. **Create a `.env` file** in the `Suite_Hearts` directory (same folder as `package.json`)

2. **Add your API keys** to the `.env` file:
   ```
   EXPO_PUBLIC_DATAFINITI_API_KEY=your-datafiniti-api-key-here
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Restart Expo** after adding environment variables:
   ```bash
   npx expo start --clear
   ```

## Datafiniti API Key

- **Get your key**: Sign up at [https://datafiniti.co/](https://datafiniti.co/)
- **Variable name**: `EXPO_PUBLIC_DATAFINITI_API_KEY`
- **Location**: Add to `.env` file in `Suite_Hearts` directory
- **Note**: The app uses mock data by default. See `DATAFINITI_SETUP.md` to enable live API

## Supabase Keys

- **Get your keys**: From your Supabase project settings
- **Variables**: 
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Location**: Add to `.env` file in `Suite_Hearts` directory

## Important Notes

- ✅ The `.env` file is already in `.gitignore` - your keys won't be committed
- ✅ Always restart Expo after changing environment variables
- ✅ Use `EXPO_PUBLIC_` prefix for all environment variables (required by Expo)
- ❌ Never commit your `.env` file to version control

## Example .env File

```env
# Datafiniti API
EXPO_PUBLIC_DATAFINITI_API_KEY=abc123xyz789

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

