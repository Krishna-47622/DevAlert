from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    """User model for authentication and authorization"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)  # Nullable for OAuth users
    role = db.Column(db.String(20), default='participant') # admin, hoster, participant
    organization = db.Column(db.String(200)) # For hosters
    designation = db.Column(db.String(200)) # For hosters
    is_host_approved = db.Column(db.Boolean, default=False)
    requested_host_access = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Email Verification
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_token = db.Column(db.String(255), nullable=True)
    email_verification_sent_at = db.Column(db.DateTime, nullable=True)
    
    # Password Reset
    password_reset_token = db.Column(db.String(255), nullable=True)
    password_reset_expires_at = db.Column(db.DateTime, nullable=True)
    
    # Two-Factor Authentication
    two_factor_enabled = db.Column(db.Boolean, default=False)
    two_factor_secret = db.Column(db.String(32), nullable=True)
    
    # OAuth Integration
    oauth_provider = db.Column(db.String(20), nullable=True)  # 'google', 'github', or None
    oauth_provider_id = db.Column(db.String(255), nullable=True)  # Provider's user ID
    
    # Personalization & Restrictions
    full_name = db.Column(db.String(150), nullable=True)
    display_name = db.Column(db.String(80), nullable=True)
    theme_preference = db.Column(db.String(20), default='dark')
    
    # Name Update Rate Limiting
    full_name_update_count = db.Column(db.Integer, default=0)
    full_name_window_start = db.Column(db.DateTime, nullable=True)
    
    # Resume for AI Match Score
    resume_text = db.Column(db.Text, nullable=True)
    resume_link = db.Column(db.String(500), nullable=True)
    resume_updated_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    applications = db.relationship('Application', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'organization': self.organization,
            'designation': self.designation,
            'is_host_approved': self.is_host_approved,
            'requested_host_access': self.requested_host_access,
            'email_verified': self.email_verified,
            'two_factor_enabled': self.two_factor_enabled,
            'oauth_provider': self.oauth_provider,
            'full_name': self.full_name,
            'display_name': self.display_name,
            'theme_preference': self.theme_preference,
            'resume_text': self.resume_text,
            'resume_link': self.resume_link,
            'resume_updated_at': self.resume_updated_at.isoformat() if self.resume_updated_at else None,
            'created_at': self.created_at.isoformat()
        }


class Application(db.Model):
    """Application tracking model for DevAlert-hosted events"""
    __tablename__ = 'applications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Optional for non-logged users
    event_type = db.Column(db.String(20), nullable=False)  # 'hackathon' or 'internship'
    event_id = db.Column(db.Integer, nullable=False)
    
    # Application details
    name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), nullable=False)
    resume_link = db.Column(db.String(500))
    cover_letter = db.Column(db.Text)
    
    status = db.Column(db.String(20), default='pending')  # pending, reviewed, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'event_type': self.event_type,
            'event_id': self.event_id,
            'name': self.name,
            'email': self.email,
            'resume_link': self.resume_link,
            'cover_letter': self.cover_letter,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }
        
        # Try to add event title for easier display
        try:
            from models import Hackathon, Internship
            if self.event_type == 'hackathon':
                event = Hackathon.query.get(self.event_id)
                data['event_title'] = event.title if event else 'Deleted Hackathon'
            else:
                event = Internship.query.get(self.event_id)
                data['event_title'] = event.title if event else 'Deleted Internship'
        except:
            data['event_title'] = 'Multiple Events'
            
        return data


class Hackathon(db.Model):
    """Hackathon opportunity model"""
    __tablename__ = 'hackathons'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    organizer = db.Column(db.String(200))
    location = db.Column(db.String(200), nullable=False)
    mode = db.Column(db.String(20), default='hybrid')  # online, offline, hybrid
    deadline = db.Column(db.DateTime, nullable=False)
    start_date = db.Column(db.DateTime)
    end_date = db.Column(db.DateTime)
    prize_pool = db.Column(db.String(100))
    registration_link = db.Column(db.String(500))
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    source = db.Column(db.String(100), default='manual')  # manual, ai_scan
    host_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # ID of user who posted
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    applications_rel = db.relationship('Application', 
                                    primaryjoin="and_(Application.event_id==Hackathon.id, Application.event_type=='hackathon')",
                                    foreign_keys=[Application.event_id],
                                    viewonly=True)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'organizer': self.organizer,
            'location': self.location,
            'mode': self.mode,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'prize_pool': self.prize_pool,
            'registration_link': self.registration_link,
            'status': self.status,
            'source': self.source,
            'host_id': self.host_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Internship(db.Model):
    """Internship opportunity model"""
    __tablename__ = 'internships'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    company = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    location = db.Column(db.String(200), nullable=False)
    mode = db.Column(db.String(20), default='hybrid')  # online, offline, hybrid
    duration = db.Column(db.String(50))  # e.g., "3 months", "6 months"
    stipend = db.Column(db.String(100))
    deadline = db.Column(db.DateTime, nullable=False)
    start_date = db.Column(db.DateTime)
    skills_required = db.Column(db.Text)  # Comma-separated skills
    application_link = db.Column(db.String(500))
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    source = db.Column(db.String(100), default='manual')  # manual, ai_scan
    host_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # ID of user who posted
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    applications_rel = db.relationship('Application', 
                                    primaryjoin="and_(Application.event_id==Internship.id, Application.event_type=='internship')",
                                    foreign_keys=[Application.event_id],
                                    viewonly=True)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'company': self.company,
            'description': self.description,
            'location': self.location,
            'mode': self.mode,
            'duration': self.duration,
            'stipend': self.stipend,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'skills_required': self.skills_required,
            'application_link': self.application_link,
            'status': self.status,
            'source': self.source,
            'host_id': self.host_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Notification(db.Model):
    """Notification model for alerting users about new opportunities"""
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    event_type = db.Column(db.String(20), nullable=False)  # 'hackathon' or 'internship'
    event_id = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'event_type': self.event_type,
            'event_id': self.event_id,
            'title': self.title,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }
class TrackedEvent(db.Model):
    """Model for tracking user interest and application status for opportunities"""
    __tablename__ = 'tracked_events'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    event_type = db.Column(db.String(20), nullable=False)  # 'hackathon' or 'internship'
    event_id = db.Column(db.Integer, nullable=False)
    
    # Status: Saved, To Apply, Applied, Interviewing, Offered, Rejected
    status = db.Column(db.String(20), default='Saved')
    notes = db.Column(db.Text, nullable=True)
    
    # AI Match Score
    match_score = db.Column(db.Integer, nullable=True) # 0-100
    match_explanation = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user
    user_rel = db.relationship('User', backref=db.backref('tracked_items', lazy=True))

    def to_dict(self):
        """Convert to dictionary with event details"""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'event_type': self.event_type,
            'event_id': self.event_id,
            'status': self.status,
            'notes': self.notes,
            'match_score': self.match_score,
            'match_explanation': self.match_explanation,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
        
        # Add event details
        try:
            if self.event_type == 'hackathon':
                event = Hackathon.query.get(self.event_id)
                if event:
                    data['event_details'] = {
                        'title': event.title,
                        'organizer': event.organizer,
                        'deadline': event.deadline.isoformat() if event.deadline else None,
                        'link': event.registration_link
                    }
            else:
                event = Internship.query.get(self.event_id)
                if event:
                    data['event_details'] = {
                        'title': event.title,
                        'company': event.company,
                        'deadline': event.deadline.isoformat() if event.deadline else None,
                        'link': event.application_link
                    }
        except Exception as e:
            data['event_details'] = {'error': str(e)}
            
        return data
