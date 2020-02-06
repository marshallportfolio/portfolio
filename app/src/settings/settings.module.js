(function() {
    'use strict';

    angular
        .module('enterpriseApp.settings', ['ui.router'])

    .config(['$stateProvider', function($stateProvider) {
        $stateProvider.state('settings', {
            name: 'settings',
            url: '/settings',
            templateUrl: 'settings/settings.html',
            controller: 'SettingsCtrl',
            controllerAs: 'vm'
        });
    }]);

})();
