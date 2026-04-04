# Netlify Deployment Guide

## Quick Deploy Options

### Option 1: Drag and Drop (Easiest)
1. Go to [Netlify](https://app.netlify.com/)
2. Sign up or log in
3. Drag and drop the `dist` folder onto the Netlify dashboard
4. Your site will be live in seconds!

### Option 2: Git Integration (Recommended for updates)
1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Netlify](https://app.netlify.com/)
3. Click "Add new site" → "Import an existing project"
4. Connect your Git repository
5. Configure build settings:
   - **Base directory:** (leave empty or set to root)
   - **Publish directory:** `dist`
   - **Build command:** (leave empty - no build needed)
6. Click "Deploy site"

### Option 3: Netlify CLI
1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Navigate to your project directory
3. Login to Netlify:
   ```bash
   netlify login
   ```
4. Initialize and deploy:
   ```bash
   netlify init
   netlify deploy --prod --dir=dist
   ```

## Important Notes

- ✅ The `dist/index.html` file is self-contained (all CSS and JS are inline)
- ✅ No build process required - it's ready to deploy as-is
- ✅ The `netlify.toml` file is configured to serve from the `dist` folder
- ✅ External CDN (SheetJS) is loaded from CDN, so no additional dependencies needed

## After Deployment

1. Your site will get a random Netlify URL (e.g., `https://random-name-123.netlify.app`)
2. You can customize the domain name in Netlify settings
3. You can add a custom domain if you have one

## Troubleshooting

- If the site doesn't load, check that the publish directory is set to `dist`
- Make sure `index.html` is in the `dist` folder
- Check browser console for any errors

