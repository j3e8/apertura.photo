app.controller("PhotosWithoutADatePage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
	$scope.$site = $site;
	$scope.today = new Date();
	$scope.photos = [];

  $scope.lightBoxPhoto = undefined;
  $scope.photosAreLoading = true;

  $site.ajax("GET", SITE_ROOT + "/api/Photo/get_photos_without_date", {
  	limit: 50
  }).then(function(data) {
    $scope.photos = data.results;
    $scope.photosAreLoading = false;
  }).catch(function(data) {
    $scope.photosAreLoading = false;
  });


  $scope.addDateToPhoto = function(photo) {
    console.log("addDateToPhoto: " + photo.date);
    $http.post(SITE_ROOT + "/api/Photo/update_photo_date", {
      photoId: photo.photoId,
      dateTaken: photo.dateTaken
    }).then(function(response) {
      console.log(response);
    }, function(error) {
      console.error(error);
    });
  }

  $scope.openLightBox = function(photo) {
    $scope.lightBoxPhoto = photo;
    $scope.photos.forEach(function(eachPhoto) {
      eachPhoto.displayTagForm = false;
    });
  }

}]);