import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Create test tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Organization',
      domain: 'test.com',
    },
  })

  // Create test user
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test@test.com',
      tenantId: tenant.id,
      role: 'ADMIN',
    },
  })

  // Create test department
  const department = await prisma.department.create({
    data: {
      name: 'Sales',
      type: 'SALES',
      tenantId: tenant.id,
    },
  })

  // Create test deal
  await prisma.deal.create({
    data: {
      name: 'Test Deal',
      stage: 'DISCOVERY',
      tenantId: tenant.id,
      departmentId: department.id,
      value: 10000,
    },
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
