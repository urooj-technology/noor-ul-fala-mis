from django.apps import AppConfig
from django.db.models.signals import post_migrate


def _ensure_chart_of_accounts_after_migrate(sender, **kwargs):
    """Create missing chart-of-accounts rows after api migrations."""
    # Only run for this app, and only when the Account table exists.
    from django.db import connection

    table_names = set(connection.introspection.table_names())
    if 'api_account' not in table_names:
        return

    from api.services.chart_of_accounts import ensure_chart_of_accounts

    ensure_chart_of_accounts()


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        import api.signals  # noqa: F401
        
        # Connect file upload signal handlers
        from api.signals.file_upload_handler import connect_signal_handlers
        connect_signal_handlers()

        post_migrate.connect(
            _ensure_chart_of_accounts_after_migrate,
            sender=self,
            dispatch_uid='api.ensure_chart_of_accounts_after_migrate',
        )
