# ERP System Installation & Troubleshooting Guide

## Prerequisites Checklist

- [ ] Docker installed (v20.10+)
- [ ] Docker Compose installed (v1.29+)
- [ ] Git installed
- [ ] At least 4GB RAM available
- [ ] Ports 5173, 8000, 5432, 6379, 5050 are available

## Step-by-Step Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd project
```

### 2. Verify Docker Installation
```bash
docker --version
docker-compose --version
```

### 3. Set Environment Variables
```bash
# Already provided, but you can customize:
cat .env

# Or create custom .env
cp .env.example .env
# Edit .env with your settings
```

### 4. Start Services
```bash
docker-compose up -d
```

### 5. Wait for Services
```bash
# Wait 10-15 seconds for PostgreSQL to start
sleep 15

# Check status
docker-compose ps
```

### 6. Run Migrations
```bash
docker-compose exec backend python manage.py migrate
```

### 7. Create Admin User
```bash
docker-compose exec backend python manage.py createsuperuser
```

Follow prompts:
- Username: admin
- Email: admin@example.com
- Password: admin123 (change in production!)

### 8. Collect Static Files
```bash
docker-compose exec backend python manage.py collectstatic --no-input
```

### 9. Access the Application

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | Login with admin account |
| API Documentation | http://localhost:8000/api/docs/ | N/A |
| Django Admin | http://localhost:8000/admin/ | admin / admin123 |
| pgAdmin | http://localhost:5050 | admin@example.com / admin123 |

## Troubleshooting

### Issue: Containers won't start

**Solution 1: Check logs**
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

**Solution 2: Remove and rebuild**
```bash
docker-compose down -v
docker-compose up -d
```

**Solution 3: Rebuild images**
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Issue: Port already in use

**Find process using port:**
```bash
lsof -i :8000
lsof -i :5173
lsof -i :5432
```

**Kill process:**
```bash
kill -9 <PID>
```

Or change ports in `docker-compose.yml`:
```yaml
services:
  backend:
    ports:
      - "8001:8000"  # Changed from 8000 to 8001
```

### Issue: Database connection refused

**Wait longer:**
```bash
sleep 20
docker-compose exec backend python manage.py migrate
```

**Check PostgreSQL logs:**
```bash
docker-compose logs postgres
```

**Reset database:**
```bash
docker-compose down -v
docker volume rm project_postgres_data
docker-compose up -d
```

### Issue: Frontend won't load

**Check if frontend is running:**
```bash
docker-compose ps frontend
```

**Rebuild frontend:**
```bash
docker-compose down frontend
docker-compose up -d frontend
```

**Check environment variables:**
```bash
docker-compose exec frontend env | grep VITE
```

### Issue: API calls failing with 401 Unauthorized

**Check authentication:**
1. Clear browser cookies
2. Logout and login again
3. Check token in browser DevTools → Application → Cookies

**Check backend logs:**
```bash
docker-compose logs -f backend
```

### Issue: File upload not working

**Check permissions:**
```bash
docker-compose exec backend ls -la /app/media/
docker-compose exec backend chmod -R 755 /app/media/
```

**Check settings:**
```bash
# In backend config/settings.py
MEDIA_ROOT = '/app/media'
MEDIA_URL = '/media/'
```

### Issue: Running out of disk space

**Clean up Docker:**
```bash
docker system prune -a
docker volume prune
```

### Issue: "relation does not exist" error

**Run migrations:**
```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

**Check if models are registered:**
```bash
docker-compose exec backend python manage.py showmigrations
```

## Performance Optimization

### Increase Docker memory limit
Edit Docker settings or in docker-compose.yml:
```yaml
services:
  backend:
    mem_limit: 2g
  postgres:
    mem_limit: 1g
```

### Enable query logging for debugging
In `backend/config/settings.py`:
```python
if DEBUG:
    LOGGING = {
        'version': 1,
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
            },
        },
        'loggers': {
            'django.db.backends': {
                'handlers': ['console'],
                'level': 'DEBUG',
            },
        },
    }
```

## Common Commands Reference

```bash
# View logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs postgres

# Access containers
docker-compose exec backend bash
docker-compose exec frontend bash
docker-compose exec postgres psql -U erp_user -d erp_db

# Django management
docker-compose exec backend python manage.py shell
docker-compose exec backend python manage.py dbshell
docker-compose exec backend python manage.py test

# Database backup
docker-compose exec postgres pg_dump -U erp_user erp_db > backup.sql

# Database restore
cat backup.sql | docker-compose exec -T postgres psql -U erp_user erp_db

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

## After Installation

### Add sample data
```bash
docker-compose exec backend python manage.py shell
```

Then in Python shell:
```python
from apps.users.models import User
from apps.services.models import Service
from decimal import Decimal

# Create admin user
User.objects.create_superuser(
    username='admin2',
    email='admin2@example.com',
    password='admin123',
    role='admin'
)

# Create services
Service.objects.create(
    name='Basic Repair',
    description='Basic electrical repair service',
    base_price=Decimal('500.00'),
    estimated_duration=60
)

Service.objects.create(
    name='Complex Repair',
    description='Complex electrical repair service',
    base_price=Decimal('1000.00'),
    estimated_duration=120
)

print("Sample data created!")
```

### Configure email (optional)
In `.env`:
```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

## Next Steps

1. **Create some test data** - Use Django admin or shell
2. **Customize settings** - Edit .env and config/settings.py
3. **Add SSL certificate** - For production deployment
4. **Setup monitoring** - Add error tracking (Sentry, etc.)
5. **Configure backups** - Automate database backups

## Support Resources

- **API Documentation**: http://localhost:8000/api/docs/
- **Django Admin**: http://localhost:8000/admin/
- **pgAdmin**: http://localhost:5050 (for database management)
- **Docker Logs**: `docker-compose logs <service>`

## Resetting Everything

If you want to start fresh:
```bash
# Stop all containers
docker-compose down -v

# Remove all containers and volumes
docker system prune -a --volumes

# Clone fresh and start over
git clone <repo>
cd project
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

---

**For detailed troubleshooting, check the logs first:**
```bash
docker-compose logs -f
```

**Still having issues?**
1. Check Docker installation
2. Verify port availability
3. Ensure sufficient disk space
4. Review error messages carefully
5. Check documentation

