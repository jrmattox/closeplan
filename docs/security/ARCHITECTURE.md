# Security Architecture Documentation

## Overview
This document describes the security architecture of our HIPAA-compliant, multi-tenant healthcare system. It outlines the key components, their interactions, and security boundaries.

## Core Components

### 1. Tenant Isolation Layer
```mermaid
graph TD
    A[Request] --> B[Tenant Context Middleware]
    B --> C{Valid Context?}
    C -->|Yes| D[RLS Policy]
    C -->|No| E[Error Response]
    D --> F[Database Access]
    F --> G[Response]
```

- **Row-Level Security (RLS)**: Enforces tenant isolation at database level
- **Context Management**: Maintains tenant context throughout request lifecycle
- **Validation**: Ensures all requests have valid tenant context

### 2. PHI Protection System

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Encryption
    participant Database
    
    Client->>API: Request PHI Access
    API->>Encryption: Get Current Key
    Encryption->>Database: Fetch Active Key
    Database-->>Encryption: Return Key
    Encryption-->>API: Encrypted Data
    API->>Client: Protected Response
```

Components:
- Key Management
- Encryption/Decryption Service
- Access Control
- Audit Logging

### 3. Audit System

```mermaid
graph LR
    A[User Action] --> B[Audit Middleware]
    B --> C[JSON Diff]
    B --> D[Context Capture]
    C --> E[Audit Log]
    D --> E
    E --> F[Compliance Reports]
```

Features:
- Real-time logging
- Change tracking
- Context preservation
- Compliance reporting

## Security Boundaries

```mermaid
graph TD
    subgraph Public Zone
        A[Client Request]
        B[API Gateway]
    end
    
    subgraph Security Zone
        C[Authentication]
        D[Authorization]
        E[Tenant Context]
    end
    
    subgraph Protected Zone
        F[PHI Processing]
        G[Encryption]
        H[Audit Logging]
    end
    
    subgraph Database Zone
        I[RLS]
        J[Encrypted Storage]
        K[Audit Trail]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    F --> H
    G --> J
    H --> K
    E --> I
```

## Key Operations

### PHI Access Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth
    participant PHI
    participant Audit
    participant DB
    
    Client->>API: Request PHI
    API->>Auth: Validate Access
    Auth->>Auth: Check Permissions
    Auth-->>API: Access Token
    API->>PHI: Request Decryption
    PHI->>DB: Get Encrypted Data
    DB-->>PHI: Return Data
    PHI->>PHI: Decrypt
    PHI-->>API: Protected Data
    API->>Audit: Log Access
    API->>Client: Send Response
```

### Key Rotation Process

```mermaid
sequenceDiagram
    participant Admin
    participant KeyMgmt
    participant PHI
    participant Audit
    participant DB
    
    Admin->>KeyMgmt: Initiate Rotation
    KeyMgmt->>DB: Create New Key
    KeyMgmt->>PHI: Start Re-encryption
    PHI->>DB: Get All PHI Records
    DB-->>PHI: Return Records
    loop Each Record
        PHI->>PHI: Re-encrypt
        PHI->>DB: Update Record
        PHI->>Audit: Log Change
    end
    KeyMgmt->>DB: Deactivate Old Key
    KeyMgmt->>Admin: Confirm Completion
```

## Security Controls

### 1. Access Control
- Role-Based Access Control (RBAC)
- Purpose-based authorization
- MFA enforcement
- Session management

### 2. Data Protection
- AES-256 encryption
- Key rotation
- Secure key storage
- PHI masking

### 3. Audit Controls
- Comprehensive logging
- Change tracking
- Access monitoring
- Compliance reporting

### 4. Tenant Security
- RLS enforcement
- Context isolation
- Cross-tenant protection
- Resource separation

## Monitoring and Incident Response

```mermaid
graph TD
    A[Security Event] --> B{Incident Handler}
    B --> C[Pattern Detection]
    B --> D[Audit Analysis]
    B --> E[Performance Monitoring]
    
    C --> F{Response Required?}
    F -->|Yes| G[Automated Response]
    F -->|No| H[Log Event]
    
    G --> I[Alert Security Team]
    G --> J[Execute Response]
    G --> K[Update Status]
```

### Incident Types
1. Access Violations
2. Encryption Failures
3. Audit Gaps
4. Tenant Isolation Breaches

### Response Procedures
1. Immediate containment
2. Automated responses
3. Team notification
4. Incident tracking

## Compliance Reporting

```mermaid
graph LR
    A[Audit Logs] --> B[Metrics Collection]
    C[Security Events] --> B
    D[Performance Data] --> B
    B --> E[Report Generation]
    E --> F[Summary Reports]
    E --> G[Detailed Exports]
    E --> H[Compliance Status]
```

### Report Types
1. Access Reports
2. Encryption Status
3. Audit Completeness
4. Security Incidents

## Development Guidelines

### Security Best Practices
1. Always use tenant context middleware
2. Implement proper error handling
3. Log security events
4. Verify audit completeness

### Code Examples

```typescript
// Example: Handling PHI access
async function accessPhi(dealId: string, userId: string, purpose: string) {
  await verifyAccess(userId, purpose)
  const data = await getPhiWithAudit(dealId, userId)
  return maskSensitiveData(data)
}
```

## Testing Requirements

1. Security Tests
   - Tenant isolation
   - PHI protection
   - Audit completeness
   - Error handling

2. Performance Tests
   - RLS overhead
   - Encryption impact
   - Audit logging

3. Compliance Tests
   - HIPAA requirements
   - Audit trails
   - Access controls

## Additional Resources

1. [Security Monitoring Guide](./monitoring.md)
2. [Incident Response Procedures](./incidents.md)
3. [Compliance Testing Guide](./compliance.md)
4. [Development Guidelines](./guidelines.md) 