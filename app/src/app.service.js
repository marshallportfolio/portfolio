(function() {
    'use strict';

    angular
        .module('enterpriseApp')
        .factory('appService', appService);

    appService.$inject = ['$http', '$log', '$timeout'];

    function appService($http, $log, $timeout) {

        var preferredLanguage = 'en-US';

        var service = {
            preferredLanguage: preferredLanguage,
            simulateBackendCall: simulateBackendCall,
            formatDate: formatDate
        };

        return service;

        function simulateBackendCall(data) {
            //Since this sample app is designed to run on a GitHub Page, it has no backend to make calls to.
            //We still want the app to handle asynchronous calls and deal with the delays and such that remote
            //calls introduce, so we'll simulate calls to the backend with a timeout function that delays up to a few
            //seconds before resolving a promise.
            return $timeout(function() { return data; }, Math.floor(Math.random() * Math.floor(4000)));
        }

        function formatDate(date) {
            if (!angular.isDefined(date)) {
                return;
            }
            return moment(date, 'YYYYMMDD').format('L');
        }
    }
})();
