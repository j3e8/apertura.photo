app.controller("BrowseByTagPage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;

  $scope.tag = null;
  $scope.photos = [];

  $scope.photosAreLoading = true;
  $scope.tagInfoIsLoading = true;

  $scope.lightBoxPhoto = null;

  $scope.startSlideshow = function() {
    var photoSrcArray = $scope.photos.map(function(photo) {
      return photo.filename + "/1920";
    });
    $scope.$broadcast("slideshow", photoSrcArray);
  }
  
  $scope.stopSlideshow = function() {
    $scope.$broadcast("slideshow", null);
  }

  var params = $site.paramsFromQuerystring();
  if (params && params.id) {
    $http.post(SITE_ROOT + "/api/Tag/get_tag_info", {
      id: params.id
    }).then(function(response) {
      $scope.tagInfoIsLoading = false;
      $scope.tag = response.data.results;
    }, function(error) {
      $scope.tagInfoIsLoading = false;
      console.error(error);
    });

    $http.post(SITE_ROOT + "/api/Photo/get_photos_for_tag", {
      tagId: params.id
    }).then(function(response) {
      $scope.photos = response.data.results;
      $scope.photosAreLoading = false;
    }, function(error) {
      $scope.photosAreLoading = false;
      console.error(error);
    });
  }
  else {
    $site.navigateTo('tags');
  }

  $scope.openLightBox = function(photo) {
    $scope.lightBoxPhoto = photo;
    $scope.photos.forEach(function(eachPhoto) {
      eachPhoto.displayTagForm = false;
    });
  }

}]);
