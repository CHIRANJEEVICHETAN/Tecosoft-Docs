import { PrismaClient, Role, ProjectMemberRole, ProjectStatus, DocumentStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create sample organizations
  const org1 = await prisma.organization.upsert({
    where: { slug: 'tecosoft' },
    update: {},
    create: {
      name: 'Tecosoft',
      slug: 'tecosoft',
      description: 'Technology Digital Solutions',
    },
  })

  console.log('✅ Created organizations')

  // Create sample users with all roles
  // SUPER_ADMIN - Platform administrator (no organization)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@docify.ai' },
    update: {},
    create: {
      clerkId: null, // Will be updated when user signs up in Clerk
      email: 'superadmin@docify.ai',
      name: 'Super Admin',
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
      organizationId: null, // SUPER_ADMIN is not tied to any organization
    },
  })

  // ORG_ADMIN - Organization administrator
  const admin1 = await prisma.user.upsert({
    where: { email: 'chiranjeevichetan1998@gmail.com' },
    update: {},
    create: {
      clerkId: null, // Will be updated when user signs up in Clerk
      email: 'chiranjeevichetan1998@gmail.com',
      name: 'Chetan Admin',
      firstName: 'Chetan',
      lastName: 'Admin',
      role: Role.ORG_ADMIN,
      organizationId: org1.id,
    },
  })

  // MANAGER - Project manager
  const manager1 = await prisma.user.upsert({
    where: { email: 'sonuradha988@gmail.com' },
    update: {},
    create: {
      clerkId: null, // Will be updated when user signs up in Clerk
      email: 'sonuradha988@gmail.com',
      name: 'Sonu Manager',
      firstName: 'Sonu',
      lastName: 'Manager',
      role: Role.MANAGER,
      organizationId: org1.id,
    },
  })

  // USER - Regular user
  const user1 = await prisma.user.upsert({
    where: { email: 'chiranjeevichetan1996@gmail.com' },
    update: {},
    create: {
      clerkId: null, // Will be updated when user signs up in Clerk
      email: 'chiranjeevichetan1996@gmail.com',
      name: 'Chetan User',
      firstName: 'Chetan',
      lastName: 'User',
      role: Role.USER,
      organizationId: org1.id,
    },
  })

  // VIEWER - Read-only user
  const viewer1 = await prisma.user.upsert({
    where: { email: 'viewer@tecosoft.com' },
    update: {},
    create: {
      clerkId: null, // Will be updated when user signs up in Clerk
      email: 'viewer@tecosoft.com',
      name: 'Viewer User',
      firstName: 'Viewer',
      lastName: 'User',
      role: Role.VIEWER,
      organizationId: org1.id,
    },
  })

  console.log('✅ Created users')

  // Create sample projects
  const project1 = await prisma.project.upsert({
    where: { 
      slug_organizationId: {
        slug: 'docs-platform',
        organizationId: org1.id,
      }
    },
    update: {},
    create: {
      name: 'Documentation Platform',
      slug: 'docs-platform',
      description: 'Multi-tenant documentation platform',
      status: ProjectStatus.ACTIVE,
      organizationId: org1.id,
    },
  })

  const project2 = await prisma.project.upsert({
    where: { 
      slug_organizationId: {
        slug: 'mobile-app',
        organizationId: org1.id,
      }
    },
    update: {},
    create: {
      name: 'Mobile Application',
      slug: 'mobile-app',
      description: 'Company mobile application',
      status: ProjectStatus.ACTIVE,
      organizationId: org1.id,
    },
  })

  console.log('✅ Created projects')

  // Create project members
  // Note: SUPER_ADMIN doesn't need to be explicitly added to projects
  // as they have platform-wide access to all organizations and projects

  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: admin1.id,
        projectId: project1.id,
      },
    },
    update: {},
    create: {
      userId: admin1.id,
      projectId: project1.id,
      role: ProjectMemberRole.ADMIN,
    },
  })

  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: manager1.id,
        projectId: project1.id,
      },
    },
    update: {},
    create: {
      userId: manager1.id,
      projectId: project1.id,
      role: ProjectMemberRole.ADMIN,
    },
  })

  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: user1.id,
        projectId: project1.id,
      },
    },
    update: {},
    create: {
      userId: user1.id,
      projectId: project1.id,
      role: ProjectMemberRole.MEMBER,
    },
  })

  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: viewer1.id,
        projectId: project1.id,
      },
    },
    update: {},
    create: {
      userId: viewer1.id,
      projectId: project1.id,
      role: ProjectMemberRole.VIEWER,
    },
  })

  // Add members to project 2
  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: admin1.id,
        projectId: project2.id,
      },
    },
    update: {},
    create: {
      userId: admin1.id,
      projectId: project2.id,
      role: ProjectMemberRole.OWNER,
    },
  })

  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: user1.id,
        projectId: project2.id,
      },
    },
    update: {},
    create: {
      userId: user1.id,
      projectId: project2.id,
      role: ProjectMemberRole.MEMBER,
    },
  })

  console.log('✅ Created project members')

  // Create sample documents
  const doc1 = await prisma.document.upsert({
    where: {
      slug_projectId: {
        slug: 'getting-started',
        projectId: project1.id,
      }
    },
    update: {},
    create: {
      title: 'Getting Started Guide',
      slug: 'getting-started',
      content: '# Getting Started\n\nWelcome to our documentation platform! This guide will help you get started with creating and managing your documentation.\n\n## Overview\n\nOur platform provides a comprehensive solution for managing documentation across multiple projects and teams.',
      summary: 'A comprehensive guide to get started with the documentation platform',
      status: DocumentStatus.PUBLISHED,
      projectId: project1.id,
      authorId: superAdmin.id,
    },
  })

  const doc2 = await prisma.document.upsert({
    where: {
      slug_projectId: {
        slug: 'api-reference',
        projectId: project1.id,
      }
    },
    update: {},
    create: {
      title: 'API Reference',
      slug: 'api-reference',
      content: '# API Reference\n\nThis document contains the complete API reference for our platform.\n\n## Authentication\n\nAll API requests require authentication using Bearer tokens.\n\n## Endpoints\n\n### GET /api/projects\n\nRetrieve all projects for the authenticated user.',
      summary: 'Complete API reference documentation',
      status: DocumentStatus.PUBLISHED,
      projectId: project1.id,
      authorId: manager1.id,
    },
  })

  const doc3 = await prisma.document.upsert({
    where: {
      slug_projectId: {
        slug: 'user-guide',
        projectId: project1.id,
      }
    },
    update: {},
    create: {
      title: 'User Guide',
      slug: 'user-guide',
      content: '# User Guide\n\nThis guide covers how to use the platform from a user perspective.\n\n## Creating Documents\n\nTo create a new document, navigate to your project and click the "New Document" button.',
      summary: 'Step-by-step user guide for the platform',
      status: DocumentStatus.DRAFT,
      projectId: project1.id,
      authorId: user1.id,
    },
  })

  const doc4 = await prisma.document.upsert({
    where: {
      slug_projectId: {
        slug: 'mobile-setup',
        projectId: project2.id,
      }
    },
    update: {},
    create: {
      title: 'Mobile App Setup',
      slug: 'mobile-setup',
      content: '# Mobile Application Setup\n\nThis document covers the setup process for our mobile application.\n\n## Prerequisites\n\n- Node.js 18+\n- React Native CLI\n- Android Studio or Xcode',
      summary: 'Setup instructions for the mobile application',
      status: DocumentStatus.PUBLISHED,
      projectId: project2.id,
      authorId: superAdmin.id,
    },
  })

  const doc5 = await prisma.document.upsert({
    where: {
      slug_projectId: {
        slug: 'deployment-guide',
        projectId: project2.id,
      }
    },
    update: {},
    create: {
      title: 'Deployment Guide',
      slug: 'deployment-guide',
      content: '# Deployment Guide\n\nThis guide covers how to deploy the mobile application to production.\n\n## Build Process\n\n1. Run tests\n2. Build the application\n3. Deploy to app stores',
      summary: 'Production deployment guide for mobile app',
      status: DocumentStatus.DRAFT,
      projectId: project2.id,
      authorId: user1.id,
    },
  })

  console.log('✅ Created sample documents')
  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
