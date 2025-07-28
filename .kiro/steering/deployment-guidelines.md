---
inclusion: always
---

# Deployment Guidelines & DevOps Practices

## Environment Configuration

### Environment Hierarchy
```
Development (Local)
├── Database: Local PostgreSQL
├── Auth: Clerk Development
├── Storage: Local filesystem
└── AI: Development API keys

Staging (Preview)
├── Database: Staging PostgreSQL
├── Auth: Clerk Staging
├── Storage: Cloud storage (staging bucket)
└── AI: Staging API keys

Production
├── Database: Production PostgreSQL (with replicas)
├── Auth: Clerk Production
├── Storage: Cloud storage (production bucket)
└── AI: Production API keys
```

### Environment Variables Management
```typescript
// lib/config/environment.ts
export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL!,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000')
  },
  
  // Authentication
  auth: {
    clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
    clerkSecretKey: process.env.CLERK_SECRET_KEY!,
    clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET!
  },
  
  // AI Services
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY!,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    geminiApiKey: process.env.GEMINI_API_KEY!
  },
  
  // Application
  app: {
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  
  // Security
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY!,
    jwtSecret: process.env.JWT_SECRET!,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || []
  }
}

// Validate configuration on startup
export function validateConfig() {
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'ENCRYPTION_KEY'
  ]
  
  const missing = requiredEnvVars.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
  
  console.log(`✅ Configuration validated for ${config.app.environment} environment`)
}
```

## Vercel Deployment Configuration

### Project Configuration
```typescript
// vercel.json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["iad1", "fra1", "hnd1"], // Multi-region deployment
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/analytics",
      "schedule": "0 1 * * *"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://yourdomain.com"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/docs",
      "destination": "/docs/getting-started/introduction",
      "permanent": false
    }
  ],
  "rewrites": [
    {
      "source": "/api/webhooks/clerk",
      "destination": "/api/webhooks/clerk"
    }
  ]
}
```

### Build Configuration
```typescript
// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react']
  },
  
  // Image optimization
  images: {
    domains: ['img.clerk.com', 'images.clerk.dev'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30 // 30 days
  },
  
  // Compression
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
          }
        ]
      }
    ]
  },
  
  // Environment-specific configurations
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Bundle analyzer (development only)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config: any) => {
      config.plugins.push(
        new (require('@next/bundle-analyzer'))({
          enabled: true
        })
      )
      return config
    }
  })
}

export default nextConfig
```

## Database Deployment

### Migration Strategy
```typescript
// scripts/deploy-migrations.ts
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deployMigrations() {
  console.log('🚀 Starting database migration deployment...')
  
  try {
    // Check database connectivity
    await prisma.$connect()
    console.log('✅ Database connection established')
    
    // Run migrations
    console.log('📦 Applying database migrations...')
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    
    // Generate Prisma client
    console.log('🔧 Generating Prisma client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    // Verify migration status
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 5
    `
    
    console.log('✅ Recent migrations:', migrations)
    
    console.log('🎉 Database migration deployment completed successfully')
  } catch (error) {
    console.error('❌ Migration deployment failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  deployMigrations()
}
```

### Database Backup Strategy
```typescript
// scripts/backup-database.ts
import { execSync } from 'child_process'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
})

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFileName = `backup-${timestamp}.sql`
  
  try {
    console.log('📦 Creating database backup...')
    
    // Create backup using pg_dump
    execSync(`pg_dump ${process.env.DATABASE_URL} > ${backupFileName}`, {
      stdio: 'inherit'
    })
    
    // Upload to S3
    console.log('☁️ Uploading backup to S3...')
    const fileContent = require('fs').readFileSync(backupFileName)
    
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.BACKUP_BUCKET!,
      Key: `database-backups/${backupFileName}`,
      Body: fileContent,
      StorageClass: 'STANDARD_IA' // Infrequent access for cost optimization
    }))
    
    // Clean up local file
    execSync(`rm ${backupFileName}`)
    
    console.log(`✅ Backup completed: ${backupFileName}`)
  } catch (error) {
    console.error('❌ Backup failed:', error)
    throw error
  }
}

// Schedule daily backups
export { backupDatabase }
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: Docify.ai_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          npx prisma migrate deploy
          npx prisma db seed
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/Docify.ai_test
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/Docify.ai_test
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/Docify.ai_test
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run security audit
        run: npm audit --audit-level high
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy-staging:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Pull Vercel environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build project artifacts
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy to staging
        run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Install Vercel CLI
        run: npm install --global vercel@latest
      
      - name: Pull Vercel environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Build project artifacts
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy to production
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
      
      - name: Run database migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Create database backup
        run: node scripts/backup-database.js
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          BACKUP_BUCKET: ${{ secrets.BACKUP_BUCKET }}

  notify:
    needs: [deploy-production]
    runs-on: ubuntu-latest
    if: always()
    
    steps:
      - name: Notify deployment status
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Monitoring & Observability

### Application Monitoring
```typescript
// lib/monitoring/application-monitoring.ts
import { NextRequest } from 'next/server'

export class ApplicationMonitor {
  private static metrics = {
    requestCount: 0,
    errorCount: 0,
    responseTimeSum: 0,
    activeUsers: new Set<string>()
  }
  
  static trackRequest(request: NextRequest, startTime: number) {
    const duration = Date.now() - startTime
    
    this.metrics.requestCount++
    this.metrics.responseTimeSum += duration
    
    // Track active users
    const userId = request.headers.get('x-user-id')
    if (userId) {
      this.metrics.activeUsers.add(userId)
    }
    
    // Log slow requests
    if (duration > 5000) { // 5 seconds
      console.warn('Slow request detected:', {
        url: request.url,
        method: request.method,
        duration,
        userAgent: request.headers.get('user-agent')
      })
    }
  }
  
  static trackError(error: Error, context: any) {
    this.metrics.errorCount++
    
    console.error('Application error:', {
      message: error.message,
      stack: error.stack,
      context
    })
    
    // Send to external monitoring service
    if (process.env.SENTRY_DSN) {
      // Sentry.captureException(error, { extra: context })
    }
  }
  
  static getMetrics() {
    const avgResponseTime = this.metrics.requestCount > 0 
      ? this.metrics.responseTimeSum / this.metrics.requestCount 
      : 0
    
    return {
      requestCount: this.metrics.requestCount,
      errorCount: this.metrics.errorCount,
      errorRate: this.metrics.requestCount > 0 
        ? (this.metrics.errorCount / this.metrics.requestCount) * 100 
        : 0,
      averageResponseTime: avgResponseTime,
      activeUsers: this.metrics.activeUsers.size
    }
  }
  
  // Reset metrics periodically
  static resetMetrics() {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      responseTimeSum: 0,
      activeUsers: new Set<string>()
    }
  }
}

// Health check endpoint
export async function healthCheck() {
  const checks = {
    database: false,
    clerk: false,
    ai: false
  }
  
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch (error) {
    console.error('Database health check failed:', error)
  }
  
  try {
    // Check Clerk API
    const response = await fetch('https://api.clerk.com/v1/health', {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`
      }
    })
    checks.clerk = response.ok
  } catch (error) {
    console.error('Clerk health check failed:', error)
  }
  
  try {
    // Check AI services
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    })
    checks.ai = response.ok
  } catch (error) {
    console.error('AI service health check failed:', error)
  }
  
  const healthy = Object.values(checks).every(check => check)
  
  return {
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    ...ApplicationMonitor.getMetrics()
  }
}
```

### Performance Monitoring
```typescript
// lib/monitoring/performance.ts
export class PerformanceMonitor {
  private static readonly SLOW_QUERY_THRESHOLD = 1000 // 1 second
  private static readonly MEMORY_THRESHOLD = 500 * 1024 * 1024 // 500MB
  
  static monitorDatabaseQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now()
      
      try {
        const result = await queryFn()
        const duration = Date.now() - startTime
        
        if (duration > this.SLOW_QUERY_THRESHOLD) {
          console.warn(`Slow database query detected: ${queryName}`, {
            duration,
            threshold: this.SLOW_QUERY_THRESHOLD
          })
        }
        
        resolve(result)
      } catch (error) {
        const duration = Date.now() - startTime
        console.error(`Database query failed: ${queryName}`, {
          duration,
          error: error.message
        })
        reject(error)
      }
    })
  }
  
  static monitorMemoryUsage() {
    const usage = process.memoryUsage()
    
    if (usage.heapUsed > this.MEMORY_THRESHOLD) {
      console.warn('High memory usage detected:', {
        heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
        threshold: `${Math.round(this.MEMORY_THRESHOLD / 1024 / 1024)}MB`
      })
    }
    
    return usage
  }
  
  static async monitorAPIEndpoint(
    endpointName: string,
    handler: () => Promise<any>
  ) {
    const startTime = Date.now()
    const startMemory = process.memoryUsage()
    
    try {
      const result = await handler()
      const duration = Date.now() - startTime
      const endMemory = process.memoryUsage()
      
      console.log(`API endpoint performance: ${endpointName}`, {
        duration,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
        success: true
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.error(`API endpoint error: ${endpointName}`, {
        duration,
        error: error.message,
        success: false
      })
      
      throw error
    }
  }
}
```

## Disaster Recovery

### Backup & Recovery Procedures
```typescript
// scripts/disaster-recovery.ts
import { execSync } from 'child_process'
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
})

export class DisasterRecovery {
  static async listBackups(): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: process.env.BACKUP_BUCKET!,
      Prefix: 'database-backups/'
    })
    
    const response = await s3Client.send(command)
    return response.Contents?.map(obj => obj.Key!) || []
  }
  
  static async restoreFromBackup(backupKey: string) {
    console.log(`🔄 Starting restore from backup: ${backupKey}`)
    
    try {
      // Download backup from S3
      const getCommand = new GetObjectCommand({
        Bucket: process.env.BACKUP_BUCKET!,
        Key: backupKey
      })
      
      const response = await s3Client.send(getCommand)
      const backupData = await response.Body?.transformToString()
      
      if (!backupData) {
        throw new Error('Failed to download backup data')
      }
      
      // Write backup to temporary file
      const tempFile = `/tmp/restore-${Date.now()}.sql`
      require('fs').writeFileSync(tempFile, backupData)
      
      // Restore database
      console.log('📦 Restoring database...')
      execSync(`psql ${process.env.DATABASE_URL} < ${tempFile}`, {
        stdio: 'inherit'
      })
      
      // Clean up temporary file
      execSync(`rm ${tempFile}`)
      
      console.log('✅ Database restore completed successfully')
    } catch (error) {
      console.error('❌ Database restore failed:', error)
      throw error
    }
  }
  
  static async createEmergencyBackup() {
    console.log('🚨 Creating emergency backup...')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `emergency-backup-${timestamp}.sql`
    
    try {
      // Create backup
      execSync(`pg_dump ${process.env.DATABASE_URL} > ${backupFileName}`, {
        stdio: 'inherit'
      })
      
      // Upload to S3 with high priority
      const fileContent = require('fs').readFileSync(backupFileName)
      
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.BACKUP_BUCKET!,
        Key: `emergency-backups/${backupFileName}`,
        Body: fileContent,
        StorageClass: 'STANDARD', // Standard storage for immediate access
        Metadata: {
          'emergency': 'true',
          'created-by': 'disaster-recovery-script'
        }
      }))
      
      // Clean up local file
      execSync(`rm ${backupFileName}`)
      
      console.log(`✅ Emergency backup created: ${backupFileName}`)
      return backupFileName
    } catch (error) {
      console.error('❌ Emergency backup failed:', error)
      throw error
    }
  }
}
```

### Rollback Procedures
```typescript
// scripts/rollback.ts
export class RollbackManager {
  static async rollbackDeployment(version: string) {
    console.log(`🔄 Rolling back to version: ${version}`)
    
    try {
      // Create emergency backup before rollback
      await DisasterRecovery.createEmergencyBackup()
      
      // Rollback using Vercel CLI
      execSync(`vercel rollback ${version} --token=${process.env.VERCEL_TOKEN}`, {
        stdio: 'inherit'
      })
      
      // Rollback database migrations if needed
      await this.rollbackMigrations(version)
      
      console.log('✅ Rollback completed successfully')
    } catch (error) {
      console.error('❌ Rollback failed:', error)
      throw error
    }
  }
  
  private static async rollbackMigrations(version: string) {
    // Get migration history for the version
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, applied_steps_count 
      FROM _prisma_migrations 
      WHERE finished_at > (
        SELECT created_at FROM deployments WHERE version = ${version}
      )
      ORDER BY finished_at DESC
    `
    
    if (migrations.length > 0) {
      console.log('🔄 Rolling back database migrations...')
      
      // This would require custom migration rollback logic
      // Prisma doesn't support automatic rollbacks
      console.warn('⚠️ Manual migration rollback required')
      console.log('Migrations to rollback:', migrations)
    }
  }
}
```

## Security in Deployment

### Secrets Management in Production
```typescript
// lib/deployment/secrets.ts
export class ProductionSecrets {
  private static secrets = new Map<string, string>()
  
  static async loadSecrets() {
    // In production, load from secure vault (e.g., AWS Secrets Manager)
    if (process.env.NODE_ENV === 'production') {
      await this.loadFromVault()
    } else {
      this.loadFromEnv()
    }
  }
  
  private static async loadFromVault() {
    // Example: AWS Secrets Manager integration
    try {
      const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager')
      
      const client = new SecretsManagerClient({
        region: process.env.AWS_REGION || 'us-east-1'
      })
      
      const secretNames = [
        'Docify.ai/database-url',
        'Docify.ai/clerk-secret',
        'Docify.ai/encryption-key'
      ]
      
      for (const secretName of secretNames) {
        const command = new GetSecretValueCommand({
          SecretId: secretName
        })
        
        const response = await client.send(command)
        if (response.SecretString) {
          const key = secretName.split('/')[1].toUpperCase().replace('-', '_')
          this.secrets.set(key, response.SecretString)
        }
      }
      
      console.log('✅ Secrets loaded from vault')
    } catch (error) {
      console.error('❌ Failed to load secrets from vault:', error)
      throw error
    }
  }
  
  private static loadFromEnv() {
    // Development: load from environment variables
    const envSecrets = [
      'DATABASE_URL',
      'CLERK_SECRET_KEY',
      'ENCRYPTION_KEY'
    ]
    
    for (const key of envSecrets) {
      const value = process.env[key]
      if (value) {
        this.secrets.set(key, value)
      }
    }
  }
  
  static getSecret(key: string): string {
    const secret = this.secrets.get(key) || process.env[key]
    if (!secret) {
      throw new Error(`Secret ${key} not found`)
    }
    return secret
  }
}
```

These deployment guidelines ensure reliable, secure, and scalable deployment of the Docify.ai Pro platform with proper monitoring, backup, and recovery procedures.