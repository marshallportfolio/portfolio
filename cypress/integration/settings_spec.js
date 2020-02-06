describe('Settings view', function() {
   it('Switches the language between Japanese and English', function() {
       cy.visit('/settings');

       cy.get('h1').should('contain', 'Settings');

       cy.contains('日本語').click();

       cy.get('h1').should('contain', '設定');

       cy.contains('English').click();

       cy.get('h1').should('contain', 'Settings');
   });
});
