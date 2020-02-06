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

                currentValue.bottom = 150 * (currentValue.value / topMostPoint);
                nextPoint = 150 * (values[i+1].value / topMostPoint);

                rise = currentValue.bottom - nextPoint;
                currentValue.hypotenuse = Math.sqrt((base * base) + (rise * rise));
                currentValue.angle = radiansToDegrees(Math.asin(rise / currentValue.hypotenuse));

                cssValues.push(currentValue);
            }

            var lastPoint = {
                left: leftOffset - 2,
                bottom: 150 * (values[values.length - 1].value / topMostPoint),
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

    };

    function sortValues(values) {
        values.sort(function(a, b) { return b.value - a.value; });
    }

    function sum(total, value) {
        return total + value.value;
    }

})();

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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRhc2hib2FyZHMvZGFzaGJvYXJkcy5tb2R1bGUuanMiLCJzZXR0aW5ncy9zZXR0aW5ncy5tb2R1bGUuanMiLCJyZXBvcnRzL3JlcG9ydHMubW9kdWxlLmpzIiwiYXBwLmpzIiwiYXBwLnNlcnZpY2UuanMiLCJkYXNoYm9hcmRzL2Rhc2hib2FyZHMuY29udHJvbGxlci5qcyIsImRhc2hib2FyZHMvZGFzaGJvYXJkcy5zZXJ2aWNlLmpzIiwic2V0dGluZ3Mvc2V0dGluZ3MuY29udHJvbGxlci5qcyIsInJlcG9ydHMvcmVwb3J0cy5jb250cm9sbGVyLmpzIiwicmVwb3J0cy9yZXBvcnRzLnNlcnZpY2UuanMiLCJmcmFtZXdvcmsvc2hhcmVkL3NwaW5uZXIvc3Bpbm5lci5kaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwMTU4MTAwNjkzNTAwNi5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2VudGVycHJpc2VBcHAuZGFzaGJvYXJkcycsIFsndWkucm91dGVyJ10pXG5cbiAgICAgICAgLmNvbmZpZyhbJyRzdGF0ZVByb3ZpZGVyJywgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAgICAgICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdkYXNoYm9hcmRzJywge1xuICAgICAgICAgICAgICAgIHVybDogJy9kYXNoYm9hcmRzJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2Rhc2hib2FyZHMvZGFzaGJvYXJkcy5odG1sJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnRGFzaGJvYXJkc0N0cmwnLFxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1dKTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdlbnRlcnByaXNlQXBwLnNldHRpbmdzJywgWyd1aS5yb3V0ZXInXSlcblxuICAgIC5jb25maWcoWyckc3RhdGVQcm92aWRlcicsIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzZXR0aW5ncycsIHtcbiAgICAgICAgICAgIG5hbWU6ICdzZXR0aW5ncycsXG4gICAgICAgICAgICB1cmw6ICcvc2V0dGluZ3MnLFxuICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdzZXR0aW5ncy9zZXR0aW5ncy5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTZXR0aW5nc0N0cmwnLFxuICAgICAgICAgICAgY29udHJvbGxlckFzOiAndm0nXG4gICAgICAgIH0pO1xuICAgIH1dKTtcblxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2VudGVycHJpc2VBcHAucmVwb3J0cycsIFsndWkucm91dGVyJ10pXG5cbiAgICAuY29uZmlnKFsnJHN0YXRlUHJvdmlkZXInLCBmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncmVwb3J0cycsIHtcbiAgICAgICAgICAgIHVybDogJy9yZXBvcnRzJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAncmVwb3J0cy9yZXBvcnRzLmh0bWwnLFxuICAgICAgICAgICAgY29udHJvbGxlcjogJ1JlcG9ydHNDdHJsJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJyxcbiAgICAgICAgICAgIG5hbWU6ICdyZXBvcnRzJ1xuICAgICAgICB9KTtcbiAgICB9XSk7XG5cbn0pKCk7XG4iLCJcblxuKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIERlY2xhcmUgYXBwIGxldmVsIG1vZHVsZSB3aGljaCBkZXBlbmRzIG9uIHZpZXdzLCBhbmQgY29yZSBjb21wb25lbnRzXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VudGVycHJpc2VBcHAnLCBbXG4gICAgICAgICd1aS5yb3V0ZXInLFxuICAgICAgICAnbmdTYW5pdGl6ZScsXG4gICAgICAgICdwYXNjYWxwcmVjaHQudHJhbnNsYXRlJyxcbiAgICAgICAgJ2VudGVycHJpc2VBcHAuZGFzaGJvYXJkcycsXG4gICAgICAgICdlbnRlcnByaXNlQXBwLnJlcG9ydHMnLFxuICAgICAgICAnZW50ZXJwcmlzZUFwcC5zZXR0aW5ncycsXG4gICAgICAgICdlbnRlcnByaXNlQXBwLnRlbXBsYXRlcydcbiAgICBdKVxuICAgICAgICAuY29uZmlnKFtcbiAgICAgICAgICAgICckbG9jYXRpb25Qcm92aWRlcicsICckdHJhbnNsYXRlUHJvdmlkZXInLCAnJHVybFJvdXRlclByb3ZpZGVyJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uKCRsb2NhdGlvblByb3ZpZGVyLCAkdHJhbnNsYXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICRsb2NhdGlvblByb3ZpZGVyLmhhc2hQcmVmaXgoJyEnKTtcblxuICAgICAgICAgICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy9kYXNoYm9hcmRzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBDb25maWd1cmUgdHJhbnNsYXRpb25zXG4gICAgICAgICAgICAgICAgJHRyYW5zbGF0ZVByb3ZpZGVyXG4gICAgICAgICAgICAgICAgICAgIC51c2VTdGF0aWNGaWxlc0xvYWRlcih7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmaXg6ICdsMTBuLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWZmaXg6ICcuanNvbidcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLnJlZ2lzdGVyQXZhaWxhYmxlTGFuZ3VhZ2VLZXlzKFsnZW4tVVMnLCAnamEnXSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgJ2VuJzogJ2VuLVVTJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdlbl8qJzogJ2VuLVVTJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdlbi0qJzogJ2VuLVVTJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdqYSc6ICdqYScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnamEtKic6ICdqYScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnamFfKic6ICdqYScsXG4gICAgICAgICAgICAgICAgICAgICAgICAnKic6ICdlbi1VUydcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmRldGVybWluZVByZWZlcnJlZExhbmd1YWdlKClcbiAgICAgICAgICAgICAgICAgICAgLmZhbGxiYWNrTGFuZ3VhZ2UoJ2VuLVVTJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBQcm90ZWN0IGZyb20gaW5zZXJ0aW9uIGF0dGFja3MgaW4gdGhlIHRyYW5zbGF0aW9uIHZhbHVlcy5cbiAgICAgICAgICAgICAgICAkdHJhbnNsYXRlUHJvdmlkZXIudXNlU2FuaXRpemVWYWx1ZVN0cmF0ZWd5KCdzYW5pdGl6ZVBhcmFtZXRlcnMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSlcbiAgICAgICAgLmNvbnRyb2xsZXIoJ2VudGVycHJpc2VBcHBDb250cm9sbGVyJywgZW50ZXJwcmlzZUFwcENvbnRyb2xsZXIpO1xuXG4gICAgZW50ZXJwcmlzZUFwcENvbnRyb2xsZXIuJGluamVjdCA9IFsnJGxvZycsICckc2NvcGUnLCAnJHJvb3RTY29wZSddO1xuXG4gICAgZnVuY3Rpb24gZW50ZXJwcmlzZUFwcENvbnRyb2xsZXIoJGxvZywgJHNjb3BlLCAkcm9vdFNjb3BlKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXM7XG5cbiAgICAgICAgdm0uaXNMb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgdm0uc2hvd05hdk1lbnUgPSB0cnVlO1xuICAgICAgICB2bS5zaG93TW9iaWxlTWVudSA9IGZhbHNlO1xuXG4gICAgICAgIHZtLmN1cnJlbnRNZW51ID0gJ2Rhc2hib2FyZHMnO1xuXG4gICAgICAgIHZtLnNlbGVjdE1lbnVJdGVtID0gZnVuY3Rpb24obWVudU5hbWUpIHtcbiAgICAgICAgICAgIHZtLmN1cnJlbnRNZW51ID0gbWVudU5hbWU7XG4gICAgICAgICAgICB2bS5zaG93TW9iaWxlTWVudSA9IGZhbHNlO1xuICAgICAgICB9O1xuXG4gICAgICAgIHZhciB0cmFuc2xhdGlvbkxpc3RlbmVyID0gJHJvb3RTY29wZS4kb24oJyR0cmFuc2xhdGVDaGFuZ2VFbmQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZtLmlzTG9hZGluZyA9IGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICB2YXIgcm91dGVMaXN0ZW5lciA9ICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdWNjZXNzJywgZnVuY3Rpb24oZXZlbnQsIHRvU3RhdGUpIHtcbiAgICAgICAgICAgICRsb2cuZGVidWcoJ0luIHN0YXRlQ2hhbmdlU3VjY2VzcyBsb2FkaW5nIHN0YXRlOicgKyB0b1N0YXRlLm5hbWUpO1xuICAgICAgICAgICAgaWYgKHRvU3RhdGUgJiYgdG9TdGF0ZS5uYW1lKSB7XG4gICAgICAgICAgICAgICAgdm0uY3VycmVudE1lbnUgPSB0b1N0YXRlLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRzY29wZS4kb24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0cmFuc2xhdGlvbkxpc3RlbmVyKCk7XG4gICAgICAgICAgICByb3V0ZUxpc3RlbmVyKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdlbnRlcnByaXNlQXBwJylcbiAgICAgICAgLmZhY3RvcnkoJ2FwcFNlcnZpY2UnLCBhcHBTZXJ2aWNlKTtcblxuICAgIGFwcFNlcnZpY2UuJGluamVjdCA9IFsnJGh0dHAnLCAnJGxvZycsICckdGltZW91dCddO1xuXG4gICAgZnVuY3Rpb24gYXBwU2VydmljZSgkaHR0cCwgJGxvZywgJHRpbWVvdXQpIHtcblxuICAgICAgICB2YXIgcHJlZmVycmVkTGFuZ3VhZ2UgPSAnZW4tVVMnO1xuXG4gICAgICAgIHZhciBzZXJ2aWNlID0ge1xuICAgICAgICAgICAgcHJlZmVycmVkTGFuZ3VhZ2U6IHByZWZlcnJlZExhbmd1YWdlLFxuICAgICAgICAgICAgc2ltdWxhdGVCYWNrZW5kQ2FsbDogc2ltdWxhdGVCYWNrZW5kQ2FsbCxcbiAgICAgICAgICAgIGZvcm1hdERhdGU6IGZvcm1hdERhdGVcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gc2VydmljZTtcblxuICAgICAgICBmdW5jdGlvbiBzaW11bGF0ZUJhY2tlbmRDYWxsKGRhdGEpIHtcbiAgICAgICAgICAgIC8vU2luY2UgdGhpcyBzYW1wbGUgYXBwIGlzIGRlc2lnbmVkIHRvIHJ1biBvbiBhIEdpdEh1YiBQYWdlLCBpdCBoYXMgbm8gYmFja2VuZCB0byBtYWtlIGNhbGxzIHRvLlxuICAgICAgICAgICAgLy9XZSBzdGlsbCB3YW50IHRoZSBhcHAgdG8gaGFuZGxlIGFzeW5jaHJvbm91cyBjYWxscyBhbmQgZGVhbCB3aXRoIHRoZSBkZWxheXMgYW5kIHN1Y2ggdGhhdCByZW1vdGVcbiAgICAgICAgICAgIC8vY2FsbHMgaW50cm9kdWNlLCBzbyB3ZSdsbCBzaW11bGF0ZSBjYWxscyB0byB0aGUgYmFja2VuZCB3aXRoIGEgdGltZW91dCBmdW5jdGlvbiB0aGF0IGRlbGF5cyB1cCB0byBhIGZld1xuICAgICAgICAgICAgLy9zZWNvbmRzIGJlZm9yZSByZXNvbHZpbmcgYSBwcm9taXNlLlxuICAgICAgICAgICAgcmV0dXJuICR0aW1lb3V0KGZ1bmN0aW9uKCkgeyByZXR1cm4gZGF0YTsgfSwgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogTWF0aC5mbG9vcig0MDAwKSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZm9ybWF0RGF0ZShkYXRlKSB7XG4gICAgICAgICAgICBpZiAoIWFuZ3VsYXIuaXNEZWZpbmVkKGRhdGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1vbWVudChkYXRlLCAnWVlZWU1NREQnKS5mb3JtYXQoJ0wnKTtcbiAgICAgICAgfVxuICAgIH1cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VudGVycHJpc2VBcHAuZGFzaGJvYXJkcycpXG4gICAgICAgIC5jb250cm9sbGVyKCdEYXNoYm9hcmRzQ3RybCcsIERhc2hib2FyZHNDdHJsKTtcblxuICAgIERhc2hib2FyZHNDdHJsLiRpbmplY3QgPSBbJ2FwcFNlcnZpY2UnLCAnZGFzaGJvYXJkc1NlcnZpY2UnXTtcblxuICAgIGZ1bmN0aW9uIERhc2hib2FyZHNDdHJsKGFwcFNlcnZpY2UsIGRhc2hib2FyZHNTZXJ2aWNlKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXM7XG4gICAgICAgIHZtLnRpdGxlID0gJ2Rhc2hib2FyZHMnO1xuXG4gICAgICAgIHZtLnBpZUxvYWRpbmcgPSB0cnVlO1xuICAgICAgICB2bS5iYXJMb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgdm0ubGluZUxvYWRpbmcgPSB0cnVlO1xuXG4gICAgICAgIHZtLnN0YXJ0RGF0ZSA9IG1vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJykuZm9ybWF0KCdZWVlZTU1ERCcpO1xuICAgICAgICB2bS5lbmREYXRlID0gbW9tZW50KCkuZm9ybWF0KCdZWVlZTU1ERCcpO1xuXG4gICAgICAgIHZtLnBpZUNoYXJ0RGF0YTtcbiAgICAgICAgdm0uYmFyQ2hhcnREYXRhO1xuICAgICAgICB2bS5saW5lQ2hhcnREYXRhO1xuXG4gICAgICAgIHZtLmZvcm1hdERhdGUgPSBhcHBTZXJ2aWNlLmZvcm1hdERhdGU7XG5cbiAgICAgICAgaW5pdCgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICAgICAgICBkYXNoYm9hcmRzU2VydmljZS5nZXRQaWVDaGFydERhdGEoKS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2bS5waWVDaGFydERhdGEgPSBmb3JtYXRQaWVDaGFydERhdGEoZGF0YS5kYXRhKTtcbiAgICAgICAgICAgICAgICB2bS5waWVMb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZGFzaGJvYXJkc1NlcnZpY2UuZ2V0QmFyQ2hhcnREYXRhKCkudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgdm0uYmFyQ2hhcnREYXRhID0gZm9ybWF0QmFyQ2hhcnREYXRhKGRhdGEuZGF0YSk7XG4gICAgICAgICAgICAgICAgdm0uYmFyTG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGRhc2hib2FyZHNTZXJ2aWNlLmdldExpbmVDaGFydERhdGEoKS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2bS5saW5lQ2hhcnREYXRhID0gZm9ybWF0TGluZUNoYXJ0RGF0YShkYXRhLmRhdGEpO1xuICAgICAgICAgICAgICAgIHZtLmxpbmVMb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdFBpZUNoYXJ0RGF0YSh2YWx1ZXMpIHtcbiAgICAgICAgICAgIHNvcnRWYWx1ZXModmFsdWVzKTtcblxuICAgICAgICAgICAgdmFyIHRvdGFsID0gdmFsdWVzLnJlZHVjZShzdW0sIDApO1xuICAgICAgICAgICAgdmFyIG9mZnNldCA9IDA7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXZhbHVlcy5sZW5ndGg7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXNbaV0ub2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgICAgICAgICAgIHZhbHVlc1tpXS5wZXJjZW50ID0gdmFsdWVzW2ldLnZhbHVlIC8gdG90YWwgKiAxMDA7XG4gICAgICAgICAgICAgICAgb2Zmc2V0ICs9IHZhbHVlc1tpXS5wZXJjZW50O1xuICAgICAgICAgICAgICAgIHZhbHVlc1tpXS5vdmVyNTAgPSB2YWx1ZXNbaV0ucGVyY2VudCA+IDUwID8gMSA6IDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmb3JtYXRCYXJDaGFydERhdGEodmFsdWVzKSB7XG4gICAgICAgICAgICBzb3J0VmFsdWVzKHZhbHVlcyk7XG5cbiAgICAgICAgICAgIHZhciB0b3RhbCA9IHZhbHVlcy5yZWR1Y2Uoc3VtLCAwKTtcbiAgICAgICAgICAgIHZhbHVlcy50b3BNb3N0UG9pbnQgPSB2YWx1ZXNbMF0udmFsdWU7XG5cbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXZhbHVlcy5sZW5ndGg7IGk8bGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXNbaV0ucGVyY2VudCA9IHZhbHVlc1tpXS52YWx1ZSAvIHRvdGFsICogMTAwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdmFsdWVzO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZm9ybWF0TGluZUNoYXJ0RGF0YSh2YWx1ZXMpIHtcblxuICAgICAgICAgICAgLy9kaXZpZGUgMjAwcHggYnkgdG90YWwgbnVtYmVyIG9mIHBvaW50cyB0byBnZXQgbGVuZ3RoIG9mIHRyaWFuZ2xlIGJhc2UuIFRoYXQgYmVjb21lcyB0aGUgbGVmdCBvZmZzZXQgZm9yIGVhY2ggbmV3IHBvaW50XG4gICAgICAgICAgICAvL3N1YnRyYWN0IHByZXZpb3VzIHBvaW50IGhlaWdodCBmcm9tIG5ldyBwb2ludCBoZWlnaHQgdG8gZ2V0IHRoZSByaXNlIG9mIHRoZSB0cmlhbmdsZS4gVGhhdCBiZWNvbWVzIHRoZSBib3R0b20gb2Zmc2V0IGZvciB0aGUgbmV3IHBvaW50LlxuICAgICAgICAgICAgLy91c2UgYmFzZSBzcXVhcmVkICsgcmlzZSBzcXVhcmVkIHRvIGZpbmQgdGhlIGxlbmd0aCBvZiB0aGUgaHlwb3RlbnVzZS4gVGhhdCBiZWNvbWVzIHRoZSB3aWR0aCBvZiB0aGUgbGluZSB0byBkcmF3LlxuICAgICAgICAgICAgLy91c2UgTWF0aC5hc2luKGJhc2UgLyBoeXBvdGVudXNlKSBbdGhlbiBjb252ZXJ0IHRoZSByYWRpYW5zIHRvIGRlZ3JlZXNdIHRvIGZpbmQgdGhlIGRlZ3JlZSBhbmdsZSB0byByb3RhdGUgdGhlIGxpbmUgdG8uXG4gICAgICAgICAgICAvL011bHRpcGx5IHRoZSByb3RhdGlvbiBhbmdsZSBieSAtMSBpZiBpdCBuZWVkcyB0byByaXNlIHRvIG1lZXQgdGhlIG5leHQgcG9pbnQuXG5cbiAgICAgICAgICAgIHZhciBiYXNlID0gMjAwIC8gdmFsdWVzLmxlbmd0aDtcblxuICAgICAgICAgICAgc29ydFZhbHVlcyh2YWx1ZXMpO1xuXG4gICAgICAgICAgICB2YXIgdG9wTW9zdFBvaW50ID0gdmFsdWVzWzBdLnZhbHVlO1xuICAgICAgICAgICAgdmFyIGxlZnRPZmZzZXQgPSA0MDsgLy9wYWRkaW5nIGZvciBsZWZ0IGF4aXMgbGFiZWxzXG4gICAgICAgICAgICB2YXIgbmV4dFBvaW50ID0gMDtcbiAgICAgICAgICAgIHZhciByaXNlID0gMDtcbiAgICAgICAgICAgIHZhciBjc3NWYWx1ZXMgPSBbXTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49dmFsdWVzLmxlbmd0aC0xOyBpPGxlbjsgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICBsZWZ0OiAwLFxuICAgICAgICAgICAgICAgICAgICBib3R0b206IDAsXG4gICAgICAgICAgICAgICAgICAgIGh5cG90ZW51c2U6IDAsXG4gICAgICAgICAgICAgICAgICAgIGFuZ2xlOiAwLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMCxcbiAgICAgICAgICAgICAgICAgICAgaXRlbTogJydcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlLnZhbHVlID0gdmFsdWVzW2ldLnZhbHVlO1xuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZS5pdGVtID0gdmFsdWVzW2ldLml0ZW07XG5cbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUubGVmdCA9IGxlZnRPZmZzZXQgPiAwID8gbGVmdE9mZnNldCAtIDIgOiBsZWZ0T2Zmc2V0OyAvL2FkanVzdCBmb3IgYm9yZGVyXG4gICAgICAgICAgICAgICAgbGVmdE9mZnNldCArPSBiYXNlO1xuXG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlLmJvdHRvbSA9IDE1MCAqIChjdXJyZW50VmFsdWUudmFsdWUgLyB0b3BNb3N0UG9pbnQpO1xuICAgICAgICAgICAgICAgIG5leHRQb2ludCA9IDE1MCAqICh2YWx1ZXNbaSsxXS52YWx1ZSAvIHRvcE1vc3RQb2ludCk7XG5cbiAgICAgICAgICAgICAgICByaXNlID0gY3VycmVudFZhbHVlLmJvdHRvbSAtIG5leHRQb2ludDtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUuaHlwb3RlbnVzZSA9IE1hdGguc3FydCgoYmFzZSAqIGJhc2UpICsgKHJpc2UgKiByaXNlKSk7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlLmFuZ2xlID0gcmFkaWFuc1RvRGVncmVlcyhNYXRoLmFzaW4ocmlzZSAvIGN1cnJlbnRWYWx1ZS5oeXBvdGVudXNlKSk7XG5cbiAgICAgICAgICAgICAgICBjc3NWYWx1ZXMucHVzaChjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbGFzdFBvaW50ID0ge1xuICAgICAgICAgICAgICAgIGxlZnQ6IGxlZnRPZmZzZXQgLSAyLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogMTUwICogKHZhbHVlc1t2YWx1ZXMubGVuZ3RoIC0gMV0udmFsdWUgLyB0b3BNb3N0UG9pbnQpLFxuICAgICAgICAgICAgICAgIGh5cG90ZW51c2U6IDAsXG4gICAgICAgICAgICAgICAgYW5nbGU6IDAsXG4gICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlc1t2YWx1ZXMubGVuZ3RoIC0gMV0udmFsdWUsXG4gICAgICAgICAgICAgICAgaXRlbTogdmFsdWVzW3ZhbHVlcy5sZW5ndGggLSAxXS5pdGVtXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjc3NWYWx1ZXMucHVzaChsYXN0UG9pbnQpO1xuICAgICAgICAgICAgY3NzVmFsdWVzLnRvcE1vc3RQb2ludCA9IHRvcE1vc3RQb2ludDtcblxuXG4gICAgICAgICAgICBmdW5jdGlvbiByYWRpYW5zVG9EZWdyZWVzKHJhZHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmFkcyAqICgxODAgLyBNYXRoLlBJKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGNzc1ZhbHVlcztcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIHNvcnRWYWx1ZXModmFsdWVzKSB7XG4gICAgICAgIHZhbHVlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpIHsgcmV0dXJuIGIudmFsdWUgLSBhLnZhbHVlOyB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdW0odG90YWwsIHZhbHVlKSB7XG4gICAgICAgIHJldHVybiB0b3RhbCArIHZhbHVlLnZhbHVlO1xuICAgIH1cblxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2VudGVycHJpc2VBcHAuZGFzaGJvYXJkcycpXG4gICAgICAgIC5mYWN0b3J5KCdkYXNoYm9hcmRzU2VydmljZScsIGRhc2hib2FyZHNTZXJ2aWNlKTtcblxuICAgIGRhc2hib2FyZHNTZXJ2aWNlLiRpbmplY3QgPSBbJyRodHRwJywgJyRsb2cnLCAnYXBwU2VydmljZSddO1xuXG4gICAgZnVuY3Rpb24gZGFzaGJvYXJkc1NlcnZpY2UoJGh0dHAsICRsb2csIGFwcFNlcnZpY2UpIHtcbiAgICAgICAgdmFyIHNlcnZpY2UgPSB7XG4gICAgICAgICAgICBnZXRQaWVDaGFydERhdGE6IGdldFBpZUNoYXJ0RGF0YSxcbiAgICAgICAgICAgIGdldEJhckNoYXJ0RGF0YTogZ2V0QmFyQ2hhcnREYXRhLFxuICAgICAgICAgICAgZ2V0TGluZUNoYXJ0RGF0YTogZ2V0TGluZUNoYXJ0RGF0YVxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciByZXBvcnREYXRhID0ge1xuICAgICAgICAgICAgc3RhcnREYXRlOiBtb21lbnQoKS5zdWJ0cmFjdCg2LCAnZGF5cycpLmZvcm1hdCgnWVlZWU1NREQnKSxcbiAgICAgICAgICAgIGVuZERhdGU6IG1vbWVudCgpLmZvcm1hdCgnWVlZWU1NREQnKSxcbiAgICAgICAgICAgIGRhdGE6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW06ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdOVU1CRVInLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogNjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbTogJ2JsdWUgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnTlVNQkVSJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbTogJ3JlZCBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdOVU1CRVInLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMTVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbTogJ25ldyBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdOVU1CRVInLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogMjBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHNlcnZpY2U7XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0UGllQ2hhcnREYXRhKCkge1xuXG4gICAgICAgICAgICByZXR1cm4gYXBwU2VydmljZS5zaW11bGF0ZUJhY2tlbmRDYWxsKHtkYXRhOiByZXBvcnREYXRhfSkudGhlbihwcm9jZXNzRGF0YSk7XG5cbiAgICAgICAgICAgIC8vIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZGF0YS9waWUnKVxuICAgICAgICAgICAgLy8gICAgIC50aGVuKHByb2Nlc3NEYXRhKVxuICAgICAgICAgICAgLy8gICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgLy8gICAgICAgICAkbG9nLmVycm9yKCdnZXQgZGF0YSBjYWxsIGZhaWxlZDogJyArIGVycm9yKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgLy9wb3NzaWJseSBoYW5kbGUgZXJyb3IgYnkgcmVkaXJlY3RpbmcgdG8gbG9naW4gb3IgbWFpbiBzY3JlZW5cbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyApO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0QmFyQ2hhcnREYXRhKCkge1xuXG4gICAgICAgICAgICByZXR1cm4gYXBwU2VydmljZS5zaW11bGF0ZUJhY2tlbmRDYWxsKHtkYXRhOiByZXBvcnREYXRhfSkudGhlbihwcm9jZXNzRGF0YSk7XG5cbiAgICAgICAgICAgIC8vIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZGF0YS9iYXInKVxuICAgICAgICAgICAgLy8gICAgIC50aGVuKHByb2Nlc3NEYXRhKVxuICAgICAgICAgICAgLy8gICAgIC5jYXRjaChmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgLy8gICAgICAgICAkbG9nLmVycm9yKCdnZXQgZGF0YSBjYWxsIGZhaWxlZDogJyArIGVycm9yKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgLy9wb3NzaWJseSBoYW5kbGUgZXJyb3IgYnkgcmVkaXJlY3RpbmcgdG8gbG9naW4gb3IgbWFpbiBzY3JlZW5cbiAgICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgICAvLyApO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZ2V0TGluZUNoYXJ0RGF0YSgpIHtcblxuICAgICAgICAgICAgcmV0dXJuIGFwcFNlcnZpY2Uuc2ltdWxhdGVCYWNrZW5kQ2FsbCh7ZGF0YTogcmVwb3J0RGF0YX0pLnRoZW4ocHJvY2Vzc0RhdGEpO1xuXG4gICAgICAgICAgICAvLyByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2RhdGEvYmFyJylcbiAgICAgICAgICAgIC8vICAgICAudGhlbihwcm9jZXNzRGF0YSlcbiAgICAgICAgICAgIC8vICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgJGxvZy5lcnJvcignZ2V0IGRhdGEgY2FsbCBmYWlsZWQ6ICcgKyBlcnJvcik7XG4gICAgICAgICAgICAvLyAgICAgICAgIC8vcG9zc2libHkgaGFuZGxlIGVycm9yIGJ5IHJlZGlyZWN0aW5nIHRvIGxvZ2luIG9yIG1haW4gc2NyZWVuXG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHByb2Nlc3NEYXRhKGRhdGEpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLmRhdGE7XG4gICAgICAgIH1cblxuICAgIH1cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VudGVycHJpc2VBcHAuc2V0dGluZ3MnKVxuICAgIC5jb250cm9sbGVyKCdTZXR0aW5nc0N0cmwnLCBTZXR0aW5nc0N0cmwpO1xuXG4gICAgU2V0dGluZ3NDdHJsLiRpbmplY3QgPSBbJyRyb290U2NvcGUnLCAnJHRyYW5zbGF0ZScsICdhcHBTZXJ2aWNlJ107XG5cbiAgICBmdW5jdGlvbiBTZXR0aW5nc0N0cmwoJHJvb3RTY29wZSwgJHRyYW5zbGF0ZSwgYXBwU2VydmljZSkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzO1xuICAgICAgICB2bS5sYW5nID0gYXBwU2VydmljZS5wcmVmZXJyZWRMYW5ndWFnZTtcbiAgICAgICAgdm0udGl0bGUgPSAnc2V0dGluZ3MnO1xuXG4gICAgICAgIHZtLmNoYW5nZUxhbmd1YWdlQW5kTG9jYWxlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBhcHBTZXJ2aWNlLnByZWZlcnJlZExhbmd1YWdlID0gdm0ubGFuZztcbiAgICAgICAgICAgIG1vbWVudC5sb2NhbGUodm0ubGFuZyk7XG4gICAgICAgICAgICAkdHJhbnNsYXRlLnVzZSh2bS5sYW5nKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnbGFuZ3VhZ2VDaGFuZ2UnKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhci5tb2R1bGUoJ2VudGVycHJpc2VBcHAucmVwb3J0cycpXG4gICAgLmNvbnRyb2xsZXIoJ1JlcG9ydHNDdHJsJywgUmVwb3J0c0N0cmwpO1xuXG4gICAgUmVwb3J0c0N0cmwuJGluamVjdCA9IFsnYXBwU2VydmljZScsICdyZXBvcnRzU2VydmljZSddO1xuXG4gICAgZnVuY3Rpb24gUmVwb3J0c0N0cmwoYXBwU2VydmljZSwgcmVwb3J0c1NlcnZpY2UpIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcbiAgICAgICAgdm0udGl0bGUgPSAncmVwb3J0cyc7XG5cbiAgICAgICAgdm0ubG9hZGluZyA9IHRydWU7XG4gICAgICAgIHZtLnJlcG9ydERhdGEgPSB7fTtcbiAgICAgICAgdm0uZm9ybWF0RGF0ZSA9IGFwcFNlcnZpY2UuZm9ybWF0RGF0ZTtcblxuICAgICAgICBpbml0KCk7XG5cbiAgICAgICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgICAgIHJlcG9ydHNTZXJ2aWNlLmdldFJlcG9ydERhdGEoKS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2bS5yZXBvcnREYXRhID0gZGF0YTtcbiAgICAgICAgICAgICAgICB2bS5sb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgfTtcbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdlbnRlcnByaXNlQXBwLnJlcG9ydHMnKVxuICAgICAgICAuZmFjdG9yeSgncmVwb3J0c1NlcnZpY2UnLCByZXBvcnRzU2VydmljZSk7XG5cbiAgICByZXBvcnRzU2VydmljZS4kaW5qZWN0ID0gWyckaHR0cCcsICckbG9nJywgJ2FwcFNlcnZpY2UnXTtcblxuICAgIGZ1bmN0aW9uIHJlcG9ydHNTZXJ2aWNlKCRodHRwLCAkbG9nLCBhcHBTZXJ2aWNlKSB7XG4gICAgICAgIHZhciBzZXJ2aWNlID0ge1xuICAgICAgICAgICAgZ2V0UmVwb3J0RGF0YTogZ2V0UmVwb3J0RGF0YVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBzZXJ2aWNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldFJlcG9ydERhdGEoKSB7XG4gICAgICAgICAgICB2YXIgcmVwb3J0RGF0YSA9IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAxLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAwMSxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDIsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibHVlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDUwMFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMixcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMTEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdyZWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMjBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncGxhaWQgc29ja3MnLFxuICAgICAgICAgICAgICAgICAgICBxdWFudGl0eTogMzBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDMsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDEzLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYXJneWxlIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDQwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgcmV0dXJuIGFwcFNlcnZpY2Uuc2ltdWxhdGVCYWNrZW5kQ2FsbCh7ZGF0YTogcmVwb3J0RGF0YX0pLnRoZW4ocHJvY2Vzc0RhdGEpO1xuXG4gICAgICAgICAgICAvLyByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3JlcG9ydC1kYXRhJylcbiAgICAgICAgICAgIC8vICAgICAudGhlbihwcm9jZXNzRGF0YSlcbiAgICAgICAgICAgIC8vICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgICRsb2cuZXJyb3IoJ2dldCBkYXRhIGNhbGwgZmFpbGVkOiAnICsgZXJyb3IpO1xuICAgICAgICAgICAgLy8gICAgICAgICAgICAgLy9wb3NzaWJseSBoYW5kbGUgZXJyb3IgYnkgcmVkaXJlY3RpbmcgdG8gbG9naW4gb3IgbWFpbiBzY3JlZW5cbiAgICAgICAgICAgIC8vICAgICAgICAgfVxuICAgICAgICAgICAgLy8gICAgICk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHByb2Nlc3NEYXRhKGRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YS5kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSkoKTtcbiIsIihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICBhbmd1bGFyXG4gICAgICAgIC5tb2R1bGUoJ2VudGVycHJpc2VBcHAnKVxuICAgICAgICAuZGlyZWN0aXZlKCdzcGlubmVyJywgW1xuICAgICAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdHJpY3Q6ICdFQScsXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnZnJhbWV3b3JrL3NoYXJlZC9zcGlubmVyL3NwaW5uZXIuaHRtbCcsXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzbWFsbDogJ0A/J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG59KSgpO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
