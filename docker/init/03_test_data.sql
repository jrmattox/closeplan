-- Insert test encryption key
INSERT INTO encryption_keys (version, key_value, active)
VALUES (
    1,
    pgp_sym_encrypt('test-key-material', 'dev-only-password')::bytea,
    true
);

-- Create test tenant
INSERT INTO tenants (id, name)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Test Tenant'
); 