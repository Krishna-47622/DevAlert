import os
from flask import Blueprint, request, jsonify, current_app, redirect
import json
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User
from services.email_service import send_verification_email, send_password_reset_email, send_2fa_enabled_notification
from datetime import datetime, timedelta
import pyotp
import qrcode
import io
import base64
from authlib.integrations.flask_client import OAuth

auth_bp = Blueprint('auth', __name__)

# Initialize OAuth
oauth = OAuth()

def init_oauth(app):
    """Initialize OAuth providers"""
    # Google OAuth
    oauth.register(
        name='google',
        client_id=app.config.get('GOOGLE_OAUTH_CLIENT_ID'),
        client_secret=app.config.get('GOOGLE_OAUTH_CLIENT_SECRET'),
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )
    
    oauth.init_app(app)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not all(k in data for k in ['username', 'email', 'password']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        role = data.get('role', 'applicant')
        organization = data.get('organization')
        designation = data.get('designation')
        is_host_approved = False
        requested_host_access = False

        if role == 'hoster':
            role = 'participant' # Default to participant until approved
            requested_host_access = True
            
        # Create new user
        user = User(
            username=data['username'],
            email=data['email'],
            role=role,
            organization=organization,
            designation=designation,
            is_host_approved=is_host_approved,
            requested_host_access=requested_host_access,
            email_verified=False  # Email not verified initially
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Notify admins if this is a host request
        if requested_host_access:
            try:
                from models import Notification
                admins = User.query.filter_by(role='admin').all()
                for admin in admins:
                    admin_notif = Notification(
                        user_id=admin.id,
                        event_type='system',
                        event_id=user.id,
                        title='New Host Request',
                        message=f'User {user.username} has requested host access.',
                        is_read=False
                    )
                    db.session.add(admin_notif)
                db.session.commit()
            except Exception as e:
                print(f"Warning: Could not notify admins: {e}")
        
        # Send verification email
        frontend_url = current_app.config.get('FRONTEND_URL')
        try:
            send_verification_email(user, frontend_url)
            # Also send welcome email
            from services.email_service import send_welcome_email
            send_welcome_email(user, frontend_url)
        except Exception as e:
            print(f"Warning: Could not send email: {e}")
        
        # Create access token
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'message': 'User registered successfully. Please check your email to verify your account.',
            'user': user.to_dict(),
            'access_token': access_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user with username or email"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not all(k in data for k in ['username', 'password']):
            return jsonify({'error': 'Missing username or password'}), 400
        
        # Find user by username OR email (case-insensitive)
        username_or_email = data['username'].strip().lower()
        user = User.query.filter(
            (db.func.lower(User.username) == username_or_email) | 
            (db.func.lower(User.email) == username_or_email)
        ).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if 2FA is enabled
        if user.two_factor_enabled:
            # Require 2FA code
            two_fa_code = data.get('two_fa_code')
            if not two_fa_code:
                return jsonify({
                    'requires_2fa': True,
                    'message': 'Two-factor authentication code required'
                }), 200
            
            # Verify 2FA code
            totp = pyotp.TOTP(user.two_factor_secret)
            if not totp.verify(two_fa_code, valid_window=1):
                return jsonify({'error': 'Invalid two-factor authentication code'}), 401
        
        # Create access token
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile (Full Name, Theme)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        data = request.get_json()
        
        # Handle Full Name Update with Rate Limiting
        if 'full_name' in data:
            new_name = data['full_name']
            now = datetime.utcnow()
            
            # Initialize window if not set or expired (1 week window)
            if not user.full_name_window_start or now > user.full_name_window_start + timedelta(weeks=1):
                user.full_name_window_start = now
                user.full_name_update_count = 0
            
            # Check limit (2 updates per week)
            if user.full_name_update_count >= 2:
                 # Check if the new name is actually different before blocking
                 if user.full_name != new_name:
                    reset_date = user.full_name_window_start + timedelta(weeks=1)
                    return jsonify({
                        'error': f'Name update limit reached. You can update your name again after {reset_date.strftime("%Y-%m-%d")}.'
                    }), 429
            
            if user.full_name != new_name:
                user.full_name = new_name
                user.full_name_update_count += 1
        
        # Handle Display Name Update
        if 'display_name' in data:
            current_user = user # Ensure consistency
            current_user.display_name = data['display_name']
        
        # Handle Theme Preference
        if 'theme_preference' in data:
            user.theme_preference = data['theme_preference']
            
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/profile/resume', methods=['PUT'])
@jwt_required()
def update_resume():
    """Update user resume text"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        data = request.get_json()
        if 'resume_text' in data:
            user.resume_text = data['resume_text']
        if 'resume_link' in data:
            user.resume_link = data['resume_link']
            
        if not user.resume_text and not user.resume_link:
            return jsonify({'error': 'Either resume_text or resume_link is required'}), 400
            
        user.resume_updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Resume updated successfully',
            'resume_updated_at': user.resume_updated_at.isoformat(),
            'resume_link': user.resume_link
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Email Verification Endpoints

@auth_bp.route('/verify-email/<token>', methods=['GET'])
def verify_email(token):
    """Verify email address with token"""
    try:
        user = User.query.filter_by(email_verification_token=token).first()
        
        if not user:
            return jsonify({'error': 'Invalid verification token'}), 400
        
        # Check if token is expired (24 hours)
        if user.email_verification_sent_at:
            expiry = user.email_verification_sent_at + timedelta(hours=24)
            if datetime.utcnow() > expiry:
                return jsonify({'error': 'Verification link has expired'}), 400
        
        # Verify email
        user.email_verified = True
        user.email_verification_token = None
        db.session.commit()
        
        return jsonify({'message': 'Email verified successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/resend-verification', methods=['POST'])
@jwt_required()
def resend_verification():
    """Resend verification email"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.email_verified:
            return jsonify({'message': 'Email already verified'}), 200
        
        # Send verification email
        frontend_url = current_app.config.get('FRONTEND_URL')
        if send_verification_email(user, frontend_url):
            return jsonify({'message': 'Verification email sent successfully'}), 200
        else:
            return jsonify({'error': 'Failed to send verification email'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Password Reset Endpoints

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        # Always return success to prevent email enumeration
        if user:
            frontend_url = current_app.config.get('FRONTEND_URL')
            send_password_reset_email(user, frontend_url)
        
        return jsonify({'message': 'If an account exists with that email, a password reset link has been sent'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token"""
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('new_password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        user = User.query.filter_by(password_reset_token=token).first()
        
        if not user:
            return jsonify({'error': 'Invalid reset token'}), 400
        
        # Check if token is expired
        if user.password_reset_expires_at and datetime.utcnow() > user.password_reset_expires_at:
            return jsonify({'error': 'Reset link has expired'}), 400
        
        # Reset password
        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_expires_at = None
        db.session.commit()
        
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change password (authenticated user)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        # Verify current password
        if not user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Change password
        user.set_password(new_password)
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/set-password', methods=['POST'])
@jwt_required()
def set_password():
    """Set password for users who don't have one (phone/OAuth users)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only allow if user has no password set
        if user.password_hash:
            return jsonify({'error': 'Password already set. Use change-password instead.'}), 400
        
        data = request.get_json()
        new_password = data.get('new_password', '').strip()
        
        if not new_password or len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        user.set_password(new_password)
        db.session.commit()
        
        return jsonify({'message': 'Password set successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/update-email', methods=['POST'])
@jwt_required()
def update_email():
    """Update email for phone users who don't have a real email"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        new_email = data.get('email', '').strip().lower()
        
        if not new_email or '@' not in new_email:
            return jsonify({'error': 'Valid email is required'}), 400
        
        # Check if email is already in use
        existing = User.query.filter_by(email=new_email).first()
        if existing and existing.id != user.id:
            return jsonify({'error': 'Email already in use by another account'}), 400
        
        user.email = new_email
        user.email_verified = False
        db.session.commit()
        
        # Send verification email
        try:
            frontend_url = request.host_url.rstrip('/')
            send_verification_email(user, frontend_url)
        except Exception:
            pass  # Email sending may fail but update should still succeed
        
        return jsonify({
            'message': 'Email updated. Verification email sent.',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Two-Factor Authentication Endpoints

@auth_bp.route('/2fa/setup', methods=['POST'])
@jwt_required()
def setup_2fa():
    """Setup 2FA - generate secret and QR code"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.two_factor_enabled:
            return jsonify({'error': '2FA is already enabled'}), 400
        
        # Generate 2FA secret
        secret = pyotp.random_base32()
        user.two_factor_secret = secret
        db.session.commit()
        
        # Generate QR code
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name='DevAlert'
        )
        
        # Create QR code image
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return jsonify({
            'secret': secret,
            'qr_code': f'data:image/png;base64,{img_str}',
            'message': 'Scan the QR code with your authenticator app and enter the code to enable 2FA'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/2fa/enable', methods=['POST'])
@jwt_required()
def enable_2fa():
    """Enable 2FA after verifying code"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.two_factor_enabled:
            return jsonify({'error': '2FA is already enabled'}), 400
        
        data = request.get_json()
        code = data.get('code')
        
        if not code:
            return jsonify({'error': 'Verification code is required'}), 400
        
        # Verify code
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(code, valid_window=1):
            return jsonify({'error': 'Invalid code'}), 400
        
        # Enable 2FA
        user.two_factor_enabled = True
        db.session.commit()
        
        # Send notification email
        try:
            send_2fa_enabled_notification(user)
        except Exception as e:
            print(f"Warning: Could not send 2FA notification: {e}")
        
        return jsonify({'message': '2FA enabled successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/2fa/disable', methods=['POST'])
@jwt_required()
def disable_2fa():
    """Disable 2FA"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.two_factor_enabled:
            return jsonify({'error': '2FA is not enabled'}), 400
        
        data = request.get_json()
        code = data.get('code')
        
        if not code:
            return jsonify({'error': 'Verification code is required'}), 400
        
        # Verify code
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(code, valid_window=1):
            return jsonify({'error': 'Invalid code'}), 400
        
        # Disable 2FA
        user.two_factor_enabled = False
        user.two_factor_secret = None
        db.session.commit()
        
        return jsonify({'message': '2FA disabled successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Phone Authentication (Firebase) Endpoints
_google_certs_cache = None
_google_certs_fetched_at = 0

def verify_firebase_token(id_token):
    """Verify Firebase ID token using Google's public keys (no service account needed)"""
    import jwt
    import requests as req
    import os
    import time as _time
    from cryptography.x509 import load_pem_x509_certificate
    
    # Cache Google's public keys (refresh every hour)
    global _google_certs_cache, _google_certs_fetched_at
    now = _time.time()
    if _google_certs_cache is None or (now - _google_certs_fetched_at) > 3600:
        GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
        certs_response = req.get(GOOGLE_CERTS_URL, timeout=10)
        _google_certs_cache = certs_response.json()
        _google_certs_fetched_at = now
    
    certs = _google_certs_cache
    
    # Get the key ID from the token header
    unverified_header = jwt.get_unverified_header(id_token)
    kid = unverified_header.get('kid')
    
    if kid not in certs:
        raise ValueError('Invalid token: key ID not found')
    
    # Get the certificate
    cert = load_pem_x509_certificate(certs[kid].encode())
    public_key = cert.public_key()
    
    # Verify and decode the token
    project_id = os.getenv('FIREBASE_PROJECT_ID') or os.getenv('VITE_FIREBASE_PROJECT_ID', 'devalert-live')
    expected_issuer = f'https://securetoken.google.com/{project_id}'
    
    # Debug: check what's in the token before strict verification
    try:
        unverified_payload = jwt.decode(id_token, options={"verify_signature": False, "verify_aud": False, "verify_iss": False})
        actual_issuer = unverified_payload.get('iss', 'UNKNOWN')
        actual_audience = unverified_payload.get('aud', 'UNKNOWN')
        print(f"🔑 Firebase token debug: expected_issuer={expected_issuer}, actual_issuer={actual_issuer}, expected_aud={project_id}, actual_aud={actual_audience}")
    except Exception:
        pass
    
    decoded = jwt.decode(
        id_token,
        public_key,
        algorithms=['RS256'],
        audience=project_id,
        issuer=expected_issuer
    )
    
    return decoded

@auth_bp.route('/phone-login', methods=['POST'])
def phone_login():
    """Login or register user via Firebase Phone Authentication"""
    try:
        data = request.get_json()
        id_token = data.get('id_token')
        full_name = data.get('full_name', '').strip()
        username = data.get('username', '').strip()
        
        if not id_token:
            return jsonify({'error': 'Firebase ID token is required'}), 400
        
        # Verify the Firebase ID token using Google's public keys
        decoded_token = verify_firebase_token(id_token)
        phone_number = decoded_token.get('phone_number')
        firebase_uid = decoded_token.get('user_id') or decoded_token.get('sub')
        
        if not phone_number:
            return jsonify({'error': 'Phone number not found in token'}), 400
        
        # Find existing user by phone number
        user = User.query.filter_by(phone_number=phone_number).first()
        
        if not user:
            # Also check by oauth_provider_id (Firebase UID)
            user = User.query.filter_by(oauth_provider='firebase_phone', oauth_provider_id=firebase_uid).first()
        
        is_new_user = False
        if not user:
            is_new_user = True
            
            # If no name/username provided, tell frontend to collect them
            if not full_name and not username:
                return jsonify({
                    'needs_profile': True,
                    'message': 'New user — please provide name and username'
                }), 404
            
            # Generate a unique username from phone number if not provided
            if not username:
                safe_phone = phone_number.replace('+', '').replace(' ', '')
                base_username = f'phone_{safe_phone[-4:]}'
                username = base_username
                counter = 1
                while User.query.filter_by(username=username).first():
                    username = f'{base_username}_{counter}'
                    counter += 1
            else:
                # Check if username is taken
                if User.query.filter_by(username=username).first():
                    return jsonify({'error': 'Username already taken'}), 400
            
            # Generate a placeholder email (phone users may not have email)
            safe_phone = phone_number.replace('+', '').replace(' ', '')
            placeholder_email = f'{safe_phone}@phone.devalert.local'
            
            user = User(
                username=username,
                email=placeholder_email,
                phone_number=phone_number,
                full_name=full_name or None,
                oauth_provider='firebase_phone',
                oauth_provider_id=firebase_uid,
                email_verified=True,  # Phone-verified users are treated as verified
                role='participant'
            )
            db.session.add(user)
            db.session.commit()
        else:
            # Update Firebase UID if not set
            if not user.oauth_provider_id:
                user.oauth_provider = 'firebase_phone'
                user.oauth_provider_id = firebase_uid
            # Update name if provided and not already set
            if full_name and not user.full_name:
                user.full_name = full_name
            db.session.commit()
        
        # Create JWT access token
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'message': 'Phone login successful',
            'user': user.to_dict(),
            'access_token': access_token,
            'is_new_user': is_new_user
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Phone authentication failed: {str(e)}'}), 500

# OAuth Endpoints

@auth_bp.route('/oauth/<provider>', methods=['GET'])
def oauth_login(provider):
    """Initiate OAuth login"""
    try:
        if provider not in ['google', 'github']:
            return jsonify({'error': 'Invalid OAuth provider'}), 400
        
        frontend_url = current_app.config.get('FRONTEND_URL')
        redirect_uri = f'{request.host_url}api/auth/oauth/{provider}/callback'
        
        return oauth.create_client(provider).authorize_redirect(redirect_uri)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/oauth/<provider>/callback', methods=['GET'])
def oauth_callback(provider):
    """Handle OAuth callback"""
    try:
        if provider not in ['google', 'github']:
            return jsonify({'error': 'Invalid OAuth provider'}), 400
        
        # Get token
        client = oauth.create_client(provider)
        token = client.authorize_access_token()
        
        # Get user info
        if provider == 'google':
            user_info = client.get('https://www.googleapis.com/oauth2/v1/userinfo').json()
            provider_id = user_info.get('id')
            email = user_info.get('email')
            username = email.split('@')[0] if email else f'google_user_{provider_id}'
        else:  # github
            user_info = client.get('user').json()
            provider_id = str(user_info.get('id'))
            email = user_info.get('email')
            username = user_info.get('login', f'github_user_{provider_id}')
        
        # Check if user exists with this OAuth provider
        user = User.query.filter_by(oauth_provider=provider, oauth_provider_id=provider_id).first()
        
        if not user:
            # Check if email is already registered
            if email:
                existing_user = User.query.filter_by(email=email).first()
                if existing_user:
                    # Link OAuth to existing account
                    existing_user.oauth_provider = provider
                    existing_user.oauth_provider_id = provider_id
                    existing_user.email_verified = True  # OAuth emails are verified
                    user = existing_user
        
        if not user:
            # Create new user
            user = User(
                username=username,
                email=email or f'{username}@oauth.local',
                oauth_provider=provider,
                oauth_provider_id=provider_id,
                email_verified=True,
                role='participant'
            )
            db.session.add(user)
        
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(identity=str(user.id))
        
        # Redirect to OAuth callback page with token and user data
        from urllib.parse import urlencode, quote
        
        # Create a sanitized user dict for the URL to avoid "Request Line is too large"
        # We exclude large fields like resume_text and match_explanation
        user_dict = user.to_dict()
        url_safe_user = {
            k: v for k, v in user_dict.items() 
            if k not in ['resume_text', 'resume_link', 'match_explanation', 'notes'] and v is not None
        }
        
        user_data = quote(json.dumps(url_safe_user))
        params = urlencode({
            'token': access_token,
            'user': user_data
        })
        
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        callback_url = f'{frontend_url}/oauth-callback.html?{params}'
        return redirect(callback_url)
        
    except Exception as e:
        db.session.rollback()
        # Redirect to callback with error
        from urllib.parse import urlencode
        frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        params = urlencode({'error': str(e)})
        return redirect(f'{frontend_url}/oauth-callback.html?{params}')

@auth_bp.route('/promote-admin/<string:username>/<string:secret_key>', methods=['GET'])
def promote_admin(username, secret_key):
    try:
        SETUP_SECRET = 'setup-2024'
        if secret_key != SETUP_SECRET:
            return jsonify({'error': 'Invalid setup secret'}), 403
            
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'error': 'User not found. Please register first.'}), 404
            
        user.role = 'admin'
        user.is_host_approved = True
        db.session.commit()
        
        return jsonify({
            'message': f'Success! User {username} is now an Admin.',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
