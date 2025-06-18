# Authentication Guide for Enxi ERP

## Overview
Enxi ERP uses JWT token-based authentication with httpOnly cookies for web sessions and Bearer tokens for API access.

## Quick Start

### 1. Check Authentication Status
```bash
node scripts/verify-auth.js
```

### 2. Login via Command Line
```bash
node scripts/login.js
```
This will:
- Login with default admin credentials (admin/demo123)
- Save the auth token to `.auth-token` file
- Allow you to make authenticated API calls

### 3. Login via Browser
1. Visit http://localhost:3000/login
2. Enter credentials:
   - Username: `admin`
   - Password: `demo123`
3. The browser will automatically store the auth cookie

## How Authentication Works

### Browser Sessions
- When you login through the UI, the server sets an httpOnly cookie
- This cookie is automatically sent with every request
- The cookie is secure and cannot be accessed by JavaScript

### API Access
- The login endpoint returns a JWT token
- For API calls, include the token in the Authorization header:
  ```
  Authorization: Bearer <your-token>
  ```

### Command Line Tools
- Scripts read the token from `.auth-token` file
- This file is created by `scripts/login.js`
- The token is automatically included in API requests

## Troubleshooting

### "Failed to post journal entry" Error
This usually means you're not authenticated. Follow these steps:

1. **Check if you're logged in:**
   ```bash
   node scripts/verify-auth.js
   ```

2. **If not authenticated, login:**
   ```bash
   node scripts/login.js
   ```

3. **For browser access, ensure you've logged in through the UI:**
   - Clear browser cookies for localhost:3000
   - Visit http://localhost:3000/login
   - Login with admin/demo123

### Token Expired
Tokens expire after 24 hours. Simply run the login script again:
```bash
node scripts/login.js
```

### Browser Cookie Issues
If the browser isn't maintaining the session:
1. Check if cookies are enabled
2. Clear all cookies for localhost:3000
3. Login again through the UI

## Security Notes

- Never commit the `.auth-token` file (it's in .gitignore)
- The JWT secret is in `.env` file - keep it secure
- In production, use strong passwords and secrets
- Tokens expire after 24 hours for security

## API Authentication Examples

### Using fetch:
```javascript
const token = fs.readFileSync('.auth-token', 'utf8').trim();

const response = await fetch('http://localhost:3000/api/accounting/journal-entries', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Using the API client:
```typescript
import { apiClient } from '@/lib/api/client';

// The client automatically includes the token from localStorage
const entries = await apiClient('/accounting/journal-entries');
```

## Default Credentials

For development:
- Username: `admin`
- Password: `demo123`

To reset the admin password:
```bash
npm run db:reset-admin-password
```