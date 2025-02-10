import { test, expect } from '@playwright/test'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { Department, DealStage } from '@/lib/types'

test.describe('Deal Lifecycle E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deals')
    await page.waitForLoadState('networkidle')
  })

  test('completes full deal workflow with compliance checks', async ({ page }) => {
    // Create new deal
    await page.click('button:has-text("New Deal")')
    await page.fill('[data-testid="deal-name"]', 'Cardiac Monitoring System')
    await page.selectOption('[data-testid="department"]', Department.CARDIOLOGY)
    await page.click('button:has-text("Create Deal")')

    // Discovery Stage
    await expect(page.locator('[data-testid="current-stage"]'))
      .toHaveText(DealStage.DISCOVERY)
    await page.fill('[data-testid="initial-assessment"]', 'Initial evaluation complete')
    await page.click('button:has-text("Begin Validation")')

    // Clinical Validation
    await expect(page.locator('[data-testid="current-stage"]'))
      .toHaveText(DealStage.CLINICAL_VALIDATION)
    
    // Complete compliance checklist
    const complianceChecks = [
      'hipaa-compliance',
      'device-certification',
      'clinical-validation'
    ]
    for (const check of complianceChecks) {
      await page.check(`[data-testid="${check}"]`)
    }

    // Upload required documents
    await page.setInputFiles('[data-testid="document-upload"]', [
      'path/to/clinical-validation.pdf',
      'path/to/device-cert.pdf'
    ])

    await page.click('button:has-text("Submit Validation")')

    // Technical Review
    await expect(page.locator('[data-testid="current-stage"]'))
      .toHaveText(DealStage.TECHNICAL_VALIDATION)
    await page.fill('[data-testid="technical-assessment"]', 'Technical requirements met')
    await page.click('button:has-text("Complete Review")')

    // Contract Review
    await expect(page.locator('[data-testid="current-stage"]'))
      .toHaveText(DealStage.CONTRACT_REVIEW)
    await page.click('button:has-text("Approve Contract")')

    // Verify closure
    await expect(page.locator('[data-testid="current-stage"]'))
      .toHaveText(DealStage.CLOSED_WON)
    await expect(page.locator('[data-testid="compliance-status"]'))
      .toHaveText('Compliant')
  })

  test('handles multi-department deal routing', async ({ page }) => {
    // Create deal requiring multiple departments
    const deal = createDeal({
      name: 'Cross-Department Initiative',
      departments: [Department.CARDIOLOGY, Department.ONCOLOGY]
    })

    await page.goto(`/deals/${deal.id}`)

    // Verify department routing
    await expect(page.locator('[data-testid="required-departments"]'))
      .toContainText(['Cardiology', 'Oncology'])

    // Complete Cardiology requirements
    await page.click('button:has-text("Cardiology Review")')
    await page.fill('[data-testid="cardiology-assessment"]', 'Cardiac evaluation complete')
    await page.click('button:has-text("Submit Cardiology")')

    // Complete Oncology requirements
    await page.click('button:has-text("Oncology Review")')
    await page.fill('[data-testid="oncology-assessment"]', 'Oncology evaluation complete')
    await page.click('button:has-text("Submit Oncology")')

    // Verify all departments completed
    await expect(page.locator('[data-testid="department-status"]'))
      .toContainText(['Cardiology: Complete', 'Oncology: Complete'])
  })

  test('enforces compliance requirements by stage', async ({ page }) => {
    const deal = createDeal({
      stage: DealStage.CLINICAL_VALIDATION,
      department: Department.CARDIOLOGY
    })

    await page.goto(`/deals/${deal.id}`)

    // Try to progress without compliance
    await page.click('button:has-text("Next Stage")')
    await expect(page.locator('.error-message'))
      .toContainText('Compliance requirements not met')

    // Complete compliance items
    await page.click('button:has-text("View Requirements")')
    const requirements = [
      'hipaa-checklist',
      'device-certification',
      'patient-safety'
    ]
    for (const req of requirements) {
      await page.check(`[data-testid="${req}"]`)
      await page.fill(`[data-testid="${req}-notes"]`, `Completed ${req}`)
    }

    // Should now allow progression
    await page.click('button:has-text("Next Stage")')
    await expect(page.locator('[data-testid="current-stage"]'))
      .toHaveText(DealStage.TECHNICAL_VALIDATION)
  })

  test('handles validation failures and retries', async ({ page }) => {
    const deal = createCompliantDeal({
      stage: DealStage.CLINICAL_VALIDATION
    })

    await page.goto(`/deals/${deal.id}`)

    // Trigger validation failure
    await page.click('button:has-text("Validate")')
    await expect(page.locator('.error-message'))
      .toContainText('Validation failed')

    // View and fix issues
    await page.click('button:has-text("View Issues")')
    await page.fill('[data-testid="correction-notes"]', 'Fixed validation issues')
    
    // Retry validation
    await page.click('button:has-text("Retry Validation")')
    await expect(page.locator('[data-testid="validation-status"]'))
      .toHaveText('Validated')
  })
}) 