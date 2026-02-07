"""
Notification routes for user alerts
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Notification, User

notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get all notifications for the current user"""
    try:
        user_id = get_jwt_identity()
        
        # Get query parameters
        is_read = request.args.get('is_read')
        limit = request.args.get('limit', type=int)
        
        # Build query
        query = Notification.query.filter_by(user_id=user_id)
        
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            query = query.filter_by(is_read=is_read_bool)
        
        # Order by created_at desc (newest first)
        query = query.order_by(Notification.created_at.desc())
        
        if limit:
            query = query.limit(limit)
        
        notifications = query.all()
        
        return jsonify([n.to_dict() for n in notifications]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get count of unread notifications"""
    try:
        user_id = get_jwt_identity()
        count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
        return jsonify({'count': count}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_as_read(notification_id):
    """Mark a notification as read"""
    try:
        user_id = get_jwt_identity()
        
        notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({'message': 'Notification marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notifications_bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_as_read():
    """Mark all notifications as read for the current user"""
    try:
        user_id = get_jwt_identity()
        
        Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
        db.session.commit()
        
        return jsonify({'message': 'All notifications marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
