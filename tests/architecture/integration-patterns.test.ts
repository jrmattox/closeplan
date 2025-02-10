import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import * as ts from 'typescript'
import { getTypeScriptFiles, getFileImports, contentMatches, readFileContent } from './test-utils'

describe('Integration Architecture', () => {
  const integrationFiles = getTypeScriptFiles('./lib/integrations')
  const adapterFiles = integrationFiles.filter(f => f.includes('/adapters/'))
  const healthcareFiles = integrationFiles.filter(f => f.includes('/healthcare/'))

  it('validates adapter pattern implementation', () => {
    adapterFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Verify proper adapter pattern usage
      expect(contentMatches(content, /interface\s+\w+Port/))
        .toBe(true, `${file} should define ports`)
      
      expect(contentMatches(content, /class\s+\w+Adapter/))
        .toBe(true, `${file} should implement adapters`)
      
      // Check for proper interface segregation
      expect(contentMatches(content, /implements\s+\w+Port/))
        .toBe(true, `${file} should implement port interfaces`)
      
      // Verify error handling
      expect(contentMatches(content, /try\s*{[^}]*}\s*catch/))
        .toBe(true, `${file} should handle errors`)
    })
  })

  it('ensures healthcare integration compliance', () => {
    healthcareFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Check for proper data handling
      expect(contentMatches(content, /implements\s+HealthcareDataHandler/))
        .toBe(true, `${file} should implement healthcare data handling`)
      
      // Verify HIPAA compliance patterns
      expect(contentMatches(content, /implements\s+HIPAACompliant/))
        .toBe(true, `${file} should implement HIPAA compliance`)
      
      // Check for data encryption
      expect(contentMatches(content, /encrypt|decrypt/))
        .toBe(true, `${file} should handle data encryption`)
      
      // Verify audit logging
      expect(contentMatches(content, /audit|log|track/))
        .toBe(true, `${file} should include audit trails`)
    })
  })

  it('validates integration event handling', () => {
    const eventFiles = integrationFiles.filter(f => f.includes('/events/'))
    
    eventFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Check for event definitions
      expect(contentMatches(content, /interface\s+\w+IntegrationEvent/))
        .toBe(true, `${file} should define integration events`)
      
      // Verify event handling
      expect(contentMatches(content, /class\s+\w+EventHandler/))
        .toBe(true, `${file} should implement event handlers`)
      
      // Check for proper error handling
      expect(contentMatches(content, /onError|handleError/))
        .toBe(true, `${file} should handle integration errors`)
    })
  })

  it('checks external system integration patterns', () => {
    const externalFiles = integrationFiles.filter(f => f.includes('/external/'))
    
    externalFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Verify circuit breaker pattern
      expect(contentMatches(content, /CircuitBreaker|Resilience/))
        .toBe(true, `${file} should implement circuit breaker`)
      
      // Check for retry logic
      expect(contentMatches(content, /retry|backoff/))
        .toBe(true, `${file} should implement retry logic`)
      
      // Verify timeout handling
      expect(contentMatches(content, /timeout|TimeoutError/))
        .toBe(true, `${file} should handle timeouts`)
    })
  })

  it('validates data transformation patterns', () => {
    const transformerFiles = integrationFiles.filter(f => f.includes('/transformers/'))
    
    transformerFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Check for transformer pattern
      expect(contentMatches(content, /interface\s+\w+Transformer/))
        .toBe(true, `${file} should define transformer interface`)
      
      // Verify data validation
      expect(contentMatches(content, /validate|sanitize/))
        .toBe(true, `${file} should validate data`)
      
      // Check for healthcare data handling
      if (file.includes('healthcare')) {
        expect(contentMatches(content, /PHI|PII|HIPAA/))
          .toBe(true, `${file} should handle sensitive healthcare data`)
      }
    })
  })
}) 