import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifySetup() {
  try {
    // Check if we can connect
    await prisma.$connect()
    console.log('✓ Database connection successful')

    // Check if tables exist
    const user = await prisma.user.findFirst()
    const org = await prisma.organization.findFirst()
    const deal = await prisma.deal.findFirst()

    console.log('✓ Schema verified')
    console.log({
      hasUsers: !!user,
      hasOrganizations: !!org,
      hasDeals: !!deal
    })

  } catch (error) {
    console.error('Database setup verification failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifySetup()
