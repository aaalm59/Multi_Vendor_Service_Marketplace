# Development Guide

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Git
- Basic knowledge of Django, React, and REST APIs

### Initial Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd project
```

2. **Start all services**
```bash
docker-compose up -d
```

3. **Run initial setup**
```bash
# Migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Create sample data
docker-compose exec backend python manage.py shell < scripts/sample_data.py
```

## Backend Development

### Project Structure
```
backend/
├── config/          # Django settings & URLs
├── apps/           # Django apps (modular)
├── media/          # User uploads
├── static/         # Static files
└── manage.py       # Django CLI
```

### Creating a New Feature

1. **Create models in app/models.py**
```python
from django.db import models
from apps.users.models import BaseModel

class MyModel(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField()
```

2. **Create serializers in app/serializers.py**
```python
from rest_framework import serializers
from apps.myapp.models import MyModel

class MyModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = MyModel
        fields = '__all__'
```

3. **Create views in app/views.py**
```python
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.myapp.models import MyModel
from apps.myapp.serializers import MyModelSerializer

class MyModelViewSet(viewsets.ModelViewSet):
    queryset = MyModel.objects.all()
    serializer_class = MyModelSerializer
    permission_classes = [IsAuthenticated]
```

4. **Create URLs in app/urls.py**
```python
from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.myapp.views import MyModelViewSet

router = DefaultRouter()
router.register(r'', MyModelViewSet, basename='mymodel')

urlpatterns = router.urls
```

5. **Register in config/urls.py**
```python
urlpatterns = [
    # ...
    path('api/v1/myapp/', include(('apps.myapp.urls', 'myapp'), namespace='myapp')),
]
```

6. **Register in Django admin (app/admin.py)**
```python
from django.contrib import admin
from apps.myapp.models import MyModel

@admin.register(MyModel)
class MyModelAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at']
    search_fields = ['name']
```

### Common Patterns

#### Filtering
```python
class MyViewSet(viewsets.ModelViewSet):
    filterset_fields = ['status', 'category']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name']
```

#### Custom Actions
```python
@action(detail=True, methods=['post'])
def custom_action(self, request, pk=None):
    obj = self.get_object()
    # Custom logic
    return Response({'status': 'success'})
```

#### Permissions
```python
from rest_framework.permissions import BasePermission

class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user
```

### Testing

```bash
# Run all tests
docker-compose exec backend python manage.py test

# Run specific app tests
docker-compose exec backend python manage.py test apps.customers

# Run with coverage
docker-compose exec backend coverage run --source='.' manage.py test
docker-compose exec backend coverage report
```

### Database

```bash
# Access Django shell
docker-compose exec backend python manage.py shell

# Run migrations
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Reset database
docker-compose exec backend python manage.py flush
```

## Frontend Development

### Project Structure
```
frontend/src/
├── admin/          # Admin pages
├── auth/           # Auth pages
├── billing/        # Billing module
├── components/     # Reusable components
├── customer/       # Customer module
├── hooks/          # Custom hooks
├── inventory/      # Inventory module
├── layouts/        # Layout components
├── pages/          # Page components
├── redux/          # Redux store
├── routes/         # Routing
├── services/       # API clients
├── utils/          # Utilities
└── App.jsx         # Main component
```

### Component Development

1. **Create a component**
```jsx
// src/components/MyComponent.jsx
import React from 'react'
import { FiIcon } from 'react-icons/fi'

const MyComponent = ({ prop1, prop2 }) => {
  return (
    <div className="p-6 bg-white rounded-lg">
      <FiIcon /> {prop1}
    </div>
  )
}

export default MyComponent
```

2. **Use in a page**
```jsx
// src/pages/MyPage.jsx
import React from 'react'
import MyComponent from '../components/MyComponent'

const MyPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Page</h1>
      <MyComponent prop1="value1" prop2="value2" />
    </div>
  )
}

export default MyPage
```

### State Management (Redux)

1. **Create a slice**
```javascript
// src/redux/slices/mySlice.js
import { createSlice } from '@reduxjs/toolkit'

const mySlice = createSlice({
  name: 'my',
  initialState: {
    data: [],
    loading: false,
  },
  reducers: {
    setData: (state, action) => {
      state.data = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
  },
})

export const { setData, setLoading } = mySlice.actions
export default mySlice.reducer
```

2. **Use in a component**
```jsx
import { useDispatch, useSelector } from 'react-redux'
import { setData } from '../redux/slices/mySlice'

const MyComponent = () => {
  const dispatch = useDispatch()
  const { data, loading } = useSelector((state) => state.my)
  
  const handleFetch = async () => {
    dispatch(setLoading(true))
    // Fetch data
    dispatch(setData(response))
    dispatch(setLoading(false))
  }
  
  return <div>{loading ? 'Loading...' : 'Data: ' + data}</div>
}
```

### API Integration

```javascript
// In a component
import { customerAPI } from '../services/api'
import { useEffect, useState } from 'react'

const CustomersPage = () => {
  const [customers, setCustomers] = useState([])
  
  useEffect(() => {
    fetchCustomers()
  }, [])
  
  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getAll({ limit: 50 })
      setCustomers(response.data.results)
    } catch (error) {
      console.error('Error:', error)
    }
  }
  
  return <div>{customers.map(c => <div>{c.name}</div>)}</div>
}
```

### Tailwind CSS

Common classes:
- **Padding**: `p-6`, `px-4`, `py-2`
- **Margin**: `m-4`, `mx-auto`, `mb-2`
- **Text**: `text-lg`, `font-bold`, `text-gray-800`
- **Colors**: `bg-white`, `text-red-500`, `hover:bg-gray-100`
- **Layout**: `flex`, `grid`, `space-y-4`
- **Responsive**: `md:grid-cols-2`, `lg:p-8`

### Form Handling

```jsx
const [formData, setFormData] = useState({
  name: '',
  email: '',
})

const handleChange = (e) => {
  const { name, value } = e.target
  setFormData(prev => ({ ...prev, [name]: value }))
}

const handleSubmit = async (e) => {
  e.preventDefault()
  try {
    await customerAPI.create(formData)
    toast.success('Created successfully')
  } catch (error) {
    toast.error('Error creating')
  }
}

return (
  <form onSubmit={handleSubmit}>
    <input
      name="name"
      value={formData.name}
      onChange={handleChange}
      className="border rounded px-3 py-2"
    />
    <button type="submit">Submit</button>
  </form>
)
```

## Debugging

### Backend
```bash
# Django shell
docker-compose exec backend python manage.py shell

# Logs
docker-compose logs -f backend

# Print debugger
import pdb; pdb.set_trace()
```

### Frontend
- Use browser DevTools (F12)
- Redux DevTools extension
- React DevTools extension

## Common Issues

### Port already in use
```bash
docker-compose down
# Or change ports in docker-compose.yml
```

### Database connection error
```bash
# Wait for PostgreSQL
sleep 10
docker-compose exec backend python manage.py migrate
```

### CORS errors
Check `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py`

### Frontend not hot-reloading
Ensure `vite.config.js` has proper watch settings

## Performance Tips

### Backend
- Use `select_related()` for ForeignKey
- Use `prefetch_related()` for reverse relations
- Add database indexes for frequently filtered fields
- Use pagination for large datasets

### Frontend
- Use React.memo for expensive components
- Lazy load routes with React.lazy()
- Optimize images
- Use virtualization for large lists

## Deployment Preparation

### Before deploying:
1. Update `.env` with production values
2. Set `DEBUG=False`
3. Update `SECRET_KEY`
4. Configure static/media storage
5. Set up logging
6. Enable HTTPS
7. Update allowed hosts

## Resources

- [Django Docs](https://docs.djangoproject.com/)
- [DRF Docs](https://www.django-rest-framework.org/)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite Docs](https://vitejs.dev/)

