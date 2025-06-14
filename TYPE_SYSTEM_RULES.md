
# Type System Rules and Guidelines

## 🎯 Core Principles

1. **Single Source of Truth**: Each interface should be defined in only one place
2. **Central Imports**: Import from `@/lib/types` for common types
3. **Domain Separation**: Keep domain-specific types in their respective modules
4. **Consistent Naming**: Use PascalCase for interfaces and types

## 📁 Type Organization

### Primary Type Files
- `lib/types/index.ts` - Central export hub for all types
- `lib/types/common.types.ts` - Application-wide common types
- `lib/types/ui.types.ts` - UI component types
- `lib/types/api.types.ts` - API-specific types
- `lib/types/accounting.types.ts` - Accounting domain types
- `lib/types/lead.types.ts` - Lead/CRM domain types
- `lib/types/shared-enums.ts` - Prisma enum re-exports

### Import Hierarchy
1. **First choice**: `@/lib/types` (central index)
2. **Second choice**: Specific type file (e.g., `@/lib/types/accounting.types`)
3. **Last resort**: Local interface (only if truly component-specific)

## 🚫 Prohibited Patterns

### ❌ Don't Create Local Duplicates
```typescript
// Bad - duplicating existing type
interface SelectOption {
  value: string
  label: string
}

// Good - import existing type
import type { SelectOption } from '@/lib/types/ui.types'
```

### ❌ Don't Use Inconsistent API Responses
```typescript
// Bad - custom response format
interface MyResponse {
  result: unknown
  error: string
}

// Good - standard response format
import type { StandardApiResponse } from '@/lib/types'
```

### ❌ Don't Mix Interface/Type for Same Concept
```typescript
// Bad - inconsistent
interface UserInput { ... }
type UserResponse = { ... }

// Good - consistent
interface UserInput { ... }
interface UserResponse { ... }
```

## ✅ Recommended Patterns

### Form Types
```typescript
import type { FormErrors, ValidationResult } from '@/lib/types'

interface MyFormData {
  // form fields
}

interface MyFormProps {
  onSubmit: (data: MyFormData) => Promise<ValidationResult>
  errors?: FormErrors
}
```

### API Integration
```typescript
import type { StandardApiResponse, PaginatedResponse } from '@/lib/types'

interface MyListResponse extends PaginatedResponse<MyEntity> {}
interface MyCreateResponse extends StandardApiResponse<MyEntity> {}
```

### Component Props
```typescript
import type { SelectOption } from '@/lib/types/ui.types'

interface MySelectProps {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
}
```

## 🔍 Validation Tools

### Automated Checks
```bash
# Run type validation
npx tsx scripts/validate-type-system.ts

# Check for duplicates
npx tsx scripts/fix-type-duplicates.ts

# TypeScript compilation check
npx tsc --noEmit
```

### Pre-commit Hooks (Recommended)
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run type-check && npx tsx scripts/validate-type-system.ts"
    }
  }
}
```

## 📊 Quality Metrics

- **Duplicate Interfaces**: Target 0
- **Type Coverage**: >95%
- **Import Consistency**: All common types from central location
- **Naming Compliance**: 100% PascalCase for interfaces/types

## 🆕 Adding New Types

1. **Check existing types** in `lib/types/index.ts`
2. **Determine category** (common, domain-specific, UI, etc.)
3. **Add to appropriate file** or create new domain file
4. **Export from index.ts** if widely used
5. **Update this documentation**

## 🔄 Refactoring Existing Types

1. **Identify the canonical location** for the type
2. **Move all duplicates** to single source
3. **Update all imports** to use canonical location
4. **Run validation** to ensure no regressions
5. **Update related documentation**

---

**Last Updated**: 2025-06-14T02:57:37.411Z
**Maintained By**: Development Team
**Review Frequency**: Every quarter
