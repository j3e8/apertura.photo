app.controller("HomePage", ["Site", '$scope', '$http', function($site, $scope, $http) {
  $scope.$site = $site;
  $scope.isLoading = true;

  $scope.totalFiles = 0;
  $scope.totalUntaggedPhotos = 0;
  $scope.totalPhotosWithoutDates = 0;

  $scope.recentPhotos = [];
  $scope.recentlyUploadedPhotos = [];
  $scope.randomPhotos = [];


  $scope.loadData = function() {
    $http.post(SITE_ROOT + "/api/Photo/count_photos", {
    }).then(function (response) {
      $scope.isLoading = false;
      $scope.totalFiles = response.data.results.photoFiles;
      $scope.totalUntaggedPhotos = response.data.results.untaggedPhotos;
      $scope.totalPhotosWithoutDates = response.data.results.photosWithoutDate;

      if ($scope.totalFiles < 100) {
        setTimeout($scope.loadData, 30000);
      }
    }, function(error) {
      $scope.isLoading = false;
      console.error(error);
    });

    $http.post(SITE_ROOT + "/api/Photo/random_home_photos", {
    }).then(function(response) {
      $scope.recentPhotos = response.data.results.recentPhotos.map(function(result) {
        if (result.dateTaken) {
          result.dateTakenAsDate = Date.parse(result.dateTaken);
        }
        return result;
      });
      $scope.recentlyUploadedPhotos = response.data.results.recentlyUploadedPhotos.map(function(result) {
        if (result.dateTaken) {
          result.dateTakenAsDate = Date.parse(result.dateTaken);
        }
        return result;
      });
      $scope.randomPhotos = response.data.results.randomPhotos.map(function(result) {
        if (result.dateTaken) {
          result.dateTakenAsDate = Date.parse(result.dateTaken);
        }
        return result;
      });
    }, function(error) {
      console.error(error);
    });
  }

  $scope.loadData();

}]);