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
    Custom actions must be mapped via view.action_permissions or get_required_permission().
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
            if getattr(view, 'permission_module', None):
                return False
            return True

        return user.has_permission(codename)


class HasReportPermission(BasePermission):
    """Require view_reports; export formats also require export_reports."""

    message = 'You do not have permission to view or export reports.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user_is_admin(user):
            return True
        export = request.query_params.get('export')
        if export in ('excel', 'pdf'):
            return user.has_permission('export_reports')
        return user.has_permission('view_reports')


class HasFinancialReportPermission(BasePermission):
    """Require view_financial_reports for accounting report endpoints."""

    message = 'You do not have permission to view financial reports.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user_is_admin(user):
            return True
        return user.has_permission('view_financial_reports')


class HasManageSettingsPermission(BasePermission):
    """Require manage_settings for system configuration endpoints."""

    message = 'You do not have permission to manage settings.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user_is_admin(user):
            return True
        return user.has_permission('manage_settings')


class HasAnyCodenamePermission(BasePermission):
    """Pass if the user has any of view.any_required_permissions."""

    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user_is_admin(user):
            return True
        codenames = getattr(view, 'any_required_permissions', None) or []
        if not codenames:
            return True
        return any(user.has_permission(codename) for codename in codenames)


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
