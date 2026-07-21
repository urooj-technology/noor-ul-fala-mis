from django.core.management.base import BaseCommand

from api.services.chart_of_accounts import ensure_chart_of_accounts


class Command(BaseCommand):
    help = 'Initialize the Chart of Accounts with standard accounts for AFN and USD currencies'

    def handle(self, *args, **options):
        self.stdout.write('Initializing Chart of Accounts for AFN and USD...')

        result = ensure_chart_of_accounts()

        for currency_result in result['currencies']:
            currency = currency_result['currency']
            self.stdout.write(
                f"\n{currency} ({currency_result['currency_name']}): "
                f"created {currency_result['created_count']}, "
                f"restored {currency_result['restored_count']}"
            )
            for code in currency_result['created_codes']:
                self.stdout.write(f'  Created: {code}')
            for code in currency_result['restored_codes']:
                self.stdout.write(f'  Restored: {code}')

        fiscal = result['fiscal_year']
        if fiscal['created']:
            self.stdout.write(f"Created fiscal year: {fiscal['name']}")
        elif fiscal['restored']:
            self.stdout.write(f"Restored fiscal year: {fiscal['name']}")
        else:
            self.stdout.write(f"Fiscal year already exists: {fiscal['name']}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Chart of Accounts ready "
                f"(created {result['accounts_created']}, restored {result['accounts_restored']})"
            )
        )
