(function() {
    'use strict';

    angular
        .module('enterpriseApp.reports', ['ui.router'])

    .config(['$stateProvider', function($stateProvider) {
        $stateProvider.state('reports', {
            url: '/reports',
            templateUrl: 'reports/reports.html',
            controller: 'ReportsCtrl',
            controllerAs: 'vm',
            name: 'reports'
        });
    }]);

})();
