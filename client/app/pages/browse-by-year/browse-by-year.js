app.controller("BrowseByYearPage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;

  $scope.today = new Date();
  $scope.currentYear = (new Date()).getFullYear();
  $scope.prevYear = $scope.currentYear - 1;
  $scope.nextYear = Number($scope.currentYear) + 1;

  var params = $site.paramsFromQuerystring();
  if (params && params.year) {
    $scope.currentYear = params.year;
    $scope.prevYear = $scope.currentYear - 1;
    $scope.nextYear = Number($scope.currentYear) + 1;
  }

  get_photos_for_year();

  $scope.getNextYear = function() {
    $scope.currentYear++;
    $site.navigateTo("browse-by-year?year=" + $scope.currentYear);
  }

  $scope.getPrevYear = function() {
    $scope.currentYear--;
    $site.navigateTo("browse-by-year?year=" + $scope.currentYear);
  }

  $scope.showMonth = function(month) {
    var monthString = String(month + 1);
    while (monthString.length < 2) {
      monthString = "0" + monthString;
    }
    $site.navigateTo("browse-by-month?date=" + ($scope.currentYear + "-" + monthString + "-01"));    
  }

  function reset_calendar() {
    $scope.months = [];
    for (var m=0; m < 12; m++) {
      $scope.months[m] = {
        date: new Date($scope.currentYear, m, 1),
        backgroundImage: "none",
        hasBackgroundImage: false,
        photoCount: 0
      }
    };
  }

  function get_photos_for_year() {
    reset_calendar();

    $site.ajax("POST", SITE_ROOT + "/api/Photo/get_photos_for_year", {
      year: $scope.currentYear
    }).then(function(data) {
      data.results.forEach(function(dateFolder) {
        var d = new Date($scope.currentYear, dateFolder.dateTaken-1, 1);
        $scope.months.forEach(function(month) {
          if (month.date.getFullYear() == d.getUTCFullYear()
            && month.date.getMonth() == d.getUTCMonth()) {
            month.backgroundImage = "url(" + dateFolder.filename + "/500)";
            month.hasBackgroundImage = true;
            month.photoCount = dateFolder.numPhotos;
          }
        });
      });
    }).catch(function (data) {
      console.log('catch');
    });
  }

}]);