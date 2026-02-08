"""
Email Service for DevAlert
Handles sending verification and password reset emails
"""
from flask_mail import Mail, Message
from flask import render_template_string
import secrets

mail = Mail()

def init_mail(app):
    """Initialize Flask-Mail with app"""
    mail.init_app(app)

def generate_token(length=32):
    """Generate a secure random token"""
    return secrets.token_urlsafe(length)

def send_verification_email(user, base_url):
    """Send email verification email"""
    from models import db
    
    # Generate verification token
    token = generate_token()
    user.email_verification_token = token
    from datetime import datetime
    user.email_verification_sent_at = datetime.utcnow()
    db.session.commit()
    
    # Create verification URL
    verification_url = f"{base_url}/verify-email/{token}"
    
    # Email template
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; }}
            .button {{ display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 0.875rem; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>DevAlert</h1>
                <p>Verify Your Email Address</p>
            </div>
            <div class="content">
                <h2>Hello {user.username}!</h2>
                <p>Thank you for registering with DevAlert. Please verify your email address to complete your registration.</p>
                <p style="text-align: center;">
                    <a href="{verification_url}" class="button">Verify Email Address</a>
                </p>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #6366f1;">{verification_url}</p>
                <p><strong>This link will expire in 24 hours.</strong></p>
                <p>If you didn't create an account with DevAlert, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 DevAlert. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send email
    try:
        msg = Message(
            subject="Verify Your Email - DevAlert",
            recipients=[user.email],
            html=html_body
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending verification email: {e}")
        return False

def send_password_reset_email(user, base_url):
    """Send password reset email"""
    from models import db
    from datetime import datetime, timedelta
    
    # Generate reset token
    token = generate_token()
    user.password_reset_token = token
    user.password_reset_expires_at = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()
    
    # Create reset URL
    reset_url = f"{base_url}/reset-password/{token}"
    
    # Email template
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; }}
            .button {{ display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .warning {{ background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 0.875rem; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>DevAlert</h1>
                <p>Password Reset Request</p>
            </div>
            <div class="content">
                <h2>Hello {user.username}!</h2>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <p style="text-align: center;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #6366f1;">{reset_url}</p>
                <div class="warning">
                    <p><strong>⚠️ Security Notice:</strong></p>
                    <p>This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
                </div>
            </div>
            <div class="footer">
                <p>&copy; 2024 DevAlert. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send email
    try:
        msg = Message(
            subject="Reset Your Password - DevAlert",
            recipients=[user.email],
            html=html_body
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return False

def send_2fa_enabled_notification(user):
    """Send notification when 2FA is enabled"""
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 0.875rem; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>DevAlert</h1>
                <p>Two-Factor Authentication Enabled</p>
            </div>
            <div class="content">
                <h2>Hello {user.username}!</h2>
                <p>Two-factor authentication has been successfully enabled on your account.</p>
                <p>From now on, you'll need to enter a verification code from your authenticator app when logging in.</p>
                <p>If you didn't enable this feature, please contact support immediately.</p>
            </div>
            <div class="footer">
                <p>&copy; 2024 DevAlert. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        msg = Message(
            subject="Two-Factor Authentication Enabled - DevAlert",
            recipients=[user.email],
            html=html_body
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending 2FA notification: {e}")
        return False
