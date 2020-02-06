describe('Side-nav navigation', function() {
    it('Should default to the dashboard view', function() {
        cy.visit('/');

        cy.url().should('include', '/dashboards');
    });

    it('Should navigate to the report view', function() {
        cy.visit('/');

        cy.contains('Reports').click();

        cy.url().should('include', '/reports');
    });

    it('Should navigate to the settings view', function() {
        cy.visit('/');

        cy.contains('Settings').click();

        cy.url().should('include', '/settings');
    });

    it('Should navigate back to the dashboard view', function() {
        cy.visit('/');

        cy.contains('Settings').click();

        cy.url().should('include', '/settings');

        cy.contains('Dashboards').click();

        cy.url().should('include', '/dashboards');
    });
});

describe('Top-nav navigation', function() {
    it('Should navigate to the portfolio page', function() {
        cy.visit('/');

        cy.contains('Back to portfolio page').click();

        cy.url().should('include', '/index.html');
    });
});
