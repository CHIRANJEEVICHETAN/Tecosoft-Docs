---
inclusion: always
---

# Security Practices & Guidelines

## Authentication & Authorization Security

### Clerk Integration Security
```typescript
// Secure Clerk configuration
export const clerkConfig = {
  // Use environment variables for sensitive data
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  secretKey: process.env.CLERK_SECRET_KEY!,
  
  // Configure secure session settings
  sessionTokenTemplate: {
    // Include minimal necessary claims
    claims: {
      organizationId: '{{user.public_metadata.organizationId}}',
      role: '{{user.public_metadata.role}}'
    }
  },
  
  // Enable security features
  signIn: {
    mode: 'modal',
    fallbackRedirectUrl: '/dashboard',
    signUpUrl: '/sign-up'
  },
  
  // Configure MFA requirements
  multiFactorAuth: {
    required: ['ORG_ADMIN', 'SUPER_ADMIN'] // Require MFA for admin roles
  }
}
```

### Session Security
```typescript
// lib/auth/session-security.ts
import { auth } from '@clerk/nextjs'
import { NextRequest } from 'next/server'

export async function validateSession(request: NextRequest) {
  const { userId, sessionClaims } = auth()
  
  if (!userId) {
    throw new Error('Unauthorized: No valid session')
  }
  
  // Validate session age
  const sessionAge = Date.now() - (sessionClaims?.iat || 0) * 1000
  const MAX_SESSION_AGE = 24 * 60 * 60 * 1000 // 24 hours
  
  if (sessionAge > MAX_SESSION_AGE) {
    throw new Error('Session expired: Please re-authenticate')
  }
  
  // Validate session claims
  if (!sessionClaims?.organizationId) {
    throw new Error('Invalid session: Missing organization context')
  }
  
  return {
    userId,
    organizationId: sessionClaims.organizationId,
    role: sessionClaims.role
  }
}

// Rate limiting for authentication attempts
const authAttempts = new Map<string, { count: number; resetTime: number }>()

export function checkAuthRateLimit(identifier: string): boolean {
  const now = Date.now()
  const attempt = authAttempts.get(identifier)
  
  if (!attempt || attempt.resetTime < now) {
    authAttempts.set(identifier, { count: 1, resetTime: now + 15 * 60 * 1000 }) // 15 minutes
    return true
  }
  
  if (attempt.count >= 5) { // Max 5 attempts per 15 minutes
    return false
  }
  
  attempt.count++
  return true
}
```

## Input Validation & Sanitization

### Request Validation
```typescript
// lib/validation/security-schemas.ts
import { z } from 'zod'

// Secure string validation with sanitization
export const secureStringSchema = z.string()
  .min(1, 'Field is required')
  .max(1000, 'Field too long')
  .refine(
    (val) => !/<script|javascript:|data:|vbscript:/i.test(val),
    'Invalid characters detected'
  )
  .transform((val) => val.trim())

// Email validation with domain restrictions
export const secureEmailSchema = z.string()
  .email('Invalid email format')
  .refine(
    (email) => {
      const domain = email.split('@')[1]
      const blockedDomains = ['tempmail.com', '10minutemail.com'] // Add blocked domains
      return !blockedDomains.includes(domain)
    },
    'Email domain not allowed'
  )

// Slug validation to prevent path traversal
export const secureSlugSchema = z.string()
  .min(1, 'Slug is required')
  .max(50, 'Slug too long')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
  .refine(
    (slug) => !['admin', 'api', 'www', 'mail', 'ftp'].includes(slug),
    'Reserved slug not allowed'
  )

// File upload validation
export const fileUploadSchema = z.object({
  name: z.string().refine(
    (name) => {
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx']
      return allowedExtensions.some(ext => name.toLowerCase().endsWith(ext))
    },
    'File type not allowed'
  ),
  size: z.number().max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  type: z.string().refine(
    (type) => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      return allowedTypes.includes(type)
    },
    'File type not allowed'
  )
})
```

### SQL Injection Prevention
```typescript
// Always use Prisma ORM - never raw SQL
// lib/data-access/secure-queries.ts

// ✅ SECURE: Using Prisma ORM
export async function getProjectsBySearch(
  organizationId: string,
  searchTerm: string
) {
  return prisma.project.findMany({
    where: {
      organizationId, // Automatic parameterization
      OR: [
        {
          name: {
            contains: searchTerm, // Prisma handles escaping
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        }
      ]
    }
  })
}

// ❌ NEVER DO THIS: Raw SQL with string concatenation
// const query = `SELECT * FROM projects WHERE name LIKE '%${searchTerm}%'`
```

### XSS Prevention
```typescript
// lib/security/xss-prevention.ts
import DOMPurify from 'isomorphic-dompurify'

// Sanitize HTML content
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title', 'class'],
    ALLOW_DATA_ATTR: false
  })
}

// Sanitize user input for display
export function sanitizeUserInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// React component for safe HTML rendering
export function SafeHTML({ content }: { content: string }) {
  const sanitizedContent = sanitizeHTML(content)
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      className="prose prose-sm max-w-none"
    />
  )
}
```

## Data Protection & Privacy

### Sensitive Data Handling
```typescript
// lib/security/data-protection.ts
import crypto from 'crypto'

// Encrypt sensitive data before storing
export function encryptSensitiveData(data: string): string {
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const iv = crypto.randomBytes(16)
  
  const cipher = crypto.createCipher(algorithm, key)
  cipher.setAAD(Buffer.from('additional-data'))
  
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

// Decrypt sensitive data
export function decryptSensitiveData(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
  const algorithm = 'aes-256-gcm'
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  
  const decipher = crypto.createDecipher(algorithm, key)
  decipher.setAAD(Buffer.from('additional-data'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// Hash passwords (if storing locally)
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcrypt')
  return bcrypt.hash(password, 12)
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcrypt')
  return bcrypt.compare(password, hash)
}
```

### GDPR Compliance
```typescript
// lib/privacy/gdpr-compliance.ts

// Data export for GDPR requests
export async function exportUserData(userId: string, organizationId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    include: {
      projectMembers: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      }
    }
  })
  
  if (!user) {
    throw new Error('User not found')
  }
  
  // Remove sensitive fields
  const { clerkId, ...exportData } = user
  
  return {
    personalData: exportData,
    dataProcessingPurpose: 'Documentation platform services',
    dataRetentionPeriod: '7 years after account deletion',
    exportDate: new Date().toISOString()
  }
}

// Data deletion for GDPR requests
export async function deleteUserData(userId: string, organizationId: string) {
  return prisma.$transaction(async (tx) => {
    // Remove user from projects
    await tx.projectMember.deleteMany({
      where: { userId }
    })
    
    // Anonymize user data instead of hard delete to maintain referential integrity
    await tx.user.update({
      where: { id: userId, organizationId },
      data: {
        email: `deleted-${userId}@deleted.local`,
        name: 'Deleted User',
        firstName: null,
        lastName: null,
        imageUrl: null,
        clerkId: `deleted-${userId}`
      }
    })
    
    // Log deletion for audit
    console.log(`User data deleted for GDPR compliance: ${userId}`)
  })
}

// Consent management
export interface ConsentRecord {
  userId: string
  consentType: 'analytics' | 'marketing' | 'functional'
  granted: boolean
  timestamp: Date
  ipAddress: string
}

export async function recordConsent(consent: ConsentRecord) {
  // Store consent records for compliance
  await prisma.consentRecord.create({
    data: consent
  })
}
```

## API Security

### CORS Configuration
```typescript
// lib/security/cors.ts
import { NextRequest, NextResponse } from 'next/server'

export function configureCORS(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin')
  const allowedOrigins = [
    'https://yourdomain.com',
    'https://app.yourdomain.com',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : [])
  ]
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
  
  return response
}
```

### Request Size Limits
```typescript
// lib/security/request-limits.ts
import { NextRequest } from 'next/server'

export function validateRequestSize(request: NextRequest) {
  const contentLength = request.headers.get('content-length')
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new Error('Request too large')
  }
}

// Middleware to enforce limits
export function withRequestLimits(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    validateRequestSize(request)
    return handler(request, ...args)
  }
}
```

### API Rate Limiting
```typescript
// lib/security/advanced-rate-limiting.ts
interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

class AdvancedRateLimit {
  private requests = new Map<string, { count: number; resetTime: number; failures: number }>()
  
  check(
    identifier: string,
    config: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    // Clean expired entries
    for (const [key, value] of this.requests.entries()) {
      if (value.resetTime < now) {
        this.requests.delete(key)
      }
    }
    
    const current = this.requests.get(identifier)
    
    if (!current || current.resetTime < now) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + config.windowMs,
        failures: 0
      })
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs
      }
    }
    
    // Apply stricter limits for users with many failures
    const effectiveLimit = current.failures > 5 
      ? Math.floor(config.maxRequests * 0.5) 
      : config.maxRequests
    
    if (current.count >= effectiveLimit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      }
    }
    
    current.count++
    return {
      allowed: true,
      remaining: effectiveLimit - current.count,
      resetTime: current.resetTime
    }
  }
  
  recordFailure(identifier: string) {
    const current = this.requests.get(identifier)
    if (current) {
      current.failures++
    }
  }
}

export const rateLimiter = new AdvancedRateLimit()
```

## Security Headers

### Next.js Security Headers
```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.clerk.com",
      "frame-src 'none'"
    ].join('; ')
  }
]

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

## Audit Logging

### Security Event Logging
```typescript
// lib/security/audit-logging.ts
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_DELETION = 'DATA_DELETION',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

export interface SecurityEvent {
  type: SecurityEventType
  userId?: string
  organizationId?: string
  ipAddress: string
  userAgent: string
  details: Record<string, any>
  timestamp: Date
}

export class SecurityLogger {
  static async log(event: SecurityEvent) {
    // Log to database
    await prisma.securityLog.create({
      data: {
        type: event.type,
        userId: event.userId,
        organizationId: event.organizationId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        details: event.details,
        timestamp: event.timestamp
      }
    })
    
    // Log to external service for critical events
    if (this.isCriticalEvent(event.type)) {
      await this.logToExternalService(event)
    }
  }
  
  private static isCriticalEvent(type: SecurityEventType): boolean {
    return [
      SecurityEventType.PERMISSION_DENIED,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.DATA_DELETION
    ].includes(type)
  }
  
  private static async logToExternalService(event: SecurityEvent) {
    // Send to external logging service (e.g., Sentry, LogRocket)
    console.error('CRITICAL SECURITY EVENT:', event)
  }
}

// Usage in middleware
export async function logSecurityEvent(
  request: NextRequest,
  type: SecurityEventType,
  details: Record<string, any> = {}
) {
  const ipAddress = request.ip || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  await SecurityLogger.log({
    type,
    ipAddress,
    userAgent,
    details,
    timestamp: new Date()
  })
}
```

## Environment Security

### Environment Variables
```bash
# .env.example - Template for secure environment setup

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/Docify.ai_prod"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/Docify.ai_test"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Encryption
ENCRYPTION_KEY="64-character-hex-string-for-aes-256"
JWT_SECRET="secure-random-string-for-jwt-signing"

# External Services
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Security
ALLOWED_ORIGINS="https://yourdomain.com,https://app.yourdomain.com"
SESSION_SECRET="secure-session-secret"

# Monitoring
SENTRY_DSN="https://..."
LOG_LEVEL="error" # debug, info, warn, error
```

### Secrets Management
```typescript
// lib/security/secrets.ts
export class SecretsManager {
  private static validateEnvironment() {
    const requiredSecrets = [
      'DATABASE_URL',
      'CLERK_SECRET_KEY',
      'ENCRYPTION_KEY',
      'JWT_SECRET'
    ]
    
    const missing = requiredSecrets.filter(secret => !process.env[secret])
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
  }
  
  static getSecret(key: string): string {
    const value = process.env[key]
    if (!value) {
      throw new Error(`Secret ${key} not found`)
    }
    return value
  }
  
  static init() {
    this.validateEnvironment()
    
    // Validate encryption key format
    const encryptionKey = this.getSecret('ENCRYPTION_KEY')
    if (!/^[0-9a-f]{64}$/i.test(encryptionKey)) {
      throw new Error('ENCRYPTION_KEY must be a 64-character hex string')
    }
  }
}

// Initialize on startup
SecretsManager.init()
```

## Security Monitoring

### Intrusion Detection
```typescript
// lib/security/intrusion-detection.ts
export class IntrusionDetector {
  private static suspiciousPatterns = [
    /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection
    /<script|javascript:|data:|vbscript:/i, // XSS
    /\.\.\//g, // Path traversal
    /\b(eval|exec|system|shell_exec)\b/i // Code injection
  ]
  
  static analyzeRequest(request: NextRequest): {
    suspicious: boolean
    reasons: string[]
  } {
    const reasons: string[] = []
    const url = request.url
    const userAgent = request.headers.get('user-agent') || ''
    
    // Check URL for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(url)) {
        reasons.push(`Suspicious URL pattern: ${pattern.source}`)
      }
    }
    
    // Check for suspicious user agents
    if (this.isSuspiciousUserAgent(userAgent)) {
      reasons.push('Suspicious user agent')
    }
    
    // Check for rapid requests from same IP
    if (this.isRapidFire(request.ip || 'unknown')) {
      reasons.push('Rapid fire requests detected')
    }
    
    return {
      suspicious: reasons.length > 0,
      reasons
    }
  }
  
  private static isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousAgents = [
      'sqlmap',
      'nikto',
      'nmap',
      'masscan',
      'curl', // Block curl in production
      'wget'
    ]
    
    return suspiciousAgents.some(agent => 
      userAgent.toLowerCase().includes(agent)
    )
  }
  
  private static requestCounts = new Map<string, { count: number; firstRequest: number }>()
  
  private static isRapidFire(ip: string): boolean {
    const now = Date.now()
    const current = this.requestCounts.get(ip)
    
    if (!current) {
      this.requestCounts.set(ip, { count: 1, firstRequest: now })
      return false
    }
    
    // Reset if more than 1 minute has passed
    if (now - current.firstRequest > 60000) {
      this.requestCounts.set(ip, { count: 1, firstRequest: now })
      return false
    }
    
    current.count++
    
    // More than 100 requests per minute is suspicious
    return current.count > 100
  }
}
```

These security practices provide comprehensive protection for the Docify.ai Pro platform, covering authentication, data protection, API security, and monitoring to ensure a secure multi-tenant environment.