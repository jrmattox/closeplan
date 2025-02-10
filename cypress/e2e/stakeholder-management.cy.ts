describe('Stakeholder Management', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/dashboard/stakeholders')
  })

  it('filters stakeholders by role', () => {
    cy.get('[data-testid="role-filter"]').click()
    cy.contains('IT').click()
    
    cy.get('table').should('contain', 'James Wilson')
    cy.get('table').should('not.contain', 'Dr. Sarah Chen')
  })

  it('updates stakeholder roles', () => {
    cy.get('table')
      .contains('tr', 'James Wilson')
      .find('[data-testid="edit-role"]')
      .click()
    
    cy.get('[data-testid="role-select"]')
      .click()
      .contains('TECHNICAL_BUYER')
      .click()
    
    cy.get('[data-testid="save-role"]').click()
    
    cy.contains('Role updated successfully')
  })

  it('persists stakeholder changes', () => {
    // Make a change
    cy.get('table')
      .contains('tr', 'James Wilson')
      .find('[data-testid="edit-department"]')
      .click()
      .type('New Department{enter}')
    
    // Reload page
    cy.reload()
    
    // Verify change persisted
    cy.get('table')
      .contains('tr', 'James Wilson')
      .should('contain', 'New Department')
  })
}) 