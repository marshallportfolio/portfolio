(function() {
    'use strict';

    angular
        .module('enterpriseApp.reports')
        .factory('reportsService', reportsService);

    reportsService.$inject = ['$http', '$log', 'appService'];

    function reportsService($http, $log, appService) {
        var service = {
            getReportData: getReportData
        };

        return service;

        function getReportData() {
            var reportData = [
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                },
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                },
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                },
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                },
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                },
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                },
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                },
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                },
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                },
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                },
                {
                    date: 20200101,
                    id: 1001,
                    product: 'black socks',
                    quantity: 200
                },
                {
                    date: 20200101,
                    id: 1002,
                    product: 'blue socks',
                    quantity: 500
                },
                {
                    date: 20200102,
                    id: 1011,
                    product: 'red socks',
                    quantity: 20
                },
                {
                    date: 20200102,
                    id: 1012,
                    product: 'plaid socks',
                    quantity: 30
                },
                {
                    date: 20200103,
                    id: 1013,
                    product: 'argyle socks',
                    quantity: 40
                }
            ];

            return appService.simulateBackendCall({data: reportData}).then(processData);

            // return $http.get('/api/report-data')
            //     .then(processData)
            //     .catch(function(error) {
            //             $log.error('get data call failed: ' + error);
            //             //possibly handle error by redirecting to login or main screen
            //         }
            //     );

            function processData(data) {
                return data.data;
            }
        }
    }
})();
