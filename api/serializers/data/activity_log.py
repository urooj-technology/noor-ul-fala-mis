from rest_framework import serializers
from api.models.data.activity_log import ActivityLog
from account.models import User
from api.utils.calendar import get_calendar_info


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    # Calendar date fields
    created_at_shamsi = serializers.SerializerMethodField(read_only=True)
    created_at_qamari = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_name', 'user_email', 'user_role', 
            'action', 'model_name', 'object_id', 'description', 
            'ip_address', 'user_agent', 'changes', 'created_at', 'updated_at',
            'created_at_shamsi', 'created_at_qamari'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_at_shamsi', 'created_at_qamari']
    
    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip() or obj.user.username
        return "Unknown"
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else None
    
    def get_user_role(self, obj):
        return obj.user.get_role_display() if obj.user else None

    def get_created_at_shamsi(self, obj):
        """Get activity log created time in Afghanistan Shamsi calendar"""
        return get_calendar_info(obj.created_at).get('shamsi')

    def get_created_at_qamari(self, obj):
        """Get activity log created time in Hijri Qamari calendar"""
        return get_calendar_info(obj.created_at).get('qamari')
