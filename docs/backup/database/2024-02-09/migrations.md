# Database Migrations

## Setup and Configuration

### Environment Variables
```env
DATABASE_URL="postgresql://user@localhost:5432/closeplan?schema=public"
SHADOW_DATABASE_URL="postgresql://user@localhost:5432/closeplanshadow?schema=public"
```

### Required Extensions
PostgreSQL extensions are installed via initial migration:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;
```

## Migration Commands

### Development Workflow
```bash
# Create a new migration
npm run db:migrate -- --name describe_your_changes

# Reset database (development only)
npm run db:reset

# View database
npm run db:studio
```

### Production Workflow
```bash
# Deploy migrations safely
npm run db:deploy

# Verify database state
npm run db:verify-extensions
```

## Migration History
1. Initial Setup (20240209000000_init_extensions)
   - PostgreSQL extensions
   - Base schema creation

2. Core Schema (20240209000001_core_models)
   - Organization, Deal, Department models
   - UUID primary keys
   - JSONB fields for flexibility

3. HIPAA Compliance (20240209000002_audit_logging)
   - Audit logging
   - Access tracking
   - PHI controls

## Best Practices
1. Always include down migrations
2. Test migrations in shadow database
3. Backup before production migrations
4. Use explicit types (e.g., @db.Uuid)
