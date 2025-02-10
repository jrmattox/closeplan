import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import * as ts from 'typescript'
import { getTypeScriptFiles, getFileImports, contentMatches, readFileContent } from './test-utils'

describe('Infrastructure Architecture', () => {
  const infraFiles = getTypeScriptFiles('./lib/infrastructure')
  const repoFiles = infraFiles.filter(f => f.includes('/repositories/'))
  const diFiles = infraFiles.filter(f => f.includes('/di/') || f.includes('/config/'))

  it('validates repository pattern implementation', () => {
    repoFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Check for proper repository pattern
      expect(contentMatches(content, /interface\s+\w+Repository/))
        .toBe(true, `${file} should define repository interface`)
      
      // Verify repository implementations
      expect(contentMatches(content, /class\s+\w+RepositoryImpl/))
        .toBe(true, `${file} should implement repository`)
      
      // Check for proper error handling
      expect(contentMatches(content, /try\s*{[^}]*}\s*catch/))
        .toBe(true, `${file} should handle errors`)
      
      // Verify transaction support
      expect(contentMatches(content, /transaction|useTransaction/))
        .toBe(true, `${file} should support transactions`)
    })
  })

  it('ensures proper dependency injection setup', () => {
    diFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Verify DI container usage
      expect(contentMatches(content, /container\.register/))
        .toBe(true, `${file} should use DI container`)
      
      // Check for proper interface bindings
      expect(contentMatches(content, /bind<\w+>/))
        .toBe(true, `${file} should bind interfaces`)
      
      // Verify lifecycle management
      expect(contentMatches(content, /singleton|transient|scoped/))
        .toBe(true, `${file} should specify lifecycles`)
    })
  })

  it('validates healthcare data access patterns', () => {
    const healthcareRepos = repoFiles.filter(f => f.includes('/healthcare/'))
    
    healthcareRepos.forEach(file => {
      const content = readFileContent(file)
      
      // Check for HIPAA compliance patterns
      expect(contentMatches(content, /audit|log|track/))
        .toBe(true, `${file} should include audit trails`)
      
      // Verify data encryption
      expect(contentMatches(content, /encrypt|decrypt/))
        .toBe(true, `${file} should handle data encryption`)
      
      // Check for proper data sanitization
      expect(contentMatches(content, /sanitize|validate/))
        .toBe(true, `${file} should sanitize data`)
    })
  })

  it('checks infrastructure isolation', () => {
    infraFiles.forEach(file => {
      const imports = getFileImports(file)
      
      // Ensure infrastructure doesn't depend on UI
      expect(
        imports.every(i => !i.includes('/components/') && !i.includes('/pages/'))
      ).toBe(true, `${file} should not depend on UI`)
      
      // Verify proper layering
      expect(
        imports.every(i => !i.includes('/domain/'))
      ).toBe(true, `${file} should not depend on domain logic`)
    })
  })

  it('validates configuration management', () => {
    const configFiles = infraFiles.filter(f => f.includes('/config/'))
    
    configFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Check for environment handling
      expect(contentMatches(content, /process\.env/))
        .toBe(true, `${file} should handle environment variables`)
      
      // Verify configuration validation
      expect(contentMatches(content, /validate|schema/))
        .toBe(true, `${file} should validate configuration`)
      
      // Check for proper defaults
      expect(contentMatches(content, /default|fallback/))
        .toBe(true, `${file} should provide defaults`)
    })
  })

  it('ensures proper logging setup', () => {
    const loggerFiles = infraFiles.filter(f => f.includes('/logging/'))
    
    loggerFiles.forEach(file => {
      const content = readFileContent(file)
      
      // Check for proper logger configuration
      expect(contentMatches(content, /class\s+\w+Logger/))
        .toBe(true, `${file} should define logger class`)
      
      // Verify log levels
      expect(contentMatches(content, /error|warn|info|debug/))
        .toBe(true, `${file} should support log levels`)
      
      // Check for healthcare compliance
      if (file.includes('healthcare')) {
        expect(contentMatches(content, /HIPAA|PHI|audit/))
          .toBe(true, `${file} should handle HIPAA compliance`)
      }
    })
  })
}) 