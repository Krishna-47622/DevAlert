from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Hackathon, Internship, User, Notification, Application
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/pending', methods=['GET'])
@jwt_required()
def get_pending_opportunities():
    """Get all pending hackathons and internships (admin only)"""
    try:
        user_id = get_jwt_identity()
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
        user_id = get_jwt_identity()
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
        user_id = get_jwt_identity()
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
        user_id = get_jwt_identity()
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


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    try:
        user_id = get_jwt_identity()
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
        user_id_from_token = get_jwt_identity()
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
        user_id_from_token = get_jwt_identity()
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
        user_id = get_jwt_identity()
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
    """Manually trigger AI scan (admin only)"""
    try:
        user_id = get_jwt_identity()
        print(f"DEBUG: Triggering scan for user_id: {user_id}")
        user = User.query.get(int(user_id))
        
        if not user or user.role != 'admin':
            print(f"DEBUG: Unauthorized access attempt by user: {user_id}")
            return jsonify({'error': 'Unauthorized'}), 403
            
        from routes.scanner import ai_scan_and_save
        results = ai_scan_and_save()
        
        print(f"DEBUG: Scan completed. Results found: {results.get('total_found', 0)}")
        return jsonify({
            'message': 'AI scan triggered successfully',
            'results': results
        }), 200
    except Exception as e:
        print(f"❌ Error in /trigger-scan: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/host-requests', methods=['GET'])
@jwt_required()
def get_host_requests():
    """Get all users requesting host access (admin only)"""
    try:
        user_id = get_jwt_identity()
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
        current_user_id = get_jwt_identity()
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
        user_id = get_jwt_identity()
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
            success = send_email_via_mailgun(recipient, "DevAlert Mailgun Test", "<h1>It Works!</h1>")
            
            if success:
                return jsonify({'message': 'Mailgun email sent!', 'service': 'mailgun'}), 200
            else:
                return jsonify({'message': 'Mailgun failed.', 'service': 'mailgun'}), 500

        elif mail_service == 'brevo':
            # --- TEST BREVO ---
            from services.email_service import send_email_via_brevo
            print("Trying Brevo API...")
            success = send_email_via_brevo(recipient, "DevAlert Brevo Test", "<h1>It Works!</h1><p>Brevo is connected.</p>")
            
            if success:
                return jsonify({'message': 'Brevo email sent successfully!', 'service': 'brevo'}), 200
            else:
                return jsonify({'message': 'Brevo failed to send.', 'service': 'brevo'}), 500
                
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
