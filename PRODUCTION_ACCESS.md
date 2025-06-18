# Production Access Guide

## Website URLs

- **Production URL**: https://erp.alsahab.me
- **Login Page**: https://erp.alsahab.me/login

## API Endpoints

### Authentication
- **Login**: `POST /api/auth/login`
  - Body: `{"username": "...", "password": "..."}`
- **Logout**: `POST /api/auth/logout`
- **Check Auth**: `GET /api/auth/check`

## Testing Login

### Via Browser
1. Go to https://erp.alsahab.me/login
2. Enter credentials
3. Click login

### Via cURL
```bash
curl -X POST https://erp.alsahab.me/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}'
```

### Via Test Page
Visit: https://erp.alsahab.me/test-login

## Common Issues

### HTTP 405 Error
- The `/api/auth/login` endpoint only accepts POST requests
- You cannot access it directly in the browser (which sends GET)
- Use the login page at `/login` instead

### Authentication Required
Most API endpoints require authentication. After logging in, the auth token is stored as an HTTP-only cookie.

## Test Credentials
Check with your administrator for valid credentials.