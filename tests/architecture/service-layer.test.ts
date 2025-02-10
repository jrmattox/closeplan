import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import * as ts from 'typescript'
import { getTypeScriptFiles, getFileImports, contentMatches, readFileContent } from './test-utils'

describe('Service Layer Architecture', () => {
  const serviceFiles = getTypeScriptFiles('./lib/services')
  const healthcareServices = serviceFiles.filter(f => f.includes('/healthcare/'))
  const complianceServices = serviceFiles.filter(f => f.includes('/compliance/'))

  it('validates service boundaries', () => {
    serviceFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Ensure services use dependency injection
      expect(contentMatches(content, /constructor\s*\([^)]*\)/))
        .toBe(true, `${file} should use dependency injection`)
      
      // Verify services implement interfaces
      expect(contentMatches(content, /implements\s+\w+Service/))
        .toBe(true, `${file} should implement a service interface`)
      
      // Check for proper service patterns
      expect(contentMatches(content, /private\s+readonly/))
        .toBe(true, `${file} should use private readonly dependencies`)
      
      // Verify error handling
      expect(content).toContain('try {')
      expect(content).toContain('catch (error)')
    })
  })

  it('checks healthcare compliance service isolation', () => {
    complianceServices.forEach(file => {
      const imports = getFileImports(file)
      const content = readFileContent(file)

      // Ensure compliance logic is isolated
      expect(
        imports.every(i => !i.includes('/ui/') && !i.includes('/infrastructure/'))
      ).toBe(true, `${file} should not depend on UI or infrastructure`)

      // Verify compliance-specific patterns
      expect(content).toContain('ComplianceChecks')
      expect(content).toContain('ValidationResult')
      expect(content).toContain('async validate')
    })
  })

  it('validates healthcare service patterns', () => {
    healthcareServices.forEach(file => {
      const content = readFileContent(file)

      // Check for domain event usage
      expect(contentMatches(content, /emit\w+Event/))
        .toBe(true, `${file} should emit domain events`)

      // Verify transaction handling
      expect(contentMatches(content, /beginTransaction|useTransaction/))
        .toBe(true, `${file} should handle transactions`)

      // Check for proper validation
      expect(contentMatches(content, /validate\w+/))
        .toBe(true, `${file} should include validation`)
    })
  })

  it('ensures proper error handling', () => {
    serviceFiles.forEach(file => {
      const content = readFileContent(file)

      // Check for custom error classes
      expect(contentMatches(content, /class\s+\w+Error\s+extends\s+Error/))
        .toBe(true, `${file} should define custom errors`)

      // Verify error wrapping
      expect(contentMatches(content, /throw\s+new\s+\w+Error/))
        .toBe(true, `${file} should wrap errors`)

      // Check for error logging
      expect(content).toContain('logger.')
    })
  })

  it('validates service composition', () => {
    const compositeServices = serviceFiles.filter(f => 
      contentMatches(readFileContent(f), /class\s+\w+CompositeService/)
    )

    compositeServices.forEach(file => {
      const content = readFileContent(file)

      // Check for proper composition patterns
      expect(contentMatches(content, /private\s+readonly\s+services:/))
        .toBe(true, `${file} should compose services`)

      // Verify delegation
      expect(contentMatches(content, /this\.services\.\w+\./))
        .toBe(true, `${file} should delegate to composed services`)

      // Check for proper initialization
      expect(contentMatches(content, /validateServices|initializeServices/))
        .toBe(true, `${file} should validate composed services`)
    })
  })
}) 