"""
Email Service for DevAlert
Handles sending verification and password reset emails via Mailgun API or SMTP
"""
import requests
from flask import current_app, render_template_string
from flask_mail import Mail, Message
import secrets
from threading import Thread

mail = Mail()

def init_mail(app):
    """Initialize Flask-Mail with app"""
    mail.init_app(app)

def generate_token(length=32):
    """Generate a secure random token"""
    return secrets.token_urlsafe(length)

def send_email_via_mailgun(to, subject, html_body):
    """Send email using Mailgun API"""
    api_key = current_app.config.get('MAILGUN_API_KEY')
    domain = current_app.config.get('MAILGUN_DOMAIN')
    sender = current_app.config.get('MAIL_FROM_EMAIL')
    
    try:
        response = requests.post(
            f"https://api.mailgun.net/v3/{domain}/messages",
            auth=("api", api_key),
            data={"from": f"DevAlert <{sender}>", "to": [to], "subject": subject, "html": html_body}
        )
        if response.status_code == 200:
            return True, None
        else:
            return False, f"Mailgun Failed: {response.text}"
    except Exception as e:
        print(f"❌ Mailgun error: {e}")
        return False, str(e)

def send_email_via_brevo(to, subject, html_body):
    """Send email using Brevo (Sendinblue) API"""
    api_key = current_app.config.get('BREVO_API_KEY')
    sender_email = current_app.config.get('MAIL_FROM_EMAIL')
    
    if not api_key:
        print("❌ Brevo API Key missing!")
        return False, "Brevo API Key missing"
        
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    payload = {
        "sender": {"email": sender_email, "name": "DevAlert"},
        "to": [{"email": to}],
        "subject": subject,
        "htmlContent": html_body
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201]:
            print(f"✅ Brevo email sent to {to}")
            return True, None
        else:
            print(f"❌ Brevo failed: {response.text}")
            return False, f"Brevo Error: {response.text}"
    except Exception as e:
        print(f"❌ Brevo error: {e}")
        return False, str(e)

def send_async_email(app, to, subject, html_body):
    """Send email asynchronously using configured service"""
    with app.app_context():
        try:
            # Check service type
            service = app.config.get('MAIL_SERVICE', 'smtp')
            
            if service == 'mailgun':
                send_email_via_mailgun(to, subject, html_body)
            elif service == 'brevo':
                send_email_via_brevo(to, subject, html_body)
            else:
                # Fallback to SMTP
                msg = Message(subject=subject, recipients=[to], html=html_body)
                mail.send(msg)
                print(f"✅ SMTP email sent to {to}")
                
        except Exception as e:
            print(f"❌ Async email error: {e}")

def send_verification_email(user, base_url):
    """Send email verification email"""
    from models import db
    from datetime import datetime
    
    # Generate verification token
    token = generate_token()
    user.email_verification_token = token
    user.email_verification_sent_at = datetime.utcnow()
    db.session.commit()
    
    # Create verification URL
    verification_url = f"{base_url}/verify-email/{token}"
    
    # Email template (Simplified for brevity, can be expanded)
    html_body = f"""
    <h1>Verify Your Email</h1>
    <p>Hi {user.username},</p>
    <p>Click the link below to verify your email:</p>
    <a href="{verification_url}">{verification_url}</a>
    """
    
    # Send in background thread
    Thread(target=send_async_email, args=(
        current_app._get_current_object(), 
        user.email, 
        "Verify Your Email - DevAlert", 
        html_body
    )).start()
    return True

def send_password_reset_email(user, base_url):
    """Send password reset email"""
    from models import db
    from datetime import datetime, timedelta
    
    token = generate_token()
    user.password_reset_token = token
    user.password_reset_expires_at = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()
    
    reset_url = f"{base_url}/reset-password/{token}"
    
    html_body = f"""
    <h1>Reset Password</h1>
    <p>Hi {user.username},</p>
    <p>Click below to reset your password:</p>
    <a href="{reset_url}">{reset_url}</a>
    """
    
    Thread(target=send_async_email, args=(
        current_app._get_current_object(),
        user.email,
        "Reset Your Password - DevAlert",
        html_body
    )).start()
    return True

def send_2fa_enabled_notification(user):
    """Send 2FA enabled notification"""
    html_body = f"""
    <h1>2FA Enabled</h1>
    <p>Hi {user.username},</p>
    <p>Two-factor authentication has been enabled on your account.</p>
    """
    
    Thread(target=send_async_email, args=(
        current_app._get_current_object(),
        user.email,
        "2FA Enabled - DevAlert",
        html_body
    )).start()
    return True
