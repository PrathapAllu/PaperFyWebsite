# StepDoc - AI-Powered Documentation Platform

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account (free)
- Stripe account (free)

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   - Copy `.env` file and add your keys
   - Get Supabase keys from [supabase.com](https://supabase.com)
   - Get Stripe keys from [stripe.com](https://stripe.com)

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Visit Application**
   - Frontend: http://localhost:3000
   - API Health: http://localhost:3000/api/health

## 📁 Project Structure

```
stepdoc-website/
├── frontend/           # Static HTML, CSS, JS files
│   ├── index.html     # Main landing page
│   ├── login.html     # Login/Signup page
│   ├── login.js       # Auth functionality
│   └── assets/        # Images, fonts, etc.
├── backend/           # Express.js API server
│   └── server.js      # Main server file
├── package.json       # Dependencies
└── .env              # Environment variables
```

## 🛠 Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **Hosting**: Vercel (Frontend) + Railway (Backend)

## 📋 Implementation Phases

### Phase 1: Basic Setup ✅
- [x] Project structure
- [x] Express server
- [x] Environment configuration

### Phase 2: Authentication (Next)
- [ ] Supabase integration
- [ ] Login/Signup functionality
- [ ] JWT token handling

### Phase 3: Database
- [ ] User profiles
- [ ] Subscription plans
- [ ] Usage tracking

### Phase 4: Payments
- [ ] Stripe integration
- [ ] Subscription checkout
- [ ] Webhook handling

### Phase 5: Deployment
- [ ] Vercel frontend deployment
- [ ] Railway backend deployment
- [ ] Custom domain setup (stepdoc.app)

## 🔧 Development Commands

```bash
npm start          # Production server
npm run dev        # Development server with auto-reload
npm test          # Run tests
npm run build     # Build for production
```

## 🌐 Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set build directory to `frontend`
3. Configure custom domain

### Backend (Railway)
1. Connect GitHub repo to Railway
2. Set root directory to `backend`
3. Configure environment variables

## 📈 Roadmap

- [ ] User dashboard
- [ ] Document generation
- [ ] AI integration
- [ ] Team collaboration
- [ ] Analytics dashboard

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

**Built with ❤️ for better documentation**
