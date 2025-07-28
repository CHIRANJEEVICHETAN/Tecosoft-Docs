---
inclusion: always
---

# UI Component Guidelines & Design System

## Design System Foundation

### Color System
The platform uses a comprehensive color system based on CSS custom properties:

```css
/* Light mode colors */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
}

/* Dark mode automatically handled by next-themes */
```

### Typography Scale
```typescript
// Font families defined in tailwind.config.ts
const fontFamily = {
  code: ["var(--font-geist-mono)"],     // For code blocks
  regular: ["var(--font-geist-sans)"],  // For body text
}

// Usage in components
<p className="font-regular text-base">Body text</p>
<code className="font-code text-sm">Code snippet</code>
```

### Spacing & Layout
```typescript
// Container system
<div className="container mx-auto px-4 max-w-7xl">
  {/* Content with consistent spacing */}
</div>

// Grid system for documentation layout
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  <aside className="lg:col-span-1">{/* Sidebar */}</aside>
  <main className="lg:col-span-2">{/* Main content */}</main>
  <aside className="lg:col-span-1">{/* TOC */}</aside>
</div>
```

## Component Architecture

### Base Component Structure
```typescript
// Standard component template
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface ComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive"
  size?: "sm" | "md" | "lg"
  children: React.ReactNode
}

const Component = forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "rounded-md border transition-colors",
          // Variant styles
          {
            "bg-background text-foreground": variant === "default",
            "bg-secondary text-secondary-foreground": variant === "secondary",
            "bg-destructive text-destructive-foreground": variant === "destructive",
          },
          // Size styles
          {
            "p-2 text-sm": size === "sm",
            "p-4 text-base": size === "md",
            "p-6 text-lg": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Component.displayName = "Component"
export { Component }
```

### Shadcn-UI Integration
All base UI components follow the Shadcn-UI pattern:

```typescript
// components/ui/button.tsx - Example of Shadcn-UI component
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

## Documentation-Specific Components

### MDX Component System
```typescript
// components/markdown/mdx-components.tsx
export const mdxComponents = {
  h1: ({ children, ...props }: any) => (
    <h1 className="text-4xl font-bold tracking-tight mb-6" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-3xl font-semibold tracking-tight mb-4 mt-8" {...props}>
      {children}
    </h2>
  ),
  p: ({ children, ...props }: any) => (
    <p className="text-base leading-7 mb-4" {...props}>
      {children}
    </p>
  ),
  code: ({ children, ...props }: any) => (
    <code className="font-code bg-muted px-1.5 py-0.5 rounded text-sm" {...props}>
      {children}
    </code>
  ),
  pre: Pre, // Custom pre component with copy functionality
  Note, // Custom note component
  Stepper, // Custom stepper component
  Tabs, // Custom tabs component
  FileTree, // Custom file tree component
}
```

### Custom Documentation Components

#### Note Component
```typescript
// components/markdown/note.tsx
interface NoteProps {
  type?: "info" | "warning" | "error" | "success"
  title?: string
  children: React.ReactNode
}

export function Note({ type = "info", title, children }: NoteProps) {
  const variants = {
    info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100",
    error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
    success: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100"
  }

  return (
    <div className={cn("border rounded-lg p-4 my-4", variants[type])}>
      {title && (
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <NoteIcon type={type} />
          {title}
        </h4>
      )}
      <div className="prose prose-sm max-w-none">
        {children}
      </div>
    </div>
  )
}
```

#### Code Block with Copy
```typescript
// components/markdown/pre.tsx
export function Pre({ children, ...props }: any) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    const code = children?.props?.children
    if (code) {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="relative group">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto font-code text-sm" {...props}>
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded bg-background border"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  )
}
```

## Role-Based UI Components

### Permission Gates
```typescript
// components/role-specific/permission-gate.tsx
interface PermissionGateProps {
  permissions: Permission[]
  projectId?: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({
  permissions,
  projectId,
  fallback = null,
  children
}: PermissionGateProps) {
  const { hasPermissions, loading } = usePermissions(permissions, projectId)
  
  if (loading) {
    return <div className="animate-pulse bg-muted h-8 rounded" />
  }
  
  if (!hasPermissions) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}
```

### Role-Specific Navigation
```typescript
// components/navbar.tsx
export function Navbar() {
  const { user } = useUser()
  const { canManageOrg, canCreateProject, isSuperAdmin } = useCommonPermissions()

  return (
    <nav className="border-b bg-background">
      <div className="container flex items-center justify-between h-16">
        <div className="flex items-center space-x-6">
          <Logo />
          
          {canCreateProject && (
            <Button variant="ghost" asChild>
              <Link href="/projects/new">New Project</Link>
            </Button>
          )}
          
          {canManageOrg && (
            <Button variant="ghost" asChild>
              <Link href="/organization/settings">Settings</Link>
            </Button>
          )}
          
          {isSuperAdmin && (
            <Button variant="ghost" asChild>
              <Link href="/admin">Admin Panel</Link>
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <UserButton />
        </div>
      </div>
    </nav>
  )
}
```

## Layout Components

### Documentation Layout
```typescript
// app/docs/layout.tsx
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8">
              <DocsMenu />
            </div>
          </aside>
          
          {/* Main Content */}
          <main className="lg:col-span-2">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              {children}
            </div>
          </main>
          
          {/* Right Sidebar - TOC */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8">
              <TableOfContents />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
```

### Dashboard Layout
```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-muted/10">
          <div className="p-6">
            <DashboardSidebar />
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

## Form Components

### Form Patterns with React Hook Form
```typescript
// components/forms/project-form.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Invalid slug format")
})

type ProjectFormData = z.infer<typeof projectSchema>

export function ProjectForm({ onSubmit, defaultValues }: ProjectFormProps) {
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter project name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Project description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating..." : "Create Project"}
        </Button>
      </form>
    </Form>
  )
}
```

## Loading & Error States

### Loading Components
```typescript
// components/ui/loading.tsx
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  }

  return (
    <div className={cn("animate-spin rounded-full border-2 border-primary border-t-transparent", sizeClasses[size])} />
  )
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-muted rounded", className)} />
  )
}

// Usage in components
function ProjectList() {
  const { projects, loading, error } = useProjects()
  
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }
  
  if (error) {
    return <ErrorMessage error={error} />
  }
  
  return (
    <div className="space-y-4">
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

### Error Components
```typescript
// components/ui/error-message.tsx
interface ErrorMessageProps {
  error: Error | string
  retry?: () => void
  className?: string
}

export function ErrorMessage({ error, retry, className }: ErrorMessageProps) {
  const message = typeof error === 'string' ? error : error.message

  return (
    <div className={cn("border border-destructive/20 bg-destructive/10 rounded-lg p-4", className)}>
      <div className="flex items-start gap-3">
        <AlertCircleIcon className="w-5 h-5 text-destructive mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-destructive mb-1">Error</h4>
          <p className="text-sm text-destructive/80">{message}</p>
          {retry && (
            <Button variant="outline" size="sm" onClick={retry} className="mt-3">
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

## Responsive Design Patterns

### Mobile-First Approach
```typescript
// Always start with mobile styles, then add larger breakpoints
<div className="
  flex flex-col space-y-4          // Mobile: stack vertically
  md:flex-row md:space-y-0 md:space-x-4  // Tablet+: horizontal layout
  lg:space-x-6                     // Desktop: more spacing
">
  <div className="flex-1">Main content</div>
  <aside className="w-full md:w-64">Sidebar</aside>
</div>
```

### Breakpoint System
```typescript
// Tailwind breakpoints used throughout the app
const breakpoints = {
  sm: '640px',   // Small devices
  md: '768px',   // Medium devices
  lg: '1024px',  // Large devices
  xl: '1280px',  // Extra large devices
  '2xl': '1536px' // 2X large devices
}

// Usage patterns
<div className="
  grid grid-cols-1           // Mobile: 1 column
  sm:grid-cols-2            // Small: 2 columns
  lg:grid-cols-3            // Large: 3 columns
  xl:grid-cols-4            // XL: 4 columns
  gap-4 sm:gap-6 lg:gap-8   // Responsive gaps
">
```

## Accessibility Guidelines

### ARIA Labels and Roles
```typescript
// Always include proper ARIA attributes
<button
  aria-label="Copy code to clipboard"
  aria-pressed={copied}
  onClick={handleCopy}
>
  {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
</button>

// Use semantic HTML elements
<nav aria-label="Main navigation">
  <ul role="list">
    <li><a href="/docs" aria-current="page">Documentation</a></li>
  </ul>
</nav>
```

### Keyboard Navigation
```typescript
// Ensure all interactive elements are keyboard accessible
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
  onClick={handleClick}
>
  Interactive element
</div>
```

### Focus Management
```typescript
// Manage focus for better UX
export function Modal({ isOpen, onClose, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent ref={modalRef} tabIndex={-1}>
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

These UI guidelines ensure consistent, accessible, and maintainable components across the Docify.ai Pro platform while supporting the multi-tenant architecture and role-based access control system.