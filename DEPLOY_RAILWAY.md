# Railway Deployment Guide - Step by Step

## Prerequisites

- GitHub account
- Railway account (free tier available)
- Gemini API key (recommended) or Ollama setup

## Step 1: Prepare Your Code

```bash
# Make sure everything is committed
git status

# If you have uncommitted changes
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

## Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub (recommended)
4. Authorize Railway to access your repositories

## Step 3: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Find and select your `bloom-iq` repository
4. Railway will create a new project

## Step 4: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically:
   - Create PostgreSQL instance
   - Generate connection string
   - Add it to your project

4. **Copy the connection string** - you'll need it later

## Step 5: Deploy Your App

### Option A: Deploy from Dockerfile (Recommended)

1. Click "+ New" → "GitHub Repo"
2. Select your `bloom-iq` repository
3. Railway will detect your Dockerfile
4. Click "Deploy"

### Option B: Deploy from Docker Compose

Railway supports Docker Compose, but you may need to split services:

1. Deploy app as main service
2. Add PostgreSQL (already done)
3. Add ChromaDB as separate service (if needed)
4. Add Ollama as separate service (if using Ollama)

## Step 6: Configure Environment Variables

In your app service, go to "Variables" tab and add:

### Required Variables

```env
# Database (Railway auto-provides this)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}

# Authentication
NEXTAUTH_SECRET=your-super-secret-key-minimum-32-characters-long
NEXTAUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}

# AI Provider (Use Gemini - easier!)
AI_PROVIDER=GEMINI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Vector Database
CHROMA_URL=http://chromadb:8000
CHROMA_COLLECTION=material_chunks
```

### Optional: Using Ollama Instead

If you want to use Ollama:

```env
AI_PROVIDER=OLLAMA
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=mistral:7b
```

Then deploy Ollama as a separate service.

## Step 7: Add ChromaDB (Optional)

If you need ChromaDB:

1. Click "+ New" → "Empty Service"
2. Use Docker image: `chromadb/chroma:latest`
3. Add environment variables:
   ```env
   IS_PERSISTENT=TRUE
   ANONYMIZED_TELEMETRY=FALSE
   ```
4. Update app's `CHROMA_URL` to point to ChromaDB service

## Step 8: Add Ollama (Optional - Only if using Ollama)

If you want to use Ollama instead of Gemini:

1. Click "+ New" → "Empty Service"
2. Use Docker image: `ollama/ollama:latest`
3. Add volume for model storage
4. Pull model: `ollama pull mistral:7b`
5. Update app's `OLLAMA_URL` to point to Ollama service

**Note**: Using Gemini is much easier and recommended for production!

## Step 9: Run Database Migrations

After deployment:

1. Go to your app service
2. Click "Deployments" → Latest deployment
3. Click "View Logs"
4. Or use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run bunx prisma migrate deploy
```

Or via Railway dashboard:
1. Go to your app service
2. Click "Settings" → "Deploy"
3. Add deploy command: `bunx prisma migrate deploy && bun server.js`

## Step 10: Configure Custom Domain (Optional)

1. Go to your app service
2. Click "Settings" → "Networking"
3. Click "Generate Domain" (free)
4. Or add custom domain:
   - Click "Custom Domain"
   - Add your domain
   - Update DNS records as instructed

## Step 11: Update NEXTAUTH_URL

After getting your domain:

1. Go to "Variables"
2. Update `NEXTAUTH_URL`:
   ```env
   NEXTAUTH_URL=https://your-app.railway.app
   ```
3. Redeploy (Railway will auto-redeploy)

## Step 12: Verify Deployment

1. Visit your Railway URL
2. Test login
3. Test question generation
4. Test question paper validation
5. Check logs for any errors

## Troubleshooting

### Issue: Build Fails

**Check**:
- Dockerfile exists
- All dependencies in package.json
- Build logs in Railway dashboard

**Solution**:
```bash
# Test build locally
docker build -t test .
```

### Issue: Database Connection Failed

**Check**:
- `DATABASE_URL` is set correctly
- Database service is running
- Connection string format

**Solution**:
- Verify `DATABASE_URL` uses `${{Postgres.DATABASE_URL}}`
- Check database is deployed
- Check network settings

### Issue: App Crashes on Start

**Check logs**:
1. Go to app service
2. Click "Deployments" → Latest
3. Click "View Logs"

**Common causes**:
- Missing environment variables
- Database not ready
- Port configuration

### Issue: File Uploads Not Working

**Solution**:
- Railway provides persistent storage
- Check `/app/src/uploads` directory exists
- Verify file permissions

## Railway CLI Commands

```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# View logs
railway logs

# Run command
railway run bunx prisma migrate deploy

# Open shell
railway shell
```

## Cost Estimation

**Free Tier**:
- $5 credit/month
- 500 hours of usage
- Good for testing

**Hobby Plan** ($5/month):
- 512MB RAM
- 1GB storage
- Good for small deployments

**Pro Plan** ($20/month):
- 8GB RAM
- 100GB storage
- Better for production

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Test all features
3. ✅ Set up monitoring
4. ✅ Configure backups
5. ✅ Add custom domain
6. ✅ Set up CI/CD (optional)

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Your app logs: Check Railway dashboard

---

**Ready to deploy?** Follow these steps and you'll be live in minutes! 🚀

