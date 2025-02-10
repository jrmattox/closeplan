# PostgreSQL Security Implementation

This document details the PostgreSQL security mechanisms used in our HIPAA-compliant system.

## Row Level Security (RLS)

### Policy Configuration

```sql
-- Enable RLS on tables
ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Department" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation_policy ON "Deal"
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Create department access policy
CREATE POLICY department_access_policy ON "Department"
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Tenant Context Functions

```sql
-- Set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id uuid)
RETURNS void AS $$
BEGIN
    -- Validate tenant
    IF NOT EXISTS (SELECT 1 FROM "Tenant" WHERE id = tenant_id) THEN
        RAISE EXCEPTION 'Invalid tenant ID';
    END IF;
    
    -- Set context
    PERFORM set_config('app.current_tenant_id', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current tenant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS uuid AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

## PHI Encryption System

### Key Management

```sql
-- Key management table
CREATE TABLE "EncryptionKeys" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_version INT NOT NULL,
    key_value BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    UNIQUE (key_version)
);

-- Key rotation function
CREATE OR REPLACE FUNCTION rotate_encryption_key()
RETURNS UUID AS $$
DECLARE
    new_key_id UUID;
    new_key_version INT;
BEGIN
    -- Get next version
    SELECT COALESCE(MAX(key_version) + 1, 1)
    INTO new_key_version
    FROM "EncryptionKeys";

    -- Create new key
    INSERT INTO "EncryptionKeys" (key_version, key_value)
    VALUES (
        new_key_version,
        gen_random_bytes(32)
    )
    RETURNING id INTO new_key_id;

    -- Deactivate old keys
    UPDATE "EncryptionKeys"
    SET active = false
    WHERE id != new_key_id;

    RETURN new_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Encryption Functions

```sql
-- Encrypt PHI data
CREATE OR REPLACE FUNCTION encrypt_phi(data JSONB)
RETURNS JSONB AS $$
DECLARE
    encrypted_data JSONB;
    search_vector TSVECTOR;
BEGIN
    -- Create search vector
    search_vector := to_tsvector('english',
        COALESCE(data->>'patientId', '') || ' ' ||
        COALESCE(data->>'mrn', '') || ' ' ||
        COALESCE(data->>'condition', '')
    );

    -- Encrypt data
    encrypted_data := jsonb_build_object(
        'data', encode(
            encrypt_iv(
                data::text::bytea,
                get_current_key(),
                gen_random_bytes(16),
                'aes-cbc/pad:pkcs'
            ),
            'base64'
        ),
        'iv', encode(gen_random_bytes(16), 'base64'),
        'key_version', (SELECT key_version FROM "EncryptionKeys" WHERE active = true),
        'search_vector', search_vector::text
    );

    RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Audit Logging Structure

### Audit Tables

```sql
-- Audit log table
CREATE TABLE "AuditLog" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    changes JSONB,
    context JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES "Tenant" (id)
);

-- Create audit logging function
CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB;
    context_json JSONB;
BEGIN
    -- Capture changes
    IF (TG_OP = 'UPDATE') THEN
        changes_json := jsonb_diff_val(row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    ELSIF (TG_OP = 'INSERT') THEN
        changes_json := row_to_json(NEW)::jsonb;
    ELSIF (TG_OP = 'DELETE') THEN
        changes_json := row_to_json(OLD)::jsonb;
    END IF;

    -- Build context
    context_json := jsonb_build_object(
        'user_id', current_setting('app.current_user_id', true),
        'tenant_id', current_setting('app.current_tenant_id', true),
        'timestamp', current_timestamp,
        'ip_address', current_setting('app.current_ip_address', true)
    );

    -- Create audit log
    INSERT INTO "AuditLog" (
        tenant_id,
        action,
        table_name,
        record_id,
        changes,
        context
    ) VALUES (
        current_setting('app.current_tenant_id')::uuid,
        TG_OP,
        TG_TABLE_NAME,
        CASE
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        changes_json,
        context_json
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Audit Triggers

```sql
-- Create audit triggers for sensitive tables
CREATE TRIGGER audit_deal_changes
    AFTER INSERT OR UPDATE OR DELETE ON "Deal"
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

CREATE TRIGGER audit_department_changes
    AFTER INSERT OR UPDATE OR DELETE ON "Department"
    FOR EACH ROW EXECUTE FUNCTION audit_log_changes();
```

## Performance Considerations

### Indexing Strategy

```sql
-- Audit log indices
CREATE INDEX idx_audit_tenant_time ON "AuditLog" (tenant_id, created_at);
CREATE INDEX idx_audit_record ON "AuditLog" (record_id);
CREATE INDEX idx_audit_action_time ON "AuditLog" (action, created_at);

-- PHI search index
CREATE INDEX idx_phi_search ON "Deal" USING gin((phi->'search_vector')::tsvector);
```

### Monitoring Queries

```sql
-- Monitor RLS performance
CREATE OR REPLACE FUNCTION monitor_rls_overhead()
RETURNS TABLE (
    table_name text,
    avg_overhead_ms float,
    total_queries bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        relname::text,
        avg(total_time)::float,
        count(*)::bigint
    FROM pg_stat_statements
    JOIN pg_class ON pg_class.oid = pg_stat_statements.relations[1]
    WHERE query ~* 'security_barrier'
    GROUP BY relname;
END;
$$ LANGUAGE plpgsql;
```

## Security Best Practices

1. **Connection Security**
   - Use SSL/TLS connections
   - Implement connection pooling
   - Set appropriate timeouts

2. **User Management**
   - Use least-privilege accounts
   - Rotate service account credentials
   - Audit database roles regularly

3. **Monitoring**
   - Track failed access attempts
   - Monitor encryption performance
   - Audit policy effectiveness

## Related Documentation
- [Security Architecture](./ARCHITECTURE.md)
- [Compliance Requirements](./compliance.md)
- [Incident Response](./incidents.md) 