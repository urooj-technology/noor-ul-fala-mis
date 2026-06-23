from rest_framework.permissions import BasePermission


def user_is_admin(user):
    if not user or not user.is_authenticated:
        return False
    return (
        user.is_admin
        or user.is_superuser
        or getattr(user, 'role', None) in ('super_admin', 'admin')
    )


class IsAdmin(BasePermission):
    """Only admin users can access."""

    message = 'Admin access required.'

    def has_permission(self, request, view):
        return user_is_admin(request.user)


class HasModelPermission(BasePermission):
    """
    Check granular permission based on view.permission_module and action.
    Codenames: view_{module}, create_{module}, edit_{module}, delete_{module}
    """

    ACTION_PREFIX = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'create',
        'update': 'edit',
        'partial_update': 'edit',
        'destroy': 'delete',
    }

    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user_is_admin(user):
            return True

        codename = view.get_required_permission() if hasattr(view, 'get_required_permission') else None
        if not codename:
            return True

        return user.has_permission(codename)


class HasCodenamePermission(BasePermission):
    """Check a single permission codename set on the view as required_permission."""

    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user_is_admin(user):
            return True
        codename = getattr(view, 'required_permission', None)
        if not codename:
            return True
        return user.has_permission(codename)
