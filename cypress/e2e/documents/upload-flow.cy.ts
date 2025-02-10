describe('Document Upload Flow', () => {
  beforeEach(() => {
    cy.login() // Custom command for authentication
    cy.visit('/dashboard/documents')
  })

  it('completes full upload flow', () => {
    // Open modal
    cy.findByText(/upload files/i).click()
    
    // Select folder
    cy.findByRole('combobox').click()
    cy.findByText(/technical/i).click()
    
    // Upload file
    cy.get('[data-testid="dropzone"]').attachFile('test.pdf')
    
    // Check progress
    cy.findByText(/uploading/i).should('exist')
    cy.findByText(/100%/i).should('exist')
    
    // Verify success
    cy.findByTestId('success-icon').should('exist')
    
    // Check document list update
    cy.findByText(/test.pdf/i).should('exist')
  })

  it('handles upload errors gracefully', () => {
    cy.intercept('POST', '/api/upload', {
      statusCode: 500,
      body: { error: 'Upload failed' }
    })
    
    cy.findByText(/upload files/i).click()
    cy.get('[data-testid="dropzone"]').attachFile('test.pdf')
    
    cy.findByText(/error/i).should('exist')
    cy.findByText(/upload failed/i).should('exist')
  })
}) 