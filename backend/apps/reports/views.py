from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import ModelSerializer
from apps.reports.models import Report, DailyMetrics

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
    permission_classes = [IsAuthenticated]
    filterset_fields = ['report_type', 'generated_date']
    ordering_fields = ['generated_date', 'start_date']

class DailyMetricsViewSet(viewsets.ModelViewSet):
    """Daily metrics API"""
    queryset = DailyMetrics.objects.all()
    serializer_class = DailyMetricsSerializer
    permission_classes = [IsAuthenticated]
    ordering_fields = ['date']
