# Database Documentation

## Overview
The Closeplan database is designed for HIPAA-compliant healthcare deal management with multi-tenant support.

## Key Features
- UUID-based primary keys for security
- Multi-tenant architecture
- HIPAA-compliant audit logging
- Comprehensive access control

## Quick Start
```bash
# Initialize database
npm run db:init

# View database with Prisma Studio
npm run db:studio
```

## Schema Overview
- Organizations: Healthcare providers and institutions
- Deals: Healthcare-specific business opportunities
- Departments: Organizational units with specific workflows
- Users: System users with role-based access
- Audit/Access Logs: HIPAA-compliant activity tracking

## Security Features
- Row-level security
- Comprehensive audit logging
- PHI access controls
- Tenant isolation
