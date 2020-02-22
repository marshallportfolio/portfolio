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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRhc2hib2FyZHMvZGFzaGJvYXJkcy5tb2R1bGUuanMiLCJzZXR0aW5ncy9zZXR0aW5ncy5tb2R1bGUuanMiLCJyZXBvcnRzL3JlcG9ydHMubW9kdWxlLmpzIiwiYXBwLmpzIiwiYXBwLnNlcnZpY2UuanMiLCJkYXNoYm9hcmRzL2Rhc2hib2FyZHMuY29udHJvbGxlci5qcyIsImRhc2hib2FyZHMvZGFzaGJvYXJkcy5zZXJ2aWNlLmpzIiwic2V0dGluZ3Mvc2V0dGluZ3MuY29udHJvbGxlci5qcyIsInJlcG9ydHMvcmVwb3J0cy5jb250cm9sbGVyLmpzIiwicmVwb3J0cy9yZXBvcnRzLnNlcnZpY2UuanMiLCJmcmFtZXdvcmsvc2hhcmVkL3NwaW5uZXIvc3Bpbm5lci5kaXJlY3RpdmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcDE1ODIzMzEwNTQzMTYuanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdlbnRlcnByaXNlQXBwLmRhc2hib2FyZHMnLCBbJ3VpLnJvdXRlciddKVxuXG4gICAgICAgIC5jb25maWcoWyckc3RhdGVQcm92aWRlcicsIGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgICAgICAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZGFzaGJvYXJkcycsIHtcbiAgICAgICAgICAgICAgICB1cmw6ICcvZGFzaGJvYXJkcycsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdkYXNoYm9hcmRzL2Rhc2hib2FyZHMuaHRtbCcsXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0Rhc2hib2FyZHNDdHJsJyxcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XSk7XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZW50ZXJwcmlzZUFwcC5zZXR0aW5ncycsIFsndWkucm91dGVyJ10pXG5cbiAgICAuY29uZmlnKFsnJHN0YXRlUHJvdmlkZXInLCBmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAgICAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnc2V0dGluZ3MnLCB7XG4gICAgICAgICAgICBuYW1lOiAnc2V0dGluZ3MnLFxuICAgICAgICAgICAgdXJsOiAnL3NldHRpbmdzJyxcbiAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnc2V0dGluZ3Mvc2V0dGluZ3MuaHRtbCcsXG4gICAgICAgICAgICBjb250cm9sbGVyOiAnU2V0dGluZ3NDdHJsJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXJBczogJ3ZtJ1xuICAgICAgICB9KTtcbiAgICB9XSk7XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdlbnRlcnByaXNlQXBwLnJlcG9ydHMnLCBbJ3VpLnJvdXRlciddKVxuXG4gICAgLmNvbmZpZyhbJyRzdGF0ZVByb3ZpZGVyJywgZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAgICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3JlcG9ydHMnLCB7XG4gICAgICAgICAgICB1cmw6ICcvcmVwb3J0cycsXG4gICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3JlcG9ydHMvcmVwb3J0cy5odG1sJyxcbiAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdSZXBvcnRzQ3RybCcsXG4gICAgICAgICAgICBjb250cm9sbGVyQXM6ICd2bScsXG4gICAgICAgICAgICBuYW1lOiAncmVwb3J0cydcbiAgICAgICAgfSk7XG4gICAgfV0pO1xuXG59KSgpO1xuIiwiXG5cbihmdW5jdGlvbigpIHtcbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBEZWNsYXJlIGFwcCBsZXZlbCBtb2R1bGUgd2hpY2ggZGVwZW5kcyBvbiB2aWV3cywgYW5kIGNvcmUgY29tcG9uZW50c1xuICAgIGFuZ3VsYXIubW9kdWxlKCdlbnRlcnByaXNlQXBwJywgW1xuICAgICAgICAndWkucm91dGVyJyxcbiAgICAgICAgJ25nU2FuaXRpemUnLFxuICAgICAgICAncGFzY2FscHJlY2h0LnRyYW5zbGF0ZScsXG4gICAgICAgICdlbnRlcnByaXNlQXBwLmRhc2hib2FyZHMnLFxuICAgICAgICAnZW50ZXJwcmlzZUFwcC5yZXBvcnRzJyxcbiAgICAgICAgJ2VudGVycHJpc2VBcHAuc2V0dGluZ3MnLFxuICAgICAgICAnZW50ZXJwcmlzZUFwcC50ZW1wbGF0ZXMnXG4gICAgXSlcbiAgICAgICAgLmNvbmZpZyhbXG4gICAgICAgICAgICAnJGxvY2F0aW9uUHJvdmlkZXInLCAnJHRyYW5zbGF0ZVByb3ZpZGVyJywgJyR1cmxSb3V0ZXJQcm92aWRlcicsXG4gICAgICAgICAgICBmdW5jdGlvbigkbG9jYXRpb25Qcm92aWRlciwgJHRyYW5zbGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAkbG9jYXRpb25Qcm92aWRlci5oYXNoUHJlZml4KCchJyk7XG5cbiAgICAgICAgICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvZGFzaGJvYXJkcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gQ29uZmlndXJlIHRyYW5zbGF0aW9uc1xuICAgICAgICAgICAgICAgICR0cmFuc2xhdGVQcm92aWRlclxuICAgICAgICAgICAgICAgICAgICAudXNlU3RhdGljRmlsZXNMb2FkZXIoe1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZml4OiAnbDEwbi8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VmZml4OiAnLmpzb24nXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5yZWdpc3RlckF2YWlsYWJsZUxhbmd1YWdlS2V5cyhbJ2VuLVVTJywgJ2phJ10sIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdlbic6ICdlbi1VUycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZW5fKic6ICdlbi1VUycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnZW4tKic6ICdlbi1VUycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnamEnOiAnamEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2phLSonOiAnamEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ2phXyonOiAnamEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJyonOiAnZW4tVVMnXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIC5kZXRlcm1pbmVQcmVmZXJyZWRMYW5ndWFnZSgpXG4gICAgICAgICAgICAgICAgICAgIC5mYWxsYmFja0xhbmd1YWdlKCdlbi1VUycpO1xuXG4gICAgICAgICAgICAgICAgLy8gUHJvdGVjdCBmcm9tIGluc2VydGlvbiBhdHRhY2tzIGluIHRoZSB0cmFuc2xhdGlvbiB2YWx1ZXMuXG4gICAgICAgICAgICAgICAgJHRyYW5zbGF0ZVByb3ZpZGVyLnVzZVNhbml0aXplVmFsdWVTdHJhdGVneSgnc2FuaXRpemVQYXJhbWV0ZXJzJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pXG4gICAgICAgIC5jb250cm9sbGVyKCdlbnRlcnByaXNlQXBwQ29udHJvbGxlcicsIGVudGVycHJpc2VBcHBDb250cm9sbGVyKTtcblxuICAgIGVudGVycHJpc2VBcHBDb250cm9sbGVyLiRpbmplY3QgPSBbJyRsb2cnLCAnJHNjb3BlJywgJyRyb290U2NvcGUnXTtcblxuICAgIGZ1bmN0aW9uIGVudGVycHJpc2VBcHBDb250cm9sbGVyKCRsb2csICRzY29wZSwgJHJvb3RTY29wZSkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzO1xuXG4gICAgICAgIHZtLmlzTG9hZGluZyA9IHRydWU7XG4gICAgICAgIHZtLnNob3dOYXZNZW51ID0gdHJ1ZTtcbiAgICAgICAgdm0uc2hvd01vYmlsZU1lbnUgPSBmYWxzZTtcblxuICAgICAgICB2bS5jdXJyZW50TWVudSA9ICdkYXNoYm9hcmRzJztcblxuICAgICAgICB2bS5zZWxlY3RNZW51SXRlbSA9IGZ1bmN0aW9uKG1lbnVOYW1lKSB7XG4gICAgICAgICAgICB2bS5jdXJyZW50TWVudSA9IG1lbnVOYW1lO1xuICAgICAgICAgICAgdm0uc2hvd01vYmlsZU1lbnUgPSBmYWxzZTtcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgdHJhbnNsYXRpb25MaXN0ZW5lciA9ICRyb290U2NvcGUuJG9uKCckdHJhbnNsYXRlQ2hhbmdlRW5kJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2bS5pc0xvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHJvdXRlTGlzdGVuZXIgPSAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3VjY2VzcycsIGZ1bmN0aW9uKGV2ZW50LCB0b1N0YXRlKSB7XG4gICAgICAgICAgICAkbG9nLmRlYnVnKCdJbiBzdGF0ZUNoYW5nZVN1Y2Nlc3MgbG9hZGluZyBzdGF0ZTonICsgdG9TdGF0ZS5uYW1lKTtcbiAgICAgICAgICAgIGlmICh0b1N0YXRlICYmIHRvU3RhdGUubmFtZSkge1xuICAgICAgICAgICAgICAgIHZtLmN1cnJlbnRNZW51ID0gdG9TdGF0ZS5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkc2NvcGUuJG9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdHJhbnNsYXRpb25MaXN0ZW5lcigpO1xuICAgICAgICAgICAgcm91dGVMaXN0ZW5lcigpO1xuICAgICAgICB9KTtcbiAgICB9XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZW50ZXJwcmlzZUFwcCcpXG4gICAgICAgIC5mYWN0b3J5KCdhcHBTZXJ2aWNlJywgYXBwU2VydmljZSk7XG5cbiAgICBhcHBTZXJ2aWNlLiRpbmplY3QgPSBbJyRodHRwJywgJyRsb2cnLCAnJHRpbWVvdXQnXTtcblxuICAgIGZ1bmN0aW9uIGFwcFNlcnZpY2UoJGh0dHAsICRsb2csICR0aW1lb3V0KSB7XG5cbiAgICAgICAgdmFyIHByZWZlcnJlZExhbmd1YWdlID0gJ2VuLVVTJztcblxuICAgICAgICB2YXIgc2VydmljZSA9IHtcbiAgICAgICAgICAgIHByZWZlcnJlZExhbmd1YWdlOiBwcmVmZXJyZWRMYW5ndWFnZSxcbiAgICAgICAgICAgIHNpbXVsYXRlQmFja2VuZENhbGw6IHNpbXVsYXRlQmFja2VuZENhbGwsXG4gICAgICAgICAgICBmb3JtYXREYXRlOiBmb3JtYXREYXRlXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHNlcnZpY2U7XG5cbiAgICAgICAgZnVuY3Rpb24gc2ltdWxhdGVCYWNrZW5kQ2FsbChkYXRhKSB7XG4gICAgICAgICAgICAvL1NpbmNlIHRoaXMgc2FtcGxlIGFwcCBpcyBkZXNpZ25lZCB0byBydW4gb24gYSBHaXRIdWIgUGFnZSwgaXQgaGFzIG5vIGJhY2tlbmQgdG8gbWFrZSBjYWxscyB0by5cbiAgICAgICAgICAgIC8vV2Ugc3RpbGwgd2FudCB0aGUgYXBwIHRvIGhhbmRsZSBhc3luY2hyb25vdXMgY2FsbHMgYW5kIGRlYWwgd2l0aCB0aGUgZGVsYXlzIGFuZCBzdWNoIHRoYXQgcmVtb3RlXG4gICAgICAgICAgICAvL2NhbGxzIGludHJvZHVjZSwgc28gd2UnbGwgc2ltdWxhdGUgY2FsbHMgdG8gdGhlIGJhY2tlbmQgd2l0aCBhIHRpbWVvdXQgZnVuY3Rpb24gdGhhdCBkZWxheXMgdXAgdG8gYSBmZXdcbiAgICAgICAgICAgIC8vc2Vjb25kcyBiZWZvcmUgcmVzb2x2aW5nIGEgcHJvbWlzZS5cbiAgICAgICAgICAgIHJldHVybiAkdGltZW91dChmdW5jdGlvbigpIHsgcmV0dXJuIGRhdGE7IH0sIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIE1hdGguZmxvb3IoNDAwMCkpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdERhdGUoZGF0ZSkge1xuICAgICAgICAgICAgaWYgKCFhbmd1bGFyLmlzRGVmaW5lZChkYXRlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtb21lbnQoZGF0ZSwgJ1lZWVlNTUREJykuZm9ybWF0KCdMJyk7XG4gICAgICAgIH1cbiAgICB9XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlbnRlcnByaXNlQXBwLmRhc2hib2FyZHMnKVxuICAgICAgICAuY29udHJvbGxlcignRGFzaGJvYXJkc0N0cmwnLCBEYXNoYm9hcmRzQ3RybCk7XG5cbiAgICBEYXNoYm9hcmRzQ3RybC4kaW5qZWN0ID0gWydhcHBTZXJ2aWNlJywgJ2Rhc2hib2FyZHNTZXJ2aWNlJ107XG5cbiAgICBmdW5jdGlvbiBEYXNoYm9hcmRzQ3RybChhcHBTZXJ2aWNlLCBkYXNoYm9hcmRzU2VydmljZSkge1xuICAgICAgICB2YXIgdm0gPSB0aGlzO1xuICAgICAgICB2bS50aXRsZSA9ICdkYXNoYm9hcmRzJztcblxuICAgICAgICB2bS5waWVMb2FkaW5nID0gdHJ1ZTtcbiAgICAgICAgdm0uYmFyTG9hZGluZyA9IHRydWU7XG4gICAgICAgIHZtLmxpbmVMb2FkaW5nID0gdHJ1ZTtcblxuICAgICAgICB2bS5zdGFydERhdGUgPSBtb21lbnQoKS5zdWJ0cmFjdCg2LCAnZGF5cycpLmZvcm1hdCgnWVlZWU1NREQnKTtcbiAgICAgICAgdm0uZW5kRGF0ZSA9IG1vbWVudCgpLmZvcm1hdCgnWVlZWU1NREQnKTtcblxuICAgICAgICB2bS5waWVDaGFydERhdGE7XG4gICAgICAgIHZtLmJhckNoYXJ0RGF0YTtcbiAgICAgICAgdm0ubGluZUNoYXJ0RGF0YTtcbiAgICAgICAgdm0uZm9ybWF0RGF0ZSA9IGFwcFNlcnZpY2UuZm9ybWF0RGF0ZTtcblxuICAgICAgICBpbml0KCk7XG5cbiAgICAgICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgICAgIGRhc2hib2FyZHNTZXJ2aWNlLmdldFBpZUNoYXJ0RGF0YSgpLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHZtLnBpZUNoYXJ0RGF0YSA9IGZvcm1hdFBpZUNoYXJ0RGF0YShkYXRhLmRhdGEpO1xuICAgICAgICAgICAgICAgIHZtLnBpZUxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBkYXNoYm9hcmRzU2VydmljZS5nZXRCYXJDaGFydERhdGEoKS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgICAgICB2bS5iYXJDaGFydERhdGEgPSBmb3JtYXRCYXJDaGFydERhdGEoZGF0YS5kYXRhKTtcbiAgICAgICAgICAgICAgICB2bS5iYXJMb2FkaW5nID0gZmFsc2U7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZGFzaGJvYXJkc1NlcnZpY2UuZ2V0TGluZUNoYXJ0RGF0YSgpLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgICAgIHZtLmxpbmVDaGFydERhdGEgPSBmb3JtYXRMaW5lQ2hhcnREYXRhKGRhdGEuZGF0YSk7XG4gICAgICAgICAgICAgICAgdm0ubGluZUxvYWRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZm9ybWF0UGllQ2hhcnREYXRhKHZhbHVlcykge1xuICAgICAgICAgICAgc29ydFZhbHVlcyh2YWx1ZXMpO1xuXG4gICAgICAgICAgICB2YXIgdG90YWwgPSB2YWx1ZXMucmVkdWNlKHN1bSwgMCk7XG4gICAgICAgICAgICB2YXIgb2Zmc2V0ID0gMDtcblxuICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49dmFsdWVzLmxlbmd0aDsgaTxsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhbHVlc1tpXS5vZmZzZXQgPSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgdmFsdWVzW2ldLnBlcmNlbnQgPSB2YWx1ZXNbaV0udmFsdWUgLyB0b3RhbCAqIDEwMDtcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gdmFsdWVzW2ldLnBlcmNlbnQ7XG4gICAgICAgICAgICAgICAgdmFsdWVzW2ldLm92ZXI1MCA9IHZhbHVlc1tpXS5wZXJjZW50ID4gNTAgPyAxIDogMDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGZvcm1hdEJhckNoYXJ0RGF0YSh2YWx1ZXMpIHtcbiAgICAgICAgICAgIHNvcnRWYWx1ZXModmFsdWVzKTtcblxuICAgICAgICAgICAgdmFyIHRvdGFsID0gdmFsdWVzLnJlZHVjZShzdW0sIDApO1xuICAgICAgICAgICAgdmFsdWVzLnRvcE1vc3RQb2ludCA9IHZhbHVlc1swXS52YWx1ZTtcblxuICAgICAgICAgICAgZm9yICh2YXIgaT0wLCBsZW49dmFsdWVzLmxlbmd0aDsgaTxsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhbHVlc1tpXS5wZXJjZW50ID0gdmFsdWVzW2ldLnZhbHVlIC8gdG90YWwgKiAxMDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmb3JtYXRMaW5lQ2hhcnREYXRhKHZhbHVlcykge1xuXG4gICAgICAgICAgICAvL2RpdmlkZSAyMDBweCBieSB0b3RhbCBudW1iZXIgb2YgcG9pbnRzIHRvIGdldCBsZW5ndGggb2YgdHJpYW5nbGUgYmFzZS4gVGhhdCBiZWNvbWVzIHRoZSBsZWZ0IG9mZnNldCBmb3IgZWFjaCBuZXcgcG9pbnRcbiAgICAgICAgICAgIC8vc3VidHJhY3QgcHJldmlvdXMgcG9pbnQgaGVpZ2h0IGZyb20gbmV3IHBvaW50IGhlaWdodCB0byBnZXQgdGhlIHJpc2Ugb2YgdGhlIHRyaWFuZ2xlLiBUaGF0IGJlY29tZXMgdGhlIGJvdHRvbSBvZmZzZXQgZm9yIHRoZSBuZXcgcG9pbnQuXG4gICAgICAgICAgICAvL3VzZSBiYXNlIHNxdWFyZWQgKyByaXNlIHNxdWFyZWQgdG8gZmluZCB0aGUgbGVuZ3RoIG9mIHRoZSBoeXBvdGVudXNlLiBUaGF0IGJlY29tZXMgdGhlIHdpZHRoIG9mIHRoZSBsaW5lIHRvIGRyYXcuXG4gICAgICAgICAgICAvL3VzZSBNYXRoLmFzaW4oYmFzZSAvIGh5cG90ZW51c2UpIFt0aGVuIGNvbnZlcnQgdGhlIHJhZGlhbnMgdG8gZGVncmVlc10gdG8gZmluZCB0aGUgZGVncmVlIGFuZ2xlIHRvIHJvdGF0ZSB0aGUgbGluZSB0by5cbiAgICAgICAgICAgIC8vTXVsdGlwbHkgdGhlIHJvdGF0aW9uIGFuZ2xlIGJ5IC0xIGlmIGl0IG5lZWRzIHRvIHJpc2UgdG8gbWVldCB0aGUgbmV4dCBwb2ludC5cblxuICAgICAgICAgICAgdmFyIGJhc2UgPSAyMDAgLyB2YWx1ZXMubGVuZ3RoO1xuXG4gICAgICAgICAgICBzb3J0VmFsdWVzKHZhbHVlcyk7XG5cbiAgICAgICAgICAgIHZhciB0b3BNb3N0UG9pbnQgPSB2YWx1ZXNbMF0udmFsdWU7XG4gICAgICAgICAgICB2YXIgd2lkZ2V0U2l6ZSA9IDIwMDtcbiAgICAgICAgICAgIHZhciBsZWZ0T2Zmc2V0ID0gNDA7IC8vcGFkZGluZyBmb3IgbGVmdCBheGlzIGxhYmVsc1xuICAgICAgICAgICAgdmFyIG5leHRQb2ludCA9IDA7XG4gICAgICAgICAgICB2YXIgcmlzZSA9IDA7XG4gICAgICAgICAgICB2YXIgY3NzVmFsdWVzID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGk9MCwgbGVuPXZhbHVlcy5sZW5ndGgtMTsgaTxsZW47IGkrKykge1xuXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogMCxcbiAgICAgICAgICAgICAgICAgICAgYm90dG9tOiAwLFxuICAgICAgICAgICAgICAgICAgICBoeXBvdGVudXNlOiAwLFxuICAgICAgICAgICAgICAgICAgICBhbmdsZTogMCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IDAsXG4gICAgICAgICAgICAgICAgICAgIGl0ZW06ICcnXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZS52YWx1ZSA9IHZhbHVlc1tpXS52YWx1ZTtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUuaXRlbSA9IHZhbHVlc1tpXS5pdGVtO1xuXG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlLmxlZnQgPSBsZWZ0T2Zmc2V0ID4gMCA/IGxlZnRPZmZzZXQgLSAyIDogbGVmdE9mZnNldDsgLy9hZGp1c3QgZm9yIGJvcmRlclxuICAgICAgICAgICAgICAgIGxlZnRPZmZzZXQgKz0gYmFzZTtcblxuICAgICAgICAgICAgICAgIGN1cnJlbnRWYWx1ZS5ib3R0b20gPSB3aWRnZXRTaXplICogKGN1cnJlbnRWYWx1ZS52YWx1ZSAvIHRvcE1vc3RQb2ludCk7XG4gICAgICAgICAgICAgICAgbmV4dFBvaW50ID0gd2lkZ2V0U2l6ZSAqICh2YWx1ZXNbaSsxXS52YWx1ZSAvIHRvcE1vc3RQb2ludCk7XG5cbiAgICAgICAgICAgICAgICByaXNlID0gY3VycmVudFZhbHVlLmJvdHRvbSAtIG5leHRQb2ludDtcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWUuaHlwb3RlbnVzZSA9IE1hdGguc3FydCgoYmFzZSAqIGJhc2UpICsgKHJpc2UgKiByaXNlKSk7XG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlLmFuZ2xlID0gcmFkaWFuc1RvRGVncmVlcyhNYXRoLmFzaW4ocmlzZSAvIGN1cnJlbnRWYWx1ZS5oeXBvdGVudXNlKSk7XG5cbiAgICAgICAgICAgICAgICBjc3NWYWx1ZXMucHVzaChjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgbGFzdFBvaW50ID0ge1xuICAgICAgICAgICAgICAgIGxlZnQ6IGxlZnRPZmZzZXQgLSAyLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogd2lkZ2V0U2l6ZSAqICh2YWx1ZXNbdmFsdWVzLmxlbmd0aCAtIDFdLnZhbHVlIC8gdG9wTW9zdFBvaW50KSxcbiAgICAgICAgICAgICAgICBoeXBvdGVudXNlOiAwLFxuICAgICAgICAgICAgICAgIGFuZ2xlOiAwLFxuICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZXNbdmFsdWVzLmxlbmd0aCAtIDFdLnZhbHVlLFxuICAgICAgICAgICAgICAgIGl0ZW06IHZhbHVlc1t2YWx1ZXMubGVuZ3RoIC0gMV0uaXRlbVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY3NzVmFsdWVzLnB1c2gobGFzdFBvaW50KTtcbiAgICAgICAgICAgIGNzc1ZhbHVlcy50b3BNb3N0UG9pbnQgPSB0b3BNb3N0UG9pbnQ7XG5cblxuICAgICAgICAgICAgZnVuY3Rpb24gcmFkaWFuc1RvRGVncmVlcyhyYWRzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJhZHMgKiAoMTgwIC8gTWF0aC5QSSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjc3NWYWx1ZXM7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBzb3J0VmFsdWVzKHZhbHVlcykge1xuICAgICAgICAgICAgdmFsdWVzLnNvcnQoZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYi52YWx1ZSAtIGEudmFsdWU7IH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gc3VtKHRvdGFsLCB2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHRvdGFsICsgdmFsdWUudmFsdWU7XG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdlbnRlcnByaXNlQXBwLmRhc2hib2FyZHMnKVxuICAgICAgICAuZmFjdG9yeSgnZGFzaGJvYXJkc1NlcnZpY2UnLCBkYXNoYm9hcmRzU2VydmljZSk7XG5cbiAgICBkYXNoYm9hcmRzU2VydmljZS4kaW5qZWN0ID0gWyckaHR0cCcsICckbG9nJywgJ2FwcFNlcnZpY2UnXTtcblxuICAgIGZ1bmN0aW9uIGRhc2hib2FyZHNTZXJ2aWNlKCRodHRwLCAkbG9nLCBhcHBTZXJ2aWNlKSB7XG5cbiAgICAgICAgdmFyIHJlcG9ydERhdGEgPSB7XG4gICAgICAgICAgICBzdGFydERhdGU6IG1vbWVudCgpLnN1YnRyYWN0KDYsICdkYXlzJykuZm9ybWF0KCdZWVlZTU1ERCcpLFxuICAgICAgICAgICAgZW5kRGF0ZTogbW9tZW50KCkuZm9ybWF0KCdZWVlZTU1ERCcpLFxuICAgICAgICAgICAgZGF0YTogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbTogJ2JsYWNrIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ05VTUJFUicsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiA2MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpdGVtOiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdOVU1CRVInLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogNVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpdGVtOiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ05VTUJFUicsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAxNVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBpdGVtOiAnbmV3IHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ05VTUJFUicsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAyMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgc2VydmljZSA9IHtcbiAgICAgICAgICAgIGdldFBpZUNoYXJ0RGF0YTogZ2V0UGllQ2hhcnREYXRhLFxuICAgICAgICAgICAgZ2V0QmFyQ2hhcnREYXRhOiBnZXRCYXJDaGFydERhdGEsXG4gICAgICAgICAgICBnZXRMaW5lQ2hhcnREYXRhOiBnZXRMaW5lQ2hhcnREYXRhLFxuICAgICAgICAgICAgZ2V0UmVwb3J0RGF0YTogcmVwb3J0RGF0YVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBzZXJ2aWNlO1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldFBpZUNoYXJ0RGF0YSgpIHtcblxuICAgICAgICAgICAgcmV0dXJuIGFwcFNlcnZpY2Uuc2ltdWxhdGVCYWNrZW5kQ2FsbCh7ZGF0YTogcmVwb3J0RGF0YX0pLnRoZW4ocHJvY2Vzc0RhdGEpO1xuXG4gICAgICAgICAgICAvLyByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2RhdGEvcGllJylcbiAgICAgICAgICAgIC8vICAgICAudGhlbihwcm9jZXNzRGF0YSlcbiAgICAgICAgICAgIC8vICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgJGxvZy5lcnJvcignZ2V0IGRhdGEgY2FsbCBmYWlsZWQ6ICcgKyBlcnJvcik7XG4gICAgICAgICAgICAvLyAgICAgICAgIC8vcG9zc2libHkgaGFuZGxlIGVycm9yIGJ5IHJlZGlyZWN0aW5nIHRvIGxvZ2luIG9yIG1haW4gc2NyZWVuXG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldEJhckNoYXJ0RGF0YSgpIHtcblxuICAgICAgICAgICAgcmV0dXJuIGFwcFNlcnZpY2Uuc2ltdWxhdGVCYWNrZW5kQ2FsbCh7ZGF0YTogcmVwb3J0RGF0YX0pLnRoZW4ocHJvY2Vzc0RhdGEpO1xuXG4gICAgICAgICAgICAvLyByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2RhdGEvYmFyJylcbiAgICAgICAgICAgIC8vICAgICAudGhlbihwcm9jZXNzRGF0YSlcbiAgICAgICAgICAgIC8vICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIC8vICAgICAgICAgJGxvZy5lcnJvcignZ2V0IGRhdGEgY2FsbCBmYWlsZWQ6ICcgKyBlcnJvcik7XG4gICAgICAgICAgICAvLyAgICAgICAgIC8vcG9zc2libHkgaGFuZGxlIGVycm9yIGJ5IHJlZGlyZWN0aW5nIHRvIGxvZ2luIG9yIG1haW4gc2NyZWVuXG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGdldExpbmVDaGFydERhdGEoKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBhcHBTZXJ2aWNlLnNpbXVsYXRlQmFja2VuZENhbGwoe2RhdGE6IHJlcG9ydERhdGF9KS50aGVuKHByb2Nlc3NEYXRhKTtcblxuICAgICAgICAgICAgLy8gcmV0dXJuICRodHRwLmdldCgnL2FwaS9kYXRhL2JhcicpXG4gICAgICAgICAgICAvLyAgICAgLnRoZW4ocHJvY2Vzc0RhdGEpXG4gICAgICAgICAgICAvLyAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICRsb2cuZXJyb3IoJ2dldCBkYXRhIGNhbGwgZmFpbGVkOiAnICsgZXJyb3IpO1xuICAgICAgICAgICAgLy8gICAgICAgICAvL3Bvc3NpYmx5IGhhbmRsZSBlcnJvciBieSByZWRpcmVjdGluZyB0byBsb2dpbiBvciBtYWluIHNjcmVlblxuICAgICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAgIC8vICk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBwcm9jZXNzRGF0YShkYXRhKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS5kYXRhO1xuICAgICAgICB9XG5cbiAgICB9XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlbnRlcnByaXNlQXBwLnNldHRpbmdzJylcbiAgICAuY29udHJvbGxlcignU2V0dGluZ3NDdHJsJywgU2V0dGluZ3NDdHJsKTtcblxuICAgIFNldHRpbmdzQ3RybC4kaW5qZWN0ID0gWyckcm9vdFNjb3BlJywgJyR0cmFuc2xhdGUnLCAnYXBwU2VydmljZSddO1xuXG4gICAgZnVuY3Rpb24gU2V0dGluZ3NDdHJsKCRyb290U2NvcGUsICR0cmFuc2xhdGUsIGFwcFNlcnZpY2UpIHtcbiAgICAgICAgdmFyIHZtID0gdGhpcztcbiAgICAgICAgdm0ubGFuZyA9IGFwcFNlcnZpY2UucHJlZmVycmVkTGFuZ3VhZ2U7XG4gICAgICAgIHZtLnRpdGxlID0gJ3NldHRpbmdzJztcblxuICAgICAgICB2bS5jaGFuZ2VMYW5ndWFnZUFuZExvY2FsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgYXBwU2VydmljZS5wcmVmZXJyZWRMYW5ndWFnZSA9IHZtLmxhbmc7XG4gICAgICAgICAgICBtb21lbnQubG9jYWxlKHZtLmxhbmcpO1xuICAgICAgICAgICAgJHRyYW5zbGF0ZS51c2Uodm0ubGFuZyk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2xhbmd1YWdlQ2hhbmdlJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXIubW9kdWxlKCdlbnRlcnByaXNlQXBwLnJlcG9ydHMnKVxuICAgIC5jb250cm9sbGVyKCdSZXBvcnRzQ3RybCcsIFJlcG9ydHNDdHJsKTtcblxuICAgIFJlcG9ydHNDdHJsLiRpbmplY3QgPSBbJ2FwcFNlcnZpY2UnLCAncmVwb3J0c1NlcnZpY2UnXTtcblxuICAgIGZ1bmN0aW9uIFJlcG9ydHNDdHJsKGFwcFNlcnZpY2UsIHJlcG9ydHNTZXJ2aWNlKSB7XG4gICAgICAgIHZhciB2bSA9IHRoaXM7XG4gICAgICAgIHZtLnRpdGxlID0gJ3JlcG9ydHMnO1xuXG4gICAgICAgIHZtLmxvYWRpbmcgPSB0cnVlO1xuICAgICAgICB2bS5yZXBvcnREYXRhID0ge307XG4gICAgICAgIHZtLmZvcm1hdERhdGUgPSBhcHBTZXJ2aWNlLmZvcm1hdERhdGU7XG5cbiAgICAgICAgaW5pdCgpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICAgICAgICByZXBvcnRzU2VydmljZS5nZXRSZXBvcnREYXRhKCkudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgICAgICAgdm0ucmVwb3J0RGF0YSA9IGRhdGE7XG4gICAgICAgICAgICAgICAgdm0ubG9hZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgIH07XG59KSgpO1xuIiwiKGZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIGFuZ3VsYXJcbiAgICAgICAgLm1vZHVsZSgnZW50ZXJwcmlzZUFwcC5yZXBvcnRzJylcbiAgICAgICAgLmZhY3RvcnkoJ3JlcG9ydHNTZXJ2aWNlJywgcmVwb3J0c1NlcnZpY2UpO1xuXG4gICAgcmVwb3J0c1NlcnZpY2UuJGluamVjdCA9IFsnJGh0dHAnLCAnJGxvZycsICdhcHBTZXJ2aWNlJ107XG5cbiAgICBmdW5jdGlvbiByZXBvcnRzU2VydmljZSgkaHR0cCwgJGxvZywgYXBwU2VydmljZSkge1xuICAgICAgICB2YXIgc2VydmljZSA9IHtcbiAgICAgICAgICAgIGdldFJlcG9ydERhdGE6IGdldFJlcG9ydERhdGFcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gc2VydmljZTtcblxuICAgICAgICBmdW5jdGlvbiBnZXRSZXBvcnREYXRhKCkge1xuICAgICAgICAgICAgdmFyIHJlcG9ydERhdGEgPSBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkYXRlOiAyMDIwMDEwMSxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IDEwMDEsXG4gICAgICAgICAgICAgICAgICAgIHByb2R1Y3Q6ICdibGFjayBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiAyMDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDEsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDAyLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAnYmx1ZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA1MDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogMjAyMDAxMDIsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAxMDExLFxuICAgICAgICAgICAgICAgICAgICBwcm9kdWN0OiAncmVkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDIwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAyLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMixcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ3BsYWlkIHNvY2tzJyxcbiAgICAgICAgICAgICAgICAgICAgcXVhbnRpdHk6IDMwXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGU6IDIwMjAwMTAzLFxuICAgICAgICAgICAgICAgICAgICBpZDogMTAxMyxcbiAgICAgICAgICAgICAgICAgICAgcHJvZHVjdDogJ2FyZ3lsZSBzb2NrcycsXG4gICAgICAgICAgICAgICAgICAgIHF1YW50aXR5OiA0MFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHJldHVybiBhcHBTZXJ2aWNlLnNpbXVsYXRlQmFja2VuZENhbGwoe2RhdGE6IHJlcG9ydERhdGF9KS50aGVuKHByb2Nlc3NEYXRhKTtcblxuICAgICAgICAgICAgLy8gcmV0dXJuICRodHRwLmdldCgnL2FwaS9yZXBvcnQtZGF0YScpXG4gICAgICAgICAgICAvLyAgICAgLnRoZW4ocHJvY2Vzc0RhdGEpXG4gICAgICAgICAgICAvLyAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgICAgICAvLyAgICAgICAgICAgICAkbG9nLmVycm9yKCdnZXQgZGF0YSBjYWxsIGZhaWxlZDogJyArIGVycm9yKTtcbiAgICAgICAgICAgIC8vICAgICAgICAgICAgIC8vcG9zc2libHkgaGFuZGxlIGVycm9yIGJ5IHJlZGlyZWN0aW5nIHRvIGxvZ2luIG9yIG1haW4gc2NyZWVuXG4gICAgICAgICAgICAvLyAgICAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICApO1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBwcm9jZXNzRGF0YShkYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRhdGEuZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pKCk7XG4iLCIoZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgYW5ndWxhclxuICAgICAgICAubW9kdWxlKCdlbnRlcnByaXNlQXBwJylcbiAgICAgICAgLmRpcmVjdGl2ZSgnc3Bpbm5lcicsIFtcbiAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3RyaWN0OiAnRUEnLFxuICAgICAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2ZyYW1ld29yay9zaGFyZWQvc3Bpbm5lci9zcGlubmVyLmh0bWwnLFxuICAgICAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc21hbGw6ICdAPydcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xufSkoKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
