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



(function() {
    'use strict';

    // Declare app level module which depends on views, and core components
    angular.module('enterpriseApp', [
        'ui.router',
        'ngSanitize',
        'pascalprecht.translate',
        'enterpriseApp.dashboards',
        'enterpriseApp.reports',
        'enterpriseApp.settings',
        'enterpriseApp.templates'
    ])
        .config([
            '$locationProvider', '$translateProvider', '$urlRouterProvider',
            function($locationProvider, $translateProvider, $urlRouterProvider) {
                $locationProvider.hashPrefix('!');

                $urlRouterProvider.otherwise('/dashboards');

                // Configure translations
                $translateProvider
                    .useStaticFilesLoader({
                        prefix: 'l10n/',
                        suffix: '.json'
                    })
                    .registerAvailableLanguageKeys(['en-US', 'ja'], {
                        'en': 'en-US',
                        'en_*': 'en-US',
                        'en-*': 'en-US',
                        'ja': 'ja',
                        'ja-*': 'ja',
                        'ja_*': 'ja',
                        '*': 'en-US'
                    })
                    .determinePreferredLanguage()
                    .fallbackLanguage('en-US');

                // Protect from insertion attacks in the translation values.
                $translateProvider.useSanitizeValueStrategy('sanitizeParameters');
            }
        ])
        .controller('enterpriseAppController', enterpriseAppController);

    enterpriseAppController.$inject = ['$log', '$scope', '$rootScope'];

    function enterpriseAppController($log, $scope, $rootScope) {
        var vm = this;

        vm.isLoading = true;
        vm.showNavMenu = true;
        vm.showMobileMenu = false;

        vm.currentMenu = 'dashboards';

        vm.selectMenuItem = function(menuName) {
            vm.currentMenu = menuName;
            vm.showMobileMenu = false;
        };

        var translationListener = $rootScope.$on('$translateChangeEnd', function() {
            vm.isLoading = false;
        });

        var routeListener = $rootScope.$on('$stateChangeSuccess', function(event, toState) {
            $log.debug('In stateChangeSuccess loading state:' + toState.name);
            if (toState && toState.name) {
                vm.currentMenu = toState.name;
            }
        });

        $scope.$on('$destroy', function() {
            translationListener();
            routeListener();
        });
    }
})();

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

(function() {
    'use strict';

    angular.module('enterpriseApp.dashboards')
        .controller('DashboardsCtrl', DashboardsCtrl);

    DashboardsCtrl.$inject = ['appService', 'dashboardsService'];

    function DashboardsCtrl(appService, dashboardsService) {
        var vm = this;
        vm.title = 'dashboards';

        vm.pieLoading = true;
        vm.barLoading = true;
        vm.lineLoading = true;

        vm.startDate = moment().subtract(6, 'days').format('YYYYMMDD');
        vm.endDate = moment().format('YYYYMMDD');

        vm.pieChartData;
        vm.barChartData;
        vm.lineChartData;
        vm.formatDate = appService.formatDate;

        init();

        function init() {
            dashboardsService.getPieChartData().then(function(data) {
                vm.pieChartData = formatPieChartData(data.data);
                vm.pieLoading = false;
            });

            dashboardsService.getBarChartData().then(function(data) {
                vm.barChartData = formatBarChartData(data.data);
                vm.barLoading = false;
            });

            dashboardsService.getLineChartData().then(function(data) {
                vm.lineChartData = formatLineChartData(data.data);
                vm.lineLoading = false;
            });
        }

        function formatPieChartData(values) {
            sortValues(values);

            var total = values.reduce(sum, 0);
            var offset = 0;

            for (var i=0, len=values.length; i<len; i++) {
                values[i].offset = offset;
                values[i].percent = values[i].value / total * 100;
                offset += values[i].percent;
                values[i].over50 = values[i].percent > 50 ? 1 : 0;
            }

            return values;
        }

        function formatBarChartData(values) {
            sortValues(values);

            var total = values.reduce(sum, 0);
            values.topMostPoint = values[0].value;

            for (var i=0, len=values.length; i<len; i++) {
                values[i].percent = values[i].value / total * 100;
            }

            return values;
        }

        function formatLineChartData(values) {

            //divide 200px by total number of points to get length of triangle base. That becomes the left offset for each new point
            //subtract previous point height from new point height to get the rise of the triangle. That becomes the bottom offset for the new point.
            //use base squared + rise squared to find the length of the hypotenuse. That becomes the width of the line to draw.
            //use Math.asin(base / hypotenuse) [then convert the radians to degrees] to find the degree angle to rotate the line to.
            //Multiply the rotation angle by -1 if it needs to rise to meet the next point.

            var base = 200 / values.length;

            sortValues(values);

            var topMostPoint = values[0].value;
            var widgetSize = 200;
            var leftOffset = 40; //padding for left axis labels
            var nextPoint = 0;
            var rise = 0;
            var cssValues = [];

            for (var i=0, len=values.length-1; i<len; i++) {

                var currentValue = {
                    left: 0,
                    bottom: 0,
                    hypotenuse: 0,
                    angle: 0,
                    value: 0,
                    item: ''
                };

                currentValue.value = values[i].value;
                currentValue.item = values[i].item;

                currentValue.left = leftOffset > 0 ? leftOffset - 2 : leftOffset; //adjust for border
                leftOffset += base;

                currentValue.bottom = widgetSize * (currentValue.value / topMostPoint);
                nextPoint = widgetSize * (values[i+1].value / topMostPoint);

                rise = currentValue.bottom - nextPoint;
                currentValue.hypotenuse = Math.sqrt((base * base) + (rise * rise));
                currentValue.angle = radiansToDegrees(Math.asin(rise / currentValue.hypotenuse));

                cssValues.push(currentValue);
            }

            var lastPoint = {
                left: leftOffset - 2,
                bottom: widgetSize * (values[values.length - 1].value / topMostPoint),
                hypotenuse: 0,
                angle: 0,
                value: values[values.length - 1].value,
                item: values[values.length - 1].item
            };

            cssValues.push(lastPoint);
            cssValues.topMostPoint = topMostPoint;


            function radiansToDegrees(rads) {
                return rads * (180 / Math.PI);
            }

            return cssValues;
        }

        function sortValues(values) {
            values.sort(function(a, b) { return b.value - a.value; });
        }

        function sum(total, value) {
            return total + value.value;
        }

    };

})();

(function() {
    'use strict';

    angular
        .module('enterpriseApp.dashboards')
        .factory('dashboardsService', dashboardsService);

    dashboardsService.$inject = ['$http', '$log', 'appService'];

    function dashboardsService($http, $log, appService) {

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

        var service = {
            getPieChartData: getPieChartData,
            getBarChartData: getBarChartData,
            getLineChartData: getLineChartData,
            getReportData: reportData
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

(function() {
    'use strict';

    angular.module('enterpriseApp.reports')
    .controller('ReportsCtrl', ReportsCtrl);

    ReportsCtrl.$inject = ['appService', 'reportsService'];

    function ReportsCtrl(appService, reportsService) {
        var vm = this;
        vm.title = 'reports';

        vm.loading = true;
        vm.reportData = {};
        vm.formatDate = appService.formatDate;

        init();

        function init() {
            reportsService.getReportData().then(function(data) {
                vm.reportData = data;
                vm.loading = false;
            });
        }

    };
})();

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

(function() {
    'use strict';

    angular.module('enterpriseApp.settings')
    .controller('SettingsCtrl', SettingsCtrl);

    SettingsCtrl.$inject = ['$rootScope', '$translate', 'appService'];

    function SettingsCtrl($rootScope, $translate, appService) {
        var vm = this;
        vm.lang = appService.preferredLanguage;
        vm.title = 'settings';

        vm.changeLanguageAndLocale = function() {
            appService.preferredLanguage = vm.lang;
            moment.locale(vm.lang);
            $translate.use(vm.lang);
            $rootScope.$broadcast('languageChange');
        };
    }

})();

(function() {
    'use strict';

    angular
        .module('enterpriseApp')
        .directive('spinner', [
            function() {
                return {
                    restrict: 'EA',
                    templateUrl: 'framework/shared/spinner/spinner.html',
                    scope: {
                        small: '@?'
                    }
                };
            }
        ]);
})();

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRhc2hib2FyZHMvZGFzaGJvYXJkcy5tb2R1bGUuanMiLCJyZXBvcnRzL3JlcG9ydHMubW9kdWxlLmpzIiwic2V0dGluZ3Mvc2V0dGluZ3MubW9kdWxlLmpzIiwiYXBwLmpzIiwiYXBwLnNlcnZpY2UuanMiLCJkYXNoYm9hcmRzL2Rhc2hib2FyZHMuY29udHJvbGxlci5qcyIsImRhc2hib2FyZHMvZGFzaGJvYXJkcy5zZXJ2aWNlLmpzIiwicmVwb3J0cy9yZXBvcnRzLmNvbnRyb2xsZXIuanMiLCJyZXBvcnRzL3JlcG9ydHMuc2VydmljZS5qcyIsInNldHRpbmdzL3NldHRpbmdzLmNvbnRyb2xsZXIuanMiLCJmcmFtZXdvcmsvc2hhcmVkL3NwaW5uZXIvc3Bpbm5lci5kaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOVdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcDE1ODI5MjExNjk5MzkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdlbnRlcnByaXNlQXBwLmRhc2hib2FyZHMnLCBbJ3VpLnJvdXRlciddKVxuXG4gICAgICAgIC5jb25maWcoWyckc3RhdGVQcm92aWRlcicsIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZGFzaGJvYXJkcycsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvZGFzaGJvYXJkcycsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdkYXNoYm9hcmRzL2Rhc2hib2FyZHMuaHRtbCcsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0Rhc2hib2FyZHNDdHJsJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZW50ZXJwcmlzZUFwcC5yZXBvcnRzJywgWyd1aS5yb3V0ZXInXSlcblxuICAgIC5jb25maWcoWyckc3RhdGVQcm92aWRlcicsIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdyZXBvcnRzJywge1xuICAgICAgICAgICAgdXJsOiAnL3JlcG9ydHMnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdyZXBvcnRzL3JlcG9ydHMuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnUmVwb3J0c0N0cmwnLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nLFxuICAgICAgICAgICAgbmFtZTogJ3JlcG9ydHMnXG4gICAgICAgIH0pO1xuICAgIH1dKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2VudGVycHJpc2VBcHAuc2V0dGluZ3MnLCBbJ3VpLnJvdXRlciddKVxuXG4gICAgLmNvbmZpZyhbJyRzdGF0ZVByb3ZpZGVyJywgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAgICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NldHRpbmdzJywge1xuICAgICAgICAgICAgbmFtZTogJ3NldHRpbmdzJyxcbiAgICAgICAgICAgIHVybDogJy9zZXR0aW5ncycsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3NldHRpbmdzL3NldHRpbmdzLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ1NldHRpbmdzQ3RybCcsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bSdcbiAgICAgICAgfSk7XG4gICAgfV0pO1xuXG59KSgpO1xuIiwiXG5cbihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBEZWNsYXJlIGFwcCBsZXZlbCBtb2R1bGUgd2hpY2ggZGVwZW5kcyBvbiB2aWV3cywgYW5kIGNvcmUgY29tcG9uZW50c1xuICAgIGFuZ3VsYXIubW9kdWxlKCdlbnRlcnByaXNlQXBwJywgW1xuICAgICAgICAndWkucm91dGVyJyxcbiAgICAgICAgJ25nU2FuaXRpemUnLFxuICAgICAgICAncGFzY2FscHJlY2h0LnRyYW5zbGF0ZScsXG4gICAgICAgICdlbnRlcnByaXNlQXBwLmRhc2hib2FyZHMnLFxuICAgICAgICAnZW50ZXJwcmlzZUFwcC5yZXBvcnRzJyxcbiAgICAgICAgJ2VudGVycHJpc2VBcHAuc2V0dGluZ3MnLFxuICAgICAgICAnZW50ZXJwcmlzZUFwcC50ZW1wbGF0ZXMnXG4gICAgXSlcbiAgICAgICAgLmNvbmZpZyhbXG4gICAgICAgICAgICAnJGxvY2F0aW9uUHJvdmlkZXInLCAnJHRyYW5zbGF0ZVByb3ZpZGVyJywgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gICAgICAgICAgICBmdW5jdGlvbigkbG9jYXRpb25Qcm92aWRlciwgJHRyYW5zbGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAkbG9jYXRpb25Qcm92aWRlci5oYXNoUHJlZml4KCchJyk7XG5cbiAgICAgICAgICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvZGFzaGJvYXJkcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gQ29uZmlndXJlIHRyYW5zbGF0aW9uc1xuICAgICAgICAgICAgICAgICR0cmFuc2xhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgICAgICAudXNlU3RhdGljRmlsZXNMb2FkZXIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4OiAnbDEwbi8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VmZml4OiAnLmpzb24nXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5yZWdpc3RlckF2YWlsYWJsZUxhbmd1YWdlS2V5cyhbJ2VuLVVTJywgJ2phJ10sIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdlbic6ICdlbi1VUycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZW5fKic6ICdlbi1VUycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZW4tKic6ICdlbi1VUycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnamEnOiAnamEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2phLSonOiAnamEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2phXyonOiAnamEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJyonOiAnZW4tVVMnXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5kZXRlcm1pbmVQcmVmZXJyZWRMYW5ndWFnZSgpXG4gICAgICAgICAgICAgICAgICAgIC5mYWxsYmFja0xhbmd1YWdlKCdlbi1VUycpO1xuXG4gICAgICAgICAgICAgICAgLy8gUHJvdGVjdCBmcm9tIGluc2VydGlvbiBhdHRhY2tzIGluIHRoZSB0cmFuc2xhdGlvbiB2YWx1ZXMuXG4gICAgICAgICAgICAgICAgJHRyYW5zbGF0ZVByb3ZpZGVyLnVzZVNhbml0aXplVmFsdWVTdHJhdGVneSgnc2FuaXRpemVQYXJhbWV0ZXJzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pXG4gICAgICAgIC5jb250cm9sbGVyKCdlbnRlcnByaXNlQXBwQ29udHJvbGxlcicsIGVudGVycHJpc2VBcHBDb250cm9sbGVyKTtcblxuICAgIGVudGVycHJpc2VBcHBDb250cm9sbGVyLiRpbmplY3QgPSBbJyRsb2cnLCAnJHNjb3BlJywgJyRyb290U2NvcGUnXTtcblxuICAgIGZ1bmN0aW9uIGVudGVycHJpc2VBcHBDb250cm9sbGVyKCRsb2csICRzY29wZSwgJHJvb3RTY29wZSkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzO1xuXG4gICAgICAgIHZtLmlzTG9hZGluZyA9IHRydWU7XG4gICAgICAgIHZtLnNob3dOYXZNZW51ID0gdHJ1ZTtcbiAgICAgICAgdm0uc2hvd01vYmlsZU1lbnUgPSBmYWxzZTtcblxuICAgICAgICB2bS5jdXJyZW50TWVudSA9ICdkYXNoYm9hcmRzJztcblxuICAgICAgICB2bS5zZWxlY3RNZW51SXRlbSA9IGZ1bmN0aW9uKG1lbnVOYW1lKSB7XG4gICAgICAgICAgICB2bS5jdXJyZW50TWVudSA9IG1lbnVOYW1lO1xuICAgICAgICAgICAgdm0uc2hvd01vYmlsZU1lbnUgPSBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdHJhbnNsYXRpb25MaXN0ZW5lciA9ICRyb290U2NvcGUuJG9uKCckdHJhbnNsYXRlQ2hhbmdlRW5kJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2bS5pc0xvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHJvdXRlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIGZ1bmN0aW9uKGV2ZW50LCB0b1N0YXRlKSB7XG4gICAgICAgICAgICAkbG9nLmRlYnVnKCdJbiBzdGF0ZUNoYW5nZVN1Y2Nlc3MgbG9hZGluZyBzdGF0ZTonICsgdG9TdGF0ZS5uYW1lKTtcbiAgICAgICAgICAgIGlmICh0b1N0YXRlICYmIHRvU3RhdGUubmFtZSkge1xuICAgICAgICAgICAgICAgIHZtLmN1cnJlbnRNZW51ID0gdG9TdGF0ZS5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdHJhbnNsYXRpb25MaXN0ZW5lcigpO1xuICAgICAgICAgICAgcm91dGVMaXN0ZW5lcigpO1xuICAgICAgICB9KTtcbiAgICB9XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZW50ZXJwcmlzZUFwcCcpXG4gICAgICAgIC5mYWN0b3J5KCdhcHBTZXJ2aWNlJywgYXBwU2VydmljZSk7XG5cbiAgICBhcHBTZXJ2aWNlLiRpbmplY3QgPSBbJyRodHRwJywgJyRsb2cnLCAnJHRpbWVvdXQnXTtcblxuICAgIGZ1bmN0aW9uIGFwcFNlcnZpY2UoJGh0dHAsICRsb2csICR0aW1lb3V0KSB7XG5cbiAgICAgICAgdmFyIHByZWZlcnJlZExhbmd1YWdlID0gJ2VuLVVTJztcblxuICAgICAgICB2YXIgc2VydmljZSA9IHtcbiAgICAgICAgICAgIHByZWZlcnJlZExhbmd1YWdlOiBwcmVmZXJyZWRMYW5ndWFnZSxcbiAgICAgICAgICAgIHNpbXVsYXRlQmFja2VuZENhbGw6IHNpbXVsYXRlQmFja2VuZENhbGwsXG4gICAgICAgICAgICBmb3JtYXREYXRlOiBmb3JtYXREYXRlXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHNlcnZpY2U7XG5cbiAgICAgICAgZnVuY3Rpb24gc2ltdWxhdGVCYWNrZW5kQ2FsbChkYXRhKSB7XG4gICAgICAgICAgICAvL1NpbmNlIHRoaXMgc2FtcGxlIGFwcCBpcyBkZXNpZ25lZCB0byBydW4gb24gYSBHaXRIdWIgUGFnZSwgaXQgaGFzIG5vIGJhY2tlbmQgdG8gbWFrZSBjYWxscyB0by5cbiAgICAgICAgICAgIC8vV2Ugc3RpbGwgd2FudCB0aGUgYXBwIHRvIGhhbmRsZSBhc3luY2hyb25vdXMgY2FsbHMgYW5kIGRlYWwgd2l0aCB0aGUgZGVsYXlzIGFuZCBzdWNoIHRoYXQgcmVtb3RlXG4gICAgICAgICAgICAvL2NhbGxzIGludHJvZHVjZSwgc28gd2UnbGwgc2ltdWxhdGUgY2FsbHMgdG8gdGhlIGJhY2tlbmQgd2l0aCBhIHRpbWVvdXQgZnVuY3Rpb24gdGhhdCBkZWxheXMgdXAgdG8gYSBmZXdcbiAgICAgICAgICAgIC8vc2Vjb25kcyBiZWZvcmUgcmVzb2x2aW5nIGEgcHJvbWlzZS5cbiAgICAgICAgICAgIHJldHVybiAkdGltZW91dChmdW5jdGlvbigpIHsgcmV0dXJuIGRhdGE7IH0sIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIE1hdGguZmxvb3IoNDAwMCkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdERhdGUoZGF0ZSkge1xuICAgICAgICAgICAgaWYgKCFhbmd1bGFyLmlzRGVmaW5lZChkYXRlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtb21lbnQoZGF0ZSwgJ1lZWVlNTUREJykuZm9ybWF0KCdMJyk7XG4gICAgICAgIH1cbiAgICB9XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCdlbnRlcnByaXNlQXBwLmRhc2hib2FyZHMnKVxyXG4gICAgICAgIC5jb250cm9sbGVyKCdEYXNoYm9hcmRzQ3RybCcsIERhc2hib2FyZHNDdHJsKTtcclxuXHJcbiAgICBEYXNoYm9hcmRzQ3RybC4kaW5qZWN0ID0gWydhcHBTZXJ2aWNlJywgJ2Rhc2hib2FyZHNTZXJ2aWNlJ107XHJcblxyXG4gICAgZnVuY3Rpb24gRGFzaGJvYXJkc0N0cmwoYXBwU2VydmljZSwgZGFzaGJvYXJkc1NlcnZpY2UpIHtcclxuICAgICAgICB2YXIgdm0gPSB0aGlzO1xyXG4gICAgICAgIHZtLnRpdGxlID0gJ2Rhc2hib2FyZHMnO1xyXG5cclxuICAgICAgICB2bS5waWVMb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICB2bS5iYXJMb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICB2bS5saW5lTG9hZGluZyA9IHRydWU7XHJcblxyXG4gICAgICAgIHZtLnN0YXJ0RGF0ZSA9IG1vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJykuZm9ybWF0KCdZWVlZTU1ERCcpO1xyXG4gICAgICAgIHZtLmVuZERhdGUgPSBtb21lbnQoKS5mb3JtYXQoJ1lZWVlNTUREJyk7XHJcblxyXG4gICAgICAgIHZtLnBpZUNoYXJ0RGF0YTtcclxuICAgICAgICB2bS5iYXJDaGFydERhdGE7XHJcbiAgICAgICAgdm0ubGluZUNoYXJ0RGF0YTtcclxuICAgICAgICB2bS5mb3JtYXREYXRlID0gYXBwU2VydmljZS5mb3JtYXREYXRlO1xyXG5cclxuICAgICAgICBpbml0KCk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICAgICAgICAgIGRhc2hib2FyZHNTZXJ2aWNlLmdldFBpZUNoYXJ0RGF0YSgpLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgdm0ucGllQ2hhcnREYXRhID0gZm9ybWF0UGllQ2hhcnREYXRhKGRhdGEuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB2bS5waWVMb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgZGFzaGJvYXJkc1NlcnZpY2UuZ2V0QmFyQ2hhcnREYXRhKCkudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB2bS5iYXJDaGFydERhdGEgPSBmb3JtYXRCYXJDaGFydERhdGEoZGF0YS5kYXRhKTtcclxuICAgICAgICAgICAgICAgIHZtLmJhckxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBkYXNoYm9hcmRzU2VydmljZS5nZXRMaW5lQ2hhcnREYXRhKCkudGhlbihmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICB2bS5saW5lQ2hhcnREYXRhID0gZm9ybWF0TGluZUNoYXJ0RGF0YShkYXRhLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgdm0ubGluZUxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBmb3JtYXRQaWVDaGFydERhdGEodmFsdWVzKSB7XHJcbiAgICAgICAgICAgIHNvcnRWYWx1ZXModmFsdWVzKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0b3RhbCA9IHZhbHVlcy5yZWR1Y2Uoc3VtLCAwKTtcclxuICAgICAgICAgICAgdmFyIG9mZnNldCA9IDA7XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpPTAsIGxlbj12YWx1ZXMubGVuZ3RoOyBpPGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZXNbaV0ub2Zmc2V0ID0gb2Zmc2V0O1xyXG4gICAgICAgICAgICAgICAgdmFsdWVzW2ldLnBlcmNlbnQgPSB2YWx1ZXNbaV0udmFsdWUgLyB0b3RhbCAqIDEwMDtcclxuICAgICAgICAgICAgICAgIG9mZnNldCArPSB2YWx1ZXNbaV0ucGVyY2VudDtcclxuICAgICAgICAgICAgICAgIHZhbHVlc1tpXS5vdmVyNTAgPSB2YWx1ZXNbaV0ucGVyY2VudCA+IDUwID8gMSA6IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBmb3JtYXRCYXJDaGFydERhdGEodmFsdWVzKSB7XHJcbiAgICAgICAgICAgIHNvcnRWYWx1ZXModmFsdWVzKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0b3RhbCA9IHZhbHVlcy5yZWR1Y2Uoc3VtLCAwKTtcclxuICAgICAgICAgICAgdmFsdWVzLnRvcE1vc3RQb2ludCA9IHZhbHVlc1swXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXZhbHVlcy5sZW5ndGg7IGk8bGVuOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlc1tpXS5wZXJjZW50ID0gdmFsdWVzW2ldLnZhbHVlIC8gdG90YWwgKiAxMDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBmb3JtYXRMaW5lQ2hhcnREYXRhKHZhbHVlcykge1xyXG5cclxuICAgICAgICAgICAgLy9kaXZpZGUgMjAwcHggYnkgdG90YWwgbnVtYmVyIG9mIHBvaW50cyB0byBnZXQgbGVuZ3RoIG9mIHRyaWFuZ2xlIGJhc2UuIFRoYXQgYmVjb21lcyB0aGUgbGVmdCBvZmZzZXQgZm9yIGVhY2ggbmV3IHBvaW50XHJcbiAgICAgICAgICAgIC8vc3VidHJhY3QgcHJldmlvdXMgcG9pbnQgaGVpZ2h0IGZyb20gbmV3IHBvaW50IGhlaWdodCB0byBnZXQgdGhlIHJpc2Ugb2YgdGhlIHRyaWFuZ2xlLiBUaGF0IGJlY29tZXMgdGhlIGJvdHRvbSBvZmZzZXQgZm9yIHRoZSBuZXcgcG9pbnQuXHJcbiAgICAgICAgICAgIC8vdXNlIGJhc2Ugc3F1YXJlZCArIHJpc2Ugc3F1YXJlZCB0byBmaW5kIHRoZSBsZW5ndGggb2YgdGhlIGh5cG90ZW51c2UuIFRoYXQgYmVjb21lcyB0aGUgd2lkdGggb2YgdGhlIGxpbmUgdG8gZHJhdy5cclxuICAgICAgICAgICAgLy91c2UgTWF0aC5hc2luKGJhc2UgLyBoeXBvdGVudXNlKSBbdGhlbiBjb252ZXJ0IHRoZSByYWRpYW5zIHRvIGRlZ3JlZXNdIHRvIGZpbmQgdGhlIGRlZ3JlZSBhbmdsZSB0byByb3RhdGUgdGhlIGxpbmUgdG8uXHJcbiAgICAgICAgICAgIC8vTXVsdGlwbHkgdGhlIHJvdGF0aW9uIGFuZ2xlIGJ5IC0xIGlmIGl0IG5lZWRzIHRvIHJpc2UgdG8gbWVldCB0aGUgbmV4dCBwb2ludC5cclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlID0gMjAwIC8gdmFsdWVzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIHNvcnRWYWx1ZXModmFsdWVzKTtcclxuXHJcbiAgICAgICAgICAgIHZhciB0b3BNb3N0UG9pbnQgPSB2YWx1ZXNbMF0udmFsdWU7XHJcbiAgICAgICAgICAgIHZhciB3aWRnZXRTaXplID0gMjAwO1xyXG4gICAgICAgICAgICB2YXIgbGVmdE9mZnNldCA9IDQwOyAvL3BhZGRpbmcgZm9yIGxlZnQgYXhpcyBsYWJlbHNcclxuICAgICAgICAgICAgdmFyIG5leHRQb2ludCA9IDA7XHJcbiAgICAgICAgICAgIHZhciByaXNlID0gMDtcclxuICAgICAgICAgICAgdmFyIGNzc1ZhbHVlcyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49dmFsdWVzLmxlbmd0aC0xOyBpPGxlbjsgaSsrKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvdHRvbTogMCxcclxuICAgICAgICAgICAgICAgICAgICBoeXBvdGVudXNlOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGFuZ2xlOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW06ICcnXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZS52YWx1ZSA9IHZhbHVlc1tpXS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZS5pdGVtID0gdmFsdWVzW2ldLml0ZW07XHJcblxyXG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlLmxlZnQgPSBsZWZ0T2Zmc2V0ID4gMCA/IGxlZnRPZmZzZXQgLSAyIDogbGVmdE9mZnNldDsgLy9hZGp1c3QgZm9yIGJvcmRlclxyXG4gICAgICAgICAgICAgICAgbGVmdE9mZnNldCArPSBiYXNlO1xyXG5cclxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZS5ib3R0b20gPSB3aWRnZXRTaXplICogKGN1cnJlbnRWYWx1ZS52YWx1ZSAvIHRvcE1vc3RQb2ludCk7XHJcbiAgICAgICAgICAgICAgICBuZXh0UG9pbnQgPSB3aWRnZXRTaXplICogKHZhbHVlc1tpKzFdLnZhbHVlIC8gdG9wTW9zdFBvaW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICByaXNlID0gY3VycmVudFZhbHVlLmJvdHRvbSAtIG5leHRQb2ludDtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZS5oeXBvdGVudXNlID0gTWF0aC5zcXJ0KChiYXNlICogYmFzZSkgKyAocmlzZSAqIHJpc2UpKTtcclxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZS5hbmdsZSA9IHJhZGlhbnNUb0RlZ3JlZXMoTWF0aC5hc2luKHJpc2UgLyBjdXJyZW50VmFsdWUuaHlwb3RlbnVzZSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNzc1ZhbHVlcy5wdXNoKGN1cnJlbnRWYWx1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBsYXN0UG9pbnQgPSB7XHJcbiAgICAgICAgICAgICAgICBsZWZ0OiBsZWZ0T2Zmc2V0IC0gMixcclxuICAgICAgICAgICAgICAgIGJvdHRvbTogd2lkZ2V0U2l6ZSAqICh2YWx1ZXNbdmFsdWVzLmxlbmd0aCAtIDFdLnZhbHVlIC8gdG9wTW9zdFBvaW50KSxcclxuICAgICAgICAgICAgICAgIGh5cG90ZW51c2U6IDAsXHJcbiAgICAgICAgICAgICAgICBhbmdsZTogMCxcclxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZXNbdmFsdWVzLmxlbmd0aCAtIDFdLnZhbHVlLFxyXG4gICAgICAgICAgICAgICAgaXRlbTogdmFsdWVzW3ZhbHVlcy5sZW5ndGggLSAxXS5pdGVtXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjc3NWYWx1ZXMucHVzaChsYXN0UG9pbnQpO1xyXG4gICAgICAgICAgICBjc3NWYWx1ZXMudG9wTW9zdFBvaW50ID0gdG9wTW9zdFBvaW50O1xyXG5cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJhZGlhbnNUb0RlZ3JlZXMocmFkcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJhZHMgKiAoMTgwIC8gTWF0aC5QSSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBjc3NWYWx1ZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBzb3J0VmFsdWVzKHZhbHVlcykge1xyXG4gICAgICAgICAgICB2YWx1ZXMuc29ydChmdW5jdGlvbihhLCBiKSB7IHJldHVybiBiLnZhbHVlIC0gYS52YWx1ZTsgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBzdW0odG90YWwsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0b3RhbCArIHZhbHVlLnZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9O1xyXG5cclxufSkoKTtcclxuIiwiKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGFuZ3VsYXJcclxuICAgICAgICAubW9kdWxlKCdlbnRlcnByaXNlQXBwLmRhc2hib2FyZHMnKVxyXG4gICAgICAgIC5mYWN0b3J5KCdkYXNoYm9hcmRzU2VydmljZScsIGRhc2hib2FyZHNTZXJ2aWNlKTtcclxuXHJcbiAgICBkYXNoYm9hcmRzU2VydmljZS4kaW5qZWN0ID0gWyckaHR0cCcsICckbG9nJywgJ2FwcFNlcnZpY2UnXTtcclxuXHJcbiAgICBmdW5jdGlvbiBkYXNoYm9hcmRzU2VydmljZSgkaHR0cCwgJGxvZywgYXBwU2VydmljZSkge1xyXG5cclxuICAgICAgICB2YXIgcmVwb3J0RGF0YSA9IHtcclxuICAgICAgICAgICAgc3RhcnREYXRlOiBtb21lbnQoKS5zdWJ0cmFjdCg2LCAnZGF5cycpLmZvcm1hdCgnWVlZWU1NREQnKSxcclxuICAgICAgICAgICAgZW5kRGF0ZTogbW9tZW50KCkuZm9ybWF0KCdZWVlZTU1ERCcpLFxyXG4gICAgICAgICAgICBkYXRhOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbTogJ2JsYWNrIHNvY2tzJyxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnTlVNQkVSJyxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogNjBcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbTogJ2JsdWUgc29ja3MnLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdOVU1CRVInLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiA1XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW06ICdyZWQgc29ja3MnLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdOVU1CRVInLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAxNVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtOiAnbmV3IHNvY2tzJyxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnTlVNQkVSJyxcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMjBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHZhciBzZXJ2aWNlID0ge1xyXG4gICAgICAgICAgICBnZXRQaWVDaGFydERhdGE6IGdldFBpZUNoYXJ0RGF0YSxcclxuICAgICAgICAgICAgZ2V0QmFyQ2hhcnREYXRhOiBnZXRCYXJDaGFydERhdGEsXHJcbiAgICAgICAgICAgIGdldExpbmVDaGFydERhdGE6IGdldExpbmVDaGFydERhdGEsXHJcbiAgICAgICAgICAgIGdldFJlcG9ydERhdGE6IHJlcG9ydERhdGFcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICByZXR1cm4gc2VydmljZTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZ2V0UGllQ2hhcnREYXRhKCkge1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGFwcFNlcnZpY2Uuc2ltdWxhdGVCYWNrZW5kQ2FsbCh7ZGF0YTogcmVwb3J0RGF0YX0pLnRoZW4ocHJvY2Vzc0RhdGEpO1xyXG5cclxuICAgICAgICAgICAgLy8gcmV0dXJuICRodHRwLmdldCgnL2FwaS9kYXRhL3BpZScpXHJcbiAgICAgICAgICAgIC8vICAgICAudGhlbihwcm9jZXNzRGF0YSlcclxuICAgICAgICAgICAgLy8gICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcikge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgICRsb2cuZXJyb3IoJ2dldCBkYXRhIGNhbGwgZmFpbGVkOiAnICsgZXJyb3IpO1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIC8vcG9zc2libHkgaGFuZGxlIGVycm9yIGJ5IHJlZGlyZWN0aW5nIHRvIGxvZ2luIG9yIG1haW4gc2NyZWVuXHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBnZXRCYXJDaGFydERhdGEoKSB7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYXBwU2VydmljZS5zaW11bGF0ZUJhY2tlbmRDYWxsKHtkYXRhOiByZXBvcnREYXRhfSkudGhlbihwcm9jZXNzRGF0YSk7XHJcblxyXG4gICAgICAgICAgICAvLyByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2RhdGEvYmFyJylcclxuICAgICAgICAgICAgLy8gICAgIC50aGVuKHByb2Nlc3NEYXRhKVxyXG4gICAgICAgICAgICAvLyAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgJGxvZy5lcnJvcignZ2V0IGRhdGEgY2FsbCBmYWlsZWQ6ICcgKyBlcnJvcik7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgLy9wb3NzaWJseSBoYW5kbGUgZXJyb3IgYnkgcmVkaXJlY3RpbmcgdG8gbG9naW4gb3IgbWFpbiBzY3JlZW5cclxuICAgICAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAgICAgLy8gKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGdldExpbmVDaGFydERhdGEoKSB7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYXBwU2VydmljZS5zaW11bGF0ZUJhY2tlbmRDYWxsKHtkYXRhOiByZXBvcnREYXRhfSkudGhlbihwcm9jZXNzRGF0YSk7XHJcblxyXG4gICAgICAgICAgICAvLyByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2RhdGEvYmFyJylcclxuICAgICAgICAgICAgLy8gICAgIC50aGVuKHByb2Nlc3NEYXRhKVxyXG4gICAgICAgICAgICAvLyAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgJGxvZy5lcnJvcignZ2V0IGRhdGEgY2FsbCBmYWlsZWQ6ICcgKyBlcnJvcik7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgLy9wb3NzaWJseSBoYW5kbGUgZXJyb3IgYnkgcmVkaXJlY3RpbmcgdG8gbG9naW4gb3IgbWFpbiBzY3JlZW5cclxuICAgICAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAgICAgLy8gKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHByb2Nlc3NEYXRhKGRhdGEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRhdGEuZGF0YTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG59KSgpO1xyXG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VudGVycHJpc2VBcHAucmVwb3J0cycpXG4gICAgLmNvbnRyb2xsZXIoJ1JlcG9ydHNDdHJsJywgUmVwb3J0c0N0cmwpO1xuXG4gICAgUmVwb3J0c0N0cmwuJGluamVjdCA9IFsnYXBwU2VydmljZScsICdyZXBvcnRzU2VydmljZSddO1xuXG4gICAgZnVuY3Rpb24gUmVwb3J0c0N0cmwoYXBwU2VydmljZSwgcmVwb3J0c1NlcnZpY2UpIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcbiAgICAgICAgdm0udGl0bGUgPSAncmVwb3J0cyc7XG5cbiAgICAgICAgdm0ubG9hZGluZyA9IHRydWU7XG4gICAgICAgIHZtLnJlcG9ydERhdGEgPSB7fTtcbiAgICAgICAgdm0uZm9ybWF0RGF0ZSA9IGFwcFNlcnZpY2UuZm9ybWF0RGF0ZTtcblxuICAgICAgICBpbml0KCk7XG5cbiAgICAgICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgICAgIHJlcG9ydHNTZXJ2aWNlLmdldFJlcG9ydERhdGEoKS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2bS5yZXBvcnREYXRhID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdlbnRlcnByaXNlQXBwLnJlcG9ydHMnKVxuICAgICAgICAuZmFjdG9yeSgncmVwb3J0c1NlcnZpY2UnLCByZXBvcnRzU2VydmljZSk7XG5cbiAgICByZXBvcnRzU2VydmljZS4kaW5qZWN0ID0gWyckaHR0cCcsICckbG9nJywgJ2FwcFNlcnZpY2UnXTtcblxuICAgIGZ1bmN0aW9uIHJlcG9ydHNTZXJ2aWNlKCRodHRwLCAkbG9nLCBhcHBTZXJ2aWNlKSB7XG4gICAgICAgIHZhciBzZXJ2aWNlID0ge1xuICAgICAgICAgICAgZ2V0UmVwb3J0RGF0YTogZ2V0UmVwb3J0RGF0YVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBzZXJ2aWNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldFJlcG9ydERhdGEoKSB7XG4gICAgICAgICAgICB2YXIgcmVwb3J0RGF0YSA9IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgcmV0dXJuIGFwcFNlcnZpY2Uuc2ltdWxhdGVCYWNrZW5kQ2FsbCh7ZGF0YTogcmVwb3J0RGF0YX0pLnRoZW4ocHJvY2Vzc0RhdGEpO1xuXG4gICAgICAgICAgICAvLyByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3JlcG9ydC1kYXRhJylcbiAgICAgICAgICAgIC8vICAgICAudGhlbihwcm9jZXNzRGF0YSlcbiAgICAgICAgICAgIC8vICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICRsb2cuZXJyb3IoJ2dldCBkYXRhIGNhbGwgZmFpbGVkOiAnICsgZXJyb3IpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy9wb3NzaWJseSBoYW5kbGUgZXJyb3IgYnkgcmVkaXJlY3RpbmcgdG8gbG9naW4gb3IgbWFpbiBzY3JlZW5cbiAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgICk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHByb2Nlc3NEYXRhKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyLm1vZHVsZSgnZW50ZXJwcmlzZUFwcC5zZXR0aW5ncycpXG4gICAgLmNvbnRyb2xsZXIoJ1NldHRpbmdzQ3RybCcsIFNldHRpbmdzQ3RybCk7XG5cbiAgICBTZXR0aW5nc0N0cmwuJGluamVjdCA9IFsnJHJvb3RTY29wZScsICckdHJhbnNsYXRlJywgJ2FwcFNlcnZpY2UnXTtcblxuICAgIGZ1bmN0aW9uIFNldHRpbmdzQ3RybCgkcm9vdFNjb3BlLCAkdHJhbnNsYXRlLCBhcHBTZXJ2aWNlKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXM7XG4gICAgICAgIHZtLmxhbmcgPSBhcHBTZXJ2aWNlLnByZWZlcnJlZExhbmd1YWdlO1xuICAgICAgICB2bS50aXRsZSA9ICdzZXR0aW5ncyc7XG5cbiAgICAgICAgdm0uY2hhbmdlTGFuZ3VhZ2VBbmRMb2NhbGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGFwcFNlcnZpY2UucHJlZmVycmVkTGFuZ3VhZ2UgPSB2bS5sYW5nO1xuICAgICAgICAgICAgbW9tZW50LmxvY2FsZSh2bS5sYW5nKTtcbiAgICAgICAgICAgICR0cmFuc2xhdGUudXNlKHZtLmxhbmcpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdsYW5ndWFnZUNoYW5nZScpO1xuICAgICAgICB9O1xuICAgIH1cblxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2VudGVycHJpc2VBcHAnKVxuICAgICAgICAuZGlyZWN0aXZlKCdzcGlubmVyJywgW1xuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdFQScsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZnJhbWV3b3JrL3NoYXJlZC9zcGlubmVyL3NwaW5uZXIuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzbWFsbDogJ0A/J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG59KSgpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
