---
inclusion: always
---

# Development Standards & Best Practices

## Code Quality Standards

### TypeScript Guidelines
- **Strict Mode**: Always use TypeScript strict mode
- **Type Safety**: Prefer explicit types over `any`
- **Interfaces**: Use interfaces for object shapes, types for unions/primitives
- **Generics**: Leverage generics for reusable components and utilities
- **Null Safety**: Handle null/undefined cases explicitly

### React Best Practices
- **Functional Components**: Use function components with hooks
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Component Composition**: Prefer composition over inheritance
- **Props Interface**: Always define props interfaces
- **Error Boundaries**: Implement error boundaries for critical sections

### Next.js App Router Patterns
- **Server Components**: Use server components by default
- **Client Components**: Mark with 'use client' only when necessary
- **Route Handlers**: Follow RESTful conventions in API routes
- **Middleware**: Use middleware for authentication and tenant context
- **Metadata**: Implement proper SEO metadata for all pages

## File Organization

### Directory Structure
```
app/                    # Next.js App Router pages
├── api/               # API routes
├── (auth)/            # Auth route group
├── dashboard/         # Dashboard pages
└── docs/              # Documentation pages

components/            # Reusable UI components
├── ui/               # Shadcn-UI components
├── markdown/         # MDX-specific components
├── role-management/  # RBAC components
└── contexts/         # React contexts

lib/                  # Utility libraries
├── data-access/      # Database access layer
├── middleware/       # Route protection middleware
├── services/         # Business logic services
└── hooks/           # Custom React hooks

prisma/              # Database schema and migrations
├── migrations/      # Database migrations
├── schema.prisma    # Prisma schema
└── seed.ts         # Database seeding
```

### Naming Conventions
- **Files**: kebab-case for files (`user-profile.tsx`)
- **Components**: PascalCase for React components (`UserProfile`)
- **Functions**: camelCase for functions (`getUserProfile`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types/Interfaces**: PascalCase with descriptive names (`UserProfileProps`)

## Database Standards

### Prisma Schema Guidelines
- **Model Names**: PascalCase singular (`User`, `Organization`)
- **Field Names**: camelCase (`firstName`, `organizationId`)
- **Relations**: Descriptive names with proper cascading
- **Indexes**: Add indexes for frequently queried fields
- **Constraints**: Use appropriate unique constraints and validations

### Multi-Tenant Data Patterns
- **Organization Scoping**: All tenant data must include `organizationId`
- **Data Isolation**: Never query across tenant boundaries
- **Cascade Deletes**: Proper cleanup when organizations are deleted
- **Audit Trails**: Track changes for compliance and debugging

## Authentication & Authorization

### Clerk Integration
- **User Metadata**: Store role information in Clerk metadata
- **Webhook Sync**: Keep local database synchronized with Clerk
- **Session Management**: Leverage Clerk's session management
- **Multi-Factor Auth**: Enable MFA for admin roles

### RBAC Implementation
- **Permission Checks**: Always validate permissions server-side
- **Role Hierarchy**: Respect role hierarchy in all operations
- **Audit Logging**: Log all role changes and access attempts
- **Principle of Least Privilege**: Grant minimum necessary permissions

## API Design Standards

### RESTful Conventions
- **HTTP Methods**: Use appropriate HTTP verbs (GET, POST, PUT, DELETE)
- **Status Codes**: Return proper HTTP status codes
- **Error Handling**: Consistent error response format
- **Pagination**: Implement cursor-based pagination for large datasets

### Route Protection
```typescript
// Always protect API routes with appropriate middleware
export async function GET(request: NextRequest) {
  return protectOrganizationRoute(
    request,
    async (req, context) => {
      // Your logic here
      return NextResponse.json({ data: [] })
    },
    [Permission.VIEW_ORGANIZATION]
  )
}
```

### Response Format
```typescript
// Success response
{
  success: true,
  data: {...},
  meta?: { pagination, etc. }
}

// Error response
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "User-friendly message",
    details?: {...}
  }
}
```

## UI/UX Standards

### Design System
- **Components**: Use Shadcn-UI components as base
- **Theming**: Support light/dark mode throughout
- **Responsive**: Mobile-first responsive design
- **Accessibility**: WCAG 2.1 AA compliance
- **Loading States**: Implement proper loading and error states

### Component Patterns
```typescript
// Component structure template
interface ComponentProps {
  // Props definition
}

export function Component({ ...props }: ComponentProps) {
  // Hooks at the top
  // Event handlers
  // Render logic with early returns
  
  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return (
    <div className="component-container">
      {/* Component content */}
    </div>
  )
}
```

### Styling Guidelines
- **Tailwind Classes**: Use Tailwind utility classes
- **Custom CSS**: Minimize custom CSS, use CSS variables for theming
- **Component Variants**: Use class-variance-authority for component variants
- **Responsive Design**: Use Tailwind responsive prefixes

## Performance Standards

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5 seconds
- **FID (First Input Delay)**: < 100 milliseconds
- **CLS (Cumulative Layout Shift)**: < 0.1

### Optimization Techniques
- **Image Optimization**: Use Next.js Image component
- **Code Splitting**: Implement dynamic imports for large components
- **Caching**: Leverage Next.js caching strategies
- **Bundle Analysis**: Regular bundle size monitoring

## Testing Standards

### Testing Strategy
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API routes and database operations
- **E2E Tests**: Test critical user flows
- **Permission Tests**: Verify RBAC implementation

### Testing Tools
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Playwright**: End-to-end testing
- **MSW**: API mocking for tests

## Security Standards

### Data Protection
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use Prisma ORM to prevent SQL injection
- **XSS Prevention**: Sanitize user-generated content
- **CSRF Protection**: Implement CSRF tokens for state-changing operations

### Authentication Security
- **Session Security**: Secure session management
- **Password Policies**: Enforce strong password requirements
- **Rate Limiting**: Implement rate limiting on auth endpoints
- **Audit Logging**: Log all authentication events

## Documentation Standards

### Code Documentation
- **JSDoc Comments**: Document complex functions and APIs
- **README Files**: Maintain up-to-date README files
- **API Documentation**: Document all API endpoints
- **Architecture Decisions**: Record architectural decisions (ADRs)

### Inline Comments
```typescript
// Good: Explain why, not what
// Using exponential backoff to handle rate limiting
const delay = Math.pow(2, retryCount) * 1000

// Bad: Explaining what the code does
// Multiply retryCount by 2 and then by 1000
const delay = Math.pow(2, retryCount) * 1000
```

## Deployment Standards

### Environment Management
- **Environment Variables**: Use environment variables for configuration
- **Secrets Management**: Secure handling of API keys and secrets
- **Database Migrations**: Automated migration deployment
- **Health Checks**: Implement health check endpoints

### CI/CD Pipeline
- **Automated Testing**: Run tests on every commit
- **Code Quality**: Lint and format checks
- **Security Scanning**: Automated security vulnerability scanning
- **Deployment Automation**: Automated deployment to staging and production

## Error Handling

### Client-Side Error Handling
```typescript
// Use error boundaries for React components
// Handle async errors with try-catch
// Provide user-friendly error messages
// Log errors for debugging
```

### Server-Side Error Handling
```typescript
// Consistent error response format
// Proper HTTP status codes
// Error logging and monitoring
// Graceful degradation
```

These standards ensure consistent, maintainable, and scalable code across the entire Docify.ai Pro platform.