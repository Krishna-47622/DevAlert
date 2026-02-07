from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Internship, User, Notification
from datetime import datetime

internships_bp = Blueprint('internships', __name__)

@internships_bp.route('', methods=['GET'])
def get_internships():
    """Get all approved internships with optional filters"""
    try:
        # Get query parameters
        location = request.args.get('location')
        mode = request.args.get('mode')
        company = request.args.get('company')
        status = request.args.get('status', 'approved')  # Default to approved for public view
        
        # Build query
        query = Internship.query
        
        if status:
            query = query.filter_by(status=status)
        if location:
            query = query.filter(Internship.location.ilike(f'%{location}%'))
        if mode:
            query = query.filter_by(mode=mode)
        if company:
            query = query.filter(Internship.company.ilike(f'%{company}%'))
        
        # Order by deadline
        internships = query.order_by(Internship.deadline.asc()).all()
        
        return jsonify([i.to_dict() for i in internships]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@internships_bp.route('/<int:id>', methods=['GET'])
def get_internship(id):
    """Get a specific internship by ID"""
    try:
        internship = Internship.query.get(id)
        
        if not internship:
            return jsonify({'error': 'Internship not found'}), 404
        
        return jsonify(internship.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@internships_bp.route('', methods=['POST'])
@jwt_required()
def create_internship():
    """Create a new internship (admin/hoster)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Determine status based on role
        initial_status = 'approved' if user.role in ['admin', 'hoster'] else 'pending'
        
        data = request.get_json()
        
        # Validate required fields
        if not all(k in data for k in ['title', 'company', 'description', 'location', 'deadline']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Parse dates
        try:
            deadline_str = str(data['deadline'])
            try:
                deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
            except:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
        except Exception as e:
            return jsonify({'error': f'Invalid deadline format: {str(e)}'}), 400
        
        start_date = None
        if data.get('start_date'):
            try:
                start_str = str(data['start_date'])
                try:
                    start_date = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
                except:
                    start_date = datetime.strptime(start_str, '%Y-%m-%d')
            except:
                pass
        
        # Create internship
        internship = Internship(
            title=str(data['title']),
            company=str(data['company']),
            description=str(data['description']),
            location=str(data['location']),
            mode=str(data.get('mode', 'hybrid')),
            duration=str(data.get('duration', '')) if data.get('duration') else None,
            stipend=str(data.get('stipend', '')) if data.get('stipend') else None,
            deadline=deadline,
            start_date=start_date,
            application_link=str(data.get('application_link', '')) if data.get('application_link') else None,
            status=initial_status,
            source=str(data.get('source', 'devalert')),
            host_id=user_id
        )
        
        db.session.add(internship)
        db.session.commit()
        
        # Notify all participants about the new internship
        try:
            participants = User.query.filter_by(role='participant').all()
            for participant in participants:
                note = Notification(
                    user_id=participant.id,
                    event_type='internship',
                    event_id=internship.id,
                    title=f"New Internship: {internship.title}",
                    message=f"A new internship '{internship.title}' at {internship.company} has been posted. Check it out!",
                    is_read=False
                )
                db.session.add(note)
            db.session.commit()
        except Exception as e:
            print(f"Error sending notifications: {e}")
        
        return jsonify({
            'message': 'Internship created successfully' + (' (Pending Approval)' if initial_status == 'pending' else ''),
            'internship': internship.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating internship: {str(e)}")
        return jsonify({'error': f'Failed to create internship: {str(e)}'}), 500


@internships_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_internship(id):
    """Update an internship (admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        internship = Internship.query.get(id)
        
        if not internship:
            return jsonify({'error': 'Internship not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'title' in data:
            internship.title = data['title']
        if 'company' in data:
            internship.company = data['company']
        if 'description' in data:
            internship.description = data['description']
        if 'location' in data:
            internship.location = data['location']
        if 'mode' in data:
            internship.mode = data['mode']
        if 'duration' in data:
            internship.duration = data['duration']
        if 'stipend' in data:
            internship.stipend = data['stipend']
        if 'deadline' in data:
            internship.deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        if 'start_date' in data:
            internship.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        if 'skills_required' in data:
            internship.skills_required = data['skills_required']
        if 'application_link' in data:
            internship.application_link = data['application_link']
        if 'status' in data:
            internship.status = data['status']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Internship updated successfully',
            'internship': internship.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@internships_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_internship(id):
    """Delete an internship (admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        internship = Internship.query.get(id)
        
        if not internship:
            return jsonify({'error': 'Internship not found'}), 404
        
        db.session.delete(internship)
        db.session.commit()
        
        return jsonify({'message': 'Internship deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
