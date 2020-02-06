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
