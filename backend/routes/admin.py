from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Hackathon, Internship, User, Notification, Application, AppSetting
from sqlalchemy import func
from datetime import datetime
import threading
import sys
from .scanner import ai_scan_and_save, fetch_page_text
from services.opportunity_service import is_opportunity_expired_centralized
import re
import json

admin_bp = Blueprint('admin', __name__)

# Removed local is_link_expired in favor of services.opportunity_service

@admin_bp.route('/pending', methods=['GET'])
@jwt_required()
def get_pending_opportunities():
    """Get all pending hackathons and internships (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get pending hackathons
        pending_hackathons = Hackathon.query.filter_by(status='pending').order_by(Hackathon.created_at.desc()).all()
        
        # Get pending internships
        pending_internships = Internship.query.filter_by(status='pending').order_by(Internship.created_at.desc()).all()
        
        return jsonify({
            'hackathons': [h.to_dict() for h in pending_hackathons],
            'internships': [i.to_dict() for i in pending_internships]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/all-opportunities', methods=['GET'])
@jwt_required()
def get_all_opportunities():
    """Get all hackathons and internships (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get all hackathons
        all_hackathons = Hackathon.query.order_by(Hackathon.created_at.desc()).all()
        
        # Get all internships
        all_internships = Internship.query.order_by(Internship.created_at.desc()).all()
        
        return jsonify({
            'hackathons': [h.to_dict() for h in all_hackathons],
            'internships': [i.to_dict() for i in all_internships]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/approve/<string:opportunity_type>/<int:id>', methods=['POST'])
@jwt_required()
def approve_opportunity(opportunity_type, id):
    """Approve a hackathon or internship (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get the opportunity
        if opportunity_type == 'hackathon':
            opportunity = Hackathon.query.get(id)
        elif opportunity_type == 'internship':
            opportunity = Internship.query.get(id)
        else:
            return jsonify({'error': 'Invalid opportunity type'}), 400
        
        if not opportunity:
            return jsonify({'error': f'{opportunity_type.capitalize()} not found'}), 404
        
        # Update status
        opportunity.status = 'approved'
        db.session.commit()
        
        return jsonify({
            'message': f'{opportunity_type.capitalize()} approved successfully',
            'opportunity': opportunity.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/reject/<string:opportunity_type>/<int:id>', methods=['POST'])
@jwt_required()
def reject_opportunity(opportunity_type, id):
    """Reject a hackathon or internship (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get the opportunity
        if opportunity_type == 'hackathon':
            opportunity = Hackathon.query.get(id)
        elif opportunity_type == 'internship':
            opportunity = Internship.query.get(id)
        else:
            return jsonify({'error': 'Invalid opportunity type'}), 400
        
        if not opportunity:
            return jsonify({'error': f'{opportunity_type.capitalize()} not found'}), 404
        
        # Update status
        opportunity.status = 'rejected'
        db.session.commit()
        
        return jsonify({
            'message': f'{opportunity_type.capitalize()} rejected successfully',
            'opportunity': opportunity.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/auto-approve/toggle', methods=['POST'])
@jwt_required()
def toggle_auto_approve():
    """Enable or disable the scheduled 24h auto-approve feature (admin only).
    Persists across server restarts via AppSetting DB table."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json() or {}

        if 'enabled' in data:
            new_state = bool(data['enabled'])
        else:
            # Toggle current state
            current = AppSetting.get('auto_approve_enabled', 'false')
            new_state = current.lower() != 'true'

        AppSetting.set('auto_approve_enabled', str(new_state).lower())

        print(f"[Admin] Auto-approve {'ENABLED' if new_state else 'DISABLED'} by admin {user.username} (persisted to DB)")
        return jsonify({
            'enabled': new_state,
            'message': f"Auto-approve {'enabled' if new_state else 'disabled'}. Oldest 5 items will be approved every 24 hours."
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/auto-approve/status', methods=['GET'])
@jwt_required()
def get_auto_approve_status():
    """Get current auto-approve toggle state from DB (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403

        val = AppSetting.get('auto_approve_enabled', 'false')
        return jsonify({'enabled': val.lower() == 'true'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403

        users = User.query.all()
        return jsonify([{
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role
        } for u in users])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def update_user_role(user_id):
    try:
        user_id_from_token = int(get_jwt_identity())
        admin_user = User.query.get(user_id_from_token)
        
        if not admin_user or admin_user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        new_role = data.get('role')
        
        # The instruction provided roles 'participant', 'hoster', 'admin'.
        # Assuming 'applicant' is equivalent to 'participant' and 'hoster' is a new role.
        # If 'hoster' is not a valid role in your User model, adjust this list.
        if new_role not in ['participant', 'hoster', 'admin']:
            return jsonify({"error": "Invalid role. Must be 'participant', 'hoster', or 'admin'"}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        user.role = new_role
        db.session.commit()
        
        return jsonify({"message": "Role updated successfully", "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        user_id_from_token = int(get_jwt_identity())
        admin_user = User.query.get(user_id_from_token)
        
        if not admin_user or admin_user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403

        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # 1. Delete user's notifications (CASCADE)
        Notification.query.filter_by(user_id=user_id).delete()

        # 2. Delete user's applications (CASCADE)
        from models import Application
        Application.query.filter_by(user_id=user_id).delete()

        # 3. Unlink hosted opportunities (Set host_id = NULL)
        Hackathon.query.filter_by(host_id=user_id).update({'host_id': None})
        Internship.query.filter_by(host_id=user_id).update({'host_id': None})
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({"message": "User deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get dashboard statistics (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Count statistics
        total_hackathons = Hackathon.query.count()
        approved_hackathons = Hackathon.query.filter_by(status='approved').count()
        pending_hackathons = Hackathon.query.filter_by(status='pending').count()
        
        total_internships = Internship.query.count()
        approved_internships = Internship.query.filter_by(status='approved').count()
        pending_internships = Internship.query.filter_by(status='pending').count()
        
        total_users = User.query.count()
        admin_users = User.query.filter_by(role='admin').count()
        applicant_users = User.query.filter_by(role='applicant').count()
        
        return jsonify({
            'hackathons': {
                'total': total_hackathons,
                'approved': approved_hackathons,
                'pending': pending_hackathons
            },
            'internships': {
                'total': total_internships,
                'approved': approved_internships,
                'pending': pending_internships
            },
            'users': {
                'total': total_users,
                'admins': admin_users,
                'applicants': applicant_users
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/trigger-scan', methods=['POST'])
@jwt_required()
def trigger_ai_scan():
    """Manually trigger AI scan (admin only) - Background version to prevent 502"""
    print(">>> [Admin] trigger_ai_scan called", flush=True)
    try:
        user_id = int(get_jwt_identity())
        print(f">>> [Admin] user_id from token: {user_id}", flush=True)
        user = User.query.get(int(user_id))
        
        if not user or user.role != 'admin':
            print(">>> [Admin] Unauthorized access attempt", flush=True)
            return jsonify({'error': 'Unauthorized'}), 403
            
        print(">>> [Admin] Identity verified, launching background thread...", flush=True)
        
        # Check if already scanning or purging
        if AppSetting.get('is_scanning', 'false') == 'true':
            return jsonify({'error': 'A scan is already in progress.'}), 409
        if AppSetting.get('is_purging', 'false') == 'true':
            return jsonify({'error': 'A purge is in progress. Please wait.'}), 409

        # Get the real app object to pass to the thread
        from flask import current_app
        app_obj = current_app._get_current_object()
        
        # CRITICAL: Prepare for thread isolation
        db.session.remove()
        db.engine.dispose()
        
        # Run in background to avoid 502 timeout
        thread = threading.Thread(target=ai_scan_and_save, args=(app_obj,))
        thread.daemon = True
        thread.start()
        
        print(">>> [Admin] Background thread started, returning response", flush=True)
        return jsonify({
            'message': 'AI scan triggered successfully in background. Results will appear soon.',
            'status': 'success'
        }), 200
        
    except Exception as e:
        print(f"❌ Error in admin /trigger-scan: {str(e)}", flush=True)
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/host-requests', methods=['GET'])
@jwt_required()
def get_host_requests():
    """Get all users requesting host access (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(int(user_id))
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get users who requested host access but are not yet approved
        host_requests = User.query.filter_by(requested_host_access=True, is_host_approved=False).all()
        print(f"DEBUG: Found {len(host_requests)} host requests")
        
        return jsonify([u.to_dict() for u in host_requests]), 200
        
    except Exception as e:
        print(f"❌ Error in /host-requests: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/approve-host/<int:user_id>', methods=['POST'])
@jwt_required()
def approve_host(user_id):
    """Approve a user's host request (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        target_user = User.query.get(user_id)
        
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
        
        if target_user.is_host_approved:
             return jsonify({'message': 'User is already approved'}), 200

        # Update user role and status
        target_user.role = 'hoster'
        target_user.is_host_approved = True
        target_user.requested_host_access = False
        
        # Create notification for the user
        notification = Notification(
            user_id=target_user.id,
            event_type='system',
            event_id=0,
            title='Host Account Approved',
            message='Your request to become a host has been approved! You can now post hackathons and internships.',
            is_read=False
        )
        
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({'message': 'Host request approved successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
@admin_bp.route('/test-email', methods=['POST'])
@jwt_required()
def test_email_config():
    """Run Email Diagnostics (SMTP or Mailgun)"""
    import smtplib
    import socket
    import ssl
    from flask import current_app
    from services.email_service import send_email_via_mailgun
    
    results = {}
    
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user: return jsonify({'error': 'User not found'}), 404
        
        # DEBUG info
        print(f"DEBUG: Diag requested by {user.username}")
        
        data = request.get_json()
        recipient = data.get('email', user.email)
        
        # Check Service Type
        mail_service = current_app.config.get('MAIL_SERVICE', 'smtp')
        
        if mail_service == 'mailgun':
            # --- TEST MAILGUN ---
            print("Trying Mailgun API...")
            success, error = send_email_via_mailgun(recipient, "DevAlert Mailgun Test", "<h1>It Works!</h1>")
            
            if success:
                return jsonify({'message': 'Mailgun email sent!', 'service': 'mailgun'}), 200
            else:
                return jsonify({'message': 'Mailgun failed.', 'service': 'mailgun', 'error': error}), 500

        elif mail_service == 'brevo':
            # --- TEST BREVO ---
            from services.email_service import send_email_via_brevo
            print("Trying Brevo API...")
            success, error = send_email_via_brevo(recipient, "DevAlert Brevo Test", "<h1>It Works!</h1><p>Brevo is connected.</p>")
            
            if success:
                return jsonify({'message': 'Brevo email sent successfully!', 'service': 'brevo'}), 200
            else:
                return jsonify({'message': 'Brevo failed.', 'service': 'brevo', 'error': error}), 500
                
        else:
            # --- TEST SMTP (Legacy Probe) ---
            # Load config
            mail_server = current_app.config['MAIL_SERVER']
            mail_username = current_app.config['MAIL_USERNAME']
            mail_password = current_app.config['MAIL_PASSWORD']
            
            # --- TEST 1: Port 587 (TLS) ---
            results['port_587'] = {'status': 'pending'}
            try:
                print("Trying SMTP 587...")
                with smtplib.SMTP(mail_server, 587, timeout=5) as server:
                    server.set_debuglevel(1)
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(mail_username, mail_password)
                    results['port_587'] = {'status': 'success', 'message': 'Auth successful'}
                    
                    # Try sending
                    msg = f"Subject: DevAlert Test (587)\n\nTest from Port 587."
                    server.sendmail(mail_username, recipient, msg)
                    results['port_587']['send'] = 'success'
            except Exception as e:
                results['port_587'] = {'status': 'failed', 'error': str(e)}

            # --- TEST 2: Port 465 (SSL) ---
            results['port_465'] = {'status': 'pending'}
            try:
                print("Trying SMTP 465...")
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(mail_server, 465, timeout=5, context=context) as server:
                    server.login(mail_username, mail_password)
                    results['port_465'] = {'status': 'success', 'message': 'Auth successful'}
                    
                    # Try sending
                    msg = f"Subject: DevAlert Test (465)\n\nTest from Port 465."
                    server.sendmail(mail_username, recipient, msg)
                    results['port_465']['send'] = 'success'
            except Exception as e:
                results['port_465'] = {'status': 'failed', 'error': str(e)}

            return jsonify({
                'message': 'SMTP Diagnostics complete',
                'results': results,
                'config': {
                    'server': mail_server,
                    'username_provided': bool(mail_username),
                    'password_provided': bool(mail_password)
                }
            }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@admin_bp.route('/bulk-action', methods=['POST'])
@jwt_required()
def bulk_action():
    """Perform bulk actions on hackathons or internships (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        data = request.get_json()
        item_type = data.get('type') # 'hackathon' or 'internship'
        ids = data.get('ids', [])
        action = data.get('action') # 'approve', 'reject', 'delete'
        
        if not item_type or not ids or not action:
            return jsonify({'error': 'Missing required fields'}), 400
            
        Model = Hackathon if item_type == 'hackathon' else Internship
        
        count = 0
        
        if action == 'delete':
            # Bulk Delete
            items = Model.query.filter(Model.id.in_(ids)).all()
            for item in items:
                db.session.delete(item)
                count += 1
        elif action in ['approve', 'reject']:
            # Bulk Update Status
            # We use synchronize_session=False for bulk updates where we don't need immediate object refresh
            status = 'approved' if action == 'approve' else 'rejected'
            count = Model.query.filter(Model.id.in_(ids)).update({Model.status: status}, synchronize_session=False)
        else:
            return jsonify({'error': 'Invalid action'}), 400
            
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully {action}d {count} {item_type}s',
            'count': count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/purge-all', methods=['DELETE'])
@jwt_required()
def purge_all():
    """Delete ALL opportunities of a specific type (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        item_type = request.args.get('type') # 'hackathon', 'internship', or 'all'
        
        if not item_type:
             return jsonify({'error': 'Missing type parameter'}), 400
             
        deleted_counts = {}
        
        if item_type == 'hackathon' or item_type == 'all':
            count = Hackathon.query.delete()
            deleted_counts['hackathons'] = count
            
        if item_type == 'internship' or item_type == 'all':
            count = Internship.query.delete()
            deleted_counts['internships'] = count
            
        db.session.commit()
        
        return jsonify({
            'message': 'Purge completed successfully',
            'deleted': deleted_counts
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
@admin_bp.route('/seed-db', methods=['GET'])
def seed_database():
    """Seed the database SAFELY (only adds missing initial data)"""
    try:
        secret = request.args.get('secret')
        # Allow checking against SECRET_KEY or a hardcoded setup secret
        if secret != current_app.config['SECRET_KEY'] and secret != 'setup-2024':
             return jsonify({'error': 'Unauthorized'}), 403
             
        from models import User, Hackathon
        from werkzeug.security import generate_password_hash
        from datetime import datetime, timedelta
        
        created_items = []

        # 1. Ensure Admin Exists
        admin = User.query.filter_by(email='krishna@example.com').first()
        if not admin:
            admin = User(
                username='Krishna',
                email='krishna@example.com',
                password_hash=generate_password_hash('1234'),
                role='admin',
                email_verified=True,
                is_host_approved=True
            )
            db.session.add(admin)
            created_items.append("Admin User")
        
        # 2. Ensure Sample Hoster Exists
        hoster = User.query.filter_by(email='techhost@example.com').first()
        if not hoster:
            hoster = User(
                username='techhost',
                email='techhost@example.com',
                password_hash=generate_password_hash('password'),
                role='hoster',
                organization='T-Hub',
                designation='Manager',
                email_verified=True,
                is_host_approved=True
            )
            db.session.add(hoster)
            created_items.append("Hoster User")
            
        # Commit users first to get IDs
        db.session.commit()
        
        # 3. Add Sample Hackathon if it doesn't exist
        # Re-fetch hoster to ensure we have the ID attached to session
        hoster = User.query.filter_by(email='techhost@example.com').first()
        
        if hoster:
            exists = Hackathon.query.filter_by(title='Hyderabad AI Hackathon 2026').first()
            if not exists:
                hackathon = Hackathon(
                    title='Hyderabad AI Hackathon 2026',
                    description='Build innovative AI solutions for real-world problems. Win prizes worth 5 lakhs!',
                    organizer='T-Hub',
                    location='Hyderabad, T-Hub',
                    mode='Hybrid',
                    deadline=datetime.utcnow() + timedelta(days=15),
                    registration_link='https://www.linkedin.com',
                    prize_pool='₹5,00,000',
                    source='linkedin',
                    status='approved',
                    posted_by=hoster.id
                )
                db.session.add(hackathon)
                created_items.append("Sample Hackathon")
        
        db.session.commit()
        
        if not created_items:
            message = "Database already seeded. No new items added."
        else:
            message = f"Seeded successfully: {', '.join(created_items)}"
            
        return jsonify({'message': message + ' (Admin: krishna@example.com / 1234)'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/auto-approve', methods=['POST'])
@jwt_required()
def auto_approve_oldest():
    """Auto-approve the 5 oldest pending items of each type (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        # 1. Find PENDING items
        pending_hackathons = Hackathon.query.filter_by(status='pending')\
            .order_by(Hackathon.created_at.asc()).all()
            
        pending_internships = Internship.query.filter_by(status='pending')\
            .order_by(Internship.created_at.asc()).all()
            
        count_h = 0
        count_i = 0
        
        # Approve only non-expired ones, up to 5 total
        for h in pending_hackathons:
            if count_h >= 5: break
            if not is_opportunity_expired_centralized(h.registration_link):
                h.status = 'approved'
                count_h += 1
            else:
                h.status = 'rejected' # Auto-reject if expired
            
        for i in pending_internships:
            if count_i >= 5: break
            if not is_opportunity_expired_centralized(i.application_link):
                i.status = 'approved'
                count_i += 1
            else:
                i.status = 'rejected' # Auto-reject if expired
            
        db.session.commit()
        
        return jsonify({
            'message': f'Auto-approved {count_h} hackathons and {count_i} internships. Expired items were automatically rejected.',
            'hackathons_count': count_h,
            'internships_count': count_i
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/purge-expired', methods=['POST'])
@jwt_required()
def purge_expired():
    """Manually trigger a purge of expired/closed opportunities (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        # Concurrency check
        if AppSetting.get('is_scanning', 'false') == 'true':
            return jsonify({'error': 'Cannot purge while a scan is in progress.'}), 409
        
        AppSetting.set('is_purging', 'true')
        db.session.commit()
        
        # 1. Fetch only APPROVED hackathons and internships
        hackathons = Hackathon.query.filter_by(status='approved').all()
        internships = Internship.query.filter_by(status='approved').all()
        
        purged_h_ids = []
        purged_i_ids = []
        now = datetime.utcnow()
        
        for h in hackathons:
            # Check deadline first (faster than web request)
            if (h.deadline and h.deadline < now) or is_opportunity_expired_centralized(h.registration_link):
                h.status = 'rejected'
                purged_h_ids.append(h.id)
                
        for i in internships:
            # Check deadline or web content
            if (i.deadline and i.deadline < now) or is_opportunity_expired_centralized(i.application_link):
                i.status = 'rejected'
                purged_i_ids.append(i.id)
                
        # Save for undo
        undo_data = {
            'hackathons': purged_h_ids,
            'internships': purged_i_ids,
            'timestamp': datetime.utcnow().isoformat()
        }
        AppSetting.set('last_purge_data', json.dumps(undo_data))
        
        db.session.commit()
        
        AppSetting.set('is_purging', 'false')
        db.session.commit()
        
        return jsonify({
            'message': f'Purged {len(purged_h_ids)} hackathons and {len(purged_i_ids)} internships (moved to rejected status).',
            'purged_hackathons_count': len(purged_h_ids),
            'purged_internships_count': len(purged_i_ids),
            'can_undo': True
        }), 200
        
    except Exception as e:
        AppSetting.set('is_purging', 'false')
        db.session.commit()
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/undo-purge', methods=['POST'])
@jwt_required()
def undo_purge():
    """Revert the last purge action (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
            
        raw_data = AppSetting.get('last_purge_data')
        if not raw_data:
            return jsonify({'error': 'No purge data found to undo'}), 400
            
        undo_data = json.loads(raw_data)
        h_ids = undo_data.get('hackathons', [])
        i_ids = undo_data.get('internships', [])
        
        restored_h = 0
        restored_i = 0
        
        # Restore hackathons
        if h_ids:
            h_to_restore = Hackathon.query.filter(Hackathon.id.in_(h_ids)).all()
            for h in h_to_restore:
                h.status = 'approved'
                restored_h += 1
                
        # Restore internships
        if i_ids:
            i_to_restore = Internship.query.filter(Internship.id.in_(i_ids)).all()
            for i in i_to_restore:
                i.status = 'approved'
                restored_i += 1
                
        # Clear undo data
        AppSetting.set('last_purge_data', '')
        
        db.session.commit()
        
        return jsonify({
            'message': f'Restored {restored_h} hackathons and {restored_i} internships to approved status.',
            'restored_hackathons': restored_h,
            'restored_internships': restored_i
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
