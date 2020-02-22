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
