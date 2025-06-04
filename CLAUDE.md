# AI Assistant Reference - Enxi ERP Development

## ⚡ PERFORMANCE OPTIMIZATION RULE
**For maximum efficiency whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially**

Example:
```typescript
// ✅ DO THIS - Parallel tool invocation
const [users, accounts, customers] = await Promise.all([
  prisma.user.findMany(),
  prisma.account.findMany(), 
  prisma.customer.findMany()
]);

// ❌ DON'T DO THIS - Sequential operations
const users = await prisma.user.findMany();
const accounts = await prisma.account.findMany();
const customers = await prisma.customer.findMany();
```

## 📋 Quick Reference for New Development

### 1. API Routes
```typescript
export async function GET(request: NextRequest) {
  // handler code
}
```

### 2. Service Classes
```typescript
import { BaseService } from '@/lib/services/base.service';

export class ProductService extends BaseService {
  constructor() {
    super('ProductService');
  }

  async createProduct(data: any) {
    return this.withLogging('createProduct', async () => {
      // implementation
    });
  }
}
```

### 3. Error Handling
```typescript
// Let errors bubble up naturally
try {
  // code
} catch (error) {
  // Handle specific errors if needed, otherwise rethrow
  throw error;
}
```

## 🛠️ Available Tools

### Standard Next.js Commands
```bash
# Development
npm run dev

# Build
npm run build

# Start production server
npm start

# Run tests
npm test
```

## 📁 Key Files and Their Purpose

- `/lib/services/base.service.ts` - Base class for all services
- `/lib/services/shipment.service.ts` - Shipment/delivery management service
- `/lib/hooks/use-auth.ts` - Authentication hook
- `/lib/db/prisma.ts` - Database client
- `/middleware.ts` - Request middleware
- `/components/shipments/` - Shipment UI components
- `/app/(auth)/shipments/` - Shipment pages and routes

## 🔐 Security Considerations

- Always validate user input
- Use proper authentication checks
- Sanitize sensitive data before storing
- Follow Next.js security best practices

## 💡 Tips for AI Assistants

1. **Follow existing patterns** when creating new files
2. **Use TypeScript types** for better type safety
3. **Keep components focused** on a single responsibility
4. **Write clean, readable code** that's easy to maintain
5. **Test your changes** before committing

Remember: The goal is to build a maintainable, scalable application. Focus on clarity and simplicity over complexity.