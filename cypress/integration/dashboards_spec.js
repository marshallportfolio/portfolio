describe('Dashboards view', function() {
    it('Should populate the pie chart', function() {
        cy.visit('/dashboards');

        cy.get('h1').should('contain', 'Dashboards');

        expect(cy.get('.pie-chart').children()).to.not.be.empty;
    });

    it('Should populate the bar chart', function() {
        cy.visit('/dashboards');

        expect(cy.get('.bar-chart').children()).to.not.be.empty;
    });

    it('Should populate the line chart', function() {
        cy.visit('/dashboards');

        expect(cy.get('.line-chart').children()).to.not.be.empty;
    });
});
