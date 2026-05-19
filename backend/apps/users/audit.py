"""
Reusable audit-logging mixin for DRF ViewSets.

Add  `AuditLoggingMixin`  as the first base class and set `audit_module`
on the viewset.  Example:

    class BookingViewSet(AuditLoggingMixin, viewsets.ModelViewSet):
        audit_module = 'bookings'
"""
from apps.users.models import ActivityLog


class AuditLoggingMixin:
    """Automatically log create / update / destroy actions for a ViewSet."""

    audit_module: str = ''

    def _module(self):
        return self.audit_module or self.__class__.__name__.replace('ViewSet', '').lower()

    def perform_create(self, serializer):
        super().perform_create(serializer)
        obj = serializer.instance
        ActivityLog.log(
            user=self.request.user,
            action='create',
            module=self._module(),
            description=f"Created {self._module()} record",
            request=self.request,
            object_id=getattr(obj, 'pk', ''),
        )

    def perform_update(self, serializer):
        super().perform_update(serializer)
        obj = serializer.instance
        ActivityLog.log(
            user=self.request.user,
            action='update',
            module=self._module(),
            description=f"Updated {self._module()} record",
            request=self.request,
            object_id=getattr(obj, 'pk', ''),
        )

    def perform_destroy(self, instance):
        obj_id = getattr(instance, 'pk', '')
        description = str(instance)
        super().perform_destroy(instance)
        ActivityLog.log(
            user=self.request.user,
            action='delete',
            module=self._module(),
            description=f"Deleted {self._module()}: {description}",
            request=self.request,
            object_id=obj_id,
        )
