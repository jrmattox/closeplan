# PostgreSQL Extensions

## Required Extensions

### 1. uuid-ossp
- Purpose: UUID generation for primary keys
- Installation: Included in initial migration
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
```
- Usage: `@default(uuid())` in Prisma schema

### 2. pgcrypto
- Purpose: Cryptographic functions for PHI
- Installation: Included in initial migration
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;
```
- Usage: Encryption of sensitive data

## Verification

### Extension Check Script
```typescript
// scripts/verify-extensions.ts
import { prisma } from '@/lib/prisma'

async function verifyExtensions() {
  const extensions = await prisma.$queryRaw`
    SELECT extname, extversion
    FROM pg_extension;
  `
  console.log('Installed extensions:', extensions)
}
```

### Verification Command
```bash
npm run db:verify-extensions
```

## Development Setup
1. Install PostgreSQL 14 or higher
2. Enable superuser for extension management
3. Run initial migration to install extensions
4. Verify installation with check script
