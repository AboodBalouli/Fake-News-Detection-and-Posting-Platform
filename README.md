# 🗞️ Fake News Detection & Posting Platform

A full-stack web application for sharing and analyzing news articles, built with React, TypeScript, FastAPI, and PostgreSQL. Features include user authentication, article posting, commenting system, upvoting, and profile picture management.

![Tech Stack](https://img.shields.io/badge/React-19.1.1-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

## ✨ Features

- 🔐 **User Authentication** - JWT-based registration and login
- 📝 **Article Management** - Create, view, and manage news articles
- 💬 **Comments System** - Threaded comments with user profiles
- 👍 **Upvoting** - Engage with content through upvotes
- 🖼️ **Profile Pictures** - Upload and manage user avatars
- 📱 **Responsive Design** - Works on desktop and mobile
- 🔒 **Secure File Upload** - Profile picture handling with validation
- 🚀 **Modern Stack** - Latest React with TypeScript and Vite

## 🛠️ Tech Stack

### Frontend
- **React 19.1.1** with TypeScript
- **Vite** for build tooling
- **CSS3** for styling
- **Fetch API** for HTTP requests

### Backend
- **FastAPI** with Python
- **SQLAlchemy** ORM
- **PostgreSQL** database
- **JWT** authentication
- **bcrypt** password hashing
- **Uvicorn** ASGI server

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.8+
- **PostgreSQL** database

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd learning_from_documentation
```

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"

# Start backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```bash
# Navigate to frontend (new terminal)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📁 Project Structure

```
learning_from_documentation/
├── backend/                    # FastAPI backend
│   ├── main.py                # Main application file
│   ├── models.py              # Database models
│   ├── database.py            # Database configuration
│   ├── auth.py                # Authentication utilities
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example          # Environment template
│   ├── uploads/              # File upload directory
│   └── profile_pictures/     # Profile picture storage
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── assets/          # Static assets
│   │   └── main.tsx         # App entry point
│   ├── package.json         # Node dependencies
│   ├── vite.config.ts       # Vite configuration
│   └── tsconfig.json        # TypeScript config
├── .gitignore               # Git ignore rules
└── README.md               # This file
```

## 🔧 Configuration

### Backend Environment Variables
Create `backend/.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/fake_news_db
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Database Setup
```sql
-- Create database
CREATE DATABASE fake_news_db;

-- Create user (optional)
CREATE USER fake_news_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE fake_news_db TO fake_news_user;
```

## 🐳 Docker Deployment (Optional)

### Backend Dockerfile
```dockerfile
FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile
```dockerfile
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📚 API Documentation

The API is fully documented with OpenAPI/Swagger. Once the backend is running, visit:
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints
- `POST /api/register` - User registration
- `POST /api/login` - User authentication
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `POST /api/posts/{post_id}/comments` - Add comment
- `POST /api/posts/{post_id}/upvote` - Upvote post
- `POST /api/upload-profile-picture` - Upload profile picture

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚀 Production Deployment

### Backend (Railway/Heroku/DigitalOcean)
1. Set environment variables in your hosting platform
2. Update `DATABASE_URL` to your production database
3. Deploy backend code
4. Run database migrations

### Frontend (Vercel/Netlify)
1. Build the frontend: `npm run build`
2. Deploy the `dist` folder
3. Set up environment variables for API URL

### Environment Variables for Production
```env
# Backend
DATABASE_URL=your-production-db-url
SECRET_KEY=your-production-secret-key

# Frontend (if needed)
VITE_API_URL=https://your-backend-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built as a learning project for React and full-stack development
- Uses modern web development best practices
- Inspired by social media and news aggregation platforms

## 🐛 Bug Reports & Feature Requests

Please use the [GitHub Issues](../../issues) page to report bugs or request features.

## 📧 Contact

Created as part of a React learning journey - feel free to reach out with questions or suggestions!