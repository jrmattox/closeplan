import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import * as ts from 'typescript'

/**
 * Helper to get all TypeScript files in a directory recursively
 */
function getTypeScriptFiles(dir: string): string[] {
  const files: string[] = []
  
  readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const path = join(dir, dirent.name)
    if (dirent.isDirectory()) {
      files.push(...getTypeScriptFiles(path))
    } else if (path.endsWith('.ts') || path.endsWith('.tsx')) {
      files.push(path)
    }
  })
  
  return files
}

/**
 * Helper to check imports in a TypeScript file
 */
function getFileImports(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8')
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  )
  
  const imports: string[] = []
  
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '')
      imports.push(importPath)
    }
    ts.forEachChild(node, visit)
  }
  
  visit(sourceFile)
  return imports
}

/**
 * Helper to check if file content matches a pattern
 */
function contentMatches(content: string, pattern: RegExp): boolean {
  return pattern.test(content)
}

/**
 * Helper to get file content with basic validation
 */
function readFileContent(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf-8')
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error)
    return ''
  }
}

describe('Architecture Tests', () => {
  const componentFiles = getTypeScriptFiles('./components')
  const utilFiles = getTypeScriptFiles('./lib/utils')
  const typeFiles = getTypeScriptFiles('./lib/types')

  it('validates layer separation', () => {
    // Components should not import directly from database
    componentFiles.forEach(file => {
      const imports = getFileImports(file)
      expect(imports.some(imp => imp.includes('prisma'))).toBe(false)
      expect(imports.some(imp => imp.includes('database'))).toBe(false)
    })

    // Utils should not import from components
    utilFiles.forEach(file => {
      const imports = getFileImports(file)
      expect(imports.some(imp => imp.includes('/components/'))).toBe(false)
    })
  })

  it('validates healthcare domain types usage', () => {
    const domainTypes = [
      'Deal',
      'DealStage',
      'Department',
      'ClinicalValidation',
      'ComplianceChecks'
    ]

    // Check that domain types are imported from types directory
    componentFiles.forEach(file => {
      const content = readFileSync(file, 'utf-8')
      domainTypes.forEach(type => {
        if (content.includes(type)) {
          const imports = getFileImports(file)
          expect(
            imports.some(imp => imp.includes('@/lib/types'))
          ).toBe(true)
        }
      })
    })
  })

  it('checks extension points', () => {
    // Verify factory interfaces are properly exposed
    const factoryFile = readFileSync('./tests/factories/deals.ts', 'utf-8')
    expect(factoryFile).toContain('export interface DealPipelineConfig')
    expect(factoryFile).toContain('export function createDeal')

    // Check validator exposure
    const validatorFile = readFileSync('./tests/utils/deal-validators.ts', 'utf-8')
    expect(validatorFile).toContain('export function validateDeal')
  })

  it('validates test structure', () => {
    const testFiles = getTypeScriptFiles('./tests')

    testFiles.forEach(file => {
      const content = readFileSync(file, 'utf-8')
      
      // Ensure tests use proper utilities
      if (file.includes('.test.')) {
        expect(content).toContain('describe(')
        expect(content).toContain('it(')
      }

      // Check factory usage
      if (content.includes('createDeal(')) {
        expect(content).toContain('import { createDeal }')
      }
    })
  })

  it('validates healthcare compliance structure', () => {
    const dealFiles = [
      ...componentFiles.filter(f => f.includes('/deals/')),
      ...utilFiles.filter(f => f.includes('/deals/'))
    ]

    dealFiles.forEach(file => {
      const content = readFileSync(file, 'utf-8')
      
      // Check for required healthcare patterns
      if (content.includes('ComplianceChecks')) {
        expect(content).toContain('hipaaCompliant')
      }
      if (content.includes('ClinicalValidation')) {
        expect(content).toContain('validatedBy')
      }
    })
  })

  describe('Domain Model Architecture', () => {
    const healthcareModels = getTypeScriptFiles('./lib/models/healthcare')
    const workflowFiles = getTypeScriptFiles('./lib/workflows')

    it('validates healthcare domain model isolation', () => {
      healthcareModels.forEach(file => {
        const imports = getFileImports(file)
        
        // Ensure healthcare models don't depend on UI or infrastructure
        expect(
          imports.some(i => 
            i.includes('/components/') || 
            i.includes('/infrastructure/')
          )
        ).toBe(false)

        // Verify domain model patterns
        const content = readFileContent(file)
        expect(contentMatches(content, /interface\s+\w+Repository/))
          .toBe(true, `${file} should define a repository interface`)
        expect(contentMatches(content, /class\s+\w+Entity/))
          .toBe(true, `${file} should define domain entities`)
      })
    })

    it('ensures deal workflows are extensible', () => {
      workflowFiles.forEach(file => {
        const content = readFileContent(file)
        
        // Check for proper interface usage
        expect(contentMatches(content, /interface\s+\w+Workflow/))
          .toBe(true, `${file} should define workflow interfaces`)
        
        // Verify factory pattern usage
        expect(contentMatches(content, /class\s+\w+WorkflowFactory/))
          .toBe(true, `${file} should use factory pattern`)
        
        // Check for healthcare-specific workflow components
        if (file.includes('clinical')) {
          expect(content).toContain('ClinicalValidation')
          expect(content).toContain('ComplianceChecks')
        }
      })
    })

    it('validates domain event handling', () => {
      const eventFiles = getTypeScriptFiles('./lib/events')
      
      eventFiles.forEach(file => {
        const content = readFileContent(file)
        
        // Check for event definitions
        expect(contentMatches(content, /interface\s+\w+Event/))
          .toBe(true, `${file} should define event interfaces`)
        
        // Verify event handler patterns
        expect(contentMatches(content, /class\s+\w+EventHandler/))
          .toBe(true, `${file} should define event handlers`)
        
        // Check healthcare compliance events
        if (file.includes('compliance')) {
          expect(content).toContain('ComplianceStatus')
          expect(content).toContain('ValidationResult')
        }
      })
    })

    it('checks value object immutability', () => {
      const valueObjectFiles = healthcareModels.filter(f => 
        f.includes('value-objects')
      )
      
      valueObjectFiles.forEach(file => {
        const content = readFileContent(file)
        
        // Verify readonly properties
        expect(contentMatches(content, /readonly\s+\w+:/))
          .toBe(true, `${file} should use readonly properties`)
        
        // Check for proper value object patterns
        expect(contentMatches(content, /private\s+constructor/))
          .toBe(true, `${file} should use private constructors`)
        expect(contentMatches(content, /static\s+create/))
          .toBe(true, `${file} should use factory methods`)
      })
    })
  })
}) 