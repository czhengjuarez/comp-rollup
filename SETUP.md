# Cloudflare R2 Backend Setup

## Prerequisites
1. Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`

## Setup Steps

### 1. Install Wrangler (if not already installed)
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Create R2 Buckets
```bash
# Create production bucket
wrangler r2 bucket create comp-rollup-projects

# Create development bucket
wrangler r2 bucket create comp-rollup-projects-dev
```

### 4. Deploy the Worker
```bash
# Deploy to development
wrangler deploy --env development

# Deploy to production
wrangler deploy --env production
```

### 5. Update Frontend API URL
After deployment, update the `API_BASE_URL` in `/src/utils/projectStorage.js`:
```javascript
const API_BASE_URL = 'https://comp-rollup-api.YOUR-SUBDOMAIN.workers.dev'
```

Replace `YOUR-SUBDOMAIN` with your actual Cloudflare Workers subdomain.

## API Endpoints

- `POST /api/projects/save` - Save project data
- `POST /api/projects/load` - Load project data
- `GET /api/projects/list` - List all projects (debug only)
- `GET /api/health` - Health check

## Testing

1. Deploy the worker
2. Update the API URL in the frontend
3. Test save/load functionality
4. Verify cross-browser/device sharing works

## Security Notes

- Access keys are verified on the server
- CORS is enabled for frontend access
- No authentication beyond access keys (as designed)
- Projects are stored as `{projectName}.json` in R2
