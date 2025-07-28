import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('🔍 Checking users in database...')
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      clerkId: true,
      name: true,
      role: true,
      organizationId: true
    }
  })
  
  console.log(`Found ${users.length} users:`)
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email}`)
    console.log(`   - Name: ${user.name}`)
    console.log(`   - Role: ${user.role}`)
    console.log(`   - ClerkId: ${user.clerkId || 'NULL'}`)
    console.log(`   - OrgId: ${user.organizationId || 'NULL'}`)
    console.log('')
  })
  
  await prisma.$disconnect()
}

checkUsers().catch(console.error)