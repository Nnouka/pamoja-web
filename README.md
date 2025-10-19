# Pamoja - AI-Powered Spaced Repetition Learning Platform

Transform your study materials into personalized challenges with AI-generated questions, spaced repetition, and gamification features.

## Features

### 🤖 AI-Powered Challenge Generation
- Upload notes, PDFs, slides, or voice recordings
- AI automatically generates multiple-choice, true/false, short-answer, and fill-in-the-blank questions
- Customizable difficulty levels and question types

### 📚 Smart Spaced Repetition
- Implementation of the SM-2 algorithm for optimal retention
- Adaptive scheduling based on performance
- Automatic progression from learning to mastery

### 🎮 Gamification & Social Learning
- XP system with leveling up
- Daily streak tracking
- Global leaderboards
- Progress visualization and achievements

### 🔐 Secure Authentication
- Firebase Authentication
- User profiles and progress tracking
- Protected routes and secure data storage

### 📱 Modern UI/UX
- Responsive design with Tailwind CSS
- Clean, intuitive interface
- Real-time progress updates
- Mobile-friendly experience

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Firebase (Auth, Firestore, Storage)
- **AI Integration**: OpenAI API (configurable)
- **Deployment**: Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Firebase project with Authentication, Firestore, and Storage enabled
- OpenAI API key (optional, for enhanced AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pamoja-web
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Configure your `.env.local` file with:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# OpenAI API (optional - falls back to sample questions)
OPENAI_API_KEY=your-openai-api-key-here
```

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Firebase Setup

1. Create a new Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)

2. Enable Authentication with Email/Password provider

3. Create a Firestore database with the following collections:
   - `users` - User profiles and stats
   - `notes` - Uploaded learning materials
   - `challenges` - AI-generated questions
   - `challengeProgress` - Spaced repetition tracking
   - `dailyProgress` - Daily activity tracking

4. Set up Firebase Storage for file uploads

5. Configure Firebase Security Rules for your collections

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── challenges/        # Challenge practice page
│   ├── dashboard/         # Main dashboard
│   ├── leaderboard/       # Global rankings
│   ├── login/            # Authentication
│   ├── notes/            # Notes management
│   ├── signup/           # User registration
│   └── upload/           # File upload interface
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components
│   └── protected-route.tsx
├── contexts/            # React contexts
│   └── auth-context.tsx # Authentication state
├── lib/                 # Utility functions
│   ├── ai-utils.ts      # AI and spaced repetition logic
│   ├── database.ts      # Firebase operations
│   ├── firebase.ts      # Firebase configuration
│   ├── types.ts         # TypeScript type definitions
│   └── utils.ts         # General utilities
└── public/             # Static assets
```

## Key Features Explained

### Spaced Repetition Algorithm
The app uses the SM-2 algorithm to optimize learning retention:
- Questions are scheduled based on difficulty and past performance
- Interval increases with correct answers, resets with mistakes
- Adaptive easiness factor adjusts to individual learning patterns

### AI Challenge Generation
- Supports multiple file formats (PDF, text, audio, images)
- Generates contextually relevant questions
- Maintains consistent difficulty and explanation quality
- Falls back to sample questions if AI service is unavailable

### Gamification System
- XP rewards scale with question difficulty and speed
- Streak bonuses encourage daily practice
- Level progression provides long-term goals
- Leaderboards create friendly competition

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Roadmap

- [ ] Enhanced AI integration with multiple providers
- [ ] Study groups and collaborative learning
- [ ] Mobile app (React Native)
- [ ] Advanced analytics and insights
- [ ] Integration with external learning platforms
- [ ] Voice-based question answering
- [ ] Offline mode support

## Support

For support, create an issue in this repository or reach out via the project discussions.
