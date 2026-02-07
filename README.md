# DevAlert - Hackathon & Internship Alert Platform

A comprehensive web application for discovering hackathons and internships across India, powered by AI-driven social media scanning.

## Features

- 🎯 **AI-Powered Scanning**: Gemini AI automatically scans for new hackathons and internships
- 👨‍💼 **Admin Dashboard**: Review and approve/reject opportunities
- 👥 **Applicant Interface**: Browse and apply to approved opportunities
- 🎨 **Modern UI/UX**: Black & white theme with Google Cloud-inspired design
- 🔐 **Authentication**: Secure JWT-based authentication with role-based access
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **Flask-JWT-Extended** - JWT authentication
- **Gemini AI** - AI-powered opportunity scanning
- **APScheduler** - Automated background tasks

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client

## Prerequisites

- Python 3.14.0 or higher
- Node.js 24.12.0 or higher
- Gemini AI API key (optional, for AI scanning)

## Installation & Setup

### 1. Clone the Repository

```bash
cd d:/ADD(DevAlert)
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment (already created)
# Activate virtual environment
.venv\Scripts\activate

# Install dependencies (already installed)
pip install -r requirements.txt
```

### 3. Environment Configuration

Edit the `.env` file in the root directory:

```env
FLASK_APP=backend/app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here  # Optional
DATABASE_URL=sqlite:///instance/devalert.db
```

### 4. Frontend Setup

The frontend will be automatically built when you run the Flask app for the first time.

If you want to manually build:

```bash
cd frontend
npm install  # Already installed
npm run build
```

## Running the Application

### Auto-Start (Recommended)

Simply run the Flask app, and it will automatically build and serve the React frontend:

```bash
cd backend
.venv\Scripts\activate
python app.py
```

The application will be available at:
- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api

### Manual Development Mode

If you want to run frontend and backend separately for development:

**Terminal 1 - Backend:**
```bash
cd backend
.venv\Scripts\activate
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend dev server: http://localhost:5173

## Default Users

On first run, you'll need to register users. Create an admin account:

1. Go to http://localhost:5000
2. Click "Register"
3. Fill in details and select "Admin" role
4. Login with your credentials

## Features Guide

### Admin Workflow

1. **Login** as admin
2. **Navigate to Admin Panel**
3. **Review pending opportunities** (from AI scans or manual entries)
4. **Approve or Reject** each opportunity
5. **Trigger AI Scan** manually using the "Trigger AI Scan" button

### Applicant Workflow

1. **Login** as applicant
2. **Browse opportunities** on the Applicant page
3. **Filter** by type (hackathons/internships) or location
4. **View details** in modal
5. **Apply** directly through external links

### AI Scanning

The AI scanner runs automatically:
- **Daily at 9:00 AM** - Morning scan
- **Daily at 6:00 PM** - Evening scan

You can also trigger manual scans from the Admin panel.

## Project Structure

```
d:/ADD(DevAlert)/
├── backend/
│   ├── app.py                 # Main Flask app with auto-start
│   ├── config.py              # Configuration
│   ├── models.py              # Database models
│   ├── routes/                # API routes
│   │   ├── auth.py
│   │   ├── hackathons.py
│   │   ├── internships.py
│   │   └── admin.py
│   ├── services/              # Business logic
│   │   ├── ai_scanner.py     # Gemini AI integration
│   │   └── scheduler.py      # Background tasks
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API client
│   │   └── index.css         # Global styles
│   ├── package.json
│   └── vite.config.js
└── .env                      # Environment variables
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Hackathons
- `GET /api/hackathons` - List hackathons
- `GET /api/hackathons/:id` - Get hackathon details
- `POST /api/hackathons` - Create hackathon (admin)
- `PUT /api/hackathons/:id` - Update hackathon (admin)
- `DELETE /api/hackathons/:id` - Delete hackathon (admin)

### Internships
- `GET /api/internships` - List internships
- `GET /api/internships/:id` - Get internship details
- `POST /api/internships` - Create internship (admin)
- `PUT /api/internships/:id` - Update internship (admin)
- `DELETE /api/internships/:id` - Delete internship (admin)

### Admin
- `GET /api/admin/pending` - Get pending opportunities
- `POST /api/admin/approve/:type/:id` - Approve opportunity
- `POST /api/admin/reject/:type/:id` - Reject opportunity
- `GET /api/admin/stats` - Get dashboard statistics
- `POST /api/admin/trigger-scan` - Manually trigger AI scan

## Troubleshooting

### Frontend not loading
- Make sure the frontend is built: `cd frontend && npm run build`
- Check that `frontend/dist` directory exists
- Restart the Flask server

### Database errors
- Delete `backend/instance/devalert.db` and restart to recreate
- Check file permissions

### AI scanning not working
- Verify `GEMINI_API_KEY` is set in `.env`
- Check backend logs for error messages
- Try manual scan from Admin panel

## Contributing

This is a hackathon/internship project. Feel free to extend and customize!

## License

MIT License - feel free to use for your projects!
