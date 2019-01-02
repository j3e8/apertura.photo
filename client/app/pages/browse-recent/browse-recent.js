app.controller("BrowseRecentPage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;

  $scope.lightBoxPhoto = undefined;
  $scope.photos = [];
  $scope.isLoadingPhotos = true;

  var validTimeframes = ['hour', 'day', 'week', 'month'];
  $scope.timeframe = 'week';
  var params = $site.paramsFromQuerystring();
  if (params && params.timeframe) {
    $scope.timeframe = params.timeframe;
    if (validTimeframes.indexOf($scope.timeframe) < 0) {
      $scope.timeframe = 'week';
    }
  }

  $scope.startSlideshow = function() {
    var photoSrcArray = $scope.photos.map(function(photo) {
      return photo.filename + "/1920";
    });
    $scope.$broadcast("slideshow", photoSrcArray);
  }
  
  $scope.stopSlideshow = function() {
    $scope.$broadcast("slideshow", null);
  }

  get_recent_photos();

  $scope.openLightBox = function(photo) {
    $scope.lightBoxPhoto = photo;
    $scope.photos.forEach(function(eachPhoto) {
      eachPhoto.displayTagForm = false;
    });
  }

  function get_recent_photos() {
    $scope.isLoadingPhotos = true;
    $site.ajax("POST", SITE_ROOT + "/api/Photo/get_recent_photos", {
      timeframe: $scope.timeframe
    }).then(function(data) {
      $scope.isLoadingPhotos = false;
      $scope.photos = data.results;
    }).catch(function(data) {
    });
  }

}]);