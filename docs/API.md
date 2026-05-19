# API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication

All endpoints (except `/auth/register/` and `/auth/login/`) require JWT Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Get Tokens
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "role": "customer"
  },
  "tokens": {
    "access": "eyJ...",
    "refresh": "eyJ..."
  }
}
```

## Endpoints

### Authentication

#### Register
- **POST** `/auth/register/`
- **No Auth Required**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePassword123!",
  "password_confirm": "SecurePassword123!"
}
```

#### Login
- **POST** `/auth/login/`
- **No Auth Required**

#### Get Current User
- **GET** `/auth/me/`
- **Auth Required**

#### Change Password
- **POST** `/auth/change_password/`
- **Auth Required**

### Users

#### List Users
- **GET** `/users/?role=technician&limit=50`
- **Auth Required**

#### Get User by Role
- **GET** `/users/by_role/?role=technician`
- **Auth Required**

#### Get User Details
- **GET** `/users/{id}/`
- **Auth Required**

#### Update User
- **PATCH** `/users/{id}/`
- **Auth Required**

#### Activate User
- **POST** `/users/{id}/activate/`
- **Auth Required**

#### Deactivate User
- **POST** `/users/{id}/deactivate/`
- **Auth Required**

### Customers

#### List Customers
- **GET** `/customers/?limit=50&offset=0`
- **Query Params**: `limit`, `offset`, `city`

#### Get Customers by City
- **GET** `/customers/by_city/?city=Delhi`

#### Get Top Customers
- **GET** `/customers/top_customers/?limit=10`

#### Get Customer Details
- **GET** `/customers/{id}/`

#### Create Customer
- **POST** `/customers/`

```json
{
  "gst_number": "18AABCD1234F1Z0",
  "shop_name": "XYZ Electronics",
  "address": "123 Main St",
  "city": "Delhi",
  "state": "Delhi",
  "postal_code": "110001",
  "preferred_contact": "phone"
}
```

#### Update Customer
- **PATCH** `/customers/{id}/`

### Bookings

#### List Bookings
- **GET** `/bookings/?limit=50&status=pending`
- **Filters**: `customer`, `technician`, `status`

#### Create Booking
- **POST** `/bookings/`

```json
{
  "service": "uuid",
  "booking_date": "2024-01-15T10:00:00Z",
  "service_address": "123 Main St, Delhi",
  "problem_description": "Fan is not working",
  "problem_image": "base64_image_or_file"
}
```

#### Get Booking Details
- **GET** `/bookings/{id}/`

#### Assign Technician
- **POST** `/bookings/{id}/assign_technician/`

```json
{
  "technician_id": "uuid"
}
```

#### Mark as Completed
- **POST** `/bookings/{id}/mark_completed/`

```json
{
  "final_amount": 500,
  "notes": "Work completed successfully"
}
```

### Technicians

#### List Technicians
- **GET** `/technicians/?limit=50`

#### Get Available Technicians
- **GET** `/technicians/available/`

#### Get Technicians by Specialization
- **GET** `/technicians/by_specialization/?specialization=Electrical`

#### Get Technician Availability
- **GET** `/technicians/{id}/availability/`

### Inventory

#### List Products
- **GET** `/inventory/products/?limit=100&category=Wire`
- **Filters**: `category`, `is_taxable`
- **Search**: `name`, `SKU`, `barcode`

#### Create Product
- **POST** `/inventory/products/`

```json
{
  "SKU": "LED001",
  "name": "LED Bulb 10W",
  "description": "Energy efficient LED bulb",
  "category": "uuid",
  "price": 150,
  "cost_price": 80,
  "barcode": "8901234567890",
  "unit": "piece",
  "is_taxable": true,
  "tax_rate": 18
}
```

#### Get Low Stock Products
- **GET** `/inventory/products/low_stock/`

#### Get Product by Barcode
- **GET** `/inventory/products/by_barcode/?barcode=8901234567890`

#### Get Product Categories
- **GET** `/inventory/categories/`

#### Get Inventory
- **GET** `/inventory/inventory/?product=uuid`

### Billing

#### List Invoices
- **GET** `/billing/invoices/?limit=50&payment_method=cash`
- **Filters**: `customer`, `payment_method`

#### Create Invoice
- **POST** `/billing/invoices/`

```json
{
  "customer": "uuid",
  "staff": "uuid",
  "payment_method": "cash",
  "items": [
    {
      "product": "uuid",
      "quantity": 2,
      "unit_price": 150,
      "tax_rate": 18
    }
  ],
  "discount_amount": 100,
  "notes": "Invoice for regular customer"
}
```

#### Generate Invoice PDF
- **POST** `/billing/invoices/{id}/generate_pdf/`

#### List Payments
- **GET** `/billing/payments/?invoice=uuid&status=completed`

### Suppliers

#### List Suppliers
- **GET** `/suppliers/suppliers/?limit=50`
- **Search**: `name`, `email`, `phone`

#### Create Supplier
- **POST** `/suppliers/suppliers/`

```json
{
  "name": "ABC Electrical Supplies",
  "contact_person": "John Smith",
  "email": "john@abcelectrical.com",
  "phone": "9876543210",
  "address": "456 Industrial Ave",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postal_code": "400001",
  "gst_number": "27AABCE1234H1Z0"
}
```

#### List Purchases
- **GET** `/suppliers/purchases/?supplier=uuid&status=pending`
- **Filters**: `supplier`, `status`

#### Create Purchase Order
- **POST** `/suppliers/purchases/`

```json
{
  "supplier": "uuid",
  "purchase_date": "2024-01-15",
  "items": [
    {
      "product_name": "LED Bulb",
      "quantity": 100,
      "unit_price": 80
    }
  ],
  "payment_terms": "Net 30"
}
```

#### Mark Purchase as Received
- **POST** `/suppliers/purchases/{id}/mark_received/`

### Expenses

#### List Expenses
- **GET** `/expenses/?limit=50&category=rent&is_approved=false`
- **Filters**: `category`, `expense_date`, `is_approved`

#### Create Expense
- **POST** `/expenses/`

```json
{
  "category": "uuid",
  "description": "Monthly shop rent",
  "amount": 5000,
  "expense_date": "2024-01-15",
  "payment_method": "bank_transfer",
  "receipt_image": "file_upload"
}
```

### Reports

#### List Reports
- **GET** `/reports/reports/?report_type=revenue&limit=50`

#### Get Daily Metrics
- **GET** `/reports/daily-metrics/?limit=30`

```json
{
  "date": "2024-01-15",
  "total_revenue": 50000,
  "total_expenses": 15000,
  "total_bookings": 12,
  "completed_bookings": 10
}
```

### Notifications

#### List Notifications
- **GET** `/notifications/?limit=50`

#### Get Unread Notifications
- **GET** `/notifications/unread/`

#### Mark Notification as Read
- **POST** `/notifications/{id}/mark_as_read/`

#### Mark All Notifications as Read
- **POST** `/notifications/mark_all_read/`

## Pagination

All list endpoints support pagination:

```
?limit=20&offset=0
```

Response format:
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/v1/customers/?limit=20&offset=20",
  "previous": null,
  "results": [...]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "field_name": ["Error message"]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Server Error
```json
{
  "detail": "Internal server error."
}
```

## Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `204 No Content` - Request successful, no content
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Permission denied
- `404 Not Found` - Resource not found
- `500 Server Error` - Server error

## Rate Limiting

API rate limits:
- **Anonymous Users**: 100 requests/hour
- **Authenticated Users**: 1000 requests/hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704067200
```

## Filtering & Searching

### Filtering
```
GET /bookings/?status=completed&customer=uuid
```

### Searching
```
GET /products/?search=LED
```

### Ordering
```
GET /products/?ordering=-price
GET /products/?ordering=name
```

---

For more details, visit the interactive API documentation at:
http://localhost:8000/api/docs/
