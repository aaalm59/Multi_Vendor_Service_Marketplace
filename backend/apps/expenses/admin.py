from django.contrib import admin
from apps.expenses.models import Expense, ExpenseCategory

@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['expense_number', 'category', 'amount', 'expense_date', 'is_approved']
    list_filter = ['category', 'expense_date', 'is_approved']
    search_fields = ['expense_number', 'description']
    readonly_fields = ['id', 'expense_number', 'created_at', 'updated_at']
