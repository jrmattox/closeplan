# ClosePlan Technical Stack

## Frontend
- **Framework**: Next.js 14.0.0
- **UI Library**: React 18
- **Styling**:
  - Tailwind CSS
  - shadcn/ui components
- **Type System**: TypeScript

## Backend
- **Framework**: Next.js App Router
- **API Architecture**: REST API
- **Authentication**: Next-Auth
- **Route Structure**:
  ```
  app/
  ├── api/
  │   └── auth/
  │       ├── login/
  │       └── signup/
  ├── auth/
  │   ├── login/
  │   └── signup/
  └── dashboard/
  ```

## Database
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Key Features**:
  - Multi-tenant architecture
  - Row-level security
  - PHI encryption
  - Audit logging

## Security
- **Authentication**: Next-Auth with Prisma adapter
- **Session Management**: HTTP-only cookies
- **Data Protection**:
  - HIPAA compliance measures
  - PHI encryption at rest
  - Audit logging for all PHI access

## Development Tools
- **Testing**: Vitest
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Database Tools**: Prisma Studio

## Infrastructure (TODO)
- [ ] Choose hosting provider
- [ ] Set up CI/CD pipeline
- [ ] Configure monitoring
- [ ] Implement backup strategy
