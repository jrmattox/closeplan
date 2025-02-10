import { prisma } from '@/lib/prisma'
import { faker } from '@faker-js/faker'
import { hash } from 'bcrypt'
import { encrypt } from '@/lib/encryption'

interface SeedConfig {
  tenants: number
  usersPerTenant: number
  recordsPerTenant: number
}

const ROLES = {
  CLINICIAN: ['PHI_ACCESS', 'PHI_MODIFY'],
  ADMIN: ['PHI_ACCESS', 'USER_MANAGE', 'AUDIT_VIEW'],
  ANALYST: ['AGGREGATE_ACCESS'],
  AUDITOR: ['AUDIT_VIEW', 'REPORT_ACCESS']
} as const

async function seedTestData(config: SeedConfig) {
  console.log('Starting test data generation...')

  try {
    // Create tenants
    const tenants = await createTenants(config.tenants)
    
    for (const tenant of tenants) {
      // Set tenant context
      await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`
      
      // Create users
      const users = await createUsers(tenant.id, config.usersPerTenant)
      
      // Create PHI records
      const records = await createPhiRecords(tenant.id, config.recordsPerTenant)
      
      // Generate audit trail
      await generateAuditTrail(tenant.id, users, records)
    }

    console.log('Test data generation complete!')
  } catch (error) {
    console.error('Error seeding data:', error)
    throw error
  } finally {
    // Clear tenant context
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
  }
}

async function createTenants(count: number) {
  console.log(`Creating ${count} test tenants...`)
  
  const tenants = []
  
  for (let i = 0; i < count; i++) {
    const tenant = await prisma.tenant.create({
      data: {
        name: `${faker.company.name()} Healthcare`,
        settings: {
          mfaRequired: true,
          passwordPolicy: {
            minLength: 12,
            requireSpecialChars: true
          },
          auditRetention: 2555 // days (7 years)
        }
      }
    })
    tenants.push(tenant)
  }
  
  return tenants
}

async function createUsers(tenantId: string, count: number) {
  console.log(`Creating ${count} users for tenant ${tenantId}...`)
  
  const users = []
  
  for (let i = 0; i < count; i++) {
    // Select random role
    const role = faker.helpers.arrayElement(Object.keys(ROLES))
    
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email(),
        passwordHash: await hash('Test123!@#', 10),
        role,
        permissions: ROLES[role as keyof typeof ROLES],
        tenantId,
        mfaEnabled: true,
        status: 'ACTIVE'
      }
    })
    users.push(user)
  }
  
  return users
}

async function createPhiRecords(tenantId: string, count: number) {
  console.log(`Creating ${count} PHI records for tenant ${tenantId}...`)
  
  const records = []
  
  for (let i = 0; i < count; i++) {
    // Generate non-identifiable test data
    const phi = {
      // Use obviously fake identifiers
      patientId: `TEST-${faker.string.alphanumeric(8)}`,
      mrn: `MRN-${faker.string.numeric(6)}`,
      
      // Clinical data (non-identifiable)
      diagnosis: faker.helpers.arrayElement([
        'Hypertension',
        'Type 2 Diabetes',
        'Asthma',
        'Arthritis'
      ]),
      treatment: {
        medications: [
          faker.helpers.arrayElement([
            'Lisinopril',
            'Metformin',
            'Albuterol',
            'Ibuprofen'
          ])
        ],
        notes: faker.lorem.sentence()
      }
    }
    
    // Encrypt PHI
    const encryptedPhi = await encrypt(phi)
    
    const record = await prisma.phiRecord.create({
      data: {
        tenantId,
        phi: encryptedPhi,
        status: 'ACTIVE',
        metadata: {
          department: faker.helpers.arrayElement([
            'CARDIOLOGY',
            'ENDOCRINOLOGY',
            'PULMONOLOGY'
          ]),
          lastUpdated: new Date()
        }
      }
    })
    records.push(record)
  }
  
  return records
}

async function generateAuditTrail(
  tenantId: string,
  users: any[],
  records: any[]
) {
  console.log(`Generating audit trail for tenant ${tenantId}...`)
  
  const auditEvents = []
  
  // Generate view events
  for (const record of records) {
    const viewCount = faker.number.int({ min: 1, max: 5 })
    
    for (let i = 0; i < viewCount; i++) {
      const user = faker.helpers.arrayElement(users)
      
      auditEvents.push({
        tenantId,
        userId: user.id,
        action: 'VIEW',
        resourceType: 'PHI',
        resourceId: record.id,
        timestamp: faker.date.recent({ days: 30 }),
        context: {
          purpose: faker.helpers.arrayElement([
            'TREATMENT',
            'PAYMENT',
            'OPERATIONS'
          ]),
          userAgent: faker.internet.userAgent(),
          ipAddress: faker.internet.ip()
        }
      })
    }
  }
  
  // Generate modification events
  const modificationCount = faker.number.int({ min: 5, max: 15 })
  
  for (let i = 0; i < modificationCount; i++) {
    const record = faker.helpers.arrayElement(records)
    const user = faker.helpers.arrayElement(
      users.filter(u => u.permissions.includes('PHI_MODIFY'))
    )
    
    auditEvents.push({
      tenantId,
      userId: user.id,
      action: 'MODIFY',
      resourceType: 'PHI',
      resourceId: record.id,
      timestamp: faker.date.recent({ days: 30 }),
      context: {
        purpose: 'TREATMENT',
        changes: {
          diagnosis: {
            from: faker.helpers.arrayElement([
              'Hypertension',
              'Type 2 Diabetes'
            ]),
            to: faker.helpers.arrayElement([
              'Hypertension',
              'Type 2 Diabetes'
            ])
          }
        },
        userAgent: faker.internet.userAgent(),
        ipAddress: faker.internet.ip()
      }
    })
  }
  
  // Sort by timestamp and create audit logs
  const sortedEvents = auditEvents.sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )
  
  for (const event of sortedEvents) {
    await prisma.auditLog.create({ data: event })
  }
}

// Run seeding
const config: SeedConfig = {
  tenants: 3,
  usersPerTenant: 10,
  recordsPerTenant: 50
}

seedTestData(config)
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  }) 