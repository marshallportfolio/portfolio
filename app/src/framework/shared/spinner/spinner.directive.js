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
