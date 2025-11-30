# Deploying to Vercel

## Quick Deploy Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git commit -m "Add Supabase integration and prepare for deployment"
   git push origin main
   ```

2. **Go to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "Add New Project"
   - Import your repository

3. **Configure the project:**
   - Framework Preset: **Vite** (should auto-detect)
   - Build Command: `npm run build` (should be auto-filled)
   - Output Directory: `dist` (should be auto-filled)
   - Install Command: `npm install` (should be auto-filled)

4. **Add Environment Variables:**
   - Click "Environment Variables"
   - Add these two variables:
     - `VITE_SUPABASE_URL` = your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - Make sure to add them for **Production**, **Preview**, and **Development**

5. **Deploy:**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live! 🎉

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   - Follow the prompts
   - When asked about environment variables, add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

4. **For production:**
   ```bash
   vercel --prod
   ```

## Important Notes

- ✅ Make sure `.env` is in `.gitignore` (already done)
- ✅ Environment variables must be set in Vercel dashboard
- ✅ The app will automatically rebuild on every git push
- ✅ Vercel will give you a URL like `your-app.vercel.app`

## Troubleshooting

- **Build fails:** Check that all dependencies are in `package.json`
- **Environment variables not working:** Make sure they're prefixed with `VITE_`
- **404 errors:** Check that the output directory is set to `dist`

