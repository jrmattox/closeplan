import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth/password'

const prisma = new PrismaClient()

async function main() {
  // Create a tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Organization',
    },
  })

  // Create an admin user
  const hashedPassword = await hashPassword('password123')

  const user = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User', // For NextAuth
      tenantId: tenant.id,
    },
  })

  // Create a test deal
  const deal = await prisma.deal.create({
    data: {
      title: 'Test Deal',
      status: 'DRAFT',
      value: new Prisma.Decimal(10000),
      tenantId: tenant.id,
      createdById: user.id,
      phi: {
        patientCount: 100,
        location: 'Test Hospital',
      },
    },
  })

  console.log({
    tenant: { id: tenant.id, name: tenant.name },
    user: { id: user.id, email: user.email },
    deal: { id: deal.id, title: deal.title },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
