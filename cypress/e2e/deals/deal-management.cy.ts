import { DealStage } from '@/types/deals'

describe('Deal Management', () => {
  beforeEach(() => {
    cy.login() // Using existing auth command
    
    // Set up API intercepts
    cy.intercept('GET', '/api/deals*', { fixture: 'deals.json' }).as('getDeals')
    cy.intercept('POST', '/api/deals', { fixture: 'newDeal.json' }).as('createDeal')
    cy.intercept('PATCH', '/api/deals/*', { fixture: 'updatedDeal.json' }).as('updateDeal')
    cy.intercept('GET', '/api/metrics*', { fixture: 'dealMetrics.json' }).as('getMetrics')
    
    cy.visit('/dashboard/deals')
    cy.wait('@getDeals')
  })

  describe('Deal Lifecycle', () => {
    it('completes full deal workflow', () => {
      // Create new deal
      cy.getBySel('add-deal-button').click()
      cy.getBySel('deal-name-input').type('Cardiology PACS Integration')
      cy.getBySel('deal-value-input').type('500000')
      cy.getBySel('deal-department-select').click()
      cy.getBySel('department-option-cardiology').click()
      cy.getBySel('save-deal-button').click()

      // Verify deal creation
      cy.wait('@createDeal')
      cy.getBySel('deal-card-new').should('exist')
      cy.getBySel('total-pipeline').should('contain', '$500,000')

      // Add stakeholders
      cy.getBySel('add-stakeholder-button').click()
      cy.getBySel('stakeholder-select').click()
      cy.contains('Dr. Sarah Chen').click()
      cy.contains('Dr. James Wilson').click()
      cy.getBySel('save-stakeholders-button').click()

      // Start clinical validation
      cy.getBySel('deal-status-select').click()
      cy.getBySel(`stage-option-${DealStage.CLINICAL_VALIDATION}`).click()
      cy.wait('@updateDeal')

      // Complete clinical workflow steps
      cy.getBySel('clinical-validation-checklist').within(() => {
        cy.contains('Workflow Assessment').click()
        cy.contains('Department Review').click()
        cy.contains('CMO Approval').click()
      })

      // Technical review phase
      cy.getBySel('deal-status-select').click()
      cy.getBySel(`stage-option-${DealStage.TECHNICAL_REVIEW}`).click()
      cy.wait('@updateDeal')

      // Upload required documents
      cy.getBySel('upload-document-button').click()
      cy.getBySel('document-type-select').select('TECHNICAL_SPEC')
      cy.getBySel('document-upload-input').attachFile('technical_specs.pdf')
      cy.getBySel('submit-document-button').click()

      // Verify metrics update
      cy.wait('@getMetrics')
      cy.getBySel('stage-breakdown').within(() => {
        cy.contains('Technical Review').should('contain', '1')
      })
    })

    it('handles compliance requirements', () => {
      cy.getBySel('deal-card').first().click()

      // Start compliance review
      cy.getBySel('start-compliance-review').click()
      
      // Complete HIPAA checklist
      cy.getBySel('compliance-checklist').within(() => {
        cy.contains('Data Security Review').click()
        cy.contains('Privacy Impact Assessment').click()
        cy.contains('Access Control Documentation').click()
      })

      // Submit for approval
      cy.getBySel('submit-compliance-review').click()
      cy.wait('@updateDeal')

      // Verify compliance status
      cy.getBySel('compliance-status').should('contain', 'Approved')
    })
  })

  describe('Deal Management Features', () => {
    it('filters and sorts deals', () => {
      // Department filter
      cy.getBySel('department-filter').click()
      cy.getBySel('filter-option-radiology').click()
      cy.wait('@getDeals')
      
      // Verify filtered results
      cy.getBySel('deals-table').should('contain', 'PACS')
      cy.getBySel('deals-table').should('not.contain', 'EMR')

      // Sort by value
      cy.getBySel('value-header').click()
      cy.getBySel('deals-table').within(() => {
        cy.get('tr').eq(1).should('contain', '$750,000')
      })
    })

    it('manages stakeholder interactions', () => {
      cy.getBySel('deal-card').first().click()

      // Schedule stakeholder meeting
      cy.getBySel('schedule-meeting-button').click()
      cy.getBySel('meeting-type-select').select('CLINICAL_REVIEW')
      cy.getBySel('stakeholder-select').click()
      cy.contains('Dr. Sarah Chen').click()
      cy.getBySel('meeting-date').type('2024-03-01')
      cy.getBySel('save-meeting-button').click()

      // Verify meeting scheduled
      cy.getBySel('upcoming-meetings').should('contain', 'Clinical Review')
      cy.getBySel('stakeholder-engagement').should('contain', 'Meeting Scheduled')
    })
  })

  describe('Error Handling', () => {
    it('handles failed API calls gracefully', () => {
      // Mock API failure
      cy.intercept('PATCH', '/api/deals/*', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('updateError')

      // Attempt status change
      cy.getBySel('deal-status-select').click()
      cy.getBySel(`stage-option-${DealStage.CLINICAL_VALIDATION}`).click()
      cy.wait('@updateError')

      // Verify error handling
      cy.getBySel('error-message').should('be.visible')
      cy.getBySel('retry-button').should('exist')
    })

    it('validates required fields', () => {
      cy.getBySel('add-deal-button').click()
      cy.getBySel('save-deal-button').click()

      // Verify validation messages
      cy.getBySel('name-error').should('contain', 'Deal name is required')
      cy.getBySel('value-error').should('contain', 'Deal value is required')
      cy.getBySel('department-error').should('contain', 'Department is required')
    })
  })

  describe('Healthcare Compliance', () => {
    it('enforces clinical validation requirements', () => {
      cy.getBySel('deal-card').first().click()
      cy.getBySel('deal-status-select').click()

      // Verify implementation is blocked without clinical validation
      cy.getBySel(`stage-option-${DealStage.IMPLEMENTATION}`)
        .should('be.disabled')
        .should('have.attr', 'title', 'Requires clinical validation')
    })

    it('tracks document compliance', () => {
      cy.getBySel('deal-card').first().click()
      cy.getBySel('compliance-documents-tab').click()

      // Verify required documents
      cy.getBySel('required-documents').within(() => {
        cy.contains('HIPAA Compliance').should('exist')
        cy.contains('Clinical Validation').should('exist')
        cy.contains('Security Assessment').should('exist')
      })

      // Upload compliance document
      cy.getBySel('upload-document-button').click()
      cy.getBySel('document-type-select').select('HIPAA_COMPLIANCE')
      cy.getBySel('document-upload-input').attachFile('hipaa_compliance.pdf')
      cy.getBySel('submit-document-button').click()

      // Verify document status
      cy.getBySel('document-status-HIPAA_COMPLIANCE')
        .should('contain', 'Pending Review')
    })
  })
}) 