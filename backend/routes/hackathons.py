from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Hackathon, User, Notification
from datetime import datetime

hackathons_bp = Blueprint('hackathons', __name__)

@hackathons_bp.route('', methods=['GET'])
def get_hackathons():
    """Get all approved hackathons with optional filters"""
    try:
        # Get query parameters
        location = request.args.get('location')
        mode = request.args.get('mode')
        status = request.args.get('status', 'approved')  # Default to approved for public view
        
        # Build query
        query = Hackathon.query
        
        if status:
            query = query.filter_by(status=status)
        if location:
            query = query.filter(Hackathon.location.ilike(f'%{location}%'))
        if mode:
            query = query.filter_by(mode=mode)
        
        # Sorting
        sort_by = request.args.get('sort_by', 'deadline')
        order = request.args.get('order', 'asc')
        
        if sort_by == 'created_at':
            sort_attr = Hackathon.created_at
        else:
            sort_attr = Hackathon.deadline
            
        if order == 'desc':
            query = query.order_by(sort_attr.desc())
        else:
            query = query.order_by(sort_attr.asc())
        
        hackathons = query.all()
        
        return jsonify([h.to_dict() for h in hackathons]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hackathons_bp.route('/<int:id>', methods=['GET'])
def get_hackathon(id):
    """Get a specific hackathon by ID"""
    try:
        hackathon = Hackathon.query.get(id)
        
        if not hackathon:
            return jsonify({'error': 'Hackathon not found'}), 404
        
        return jsonify(hackathon.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hackathons_bp.route('', methods=['POST'])
@jwt_required()
def create_hackathon():
    """Create a new hackathon (admin/hoster)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Determine status based on role
        # Admins and Hosters get auto-approved (or maybe just Admins?)
        # Let's say Admins and Hosters get approved, Participants get pending
        initial_status = 'approved' if user.role in ['admin', 'hoster'] else 'pending'
        
        data = request.get_json()
        
        # Validate required fields
        if not all(k in data for k in ['title', 'description', 'location', 'deadline']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Parse deadline
        try:
            deadline_str = str(data['deadline'])
            try:
                deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
            except:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%d')
        except Exception as e:
            return jsonify({'error': f'Invalid deadline format: {str(e)}'}), 400
        
        start_date = None
        end_date = None
        if data.get('start_date'):
            try:
                start_str = str(data['start_date'])
                try:
                    start_date = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
                except:
                    start_date = datetime.strptime(start_str, '%Y-%m-%d')
            except:
                pass # Ignore invalid start date
        
        if data.get('end_date'):
            try:
                end_str = str(data['end_date'])
                try:
                    end_date = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
                except:
                    end_date = datetime.strptime(end_str, '%Y-%m-%d')
            except:
                pass # Ignore invalid end date
        
        # Create hackathon
        hackathon = Hackathon(
            title=str(data['title']),
            description=str(data['description']),
            organizer=str(data.get('organizer', '')) if data.get('organizer') else None,
            location=str(data['location']),
            mode=str(data.get('mode', 'hybrid')),
            deadline=deadline,
            start_date=start_date,
            end_date=end_date,
            registration_link=str(data.get('registration_link', '')) if data.get('registration_link') else None,
            status=initial_status,
            source=str(data.get('source', 'devalert')),
            host_id=user_id
        )
        
        db.session.add(hackathon)
        db.session.commit()
        
        # Notify all participants about the new hackathon
        try:
            participants = User.query.filter_by(role='participant').all()
            for participant in participants:
                note = Notification(
                    user_id=participant.id,
                    event_type='hackathon',
                    event_id=hackathon.id,
                    title=f"New Hackathon: {hackathon.title}",
                    message=f"A new hackathon '{hackathon.title}' has been posted. Check it out!",
                    is_read=False
                )
                db.session.add(note)
            db.session.commit()
        except Exception as e:
            print(f"Error sending notifications: {e}")
            # Don't fail the request if notifications fail
        
        return jsonify({
            'message': 'Hackathon created successfully' + (' (Pending Approval)' if initial_status == 'pending' else ''),
            'hackathon': hackathon.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating hackathon: {str(e)}") # Add server log
        return jsonify({'error': f'Failed to create hackathon: {str(e)}'}), 500


@hackathons_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_hackathon(id):
    """Update a hackathon (admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        hackathon = Hackathon.query.get(id)
        
        if not hackathon:
            return jsonify({'error': 'Hackathon not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'title' in data:
            hackathon.title = data['title']
        if 'description' in data:
            hackathon.description = data['description']
        if 'organizer' in data:
            hackathon.organizer = data['organizer']
        if 'location' in data:
            hackathon.location = data['location']
        if 'mode' in data:
            hackathon.mode = data['mode']
        if 'deadline' in data:
            hackathon.deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        if 'start_date' in data:
            hackathon.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        if 'end_date' in data:
            hackathon.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        if 'prize_pool' in data:
            hackathon.prize_pool = data['prize_pool']
        if 'registration_link' in data:
            hackathon.registration_link = data['registration_link']
        if 'status' in data:
            hackathon.status = data['status']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Hackathon updated successfully',
            'hackathon': hackathon.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@hackathons_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_hackathon(id):
    """Delete a hackathon (admin only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'admin':
            return jsonify({'error': 'Unauthorized'}), 403
        
        hackathon = Hackathon.query.get(id)
        
        if not hackathon:
            return jsonify({'error': 'Hackathon not found'}), 404
        
        db.session.delete(hackathon)
        db.session.commit()
        
        return jsonify({'message': 'Hackathon deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
