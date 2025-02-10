import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import * as ts from 'typescript'
import { getTypeScriptFiles, getFileImports, contentMatches, readFileContent } from './test-utils'

describe('Scalability Architecture', () => {
  const infraFiles = getTypeScriptFiles('./lib/infrastructure')
  const tenantFiles = infraFiles.filter(f => f.includes('/tenancy/'))
  const cacheFiles = infraFiles.filter(f => f.includes('/cache/'))
  const asyncFiles = infraFiles.filter(f => f.includes('/async/'))

  it('validates multi-tenant isolation', () => {
    tenantFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Verify tenant context usage
      expect(contentMatches(content, /TenantContext/))
        .toBe(true, `${file} should use tenant context`)
      
      // Check data isolation
      expect(contentMatches(content, /implements\s+TenantAware/))
        .toBe(true, `${file} should implement tenant awareness`)
      
      // Verify tenant middleware
      expect(contentMatches(content, /class\s+\w+TenantMiddleware/))
        .toBe(true, `${file} should include tenant middleware`)
      
      // Check healthcare tenant specifics
      if (file.includes('healthcare')) {
        expect(contentMatches(content, /HealthcareTenantConfig/))
          .toBe(true, `${file} should handle healthcare tenant config`)
      }
    })
  })

  it('ensures caching architecture', () => {
    cacheFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Verify cache invalidation patterns
      expect(contentMatches(content, /implements\s+CacheStrategy/))
        .toBe(true, `${file} should implement cache strategy`)
      
      // Check healthcare-specific caching rules
      expect(contentMatches(content, /HealthcareDataCache/))
        .toBe(true, `${file} should handle healthcare data caching`)
      
      // Verify cache expiration
      expect(contentMatches(content, /expiration|ttl|timeout/))
        .toBe(true, `${file} should handle cache expiration`)
      
      // Check distributed caching
      expect(contentMatches(content, /distributed|redis|memcached/))
        .toBe(true, `${file} should support distributed caching`)
    })
  })

  it('validates asynchronous processing patterns', () => {
    asyncFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Check queue handling
      expect(contentMatches(content, /implements\s+AsyncProcessor/))
        .toBe(true, `${file} should implement async processing`)
      
      // Verify batch processing patterns
      expect(contentMatches(content, /implements\s+BatchProcessor/))
        .toBe(true, `${file} should implement batch processing`)
      
      // Check error handling and retries
      expect(contentMatches(content, /retryStrategy|maxRetries/))
        .toBe(true, `${file} should handle retries`)
      
      // Verify dead letter handling
      expect(contentMatches(content, /deadLetter|failureQueue/))
        .toBe(true, `${file} should handle failed messages`)
    })
  })

  it('checks data partitioning strategies', () => {
    const partitionFiles = infraFiles.filter(f => f.includes('/partitioning/'))
    
    partitionFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Verify partitioning strategy
      expect(contentMatches(content, /implements\s+PartitionStrategy/))
        .toBe(true, `${file} should implement partitioning`)
      
      // Check sharding patterns
      expect(contentMatches(content, /shard|partition|segment/))
        .toBe(true, `${file} should handle data sharding`)
      
      // Verify consistent hashing
      expect(contentMatches(content, /consistentHash|hashRing/))
        .toBe(true, `${file} should use consistent hashing`)
    })
  })

  it('validates load balancing patterns', () => {
    const lbFiles = infraFiles.filter(f => f.includes('/loadbalancing/'))
    
    lbFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Check load balancing strategy
      expect(contentMatches(content, /implements\s+LoadBalancer/))
        .toBe(true, `${file} should implement load balancing`)
      
      // Verify health checks
      expect(contentMatches(content, /healthCheck|ping/))
        .toBe(true, `${file} should include health checks`)
      
      // Check failover handling
      expect(contentMatches(content, /failover|backup|secondary/))
        .toBe(true, `${file} should handle failover`)
    })
  })

  it('ensures proper rate limiting', () => {
    const rateLimitFiles = infraFiles.filter(f => f.includes('/ratelimit/'))
    
    rateLimitFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Verify rate limiting strategy
      expect(contentMatches(content, /implements\s+RateLimiter/))
        .toBe(true, `${file} should implement rate limiting`)
      
      // Check tenant-specific limits
      expect(contentMatches(content, /tenantLimit|customerQuota/))
        .toBe(true, `${file} should handle tenant limits`)
      
      // Verify throttling patterns
      expect(contentMatches(content, /throttle|backoff|delay/))
        .toBe(true, `${file} should implement throttling`)
    })
  })
}) 