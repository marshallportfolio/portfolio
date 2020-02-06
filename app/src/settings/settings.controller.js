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
