import csv
from datetime import timedelta

from django.db import models
from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from apps.billing.models import Invoice
from apps.bookings.models import Booking
from apps.expenses.models import Expense
from apps.inventory.models import Product
from apps.reports.models import Report, DailyMetrics
from apps.users.permissions import ALL_AUTH_ROLES, CUSTOMER, HasRolePermission, INVENTORY_STAFF, MANAGER_ROLES, SALES_STAFF, TECHNICIAN

class ReportSerializer(ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'

class DailyMetricsSerializer(ModelSerializer):
    class Meta:
        model = DailyMetrics
        fields = '__all__'

class ReportViewSet(viewsets.ModelViewSet):
    """Report generation API"""
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [HasRolePermission]
    allowed_roles = MANAGER_ROLES
    filterset_fields = ['report_type', 'generated_date']
    ordering_fields = ['generated_date', 'start_date']

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Local CSV export endpoint for report records."""
        export_format = request.query_params.get('format', 'csv').lower()
        if export_format not in {'csv', 'excel', 'pdf'}:
            return Response({'error': 'Supported formats: csv, excel, pdf'}, status=400)
        if export_format != 'csv':
            return Response({'message': f'{export_format.upper()} export placeholder is ready for local generator integration.'})

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="erp-reports.csv"'
        writer = csv.writer(response)
        writer.writerow(['Title', 'Type', 'Start Date', 'End Date', 'Generated Date'])
        for report in self.filter_queryset(self.get_queryset()):
            writer.writerow([report.title, report.report_type, report.start_date, report.end_date, report.generated_date])
        return response

class DailyMetricsViewSet(viewsets.ModelViewSet):
    """Daily metrics API"""
    queryset = DailyMetrics.objects.all()
    serializer_class = DailyMetricsSerializer
    permission_classes = [HasRolePermission]
    allowed_roles_by_action = {
        'dashboard_summary': ALL_AUTH_ROLES,
        'read': MANAGER_ROLES,
        'write': MANAGER_ROLES,
    }
    ordering_fields = ['date']

    @action(detail=False, methods=['get'])
    def dashboard_summary(self, request):
        """Aggregate dashboard numbers from operational tables for local ERP dashboard."""
        today = timezone.localdate()
        month_start = today.replace(day=1)
        user = request.user

        if getattr(user, 'role', None) == CUSTOMER:
            own_invoices = Invoice.objects.filter(customer__user=user)
            own_bookings = Booking.objects.filter(customer__user=user)
            daily_revenue = own_invoices.filter(invoice_date__date=today).aggregate(total=Sum('total_amount'))['total'] or 0
            monthly_revenue = own_invoices.filter(invoice_date__date__gte=month_start).aggregate(total=Sum('total_amount'))['total'] or 0
            return Response({
                'daily_revenue': daily_revenue,
                'monthly_revenue': monthly_revenue,
                'monthly_expenses': 0,
                'profit_loss': 0,
                'open_bookings': own_bookings.exclude(status__in=['completed', 'cancelled']).count(),
                'pending_bookings': own_bookings.filter(status='pending').count(),
                'completed_bookings': own_bookings.filter(completion_date__date__gte=month_start).count(),
                'low_stock_products': 0,
            })

        if getattr(user, 'role', None) == TECHNICIAN:
            own_bookings = Booking.objects.filter(technician__user=user)
            return Response({
                'daily_revenue': 0,
                'monthly_revenue': 0,
                'monthly_expenses': 0,
                'profit_loss': 0,
                'open_bookings': own_bookings.exclude(status__in=['completed', 'cancelled']).count(),
                'pending_bookings': own_bookings.filter(status='assigned').count(),
                'completed_bookings': own_bookings.filter(completion_date__date__gte=month_start).count(),
                'low_stock_products': 0,
            })

        if getattr(user, 'role', None) == INVENTORY_STAFF:
            return Response({
                'daily_revenue': 0,
                'monthly_revenue': 0,
                'monthly_expenses': 0,
                'profit_loss': 0,
                'open_bookings': 0,
                'pending_bookings': 0,
                'completed_bookings': 0,
                'low_stock_products': Product.objects.filter(
                    inventory__quantity_on_hand__lte=models.F('inventory__reorder_level')
                ).count(),
            })

        if getattr(user, 'role', None) == SALES_STAFF:
            daily_revenue = Invoice.objects.filter(invoice_date__date=today).aggregate(total=Sum('total_amount'))['total'] or 0
            monthly_revenue = Invoice.objects.filter(invoice_date__date__gte=month_start).aggregate(total=Sum('total_amount'))['total'] or 0
            return Response({
                'daily_revenue': daily_revenue,
                'monthly_revenue': monthly_revenue,
                'monthly_expenses': 0,
                'profit_loss': 0,
                'open_bookings': Booking.objects.exclude(status__in=['completed', 'cancelled']).count(),
                'pending_bookings': Booking.objects.filter(status='pending').count(),
                'completed_bookings': Booking.objects.filter(completion_date__date__gte=month_start).count(),
                'low_stock_products': Product.objects.filter(
                    inventory__quantity_on_hand__lte=models.F('inventory__reorder_level')
                ).count(),
            })

        daily_revenue = Invoice.objects.filter(invoice_date__date=today).aggregate(total=Sum('total_amount'))['total'] or 0
        monthly_revenue = Invoice.objects.filter(invoice_date__date__gte=month_start).aggregate(total=Sum('total_amount'))['total'] or 0
        monthly_expenses = Expense.objects.filter(expense_date__gte=month_start).aggregate(total=Sum('amount'))['total'] or 0

        open_bookings = Booking.objects.exclude(status__in=['completed', 'cancelled']).count()
        pending_bookings = Booking.objects.filter(status='pending').count()
        completed_bookings = Booking.objects.filter(completion_date__date__gte=month_start).count()
        low_stock_products = Product.objects.filter(
            inventory__quantity_on_hand__lte=models.F('inventory__reorder_level')
        ).count()

        trend_start = today - timedelta(days=29)
        existing_dates = set(DailyMetrics.objects.filter(date__gte=trend_start).values_list('date', flat=True))
        if today not in existing_dates:
            DailyMetrics.objects.update_or_create(
                date=today,
                defaults={
                    'total_revenue': daily_revenue,
                    'total_expenses': Expense.objects.filter(expense_date=today).aggregate(total=Sum('amount'))['total'] or 0,
                    'total_profit': daily_revenue - (Expense.objects.filter(expense_date=today).aggregate(total=Sum('amount'))['total'] or 0),
                    'total_bookings': Booking.objects.filter(created_at__date=today).count(),
                    'completed_bookings': Booking.objects.filter(completion_date__date=today).count(),
                    'pending_bookings': pending_bookings,
                },
            )

        return Response({
            'daily_revenue': daily_revenue,
            'monthly_revenue': monthly_revenue,
            'monthly_expenses': monthly_expenses,
            'profit_loss': monthly_revenue - monthly_expenses,
            'open_bookings': open_bookings,
            'pending_bookings': pending_bookings,
            'completed_bookings': completed_bookings,
            'low_stock_products': low_stock_products,
        })
