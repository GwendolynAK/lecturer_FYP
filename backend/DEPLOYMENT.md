# Backend Deployment Guide - Render

## Prerequisites

1. **GitHub Account**: Your code should be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Node.js Knowledge**: Basic understanding of Node.js deployment

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure your backend folder contains:
- ✅ `package.json` with proper scripts
- ✅ `server.js` (main entry point)
- ✅ `render.yaml` (optional, for automated setup)
- ✅ `.gitignore` (exclude node_modules, .env)

### 2. Deploy on Render

#### Option A: Manual Setup (Recommended for first time)

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your GitHub account
   - Select your repository
   - Choose the branch (usually `main`)

3. **Configure Service**
   - **Name**: `attendance-system-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

4. **Set Environment Variables**
   - Click "Environment" tab
   - Add these variables:
     ```
     NODE_ENV=production
     ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3000
     WS_HEARTBEAT_INTERVAL=25000
     WS_HEARTBEAT_TIMEOUT=5000
     LOG_LEVEL=info
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete (2-5 minutes)

#### Option B: Automated Setup (Using render.yaml)

1. **Push render.yaml to your repo**
2. **Go to Render Dashboard**
3. **Click "New +" → "Blueprint"**
4. **Select your repository**
5. **Render will auto-configure everything**

### 3. Get Your Backend URL

After deployment, you'll get a URL like:
```
https://attendance-system-backend.onrender.com
```

### 4. Update Frontend Configuration

Update your frontend `config.js`:

```javascript
const config = {
  SERVER_IP: 'attendance-system-backend.onrender.com', // Your Render URL
  SERVER_PORT: 443, // HTTPS port
  getWebSocketUrl: () => `wss://${config.SERVER_IP}`,
  getApiUrl: () => `https://${config.SERVER_IP}/api`,
};
```

### 5. Test Your Deployment

1. **Health Check**: Visit `https://your-backend-url.onrender.com/api/health`
2. **WebSocket Test**: Use browser console or a WebSocket testing tool
3. **Frontend Integration**: Test with your React app

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Production mode | `production` |
| `ALLOWED_ORIGINS` | CORS domains | `https://your-frontend.com` |
| `WS_HEARTBEAT_INTERVAL` | WebSocket ping interval | `25000` |
| `WS_HEARTBEAT_TIMEOUT` | WebSocket timeout | `5000` |
| `LOG_LEVEL` | Logging detail | `info` |

## Free Tier Limitations

- **750 hours/month** (about 31 days)
- **Sleeps after 15 minutes** of inactivity
- **Cold starts** on first request after sleep
- **512MB RAM** limit
- **Shared CPU** resources

## Monitoring & Logs

1. **View Logs**: Dashboard → Your Service → Logs
2. **Monitor Performance**: Dashboard → Your Service → Metrics
3. **Set Alerts**: Dashboard → Your Service → Alerts

## Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check `package.json` has correct scripts
   - Ensure all dependencies are listed
   - Check Node.js version compatibility

2. **WebSocket Connection Fails**
   - Verify CORS settings
   - Check if using `wss://` (secure WebSocket)
   - Ensure frontend URL is in `ALLOWED_ORIGINS`

3. **Cold Start Delays**
   - Normal for free tier
   - Consider upgrading to paid plan for better performance

4. **CORS Errors**
   - Update `ALLOWED_ORIGINS` with your frontend domain
   - Include both HTTP and HTTPS versions if needed

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **CORS**: Restrict origins to your domains only
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Consider adding rate limiting for production
5. **Input Validation**: Validate all incoming data

## Next Steps

1. **Deploy Frontend**: Consider Vercel, Netlify, or GitHub Pages
2. **Database**: Add MongoDB Atlas or PostgreSQL for persistent storage
3. **Domain**: Connect custom domain for professional look
4. **SSL**: Automatic with Render
5. **Monitoring**: Set up alerts for downtime

## Support

- **Render Docs**: [docs.render.com](https://docs.render.com)
- **Render Community**: [community.render.com](https://community.render.com)
- **GitHub Issues**: For code-specific problems 