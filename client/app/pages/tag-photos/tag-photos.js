app.controller("TagPhotosPage", ["Site", '$scope', '$http', function($site, $scope, $http) {
  $scope.$site = $site;
  $scope.isLoadingPhoto = true;
  $scope.isLoadingCount = true;

  resetVars();
  loadRandomPhoto();
  countUntaggedPhotos();

  $scope.reload = function() {
    loadRandomPhoto();
    countUntaggedPhotos();
  }

  function resetVars() {
    $scope.untaggedPhotos = [];
    $scope.totalUntaggedPhotos = 0;
    $scope.applyTagToAll = {checked: true};
    $scope.tag = {
      tag: '',
      tagSuggestions: []
    };
  }

  function loadRandomPhoto() {
    resetVars();
    $scope.isLoadingPhoto = true;
    $site.ajax("POST", SITE_ROOT + "/api/Photo/get_random_untagged_photo", {
    }).then(function(data) {
      $scope.untaggedPhotos = data.results;
      $scope.isLoadingPhoto = false;
      if ($scope.untaggedPhotos && $scope.untaggedPhotos.length) {
        $scope.untaggedPhotos.forEach(function(untaggedPhoto) {
          untaggedPhoto.tags = [];
          var arr = untaggedPhoto.dateTaken.split(/[- :]/);
          untaggedPhoto.dateTaken = new Date(arr[0], arr[1]-1, arr[2], arr[3], arr[4], arr[5]);
        });
      }
    }).catch(function(data) {
    });
  }

  function countUntaggedPhotos() {
    $scope.isLoadingCount = true;
    $site.ajax("POST", SITE_ROOT + "/api/Photo/count_photos", {
    }).then(function (data) {
      $scope.totalUntaggedPhotos = data.results.untaggedPhotos;
      $scope.isLoadingCount = false;
    }).catch(function(data) {
    });
  }

}]);