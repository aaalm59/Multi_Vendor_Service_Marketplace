from rest_framework import viewsets
from rest_framework.serializers import ModelSerializer
from apps.expenses.models import Expense, ExpenseCategory
from apps.users.permissions import HasRolePermission, MANAGER_ROLES
from apps.shops.views import TenantScopedViewSetMixin

class ExpenseCategorySerializer(ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'

class ExpenseSerializer(ModelSerializer):
    category_detail = ExpenseCategorySerializer(source='category', read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['category'] = data.pop('category_detail')
        return data

    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['id', 'expense_number', 'created_at', 'updated_at']

class ExpenseCategoryViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """Expense category API"""
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [HasRolePermission]
    permission_module = 'expenses'
    allowed_roles = MANAGER_ROLES

class ExpenseViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """Expense management API"""
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [HasRolePermission]
    permission_module = 'expenses'
    allowed_roles = MANAGER_ROLES
    filterset_fields = ['category', 'expense_date', 'is_approved']
    ordering_fields = ['expense_date', 'amount']
    search_fields = ['description']
