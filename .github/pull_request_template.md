# Pull Request

## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have performed a self-review of my own code

## UI Components Checklist
- [ ] **Every `<Select.Item>` has a non-empty `value` prop** (no empty strings, null, or undefined)
- [ ] For "All" or "None" options, used meaningful values like `"ALL"` or `"NONE"` instead of empty strings
- [ ] Placeholder behavior uses the `placeholder` prop on `<SelectTrigger>`, not empty-value items
- [ ] All select options use proper TypeScript typing with `SelectOption` interface where applicable

## API Integration Checklist
- [ ] **All API calls use the shared `apiClient`/`api` helper methods with automatic auth tokens**
- [ ] **No raw `fetch()` calls without proper authentication handling**
- [ ] All network requests use proper TypeScript typing with `ApiResponse<T>` interface
- [ ] 401/403 responses are handled consistently (redirect to login, clear tokens)
- [ ] Error responses include user-friendly error messages
- [ ] Loading states are properly implemented for async operations

## Security Checklist
- [ ] No sensitive data is logged or exposed
- [ ] Authentication/authorization is properly implemented for new endpoints
- [ ] Input validation is in place for user inputs
- [ ] SQL injection protection (via Prisma) is maintained

## Code Quality
- [ ] Code follows the established patterns and conventions
- [ ] TypeScript types are properly defined and used
- [ ] Error handling is comprehensive and user-friendly
- [ ] No console.log statements left in production code (except intentional logging)

## Database Changes
- [ ] Database migrations are included if schema changes were made
- [ ] New indexes are added for performance if needed
- [ ] Audit logging is maintained for data changes

## Documentation
- [ ] README.md is updated if needed
- [ ] API documentation is updated for new endpoints
- [ ] Code comments explain complex business logic

## Deployment
- [ ] Changes are backward compatible
- [ ] Environment variables are documented if new ones are added
- [ ] Build passes without warnings or errors