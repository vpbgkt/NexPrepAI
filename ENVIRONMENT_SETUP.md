# NexPrep Environment Configuration

This document explains how to use the automated environment configuration system for NexPrep.

## 🎯 Problem Solved

No more manual editing of configuration files when switching between development and production environments. The system automatically uses the correct settings based on how you build and run the application.

## 🔧 Development Setup

### Quick Start
```powershell
# Run the development setup script
.\dev-start.ps1
```

### Manual Start
```powershell
# Install all dependencies
npm run install:all

# Start both frontend and backend in development mode
npm run dev

# Or start individually:
npm run dev:frontend  # Angular dev server with proxy
npm run dev:backend   # Node.js backend with development settings
```

**Development URLs:**
- Frontend: http://localhost:4200
- Backend API: http://localhost:5000
- API calls from frontend: `/api/*` (proxied to backend)

## 🚀 Production Deployment

### On Your Server

1. **Initial Setup** (one time):
```bash
# Copy production environment file and update it
cp backend/.env.prod backend/.env.prod.local
nano backend/.env.prod.local  # Update with your actual production values

# Install PM2 globally if not already installed
npm install -g pm2
```

2. **Deploy**:
```bash
# Use the automated deployment script
./deploy.sh

# Or manually:
git pull
cd admin-panel && npm ci && npm run build:prod
pm2 restart nexprep-backend --env production
```

### Manual Production Commands
```bash
# Start backend in production mode
pm2 start ecosystem.config.js --env production

# Build frontend for production
cd admin-panel && npm run build:prod

# View logs
pm2 logs nexprep-backend
```

## 📁 File Structure

```
NexPrep/
├── admin-panel/
│   ├── src/environments/
│   │   ├── environment.ts      # Development: http://localhost:5000/api
│   │   └── environment.prod.ts # Production: /api (relative)
│   └── proxy.conf.json         # Development proxy config
├── backend/
│   ├── .env.dev               # Development environment variables
│   └── .env.prod              # Production environment template
├── ecosystem.config.js        # PM2 configuration
├── deploy.sh                  # Production deployment script
└── dev-start.ps1             # Windows development script
```

## 🔄 How It Works

### Frontend (Angular)
- **Development**: Uses `environment.ts` → API calls go to `http://localhost:5000/api`
- **Production**: Uses `environment.prod.ts` → API calls go to `/api` (relative)
- Proxy configuration handles CORS in development

### Backend (Node.js)
- **Development**: Loads `.env.dev` → CORS allows `http://localhost:4200`
- **Production**: Loads `.env.prod` → CORS allows your production domain
- PM2 ecosystem config manages environment variables

## 🛠️ Available Scripts

### Root Level
```bash
npm run dev              # Start both frontend and backend in dev mode
npm run build            # Build frontend for production
npm run start:prod       # Start backend in production mode with PM2
npm run start:dev        # Start backend in development mode with PM2
npm run install:all      # Install dependencies for all projects
```

### Frontend (admin-panel)
```bash
npm run start           # Development server with proxy
npm run build:prod      # Production build
```

### Backend
```bash
npm run dev             # Development with nodemon
npm run start:prod      # Production mode
```

## 🔒 Security Notes

- `.env.dev` is safe to commit (contains only localhost settings)
- `.env.prod` should NOT be committed (contains production secrets)
- Update `.env.prod` on your server with real database URLs, API keys, etc.

## 🐛 Troubleshooting

### Port Already in Use
```powershell
# Check what's using the ports
netstat -an | findstr ":4200"
netstat -an | findstr ":5000"

# Kill processes if needed
taskkill /F /PID <process_id>
```

### CORS Issues
- In development: Check that proxy.conf.json is being used
- In production: Verify ALLOWED_ORIGIN in ecosystem.config.js matches your domain

### Build Issues
```bash
# Clean install
npm run clean
npm run install:all
```

## 📝 Customization

### Adding New Environment Variables

1. **Backend**: Add to `.env.dev` and `.env.prod`
2. **Frontend**: Add to `environment.ts` and `environment.prod.ts`
3. **PM2**: Add to `ecosystem.config.js` under `env` and `env_production`

### Different Production Domain
Update these files with your actual domain:
- `backend/.env.prod` → `ALLOWED_ORIGIN`
- `ecosystem.config.js` → `env_production.ALLOWED_ORIGIN`
