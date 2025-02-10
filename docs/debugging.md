# Debugging Guide

## Security Middleware Debugging

1. Set breakpoints in security middleware files
2. Launch "Debug Security Middleware" configuration
3. Send requests to trigger middleware
4. Use Debug Console to inspect context

Debug output will be tagged with `security:*`

## Encryption System Testing

1. Launch "Test Encryption System" configuration
2. Set breakpoints in encryption tests
3. Step through encryption/decryption process
4. Check key management flow

Enable verbose logging with `DEBUG=encryption:*`

## Audit Log Tracing

1. Launch "Trace Audit Logs" configuration
2. Filter logs using trace options:
   - resourceId
   - action
   - timeRange
3. View detailed audit trail

Set `LOG_LEVEL=trace` for maximum detail

## Performance Profiling

1. Launch "Profile Performance" configuration
2. Let profiling complete
3. View generated profile report
4. Analyze bottlenecks

Profile data saved to `profile-report.txt`
