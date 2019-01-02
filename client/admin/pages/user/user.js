app.controller("UserPage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;

  $scope.user = {};
  $scope.totalPhotos = 0;
  $scope.totalStorageUsed = 0;
  $scope.recentUploads = [];

  var params = $site.paramsFromQuerystring();
  $scope.user.id = params.id;

  $http.post(SITE_ROOT + "/api/User/get_user_info", {
    userId: params.id
  }).then(function(response) {
    $scope.user = response.data.results;
    $scope.user.dateJoinedAsDate = Date.parse($scope.user.dateJoined);
    $scope.user.name = '';
    if ($scope.user.firstName) {
      $scope.user.name += $scope.user.firstName + ' ';
    }
    if ($scope.user.lastName) {
      $scope.user.name += $scope.user.lastName;
    }
    if (!$scope.user.name) {
      $scope.user.name = $scope.user.username;
    }
    if (!$scope.user.name) {
      $scope.user.name = $scope.user.email;
    }
  }, function(error) {
    console.error(error);
  });

  $http.post(SITE_ROOT + "/api/Admin/get_usage_for_user", {
    userId: params.id
  }).then(function(response) {
    $scope.totalPhotos = response.data.results.totalPhotos ? response.data.results.totalPhotos : 0;
    $scope.totalStorageUsed = response.data.results.totalStorageUsed ? response.data.results.totalStorageUsed : 0;
  }, function(error) {
  	console.error(error);
  });

  $http.post(SITE_ROOT + "/api/Admin/get_users_last_uploads", {
    userId: params.id
  }).then(function(response) {
    $scope.recentUploads = response.data.results;
    $scope.recentUploads.forEach(function(uploadedPhoto) {
      uploadedPhoto.dateUploadedAsDate = Date.parse(uploadedPhoto.dateUploaded);
    });
  }, function(error) {
    console.error(error);
  });

}]);