# 🎓 Your Edu App

A comprehensive education platform for teachers and students, built with React, Express.js, and Firebase.

## 🌟 Features

### For Teachers
- **Classroom Management**: Create and manage virtual classrooms
- **Course Creation**: Build comprehensive courses with multiple lesson types
- **AI-Powered Content**: Generate lessons using AI with custom parameters
- **Grading System**: Grade assignments, videos, and discussions with custom grade scales
- **Analytics Dashboard**: Track student progress, engagement, and performance
- **YouTube Integration**: Search and embed educational videos
- **File Upload**: Support for documents, videos, and other materials

### For Students
- **Interactive Learning**: Engage with various lesson types (lectures, quizzes, assignments, videos)
- **Progress Tracking**: Monitor your learning journey with detailed analytics
- **Gamification**: Earn points, maintain streaks, and compete on leaderboards
- **Real-time Updates**: See your progress and grades instantly
- **Responsive Design**: Learn on any device, anywhere

## 🚀 Live Demo

- **Frontend**: https://eduspark-app-c1c19.web.app
- **Backend**: Deployed on Railway

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI framework
- **Vite** - Fast build tool
- **Firebase Auth** - User authentication
- **Firestore** - Real-time database
- **CSS Variables** - Modern theming system

### Backend
- **Express.js** - RESTful API server
- **Firebase Admin** - Server-side Firebase integration
- **Google Gemini AI** - AI-powered content generation
- **YouTube API** - Video search and integration
- **Multer** - File upload handling

### Deployment
- **Firebase Hosting** - Frontend hosting
- **Railway** - Backend hosting
- **Firestore** - Database
- **Firebase Auth** - Authentication

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase account
- Railway account (for backend deployment)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/your-edu-app.git
cd your-edu-app
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd client && npm install

# Install backend dependencies
cd ../server && npm install
```

3. **Set up environment variables**

Create `.env` files in both `client/` and `server/` directories:

**client/.env.local**
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**server/.env**
```env
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

4. **Start development servers**
```bash
# Start backend (from server directory)
cd server && npm run dev

# Start frontend (from client directory)
cd client && npm run dev
```

## 🚀 Deployment

### Frontend (Firebase Hosting)
```bash
cd client
npm run build
npx firebase deploy --only hosting
```

### Backend (Railway)
1. Push code to GitHub
2. Connect repository to Railway
3. Set environment variables in Railway dashboard
4. Deploy automatically

## 📁 Project Structure

```
your-edu-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── config/         # Configuration files
│   │   └── firebase.js     # Firebase configuration
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # Express backend
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   ├── services/           # Business logic
│   └── package.json
├── firebase.json           # Firebase configuration
├── railway.json            # Railway configuration
└── README.md
```

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication, Firestore, and Hosting
3. Add your web app to Firebase
4. Update environment variables

### Railway Setup
1. Create Railway account
2. Connect GitHub repository
3. Set root directory to `server/`
4. Add environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Firebase for the amazing backend services
- Railway for free backend hosting
- Google Gemini for AI capabilities
- YouTube API for video integration
- The React and Express.js communities

## 📞 Support

If you have any questions or need help, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for education**
