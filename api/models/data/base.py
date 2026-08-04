from django.db import models
from django.contrib.auth.models import User


class BaseModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        'account.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_%(class)s_set'
    )

    class Meta:
        abstract = True
    
    def soft_delete(self, user=None):
        """Soft delete the object"""
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        if user:
            self.deleted_by = user
        self.save()
    
    def restore(self):
        """Restore a soft-deleted object"""
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save()
    
    def delete(self, *args, hard=False, **kwargs):
        """Override delete to support hard deletes for permanently deleted items"""
        if hard:
            # Force hard delete
            return super().delete(*args, **kwargs)
        else:
            # Default to soft delete
            return self.soft_delete(*args, **kwargs)
    
    @classmethod
    def active(cls):
        """Return only active (non-deleted) objects"""
        return cls.objects.filter(is_deleted=False)