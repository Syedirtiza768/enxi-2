# Development Checklist - Debug Logging

When creating new features, ensure debug logging is implemented:

## ✅ API Routes
- [ ] Use `withLogging` wrapper
- [ ] Include operation name
- [ ] Handle errors properly (let withLogging catch them)

```typescript
export const GET = withLogging(async (request) => {
  // Your code
}, { operation: 'GET resourceName' });
```

## ✅ Service Classes
- [ ] Extend `BaseService`
- [ ] Wrap methods with `this.withLogging()`
- [ ] Use `this.log` for debug messages

```typescript
export class MyService extends BaseService {
  constructor() {
    super('MyService');
  }
  
  async myMethod() {
    return this.withLogging('myMethod', async () => {
      // Your code
    });
  }
}
```

## ✅ React Components
- [ ] Use `useDebug` hook for tracking
- [ ] Use `usePerformance` for operations
- [ ] Wrap with `withErrorLogging` if critical

```typescript
const { trackAction } = useDebug();
const { trackOperation } = usePerformance('ComponentName');
```

## ✅ Database Operations
- [ ] Already automatic if using the standard prisma import
- [ ] Transactions are logged automatically
- [ ] Slow queries (>100ms) are flagged

## 🔧 Quick Commands

1. **Generate with logging built-in:**
   ```bash
   npm run scaffold <type> <name>
   ```

2. **Test debug system:**
   ```bash
   npm run debug:test
   ```

3. **View logs:**
   - Web UI: http://localhost:3000/debug-logs
   - Terminal: `npm run debug:logs`

## 🚨 Common Mistakes

1. **Forgetting to wrap API routes** - Use the snippet or scaffold
2. **Not extending BaseService** - All services should extend it
3. **Catching errors too early** - Let the logging middleware handle errors
4. **Not including context** - Always add relevant IDs and operation names

## 📝 Example: Adding a New Feature

1. **Create API route with logging:**
   ```bash
   npm run scaffold api-route orders GET POST
   ```

2. **Create service with logging:**
   ```bash
   npm run scaffold service Order
   ```

3. **Create component with tracking:**
   ```bash
   npm run scaffold component OrderList
   ```

All generated files will have debug logging built-in!