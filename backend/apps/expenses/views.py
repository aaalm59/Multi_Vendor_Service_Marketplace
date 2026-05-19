from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import ModelSerializer
from apps.expenses.models import Expense, ExpenseCategory

class ExpenseCategorySerializer(ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'

class ExpenseSerializer(ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    """Expense category API"""
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated]

class ExpenseViewSet(viewsets.ModelViewSet):
    """Expense management API"""
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['category', 'expense_date', 'is_approved']
    ordering_fields = ['expense_date', 'amount']
    search_fields = ['description']
