import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testUserRelations() {
  const clerkId = 'user_30UYyPqMO07X0xHMc67MCncYbHq'
  
  console.log('🔍 Testing user relations for clerkId:', clerkId)
  
  // Test basic user lookup
  const user = await prisma.user.findFirst({
    where: { clerkId }
  })
  
  if (!user) {
    console.log('❌ User not found')
    return
  }
  
  console.log('✅ User found:', {
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId
  })
  
  // Test organization relationship
  if (user.organizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId }
    })
    
    console.log('Organization:', organization ? {
      id: organization.id,
      name: organization.name,
      slug: organization.slug
    } : 'NOT FOUND')
  } else {
    console.log('Organization: None (SUPER_ADMIN)')
  }
  
  // Test project memberships
  const projectMembers = await prisma.projectMember.findMany({
    where: { userId: user.id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  })
  
  console.log('Project memberships:', projectMembers.length)
  projectMembers.forEach((member, index) => {
    console.log(`  ${index + 1}. ${member.project.name} (${member.role})`)
  })
  
  // Test the exact query from the API
  console.log('\n🔍 Testing exact API query...')
  
  try {
    const apiUser = await prisma.user.findFirst({
      where: { clerkId },
      include: {
        organization: {
          select: {
            id: true,
            slug: true,
            name: true
          }
        },
        projectMembers: {
          include: {
            project: {
              select: {
                id: true,
                slug: true,
                name: true
              }
            }
          }
        }
      }
    })
    
    console.log('✅ API query successful')
    console.log('User with includes:', {
      id: apiUser?.id,
      email: apiUser?.email,
      role: apiUser?.role,
      organization: apiUser?.organization,
      projectMembersCount: apiUser?.projectMembers?.length
    })
    
  } catch (error) {
    console.log('❌ API query failed:', error.message)
  }
  
  await prisma.$disconnect()
}

testUserRelations().catch(console.error)