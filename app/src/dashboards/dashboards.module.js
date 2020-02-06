(function() {
    'use strict';

    angular
        .module('enterpriseApp.dashboards', ['ui.router'])

        .config(['$stateProvider', function($stateProvider) {
            $stateProvider.state('dashboards', {
                url: '/dashboards',
                templateUrl: 'dashboards/dashboards.html',
                controller: 'DashboardsCtrl',
                controllerAs: 'vm'
            });
        }]);
})();
