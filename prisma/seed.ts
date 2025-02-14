import { PrismaClient, DealStatus } from '@prisma/client'
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

  // Create an organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Test Hospital',
      type: 'Healthcare',
      tenantId: tenant.id,
      settings: {},
      metadata: {
        region: 'North',
        type: 'Hospital',
      },
    },
  })

  // Create a department
  const department = await prisma.department.create({
    data: {
      name: 'Cardiology',
      type: 'Medical',
      organizationId: organization.id,
      tenantId: tenant.id,
      complianceRules: {
        requirePhiTracking: true,
        auditFrequency: 'daily',
      },
    },
  })

  // Create a test deal
  const deal = await prisma.deal.create({
    data: {
      title: 'Test Deal',
      value: 10000,
      status: DealStatus.DISCOVERY,
      stage: 'Initial',
      tenantId: tenant.id,
      organizationId: organization.id,
      departmentId: department.id,
      clinicalData: {
        speciality: 'Cardiology',
        procedures: ['ECG', 'Stress Test'],
      },
      complianceData: {
        hipaaCompliant: true,
        dataEncryption: 'AES-256',
      },
      phi: {
        patientCount: 100,
        location: 'Test Hospital',
      },
    },
  })

  // Create an activity
  await prisma.activity.create({
    data: {
      type: 'DEAL_CREATED',
      description: 'New deal created',
      tenantId: tenant.id,
      userId: user.id,
      dealId: deal.id,
    },
  })

  // Create an audit log
  await prisma.auditLog.create({
    data: {
      dealId: deal.id,
      tenantId: tenant.id,
      actorId: user.id,
      details: {
        action: 'CREATE',
        resource: 'DEAL',
      },
      changes: {
        before: null,
        after: { title: deal.title, value: deal.value },
      },
    },
  })

  console.log({
    tenant: { id: tenant.id, name: tenant.name },
    user: { id: user.id, email: user.email },
    organization: { id: organization.id, name: organization.name },
    department: { id: department.id, name: department.name },
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
