describe('Reports view', function() {
    it('Should display a non-empty table', function() {
        cy.visit('/reports');

        cy.get('h1').should('contain', 'Reports');

        expect(cy.get('tbody').children()).to.not.be.empty;
    });
});
