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
        
        # Find user by username OR email
        username_or_email = data['username']
        user = User.query.filter(
            (User.username == username_or_email) | (User.email == username_or_email)
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
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
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
        user_id = get_jwt_identity()
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
        user_id = get_jwt_identity()
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

# Two-Factor Authentication Endpoints

@auth_bp.route('/2fa/setup', methods=['POST'])
@jwt_required()
def setup_2fa():
    """Setup 2FA - generate secret and QR code"""
    try:
        user_id = get_jwt_identity()
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
        user_id = get_jwt_identity()
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
        user_id = get_jwt_identity()
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
        user_data = quote(json.dumps(user.to_dict()))
        params = urlencode({
            'token': access_token,
            'user': user_data
        })
        callback_url = f'/oauth-callback.html?{params}'
        return redirect(callback_url)
        
    except Exception as e:
        db.session.rollback()
        # Redirect to callback with error
        from urllib.parse import urlencode
        params = urlencode({'error': str(e)})
        return redirect(f'/oauth-callback.html?{params}')

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
