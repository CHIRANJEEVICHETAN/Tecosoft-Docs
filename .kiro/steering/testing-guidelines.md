---
inclusion: fileMatch
fileMatchPattern: '**/*.test.{ts,tsx,js,jsx}'
---

# Testing Guidelines & Patterns

## Testing Strategy Overview

### Testing Pyramid
1. **Unit Tests (70%)** - Individual functions, components, and services
2. **Integration Tests (20%)** - API routes, database operations, service interactions
3. **End-to-End Tests (10%)** - Critical user flows and business processes

### Testing Tools Stack
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **Playwright** - End-to-end testing
- **MSW (Mock Service Worker)** - API mocking
- **Prisma Test Environment** - Database testing

## Unit Testing Patterns

### Component Testing
```typescript
// components/__tests__/user-role-manager.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserRoleManager } from '@/components/role-management/user-role-manager'
import { usePermissions } from '@/lib/hooks/use-permissions'
import { Role } from '@prisma/client'

// Mock hooks
jest.mock('@/lib/hooks/use-permissions')
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>

// Mock API calls
jest.mock('@/lib/api/users', () => ({
  updateUserRole: jest.fn(),
  getOrganizationUsers: jest.fn()
}))

describe('UserRoleManager', () => {
  const mockUsers = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: Role.USER
    },
    {
      id: '2',
      name: 'Jane Admin',
      email: 'jane@example.com',
      role: Role.ORG_ADMIN
    }
  ]

  beforeEach(() => {
    mockUsePermissions.mockReturnValue({
      hasPermissions: true,
      loading: false,
      error: null
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders user list correctly', () => {
    render(<UserRoleManager organizationId="org-1" users={mockUsers} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('USER')).toBeInTheDocument()
    expect(screen.getByText('ORG_ADMIN')).toBeInTheDocument()
  })

  it('shows permission denied when user lacks permissions', () => {
    mockUsePermissions.mockReturnValue({
      hasPermissions: false,
      loading: false,
      error: null
    })

    render(<UserRoleManager organizationId="org-1" users={mockUsers} />)
    
    expect(screen.getByText(/permission denied/i)).toBeInTheDocument()
  })

  it('handles role change correctly', async () => {
    const mockUpdateUserRole = require('@/lib/api/users').updateUserRole
    mockUpdateUserRole.mockResolvedValue({ success: true })

    render(<UserRoleManager organizationId="org-1" users={mockUsers} />)
    
    // Find and click role dropdown for first user
    const roleButton = screen.getAllByRole('button', { name: /change role/i })[0]
    fireEvent.click(roleButton)
    
    // Select new role
    const managerOption = screen.getByText('MANAGER')
    fireEvent.click(managerOption)
    
    await waitFor(() => {
      expect(mockUpdateUserRole).toHaveBeenCalledWith('1', Role.MANAGER)
    })
  })

  it('displays error message on role change failure', async () => {
    const mockUpdateUserRole = require('@/lib/api/users').updateUserRole
    mockUpdateUserRole.mockRejectedValue(new Error('Update failed'))

    render(<UserRoleManager organizationId="org-1" users={mockUsers} />)
    
    const roleButton = screen.getAllByRole('button', { name: /change role/i })[0]
    fireEvent.click(roleButton)
    
    const managerOption = screen.getByText('MANAGER')
    fireEvent.click(managerOption)
    
    await waitFor(() => {
      expect(screen.getByText(/failed to update role/i)).toBeInTheDocument()
    })
  })
})
```

### Service Testing
```typescript
// lib/services/__tests__/project-service.test.ts
import { ProjectService } from '@/lib/services/project-service'
import { prismaMock } from '@/lib/test-utils/prisma-mock'
import { Role, ProjectMemberRole } from '@prisma/client'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock
}))

describe('ProjectService', () => {
  const organizationId = 'org-123'
  const userId = 'user-123'
  let projectService: ProjectService

  beforeEach(() => {
    projectService = new ProjectService(organizationId)
    jest.clearAllMocks()
  })

  describe('createProject', () => {
    it('creates project with correct organization scoping', async () => {
      const projectData = {
        name: 'Test Project',
        slug: 'test-project',
        description: 'Test description',
        creatorId: userId
      }

      const mockProject = {
        id: 'project-123',
        ...projectData,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback({
          project: {
            create: jest.fn().mockResolvedValue(mockProject)
          },
          projectMember: {
            create: jest.fn().mockResolvedValue({
              id: 'member-123',
              userId,
              projectId: mockProject.id,
              role: ProjectMemberRole.OWNER
            })
          }
        })
      })

      const result = await projectService.createProject(projectData)

      expect(result).toEqual(mockProject)
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })

    it('throws error for duplicate slug', async () => {
      const projectData = {
        name: 'Test Project',
        slug: 'existing-slug',
        creatorId: userId
      }

      prismaMock.$transaction.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['slug', 'organizationId'] }
      })

      await expect(projectService.createProject(projectData))
        .rejects.toThrow('Project with this slug already exists')
    })
  })

  describe('getProjectBySlug', () => {
    it('returns project when found in organization', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        slug: 'test-project',
        organizationId
      }

      prismaMock.project.findFirst.mockResolvedValue(mockProject)

      const result = await projectService.getProjectBySlug('test-project')

      expect(result).toEqual(mockProject)
      expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'test-project',
          organizationId
        },
        include: expect.any(Object)
      })
    })

    it('returns null when project not found', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null)

      const result = await projectService.getProjectBySlug('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('addProjectMember', () => {
    it('adds member to project successfully', async () => {
      const projectId = 'project-123'
      const newUserId = 'user-456'
      const role = ProjectMemberRole.MEMBER

      // Mock project exists
      prismaMock.project.findFirst.mockResolvedValue({
        id: projectId,
        organizationId
      })

      const mockMember = {
        id: 'member-123',
        userId: newUserId,
        projectId,
        role
      }

      prismaMock.projectMember.create.mockResolvedValue(mockMember)

      const result = await projectService.addProjectMember(projectId, newUserId, role)

      expect(result).toEqual(mockMember)
      expect(prismaMock.projectMember.create).toHaveBeenCalledWith({
        data: {
          userId: newUserId,
          projectId,
          role
        }
      })
    })

    it('throws error when project not found', async () => {
      prismaMock.project.findFirst.mockResolvedValue(null)

      await expect(
        projectService.addProjectMember('nonexistent', 'user-456')
      ).rejects.toThrow('Project not found')
    })
  })
})
```

### Hook Testing
```typescript
// lib/hooks/__tests__/use-permissions.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { usePermissions } from '@/lib/hooks/use-permissions'
import { useUser } from '@clerk/nextjs'
import { Permission, Role } from '@/lib/middleware/rbac-middleware'

// Mock Clerk
jest.mock('@clerk/nextjs')
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>

// Mock API
global.fetch = jest.fn()

describe('usePermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns correct permissions for ORG_ADMIN', async () => {
    mockUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        publicMetadata: {
          role: Role.ORG_ADMIN,
          organizationId: 'org-123'
        }
      },
      isLoaded: true
    } as any)

    const { result } = renderHook(() => 
      usePermissions([Permission.MANAGE_USERS, Permission.CREATE_PROJECT])
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.hasPermissions).toBe(true)
    expect(result.current.userRole).toBe(Role.ORG_ADMIN)
  })

  it('returns false for insufficient permissions', async () => {
    mockUseUser.mockReturnValue({
      user: {
        id: 'user-123',
        publicMetadata: {
          role: Role.USER,
          organizationId: 'org-123'
        }
      },
      isLoaded: true
    } as any)

    const { result } = renderHook(() => 
      usePermissions([Permission.MANAGE_USERS])
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.hasPermissions).toBe(false)
    expect(result.current.userRole).toBe(Role.USER)
  })

  it('handles loading state correctly', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: false
    } as any)

    const { result } = renderHook(() => 
      usePermissions([Permission.VIEW_ORGANIZATION])
    )

    expect(result.current.loading).toBe(true)
    expect(result.current.hasPermissions).toBe(false)
  })
})
```

## Integration Testing Patterns

### API Route Testing
```typescript
// app/api/org/[orgSlug]/projects/__tests__/route.test.ts
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { createMockRequest, createMockContext } from '@/lib/test-utils/api-mocks'
import { prismaMock } from '@/lib/test-utils/prisma-mock'
import { Role, Permission } from '@prisma/client'

// Mock middleware
jest.mock('@/lib/middleware/route-protection', () => ({
  protectOrganizationRoute: jest.fn((request, handler, permissions) => {
    const mockContext = createMockContext({
      organizationId: 'org-123',
      userId: 'user-123',
      userRole: Role.ORG_ADMIN
    })
    return handler(request, mockContext)
  })
}))

describe('/api/org/[orgSlug]/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns projects for organization', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project 1',
          slug: 'project-1',
          organizationId: 'org-123'
        },
        {
          id: 'project-2',
          name: 'Project 2',
          slug: 'project-2',
          organizationId: 'org-123'
        }
      ]

      prismaMock.project.findMany.mockResolvedValue(mockProjects)

      const request = createMockRequest('GET', '/api/org/test-org/projects')
      const response = await GET(request, { params: { orgSlug: 'test-org' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.projects).toEqual(mockProjects)
      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-123' },
        include: expect.any(Object)
      })
    })

    it('handles database errors gracefully', async () => {
      prismaMock.project.findMany.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('GET', '/api/org/test-org/projects')
      const response = await GET(request, { params: { orgSlug: 'test-org' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('POST', () => {
    it('creates new project successfully', async () => {
      const projectData = {
        name: 'New Project',
        slug: 'new-project',
        description: 'Test project'
      }

      const mockProject = {
        id: 'project-123',
        ...projectData,
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      prismaMock.$transaction.mockImplementation(async (callback) => {
        return callback({
          project: {
            create: jest.fn().mockResolvedValue(mockProject)
          },
          projectMember: {
            create: jest.fn().mockResolvedValue({})
          }
        })
      })

      const request = createMockRequest('POST', '/api/org/test-org/projects', projectData)
      const response = await POST(request, { params: { orgSlug: 'test-org' } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.project).toEqual(mockProject)
    })

    it('validates request data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        slug: 'invalid slug!', // Invalid: contains special characters
      }

      const request = createMockRequest('POST', '/api/org/test-org/projects', invalidData)
      const response = await POST(request, { params: { orgSlug: 'test-org' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.details).toHaveLength(2)
    })
  })
})
```

### Database Integration Testing
```typescript
// lib/services/__tests__/integration/project-service.integration.test.ts
import { ProjectService } from '@/lib/services/project-service'
import { setupTestDatabase, cleanupTestDatabase } from '@/lib/test-utils/database'
import { createTestOrganization, createTestUser } from '@/lib/test-utils/factories'
import { Role, ProjectMemberRole } from '@prisma/client'

describe('ProjectService Integration', () => {
  let testOrg: any
  let testUser: any
  let projectService: ProjectService

  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    testOrg = await createTestOrganization({
      name: 'Test Organization',
      slug: 'test-org'
    })

    testUser = await createTestUser({
      email: 'test@example.com',
      name: 'Test User',
      role: Role.ORG_ADMIN,
      organizationId: testOrg.id
    })

    projectService = new ProjectService(testOrg.id)
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.projectMember.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
    await prisma.organization.deleteMany()
  })

  it('creates project with proper relationships', async () => {
    const projectData = {
      name: 'Integration Test Project',
      slug: 'integration-test',
      description: 'Test project for integration testing',
      creatorId: testUser.id
    }

    const project = await projectService.createProject(projectData)

    expect(project).toMatchObject({
      name: projectData.name,
      slug: projectData.slug,
      organizationId: testOrg.id
    })

    // Verify project member was created
    const members = await projectService.getProjectMembers(project.id)
    expect(members).toHaveLength(1)
    expect(members[0]).toMatchObject({
      userId: testUser.id,
      role: ProjectMemberRole.OWNER
    })
  })

  it('enforces organization boundaries', async () => {
    // Create another organization
    const otherOrg = await createTestOrganization({
      name: 'Other Organization',
      slug: 'other-org'
    })

    const otherProjectService = new ProjectService(otherOrg.id)

    // Create project in first organization
    const project = await projectService.createProject({
      name: 'Test Project',
      slug: 'test-project',
      creatorId: testUser.id
    })

    // Try to access from other organization service
    const result = await otherProjectService.getProjectBySlug('test-project')
    expect(result).toBeNull()
  })

  it('handles concurrent project creation', async () => {
    const projectPromises = Array.from({ length: 5 }, (_, i) =>
      projectService.createProject({
        name: `Concurrent Project ${i}`,
        slug: `concurrent-${i}`,
        creatorId: testUser.id
      })
    )

    const projects = await Promise.all(projectPromises)
    
    expect(projects).toHaveLength(5)
    projects.forEach((project, i) => {
      expect(project.name).toBe(`Concurrent Project ${i}`)
      expect(project.organizationId).toBe(testOrg.id)
    })
  })
})
```

## End-to-End Testing Patterns

### Playwright E2E Tests
```typescript
// tests/e2e/project-management.spec.ts
import { test, expect } from '@playwright/test'
import { setupE2ETest, cleanupE2ETest } from '@/lib/test-utils/e2e-setup'

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupE2ETest(page)
    
    // Login as admin user
    await page.goto('/sign-in')
    await page.fill('[data-testid="email-input"]', 'admin@test.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="sign-in-button"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard')
  })

  test.afterEach(async ({ page }) => {
    await cleanupE2ETest(page)
  })

  test('creates new project successfully', async ({ page }) => {
    // Navigate to projects page
    await page.click('[data-testid="projects-nav"]')
    await page.waitForURL('/projects')

    // Click create project button
    await page.click('[data-testid="create-project-button"]')
    
    // Fill project form
    await page.fill('[data-testid="project-name-input"]', 'E2E Test Project')
    await page.fill('[data-testid="project-slug-input"]', 'e2e-test-project')
    await page.fill('[data-testid="project-description-input"]', 'Project created by E2E test')
    
    // Submit form
    await page.click('[data-testid="create-project-submit"]')
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Project created successfully')
    
    // Verify project appears in list
    await page.waitForURL('/projects')
    await expect(page.locator('[data-testid="project-card"]')).toContainText('E2E Test Project')
  })

  test('manages project members', async ({ page }) => {
    // Assume project exists from previous test or setup
    await page.goto('/projects/test-project/settings')
    
    // Navigate to members tab
    await page.click('[data-testid="members-tab"]')
    
    // Add new member
    await page.click('[data-testid="add-member-button"]')
    await page.fill('[data-testid="member-email-input"]', 'newmember@test.com')
    await page.selectOption('[data-testid="member-role-select"]', 'MEMBER')
    await page.click('[data-testid="add-member-submit"]')
    
    // Verify member was added
    await expect(page.locator('[data-testid="member-list"]')).toContainText('newmember@test.com')
    
    // Change member role
    await page.click('[data-testid="member-role-dropdown"]')
    await page.click('[data-testid="role-option-admin"]')
    
    // Verify role change
    await expect(page.locator('[data-testid="member-role-badge"]')).toContainText('ADMIN')
  })

  test('handles permission restrictions correctly', async ({ page }) => {
    // Login as regular user (not admin)
    await page.goto('/sign-out')
    await page.goto('/sign-in')
    await page.fill('[data-testid="email-input"]', 'user@test.com')
    await page.fill('[data-testid="password-input"]', 'testpassword')
    await page.click('[data-testid="sign-in-button"]')
    
    await page.waitForURL('/dashboard')
    
    // Try to access admin features
    await page.goto('/projects/test-project/settings')
    
    // Should see permission denied message
    await expect(page.locator('[data-testid="permission-denied"]')).toBeVisible()
    
    // Create project button should not be visible
    await page.goto('/projects')
    await expect(page.locator('[data-testid="create-project-button"]')).not.toBeVisible()
  })

  test('search and filter projects', async ({ page }) => {
    await page.goto('/projects')
    
    // Use search
    await page.fill('[data-testid="project-search-input"]', 'test')
    await page.press('[data-testid="project-search-input"]', 'Enter')
    
    // Verify filtered results
    await expect(page.locator('[data-testid="project-card"]')).toContainText('test')
    
    // Use status filter
    await page.selectOption('[data-testid="status-filter"]', 'ACTIVE')
    
    // Verify only active projects shown
    const projectCards = page.locator('[data-testid="project-card"]')
    const count = await projectCards.count()
    
    for (let i = 0; i < count; i++) {
      await expect(projectCards.nth(i).locator('[data-testid="project-status"]')).toContainText('ACTIVE')
    }
  })
})
```

## Test Utilities & Helpers

### Database Test Setup
```typescript
// lib/test-utils/database.ts
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const prisma = new PrismaClient()

export async function setupTestDatabase() {
  // Run migrations
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL
    }
  })
}

export async function cleanupTestDatabase() {
  // Clean up all tables in reverse dependency order
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
  
  await prisma.$disconnect()
}

export async function resetDatabase() {
  await cleanupTestDatabase()
  await setupTestDatabase()
}
```

### Test Factories
```typescript
// lib/test-utils/factories.ts
import { prisma } from '@/lib/prisma'
import { Role, ProjectMemberRole } from '@prisma/client'

export async function createTestOrganization(data: Partial<any> = {}) {
  return prisma.organization.create({
    data: {
      name: 'Test Organization',
      slug: `test-org-${Date.now()}`,
      description: 'Test organization',
      ...data
    }
  })
}

export async function createTestUser(data: Partial<any> = {}) {
  return prisma.user.create({
    data: {
      clerkId: `test-clerk-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      role: Role.USER,
      ...data
    }
  })
}

export async function createTestProject(data: Partial<any> = {}) {
  return prisma.project.create({
    data: {
      name: 'Test Project',
      slug: `test-project-${Date.now()}`,
      description: 'Test project',
      ...data
    }
  })
}

export async function createTestProjectMember(data: Partial<any> = {}) {
  return prisma.projectMember.create({
    data: {
      role: ProjectMemberRole.MEMBER,
      ...data
    }
  })
}
```

### API Test Helpers
```typescript
// lib/test-utils/api-mocks.ts
import { NextRequest } from 'next/server'

export function createMockRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): NextRequest {
  const request = new NextRequest(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    ...(body && { body: JSON.stringify(body) })
  })

  return request
}

export function createMockContext(overrides: Partial<any> = {}) {
  return {
    organizationId: 'test-org-123',
    organizationSlug: 'test-org',
    userId: 'test-user-123',
    userRole: Role.USER,
    ...overrides
  }
}
```

### MSW API Mocking
```typescript
// lib/test-utils/msw-handlers.ts
import { rest } from 'msw'
import { setupServer } from 'msw/node'

export const handlers = [
  rest.get('/api/org/:orgSlug/projects', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          projects: [
            {
              id: 'project-1',
              name: 'Mock Project 1',
              slug: 'mock-project-1'
            }
          ]
        }
      })
    )
  }),

  rest.post('/api/org/:orgSlug/projects', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          project: {
            id: 'new-project-123',
            name: 'New Mock Project',
            slug: 'new-mock-project'
          }
        }
      })
    )
  })
]

export const server = setupServer(...handlers)

// Setup MSW
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Test Configuration

### Jest Configuration
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

### Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

These testing guidelines ensure comprehensive test coverage while maintaining fast execution times and reliable test results across the Docify.ai Pro platform.