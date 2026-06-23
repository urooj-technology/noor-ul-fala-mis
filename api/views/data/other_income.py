from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.utils import timezone
from api.models.data.other_income import OtherIncome, IncomeCategory
from api.serializers.data.other_income import OtherIncomeSerializer, IncomeCategorySerializer
from api.views.data.base import DataRootViewSet
from decimal import Decimal


class IncomeCategoryViewSet(DataRootViewSet):
    permission_module = 'other_income'
    queryset = IncomeCategory.objects.all().order_by('name')
    serializer_class = IncomeCategorySerializer
    filterset_fields = ['category_type', 'is_active']
    search_fields = ['name', 'description']


class OtherIncomeViewSet(DataRootViewSet):
    permission_module = 'other_income'
    queryset = OtherIncome.objects.all().order_by('-income_date')
    serializer_class = OtherIncomeSerializer
    filterset_fields = ['income_category', 'income_date']
    search_fields = ['source', 'description']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by category
        category = self.request.query_params.get('income_category')
        if category:
            queryset = queryset.filter(income_category_id=category)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(income_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(income_date__lte=end_date)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def daily_summary(self, request):
        """Get daily income summary"""
        date = request.query_params.get('date', timezone.now().date().isoformat())
        
        summary = OtherIncome.objects.filter(
            income_date=date
        ).aggregate(
            total_amount=Sum('amount'),
            count=Count('id')
        )
        
        return Response({
            'date': date,
            'total_amount': float(summary['total_amount'] or 0),
            'income_count': summary['count'] or 0
        })
    
    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """Get monthly income summary"""
        year = request.query_params.get('year', timezone.now().year)
        month = request.query_params.get('month')
        
        queryset = OtherIncome.objects.filter(income_date__year=year)
        
        if month:
            queryset = queryset.filter(income_date__month=month)
        
        summary = queryset.aggregate(
            total_amount=Sum('amount'),
            count=Count('id')
        )
        
        return Response({
            'year': year,
            'month': month,
            'total_amount': float(summary['total_amount'] or 0),
            'income_count': summary['count'] or 0
        })
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get income grouped by category"""
        year = request.query_params.get('year', timezone.now().year)
        month = request.query_params.get('month')
        
        queryset = OtherIncome.objects.filter(income_date__year=year)
        
        if month:
            queryset = queryset.filter(income_date__month=month)
        
        income_by_category = queryset.values(
            'income_category__name'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        )
        
        return Response({
            'year': year,
            'month': month,
            'income_by_category': list(income_by_category)
        })
    
    def perform_create(self, serializer):
        """Create other income - journal entry created automatically by signal"""
        serializer.save()
