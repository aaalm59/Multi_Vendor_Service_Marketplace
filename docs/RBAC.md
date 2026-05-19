# RBAC Matrix

Local ERP roles:

- `admin`: full system access.
- `manager`: operational management, reports, staff, technicians, expenses.
- `sales_staff`: customers, bookings view, POS billing, product lookup.
- `inventory_staff`: inventory, stock movement, suppliers, purchases.
- `technician`: own assigned bookings, own technician profile, service catalog.
- `customer`: own customer profile, own bookings, own invoices, service catalog.

## Frontend Access

| Module | Roles |
| --- | --- |
| Dashboard | all authenticated roles |
| Customers | admin, manager, sales_staff, customer |
| Bookings | admin, manager, technician, customer |
| Services | all authenticated roles |
| Inventory | admin, manager, sales_staff, inventory_staff |
| Billing | admin, manager, sales_staff |
| Staff | admin, manager |
| Technicians | admin, manager, technician |
| Suppliers | admin, manager, inventory_staff |
| Expenses | admin, manager |
| Reports | admin, manager |
| Settings | admin, manager |

## Backend Enforcement

The backend uses `HasRolePermission` in `apps.users.permissions` with each viewset declaring `allowed_roles` or `allowed_roles_by_action`.

Important data scoping:

- Customers only see their own customer profile.
- Customers only see their own bookings and invoices.
- Technicians only see bookings assigned to them and their own technician profile.
- Notifications are always scoped to the logged-in user.
- Dashboard summary returns role-scoped numbers for customers, technicians, sales staff, and inventory staff.
