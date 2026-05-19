# Electric Service ERP System

## Overview

This is a **complete production-ready ERP system** for an electric repair and shop business, built with modern technologies and architected for local development with easy scalability.

**Built for Local Development** - All components run locally with Docker for seamless development experience.

## 🎯 Key Features

### 1. **Service Booking Management**
- Customers can book electrical services
- Real-time technician assignment
- Service status tracking (Pending → Assigned → In Progress → Completed)
- Rating and review system

### 2. **Inventory Management**
- Product catalog with categories
- Stock tracking with low stock alerts
- Barcode support for quick access
- Stock movement history
- Purchase and sales tracking

### 3. **POS Billing System**
- Modern point-of-sale interface
- Barcode scanning support
- GST calculation (18%)
- Multiple payment methods (Cash, UPI, Card, Cheque)
- Invoice generation and printing

### 4. **Technician Management**
- Technician profiles with specializations
- Availability tracking
- Performance metrics
- Earnings tracking
- Certification management

### 5. **Staff Management**
- Employee records
- Attendance tracking
- Salary management
- Role-based permissions
- Performance reporting

### 6. **Customer Management**
- Customer profiles and history
- Location-based tracking
- Total spending metrics
- Communication preferences

### 7. **Supplier & Purchase Management**
- Supplier database
- Purchase order tracking
- Payment status monitoring
- Supplier performance metrics

### 8. **Expense Tracking**
- Categorized expense recording
- Receipt management
- Approval workflow
- Expense analytics

### 9. **Reports & Analytics**
- Daily revenue tracking
- Profit & loss reports
- Staff performance analysis
- Inventory reports
- Export to PDF, Excel, CSV

### 10. **Authentication & Authorization**
- Secure JWT-based authentication
- Role-based access control (Admin, Manager, Technician, Sales, Inventory, Customer)
- Password reset functionality
- Session management

## 🛠 Tech Stack

### Backend
- **Framework**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT (SimpleJWT)
- **API Documentation**: Swagger/OpenAPI (drf-spectacular)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **UI Framework**: Tailwind CSS
- **HTTP Client**: Axios
- **Charts**: Recharts

### Local Development
- **Containerization**: Docker & Docker Compose
- **Database Admin**: pgAdmin
- **Networking**: Docker Bridge Network

## 📁 Project Structure

```
project/
├── frontend/                 # React Vite application
│   ├── src/
│   │   ├── admin/           # Admin panel components
│   │   ├── auth/            # Authentication pages
│   │   ├── billing/         # POS billing module
│   │   ├── components/      # Reusable components
│   │   ├── customer/        # Customer module
│   │   ├── hooks/           # Custom React hooks
│   │   ├── inventory/       # Inventory module
│   │   ├── layouts/         # Layout components
│   │   ├── pages/           # Page components
│   │   ├── redux/           # Redux store
│   │   ├── reports/         # Reports module
│   │   ├── routes/          # Routing configuration
│   │   ├── services/        # API service layer
│   │   ├── technician/      # Technician module
│   │   ├── utils/           # Utility functions
│   │   ├── assets/          # Images, fonts
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
│
├── backend/                  # Django application
│   ├── config/              # Django settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/                # Django apps
│   │   ├── authentication/  # JWT authentication
│   │   ├── users/           # User management
│   │   ├── customers/       # Customer module
│   │   ├── technicians/     # Technician management
│   │   ├── staff/           # Staff management
│   │   ├── services/        # Service catalog
│   │   ├── bookings/        # Service bookings
│   │   ├── inventory/       # Product inventory
│   │   ├── billing/         # Invoicing & POS
│   │   ├── suppliers/       # Supplier management
│   │   ├── expenses/        # Expense tracking
│   │   ├── reports/         # Reports & analytics
│   │   └── notifications/   # Notifications
│   ├── media/               # User uploads
│   ├── static/              # Static files
│   ├── logs/                # Application logs
│   ├── requirements/        # Dependency files
│   ├── Dockerfile
│   ├── manage.py
│   └── .env
│
├── docker/                  # Docker configuration files
├── docs/                    # API documentation
├── scripts/                 # Setup and utility scripts
├── docker-compose.yml       # Docker Compose configuration
├── .env                     # Environment variables
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- 4GB RAM minimum
- Ports 5173, 8000, 5432, 6379, 5050 available

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd project
```

2. **Setup environment variables**
```bash
# Copy .env file (already provided)
# Edit if needed
cat .env
```

3. **Run setup script**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Or manually start with Docker Compose:
```bash
docker-compose up -d
```

4. **Access the application**
```
Frontend:  http://localhost:5173
Backend:   http://localhost:8000
API Docs:  http://localhost:8000/api/docs/
pgAdmin:   http://localhost:5050
```

## 🔐 Default Credentials

### Admin User
- **Email**: admin@example.com
- **Password**: admin123

### pgAdmin
- **Email**: admin@example.com
- **Password**: admin123

## 📚 API Documentation

API documentation is available at:
- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/

### Main API Endpoints

#### Authentication
- `POST /api/v1/auth/register/` - Register new user
- `POST /api/v1/auth/login/` - User login
- `POST /api/v1/auth/logout/` - User logout
- `POST /api/v1/auth/token/refresh/` - Refresh JWT token
- `GET /api/v1/auth/me/` - Get current user

#### Customers
- `GET /api/v1/customers/` - List all customers
- `POST /api/v1/customers/` - Create new customer
- `GET /api/v1/customers/{id}/` - Get customer details
- `PATCH /api/v1/customers/{id}/` - Update customer

#### Bookings
- `GET /api/v1/bookings/` - List all bookings
- `POST /api/v1/bookings/` - Create new booking
- `POST /api/v1/bookings/{id}/assign_technician/` - Assign technician
- `POST /api/v1/bookings/{id}/mark_completed/` - Mark as completed

#### Inventory
- `GET /api/v1/inventory/products/` - List products
- `POST /api/v1/inventory/products/` - Add product
- `GET /api/v1/inventory/products/low_stock/` - Get low stock products
- `GET /api/v1/inventory/products/by_barcode/` - Search by barcode

#### Billing
- `GET /api/v1/billing/invoices/` - List invoices
- `POST /api/v1/billing/invoices/` - Create invoice
- `GET /api/v1/billing/payments/` - List payments

#### Reports
- `GET /api/v1/reports/reports/` - Get reports
- `GET /api/v1/reports/daily-metrics/` - Get daily metrics

## 🔑 User Roles & Permissions

### Admin
- Full system access
- User management
- Settings configuration
- Report generation

### Manager
- Dashboard access
- Booking management
- Staff management
- Report viewing

### Technician
- View assigned bookings
- Update booking status
- View availability
- Access own earnings

### Sales Staff
- Create invoices
- Process payments
- Manage inventory
- View customer history

### Inventory Staff
- Manage products
- Track stock levels
- Manage purchases
- Generate inventory reports

### Customer
- Book services
- Track booking status
- View order history
- Submit reviews

## 📦 Database Schema

### Core Tables
- **users** - System users with roles
- **customers** - Customer information
- **technicians** - Technician profiles
- **staff** - Employee records
- **services** - Service catalog
- **bookings** - Service bookings
- **products** - Product inventory
- **inventory** - Stock tracking
- **invoices** - Sales invoices
- **suppliers** - Supplier information
- **purchases** - Purchase orders
- **expenses** - Expense records
- **notifications** - System notifications
- **reports** - Generated reports

All tables include:
- UUID primary keys
- Soft delete support
- Audit timestamps (created_at, updated_at)
- Proper indexing

## 🔧 Development Workflow

### Local Development
```bash
# Start all services
docker-compose up

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Run Django migrations
docker-compose exec backend python manage.py migrate

# Create Django admin
docker-compose exec backend python manage.py createsuperuser

# Access Django shell
docker-compose exec backend python manage.py shell
```

### Frontend Development
```bash
# Frontend hot reloading is enabled
# Changes are automatically reflected

# Access frontend at http://localhost:5173
```

### Database Management
```bash
# Access pgAdmin at http://localhost:5050
# Or use Django management commands

docker-compose exec backend python manage.py dbshell
```

## 🧪 Testing

```bash
# Run Django tests
docker-compose exec backend python manage.py test

# Run with coverage
docker-compose exec backend coverage run --source='.' manage.py test
```

## 📝 Configuration

### Environment Variables (.env)

Key variables:
- `DEBUG=True` - Development mode
- `SECRET_KEY=` - Django secret key
- `DB_NAME=erp_db` - Database name
- `DB_USER=erp_user` - Database user
- `DB_PASSWORD=` - Database password
- `REDIS_URL=redis://redis:6379/0` - Redis URL
- `VITE_API_BASE_URL=` - Frontend API base URL

## 🚀 Scaling & Future Enhancements

This codebase is designed for future scalability:

### Ready for these upgrades:
- AWS S3 for file storage
- Kubernetes deployment
- Microservices architecture
- CI/CD pipeline
- Advanced monitoring with Datadog
- GraphQL API layer
- WebSocket support for real-time updates
- Mobile app development

### Current Limitations (by design for local dev):
- Single server deployment
- Local file storage
- No cloud integration
- Single database instance

## 🐛 Troubleshooting

### Port already in use
```bash
# Change port in docker-compose.yml or .env
docker-compose down
```

### Database connection error
```bash
# Wait for PostgreSQL to start
sleep 10
docker-compose exec backend python manage.py migrate
```

### Frontend not connecting to backend
```bash
# Check VITE_API_BASE_URL in .env
# Ensure backend is running
docker-compose ps
```

### Permission denied on scripts
```bash
chmod +x scripts/*.sh
```

## 📞 Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Review API documentation: http://localhost:8000/api/docs/
3. Check database with pgAdmin: http://localhost:5050

## 📄 License

This project is proprietary.

## 🎓 Learning Resources

- [Django REST Framework](https://www.django-rest-framework.org/)
- [React Documentation](https://react.dev/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Docker Documentation](https://docs.docker.com/)

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Status**: Production Ready (Local Development)
