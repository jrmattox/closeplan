# ClosePlan Database Schema

## Core Entities

### Users
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  firstName String
  lastName  String
  password  String   // Hashed
  tenantId  String
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  deals     Deal[]
  accessLog AccessLog[]

  @@index([email])
  @@index([tenantId])
}

enum UserRole {
  ADMIN
  USER
}
```

### Tenants
```prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String
  domain    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]
  deals     Deal[]

  @@index([domain])
}
```

### Deals
```prisma
model Deal {
  id          String   @id @default(cuid())
  title       String
  status      DealStatus
  value       Decimal
  phi         Json?    // Encrypted PHI data
  tenantId    String
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  createdBy User       @relation(fields: [createdById], references: [id])
  accessLog AccessLog[]

  @@index([tenantId])
  @@index([createdById])
}

enum DealStatus {
  DRAFT
  ACTIVE
  CLOSED_WON
  CLOSED_LOST
}
```

### Audit Logging
```prisma
model AccessLog {
  id           String     @id @default(cuid())
  userId       String
  dealId       String
  action       AccessAction
  accessType   AccessType
  resourceType String
  success      Boolean
  timestamp    DateTime   @default(now())

  user        User       @relation(fields: [userId], references: [id])
  deal        Deal       @relation(fields: [dealId], references: [id])

  @@index([userId])
  @@index([dealId])
  @@index([timestamp])
}

enum AccessAction {
  PHI_ACCESS
  DEAL_CREATE
  DEAL_UPDATE
  DEAL_DELETE
}

enum AccessType {
  READ
  WRITE
}
```

## Data Access Patterns

### Row-Level Security
- Tenant isolation using Postgres RLS policies
- Automatic tenant context injection via middleware
- PHI access logging and encryption

### Common Queries
1. User Authentication
```sql
-- Set tenant context for session
SELECT set_tenant_context($tenant_id);

-- Get user with tenant check
SELECT * FROM users
WHERE email = $email
  AND tenant_id = current_tenant_id();
```

2. Deal Access
```sql
-- Get deals with PHI access logging
SELECT d.*,
  decrypt_phi(d.phi) as decrypted_phi
FROM deals d
WHERE d.tenant_id = current_tenant_id()
  AND d.id = $deal_id;
```

## Data Sources & Integrations (TODO)
- [ ] Definitive Healthcare API integration
- [ ] Document management system
- [ ] Email service provider
- [ ] Analytics platform

## Security Measures
1. PHI Encryption
   - Column-level encryption for PHI data
   - Key rotation support
   - Access logging

2. Tenant Isolation
   - Schema-level isolation
   - Connection pooling per tenant
   - Cross-tenant access prevention

3. Audit Trail
   - Comprehensive logging
   - HIPAA compliance tracking
   - Access pattern analysis

## Core Models

### User Management
The user system is built with multi-tenant support and security logging:

- **User Model**: Stores user information with secure password handling
- **Tenant Model**: Manages organizational separation
- **Security Events**: Tracks authentication and security-related events

## Security Features

### Password Security
- Passwords are hashed using bcryptjs
- Salt rounds: 10 (industry standard)
- No plain-text password storage

### Audit Logging
- User creation events
- Login attempts
- Security incidents
- Tenant-level activities
