"""
Application routes for DevAlert-hosted events
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Application, Hackathon, Internship, User

applications_bp = Blueprint('applications', __name__)

@applications_bp.route('', methods=['POST'])
def submit_application():
    """Submit an application for a DevAlert-hosted event"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['event_type', 'event_id', 'name', 'email']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Verify event exists and is DevAlert-hosted
        event_type = data['event_type']
        event_id = data['event_id']
        
        if event_type == 'hackathon':
            event = Hackathon.query.get(event_id)
        elif event_type == 'internship':
            event = Internship.query.get(event_id)
        else:
            return jsonify({'error': 'Invalid event type'}), 400
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        if event.source not in ['devalert', 'manual']:
            return jsonify({'error': 'Applications only accepted for DevAlert-hosted events'}), 400
        
        # Get user_id if authenticated
        user_id = None
        try:
            user_id = get_jwt_identity()
        except:
            pass  # Not authenticated, that's okay
        
        # Create application
        application = Application(
            user_id=user_id,
            event_type=event_type,
            event_id=event_id,
            name=data['name'],
            email=data['email'],
            resume_link=data.get('resume_link'),
            cover_letter=data.get('cover_letter')
        )
        
        db.session.add(application)
        db.session.commit()
        
        return jsonify({
            'message': 'Application submitted successfully',
            'application': application.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@applications_bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_applications():
    """Get current user's applications"""
    try:
        user_id = get_jwt_identity()
        applications = Application.query.filter_by(user_id=user_id).order_by(Application.created_at.desc()).all()
        
        return jsonify([app.to_dict() for app in applications]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@applications_bp.route('/event/<event_type>/<int:event_id>', methods=['GET'])
@jwt_required()
def get_event_applications(event_type, event_id):
    """Get all applications for a specific event (hoster/admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role not in ['admin', 'hoster']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Verify event exists
        if event_type == 'hackathon':
            event = Hackathon.query.get(event_id)
        elif event_type == 'internship':
            event = Internship.query.get(event_id)
        else:
            return jsonify({'error': 'Invalid event type'}), 400
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        # Get applications
        applications = Application.query.filter_by(
            event_type=event_type,
            event_id=event_id
        ).order_by(Application.created_at.desc()).all()
        
        return jsonify([app.to_dict() for app in applications]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@applications_bp.route('/hosted', methods=['GET'])
@jwt_required()
def get_hosted_applications():
    """Get applications for all events hosted by the current user"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role not in ['admin', 'hoster']:
            return jsonify({'error': 'Unauthorized'}), 403
            
        # Get all applications where the event's host_id matches current user
        # Or if admin, get everything
        if user.role == 'admin':
            applications = Application.query.order_by(Application.created_at.desc()).all()
        else:
            # Query applications for hackathons hosted by this user
            hack_apps = Application.query.join(Hackathon, Application.event_id == Hackathon.id)\
                .filter(Application.event_type == 'hackathon')\
                .filter(Hackathon.host_id == user_id).all()
            
            # Query applications for internships hosted by this user
            int_apps = Application.query.join(Internship, Application.event_id == Internship.id)\
                .filter(Application.event_type == 'internship')\
                .filter(Internship.host_id == user_id).all()
            
            applications = hack_apps + int_apps
            applications.sort(key=lambda x: x.created_at, reverse=True)
            
        return jsonify([app.to_dict() for app in applications]), 200
    except Exception as e:
        print(f"Error fetching hosted apps: {e}")
        return jsonify({'error': str(e)}), 500

@applications_bp.route('/<int:id>/status', methods=['PATCH'])
@jwt_required()
def update_application_status(id):
    """Update status of an application"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role not in ['admin', 'hoster']:
            return jsonify({'error': 'Unauthorized'}), 403
            
        application = Application.query.get(id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404
            
        data = request.get_json()
        if 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400
            
        application.status = data['status']
        db.session.commit()
        
        return jsonify({'message': 'Status updated', 'application': application.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@applications_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_application(id):
    """Delete an application (admin/hoster or the applicant themselves)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        application = Application.query.get(id)
        if not application:
            return jsonify({'error': 'Application not found'}), 404

        # Allow: admin, hoster, or the user who submitted the application
        is_admin_or_hoster = user and user.role in ['admin', 'hoster']
        is_own_application = application.user_id == user_id

        if not is_admin_or_hoster and not is_own_application:
            return jsonify({'error': 'Unauthorized'}), 403

        db.session.delete(application)
        db.session.commit()
        return jsonify({'message': 'Application deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
