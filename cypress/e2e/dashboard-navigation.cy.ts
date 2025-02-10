describe('Dashboard Navigation', () => {
  beforeEach(() => {
    cy.login() // Custom command for authentication
    cy.visit('/dashboard')
  })

  it('navigates between dashboard sections', () => {
    // Test sidebar navigation
    cy.get('nav').contains('Deals').click()
    cy.url().should('include', '/dashboard/deals')
    
    cy.get('nav').contains('Stakeholders').click()
    cy.url().should('include', '/dashboard/stakeholders')
    
    cy.get('nav').contains('Documents').click()
    cy.url().should('include', '/dashboard/documents')
  })

  it('handles user dropdown actions', () => {
    // Open user dropdown
    cy.get('[data-testid="user-menu"]').click()
    
    // Check dropdown contents
    cy.contains('Profile').should('be.visible')
    cy.contains('Settings').should('be.visible')
    cy.contains('Sign out').should('be.visible')
    
    // Test sign out
    cy.contains('Sign out').click()
    cy.url().should('include', '/auth/signin')
  })

  it('protects routes from unauthorized access', () => {
    cy.clearCookies()
    cy.visit('/dashboard/deals')
    cy.url().should('include', '/auth/signin')
  })
}) 