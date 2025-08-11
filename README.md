# VR Boxing Tournament Bracket System

A real-time, interactive tournament bracket system for VR Boxing events. This application allows you to create and manage single-elimination tournaments with up to 32 players.

## Features

- Real-time updates across multiple devices using WebSockets
- Support for up to 32 players
- Automatic bracket generation
- Responsive design that works on desktop and mobile
- No database required - all state is maintained in memory

## Deploying to Render

### Prerequisites

1. A [Render](https://render.com) account (free tier available)
2. A GitHub, GitLab, or Bitbucket account with your code pushed to a repository

### Deployment Steps

1. **Fork this repository** to your own GitHub/GitLab/Bitbucket account

2. **Sign in to Render**
   - Go to [https://render.com](https://render.com)
   - Sign up or log in with your GitHub/GitLab/Bitbucket account

3. **Create a new Web Service**
   - Click the "New +" button
   - Select "Web Service"
   - Connect your repository where you forked this project

4. **Configure your Web Service**
   - **Name**: `vr-boxing-tournament` (or your preferred name)
   - **Region**: Choose the one closest to your users
   - **Branch**: `main` (or your default branch)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
   - **Auto-Deploy**: Yes (if you want automatic deployments on push)

5. **Advanced Settings**
   - Add an environment variable:
     - Key: `NODE_ENV`
     - Value: `production`
   - The port is already configured to use the `PORT` environment variable provided by Render

6. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - Once deployed, you'll get a URL like `https://your-app-name.onrender.com`

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Open [http://localhost:8000](http://localhost:8000) in your browser

## Environment Variables

- `PORT`: The port the server will listen on (default: 8000)
- `NODE_ENV`: Set to 'production' in production environments

## Troubleshooting

- If you see WebSocket connection errors, make sure your Render instance is using HTTPS and the WebSocket URL is using `wss://`
- The free tier on Render puts your app to sleep after 15 minutes of inactivity
- Check the logs in your Render dashboard for any deployment or runtime errors

## License

MIT
