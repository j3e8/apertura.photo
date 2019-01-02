app.controller("BrowseAllPage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;

  $scope.today = new Date();
  $scope.maxYear = (new Date()).getFullYear();
  $scope.minYear = $scope.maxYear;

  $scope.years = [];

  $scope.showYear = function(year) {
    $site.navigateTo("browse-by-year?year=" + year);
  }

  function get_photos_by_year() {
    $site.ajax("POST", SITE_ROOT + "/api/Photo/get_photos_for_all_time_by_year", {
    }).then(function(data) {
      data.results.forEach(function(dateFolder) {
        if (Number(dateFolder.yearTaken) < Number($scope.minYear)) {
          $scope.minYear = Number(dateFolder.yearTaken);
        }
      });
      $scope.years = [];
      for (var y=$scope.maxYear; y>=$scope.minYear; y--) {
        $scope.years.push({
          date: new Date(y, 0, 1)
        });
      }
      data.results.forEach(function(dateFolder) {
        $scope.years.forEach(function(year) {
          if (year.date.getFullYear() == dateFolder.yearTaken) {
            year.backgroundImage = "url(" + dateFolder.filename + "/600)";
            year.hasBackgroundImage = true;
            year.photoCount = dateFolder.numPhotos;
          }
        });
      });
    }).catch(function (data) {
      console.log('catch');
    });
  }
  get_photos_by_year();

}]);