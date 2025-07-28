import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testUserLookup() {
  const clerkId = 'user_30UYyPqMO07X0xHMc67MCncYbHq' // From the logs
  
  console.log('🔍 Testing user lookup with clerkId:', clerkId)
  
  // Test findFirst (what the API uses)
  const userByFindFirst = await prisma.user.findFirst({
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
  
  console.log('findFirst result:', userByFindFirst ? 'FOUND' : 'NOT FOUND')
  if (userByFindFirst) {
    console.log('User details:')
    console.log('- Email:', userByFindFirst.email)
    console.log('- Name:', userByFindFirst.name)
    console.log('- Role:', userByFindFirst.role)
    console.log('- Organization:', userByFindFirst.organization?.name || 'None')
    console.log('- Project memberships:', userByFindFirst.projectMembers.length)
  }
  
  // Test findUnique (alternative)
  const userByFindUnique = await prisma.user.findUnique({
    where: { clerkId }
  })
  
  console.log('findUnique result:', userByFindUnique ? 'FOUND' : 'NOT FOUND')
  
  await prisma.$disconnect()
}

testUserLookup().catch(console.error)