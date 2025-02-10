# Database Schema Documentation

## Core Models

### Organization
- Primary model for healthcare institutions
- UUID-based primary key for security
- Tenant-specific configuration via JSONB
```prisma
model Organization {
  id            String   @id @default(uuid()) @db.Uuid
  name          String
  type          String
  tenantId      String   @unique
  settings      Json     @default("{}")
  metadata      Json?    @db.JsonB
}
```

### Deal
- Represents healthcare business opportunities
- PHI handling with JSONB fields
- Row-level security implementation
```prisma
model Deal {
  id              String   @id @default(uuid()) @db.Uuid
  clinicalData    Json?    @db.JsonB
  complianceData  Json?    @db.JsonB
  phi             Json?    @db.JsonB
}
```

## HIPAA Compliance

### Audit Logging
- Comprehensive activity tracking
- User action attribution
- Change history in JSONB
```prisma
model AuditLog {
  id            String   @id @default(uuid()) @db.Uuid
  details       Json     @db.JsonB
  changes       Json?    @db.JsonB
}
```

## Design Decisions
1. UUID Usage
   - All primary keys use UUID v4
   - Enhanced security and distribution

2. Multi-tenant Architecture
   - Tenant isolation via tenantId
   - Row-level security implementation

3. JSONB Fields
   - Flexible schema for healthcare data
   - Efficient storage and querying
