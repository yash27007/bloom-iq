# Deployment Platforms Guide

## Platform Comparison

| Platform | Docker Support | PostgreSQL | Ollama Support | File Storage | Cost | Best For |
|----------|---------------|------------|----------------|--------------|------|----------|
| **Railway** | ✅ Excellent | ✅ Built-in | ✅ Yes | ✅ Volumes | $5-20/mo | **Recommended** |
| **Render** | ✅ Good | ✅ Built-in | ✅ Yes | ✅ Volumes | $7-25/mo | Great alternative |
| **DigitalOcean** | ✅ Excellent | ✅ Managed | ✅ Yes | ✅ Spaces | $12-25/mo | More control |
| **Fly.io** | ✅ Excellent | ✅ External | ✅ Yes | ✅ Volumes | $5-15/mo | Global edge |
| **Vercel** | ❌ Limited | ❌ External | ❌ No | ❌ No | $20+/mo | Not recommended |

## 🚂 Railway (Recommended)

### Why Railway?
- ✅ Native Docker Compose support
- ✅ Built-in PostgreSQL
- ✅ Persistent volumes for uploads
- ✅ Easy Ollama deployment
- ✅ Simple setup
- ✅ Free tier available

### Deployment Steps

#### 1. Prepare Your Repository

```bash
# Make sure all changes are committed
git add .
git commit -m "Ready for deployment"
git push
```

#### 2. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `bloom-iq` repository

#### 3. Configure Services

Railway will detect your `docker-compose.yml`. You'll need to set up:

**A. PostgreSQL Service**
- Railway will auto-create PostgreSQL
- Copy the connection string

**B. App Service**
- Add environment variables (see below)
- Set up volumes for uploads

**C. Ollama Service** (if using Ollama)
- Deploy Ollama container
- Or use Gemini instead (recommended for production)

**D. ChromaDB Service**
- Deploy ChromaDB container

#### 4. Environment Variables

Add these in Railway dashboard:

```env
# Database (Railway auto-provides)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}

# Authentication
NEXTAUTH_SECRET=your-secret-minimum-32-characters
NEXTAUTH_URL=https://your-app.railway.app

# AI Provider (Use Gemini for production - easier!)
AI_PROVIDER=GEMINI
GEMINI_API_KEY=your_gemini_api_key

# Or use Ollama (more complex)
# AI_PROVIDER=OLLAMA
# OLLAMA_URL=http://ollama:11434

# Vector Database
CHROMA_URL=http://chromadb:8000
CHROMA_COLLECTION=material_chunks
```

#### 5. Deploy

Railway will automatically:
- Build your Docker image
- Deploy all services
- Set up networking
- Provide public URL

#### 6. Run Migrations

After deployment, run:
```bash
# Via Railway CLI or dashboard
railway run bunx prisma migrate deploy
```

### Railway Pricing
- **Hobby**: $5/month (500 hours free)
- **Pro**: $20/month (unlimited)

---

## 🎨 Render (Great Alternative)

### Why Render?
- ✅ Docker support
- ✅ Built-in PostgreSQL
- ✅ Persistent disks
- ✅ Free tier available
- ✅ Good documentation

### Deployment Steps

#### 1. Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Blueprint"

#### 2. Connect Repository
- Select your GitHub repo
- Render will detect `docker-compose.yml`

#### 3. Configure Services

**A. Web Service (App)**
- Type: Web Service
- Build Command: `docker compose build`
- Start Command: `docker compose up`
- Environment: Add variables (see Railway section)

**B. PostgreSQL**
- Type: PostgreSQL
- Render auto-creates
- Copy connection string

**C. Background Workers** (if needed)
- Type: Background Worker
- For PDF processing jobs

#### 4. Environment Variables
Same as Railway (see above)

#### 5. Deploy
Render will build and deploy automatically

### Render Pricing
- **Free**: Limited hours/month
- **Starter**: $7/month
- **Standard**: $25/month

---

## ☁️ DigitalOcean App Platform

### Why DigitalOcean?
- ✅ Full Docker support
- ✅ Managed PostgreSQL
- ✅ Spaces for file storage
- ✅ More control
- ✅ Predictable pricing

### Deployment Steps

#### 1. Create App
1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Create new app
3. Connect GitHub repo

#### 2. Configure Components

**A. App Component**
- Source: Dockerfile
- Build command: `docker build -t app .`
- Run command: `docker run app`

**B. Database**
- Add managed PostgreSQL
- Copy connection string

**C. Spaces** (for file uploads)
- Create Spaces bucket
- Update app to use Spaces

#### 3. Environment Variables
Same as Railway

#### 4. Deploy
DigitalOcean will build and deploy

### DigitalOcean Pricing
- **Basic**: $12/month
- **Professional**: $25/month

---

## 🚀 Fly.io (Global Edge)

### Why Fly.io?
- ✅ Docker support
- ✅ Global edge deployment
- ✅ Persistent volumes
- ✅ Good for scaling

### Deployment Steps

#### 1. Install Fly CLI
```bash
# Windows
iwr https://fly.io/install.ps1 -useb | iex

# Mac/Linux
curl -L https://fly.io/install.sh | sh
```

#### 2. Create App
```bash
fly launch
# Follow prompts
```

#### 3. Configure fly.toml
```toml
app = "bloom-iq"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[[services]]
  internal_port = 3000
  protocol = "tcp"
```

#### 4. Deploy
```bash
fly deploy
```

### Fly.io Pricing
- **Free**: 3 shared VMs
- **Paid**: $5-15/month

---

## ⚠️ Vercel (Not Recommended)

### Why Not Vercel?
- ❌ No Docker Compose support
- ❌ No long-running processes (Ollama won't work)
- ❌ No persistent file storage
- ❌ Serverless function timeouts
- ❌ Would need external services for everything

### If You Must Use Vercel:
You'd need:
- External PostgreSQL (Supabase, Neon)
- External file storage (S3, Cloudinary)
- External Ollama service (separate server)
- External job queue (Inngest)

**Not recommended** for this application.

---

## 🎯 Recommended Deployment Strategy

### Option 1: Railway (Easiest) ⭐
**Best for**: Quick deployment, Docker Compose support

**Steps**:
1. Push code to GitHub
2. Connect Railway to repo
3. Add environment variables
4. Deploy!

**Cost**: $5-20/month

### Option 2: Render (Good Alternative)
**Best for**: Similar to Railway, good free tier

**Steps**: Similar to Railway

**Cost**: $7-25/month

### Option 3: DigitalOcean (More Control)
**Best for**: When you need more control and predictable pricing

**Steps**: More manual setup

**Cost**: $12-25/month

---

## 🚀 Quick Start: Railway Deployment

### Step-by-Step

1. **Prepare Code**
   ```bash
   git add .
   git commit -m "Ready for Railway deployment"
   git push origin main
   ```

2. **Create Railway Project**
   - Go to railway.app
   - New Project → GitHub repo
   - Select `bloom-iq`

3. **Add PostgreSQL**
   - Click "+ New" → "Database" → "PostgreSQL"
   - Railway auto-creates

4. **Deploy App**
   - Click "+ New" → "GitHub Repo"
   - Select your repo
   - Railway detects Docker

5. **Configure Environment**
   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   DIRECT_URL=${{Postgres.DATABASE_URL}}
   NEXTAUTH_SECRET=your-secret-32-chars
   NEXTAUTH_URL=https://your-app.railway.app
   AI_PROVIDER=GEMINI
   GEMINI_API_KEY=your_key
   CHROMA_URL=http://chromadb:8000
   ```

6. **Add ChromaDB** (if needed)
   - Deploy as separate service
   - Or use external ChromaDB

7. **Deploy Ollama** (if using Ollama)
   - Deploy as separate service
   - Or use Gemini (easier!)

8. **Run Migrations**
   ```bash
   railway run bunx prisma migrate deploy
   ```

9. **Done!** 🎉

---

## 📝 Production Checklist

Before deploying:

- [ ] All environment variables set
- [ ] Database migrations ready
- [ ] `NEXTAUTH_SECRET` is strong (32+ chars)
- [ ] `NEXTAUTH_URL` matches your domain
- [ ] Gemini API key added (if using Gemini)
- [ ] File upload directory configured
- [ ] SSL/HTTPS enabled (automatic on most platforms)
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Error logging configured

---

## 🔧 Platform-Specific Configurations

### Railway
- Uses `railway.toml` (optional)
- Auto-detects Docker Compose
- Built-in PostgreSQL

### Render
- Uses `render.yaml` (optional)
- Supports Docker Compose
- Built-in PostgreSQL

### DigitalOcean
- Uses `app.yaml`
- Full Docker support
- Managed PostgreSQL

---

## 💡 Pro Tips

1. **Use Gemini for Production**: Easier than Ollama
2. **Start with Railway**: Simplest setup
3. **Use Managed PostgreSQL**: Don't self-host
4. **Set up Monitoring**: Track errors and performance
5. **Configure Backups**: Automate database backups
6. **Use Environment Variables**: Never hardcode secrets
7. **Test Before Deploying**: Test locally first

---

## 🆘 Troubleshooting

### Database Connection Issues
- Check connection string format
- Verify database is running
- Check network/firewall settings

### Build Failures
- Check Dockerfile
- Verify all dependencies
- Check build logs

### Environment Variables Not Working
- Restart service after adding vars
- Check variable names (case-sensitive)
- Verify no typos

---

## 📚 Next Steps

1. Choose a platform (Railway recommended)
2. Follow platform-specific guide
3. Deploy and test
4. Set up monitoring
5. Configure backups

Need help? Check platform documentation or create an issue!

