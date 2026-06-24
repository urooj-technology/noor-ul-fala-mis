from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser

# Custom User Manager
class UserManager(BaseUserManager):
    def create_user(
        self,
        username,
        email,
        phone=None,
        first_name=None,
        last_name=None,
        password=None,
    ):
        if not username:
            raise ValueError("User must have a username")
        if not email:
            raise ValueError("User must have an email")
        username = username.lower()
        email = self.normalize_email(email)
        user = self.model(
            username=username,
            email=email,
            phone=phone,
            first_name=first_name,
            last_name=last_name,
        )
        if not password:
            raise ValueError("Users must have a password.")
        user.set_password(password)
        user.save(using=self._db)
        return user
        
    def create_superuser(self, username, email, password=None):
        if not username:
            raise ValueError("Superusers must have a username.")
        if not email:
            raise ValueError("Superusers must have an email.")
        if not password:
            raise ValueError("Superusers must have a password.")

        username = username.lower()
        email = self.normalize_email(email)

        user = (
            self.filter(username=username).first()
            or self.filter(email=email).first()
        )
        if user:
            user.email = email
            user.username = username
            user.set_password(password)
        else:
            user = self.model(
                username=username,
                email=email,
            )
            user.set_password(password)

        user.is_admin = user.is_staff = user.is_superuser = True
        user.is_active = True
        user.save(using=self._db)
        return user

class User(AbstractBaseUser):
    ROLE_CHOICES = [
        ('super_admin', 'Super Admin'),
        ('admin', 'Admin'),
        ('accountant', 'Accountant'),
        ('hr_manager', 'HR Manager'),
        ('registration_officer', 'Registration Officer'),
        ('cashier', 'Cashier'),
        ('teacher', 'Teacher'),
        ('viewer', 'Viewer'),
        ('employee', 'Employee'),
        ('customer', 'Customer'),
        ('vendor', 'Vendor'),
    ]
    
    CALENDAR_CHOICES = [
        ('gregorian', 'Gregorian (میلادی)'),
        ('shamsi', 'Shamsi (شمسی)'),
        ('qamari', 'Qamari (قمری)'),
    ]
    
    username = models.CharField(verbose_name="username", max_length=255, unique=True)
    email = models.EmailField(verbose_name="email address", max_length=255, unique=True)
    phone = models.CharField(max_length=15, blank=True, null=True)
    first_name = models.CharField(max_length=200, null=True, blank=True)
    last_name = models.CharField(max_length=200, null=True, blank=True)
    profile_picture = models.ImageField(upload_to="authors/", blank=True, null=True)

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='viewer')
    preferred_calendar = models.CharField(
        max_length=20, 
        choices=CALENDAR_CHOICES, 
        default='shamsi',
        verbose_name='Preferred Calendar'
    )
    address = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_buyer = models.BooleanField(default=False)
    is_seller = models.BooleanField(default=False)
    is_finance = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Add these fields to the User model to store OTP details
    otp = models.CharField(max_length=6, null=True, blank=True)
    otp_created_at = models.DateTimeField(null=True, blank=True)
    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]
    
    def __str__(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip()
        
    def has_perm(self, perm, obj=None):
        """Admin users have all permissions."""
        return self.is_admin or self.is_superuser or self.role == 'super_admin'
        
    def has_module_perms(self, app_label):
        """Admin users have permissions to view any app."""
        return self.is_admin or self.is_superuser or self.role == 'super_admin'
    
    def has_permission(self, permission_codename):
        """Check if user has a specific permission"""
        if self.is_admin or self.is_superuser or self.role in ('super_admin', 'admin'):
            return True
        
        try:
            from api.models.data.permissions import UserPermission, Permission
            permission = Permission.objects.get(codename=permission_codename)
            user_permission = UserPermission.objects.get(user=self, permission=permission)
            return user_permission.granted
        except (Permission.DoesNotExist, UserPermission.DoesNotExist):
            return False
    
    def get_permissions(self):
        """Get all permissions for this user"""
        if self.is_admin or self.is_superuser or self.role in ('super_admin', 'admin'):
            from api.models.data.permissions import Permission
            return list(Permission.objects.values_list('codename', flat=True))
        
        from api.models.data.permissions import UserPermission
        return list(
            UserPermission.objects.filter(user=self, granted=True)
            .values_list('permission__codename', flat=True)
        )