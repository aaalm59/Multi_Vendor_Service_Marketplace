from django.contrib import admin
from apps.reports.models import Report, DailyMetrics

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['title', 'report_type', 'generated_date', 'start_date', 'end_date']
    list_filter = ['report_type', 'generated_date']
    search_fields = ['title']
    readonly_fields = ['id', 'generated_date']

@admin.register(DailyMetrics)
class DailyMetricsAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_revenue', 'total_expenses', 'total_profit', 'total_bookings']
    list_filter = ['date']
    readonly_fields = ['date']
