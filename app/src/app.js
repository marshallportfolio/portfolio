

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
