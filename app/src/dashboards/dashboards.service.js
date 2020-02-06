(function() {
    'use strict';

    angular
        .module('enterpriseApp.dashboards')
        .factory('dashboardsService', dashboardsService);

    dashboardsService.$inject = ['$http', '$log', 'appService'];

    function dashboardsService($http, $log, appService) {
        var service = {
            getPieChartData: getPieChartData,
            getBarChartData: getBarChartData,
            getLineChartData: getLineChartData
        };

        var reportData = {
            startDate: moment().subtract(6, 'days').format('YYYYMMDD'),
            endDate: moment().format('YYYYMMDD'),
            data: [
                {
                    item: 'black socks',
                    type: 'NUMBER',
                    value: 60
                },
                {
                    item: 'blue socks',
                    type: 'NUMBER',
                    value: 5
                },
                {
                    item: 'red socks',
                    type: 'NUMBER',
                    value: 15
                },
                {
                    item: 'new socks',
                    type: 'NUMBER',
                    value: 20
                }
            ]
        };

        return service;

        function getPieChartData() {

            return appService.simulateBackendCall({data: reportData}).then(processData);

            // return $http.get('/api/data/pie')
            //     .then(processData)
            //     .catch(function(error) {
            //         $log.error('get data call failed: ' + error);
            //         //possibly handle error by redirecting to login or main screen
            //     }
            // );
        }

        function getBarChartData() {

            return appService.simulateBackendCall({data: reportData}).then(processData);

            // return $http.get('/api/data/bar')
            //     .then(processData)
            //     .catch(function(error) {
            //         $log.error('get data call failed: ' + error);
            //         //possibly handle error by redirecting to login or main screen
            //     }
            // );
        }

        function getLineChartData() {

            return appService.simulateBackendCall({data: reportData}).then(processData);

            // return $http.get('/api/data/bar')
            //     .then(processData)
            //     .catch(function(error) {
            //         $log.error('get data call failed: ' + error);
            //         //possibly handle error by redirecting to login or main screen
            //     }
            // );
        }

        function processData(data) {
            return data.data;
        }

    }
})();
