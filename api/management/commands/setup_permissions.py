from django.core.management.base import BaseCommand

from api.services.permissions_service import setup_default_permissions


class Command(BaseCommand):
    help = 'Create default permissions for the ERP system'

    def handle(self, *args, **options):
        self.stdout.write('Creating default permissions...')
        result = setup_default_permissions()
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {result["created_count"]} permissions '
                f'({result["total_count"]} total)'
            )
        )
