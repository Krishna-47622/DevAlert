from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, TrackedEvent, User, Hackathon, Internship
from datetime import datetime
from services.match_service import get_match_service

tracker_bp = Blueprint('tracker', __name__)

@tracker_bp.route('', methods=['GET'])
@jwt_required()
def get_tracked_events():
    """Get all opportunities tracked by the current user"""
    try:
        user_id = int(get_jwt_identity())
        tracked = TrackedEvent.query.filter_by(user_id=user_id).all()
        return jsonify([t.to_dict() for t in tracked]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tracker_bp.route('/add', methods=['POST'])
@jwt_required()
def add_to_tracker():
    """Add a new opportunity to the user's tracker"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or not all(k in data for k in ['event_type', 'event_id']):
            return jsonify({'error': 'Missing required fields'}), 400
            
        event_type = data['event_type']
        event_id = data['event_id']
        
        # Check if already tracked
        existing = TrackedEvent.query.filter_by(
            user_id=user_id, 
            event_type=event_type, 
            event_id=event_id
        ).first()
        
        if existing:
            return jsonify({'message': 'Already tracking this opportunity', 'item': existing.to_dict()}), 200
            
        # Create new tracked event
        tracked = TrackedEvent(
            user_id=user_id,
            event_type=event_type,
            event_id=event_id,
            status=data.get('status', 'Saved'),
            notes=data.get('notes', '')
        )
        
        db.session.add(tracked)
        db.session.flush() # Get ID for dictionary conversion

        # Auto-calculate match if user has resume
        user = User.query.get(user_id)
        if user.resume_text or user.resume_link:
            try:
                match_service = get_match_service()
                
                # Fetch event details
                opportunity_details = {}
                if event_type == 'hackathon':
                    event = Hackathon.query.get(event_id)
                    opportunity_details = {'title': event.title, 'description': event.description, 'organizer': event.organizer}
                else:
                    event = Internship.query.get(event_id)
                    opportunity_details = {'title': event.title, 'description': event.description, 'company': event.company, 'skills_required': event.skills_required}
                
                score, explanation = match_service.calculate_score(
                    user.resume_text, 
                    opportunity_details,
                    resume_link=user.resume_link
                )
                tracked.match_score = score
                tracked.match_explanation = explanation
                db.session.commit()
            except Exception as e:
                print(f"Error in auto-match: {e}")
                db.session.commit() # Still commit the basic addition
        else:
            db.session.commit()
        
        return jsonify({
            'message': 'Added to tracker successfully',
            'item': tracked.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tracker_bp.route('/<int:id>', methods=['PATCH'])
@jwt_required()
def update_tracked_event(id):
    """Update status or notes for a tracked event"""
    try:
        user_id = int(get_jwt_identity())
        tracked = TrackedEvent.query.get(id)
        
        if not tracked:
            return jsonify({'error': 'Tracked item not found'}), 404
            
        if tracked.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
            
        data = request.get_json()
        
        if 'status' in data:
            tracked.status = data['status']
        if 'notes' in data:
            tracked.notes = data['notes']
            
        db.session.commit()
        
        return jsonify({
            'message': 'Updated successfully',
            'item': tracked.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tracker_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_tracked_event(id):
    """Remove an item from the tracker"""
    try:
        user_id = int(get_jwt_identity())
        tracked = TrackedEvent.query.get(id)
        
        if not tracked:
            return jsonify({'error': 'Tracked item not found'}), 404
            
        if tracked.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
            
        db.session.delete(tracked)
        db.session.commit()
        
        return jsonify({'message': 'Removed from tracker'}), 200
        
    except Exception as e:
        print(f"DEBUG: Deletion failed for id {id}: {e}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tracker_bp.route('/<int:id>/match', methods=['POST'])
@jwt_required()
def calculate_match(id):
    """Manually trigger or refresh AI Match Score for a tracked item"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        tracked = TrackedEvent.query.get(id)
        
        if not tracked or tracked.user_id != user_id:
            return jsonify({'error': 'Item not found or unauthorized'}), 404
            
        if not user.resume_text and not user.resume_link:
            return jsonify({'error': 'Please add your resume text or a public link in Account Settings first.'}), 400
            
        match_service = get_match_service()
        
        # Fetch event details
        opportunity_details = {}
        if tracked.event_type == 'hackathon':
            event = Hackathon.query.get(tracked.event_id)
            opportunity_details = {'title': event.title, 'description': event.description, 'organizer': event.organizer}
        else:
            event = Internship.query.get(tracked.event_id)
            opportunity_details = {'title': event.title, 'description': event.description, 'company': event.company, 'skills_required': event.skills_required}
            
        score, explanation = match_service.calculate_score(
            user.resume_text, 
            opportunity_details,
            resume_link=user.resume_link
        )
        tracked.match_score = score
        tracked.match_explanation = explanation
        db.session.commit()
        
        return jsonify({
            'message': 'Match score calculated',
            'match_score': score,
            'match_explanation': explanation
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
