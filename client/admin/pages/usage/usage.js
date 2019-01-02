app.controller("UsagePage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;

  $scope.users = [];
  $scope.totalPhotos = 0;
  $scope.totalStorageUsed = 0;

  $scope.recentUsers = [];
  $scope.recentDownloads = [];
  $scope.recentUploads = [];

  $http.post(SITE_ROOT + "/api/User/get_usage_by_user", {
  }).then(function(response) {
  	$scope.users = response.data.results;
    $scope.totalPhotos = 0;
    $scope.totalStorageUsed = 0;
    $scope.users.forEach(function(user) {
      $scope.totalPhotos += Number(user.numPhotos);
      $scope.totalStorageUsed += Number(user.storageUsed);
      user.name = '';
      if (user.firstName) {
        user.name += user.firstName + ' ';
      }
      if (user.lastName) {
        user.name += user.lastName;
      }
      if (!user.name) {
        user.name = user.username;
      }
      if (!user.name) {
        user.name = user.email;
      }
    });
  }, function(error) {
  	console.error(error);
  });

  $http.post(SITE_ROOT + "/api/User/get_recent_users", {
  }).then(function(response) {
    $scope.recentUsers = response.data.results;
    $scope.recentUsers.forEach(function(user) {
      var arr = user.dateJoined.split(/[- :]/);
      user.dateJoinedAsDate = new Date(arr[0], arr[1]-1, arr[2], arr[3], arr[4], arr[5]);
      user.name = '';
      if (user.firstName) {
        user.name += user.firstName + ' ';
      }
      if (user.lastName) {
        user.name += user.lastName;
      }
      if (!user.name) {
        user.name = user.username;
      }
      if (!user.name) {
        user.name = user.email;
      }
    });
  }, function(error) {
    console.error(error);
  });
  
  $http.post(SITE_ROOT + "/api/User/get_recent_downloads", {
  }).then(function(response) {
    $scope.recentDownloads = response.data.results;
    $scope.recentDownloads.forEach(function(user) {
      var arr = user.dateJoined.split(/[- :]/);
      user.dateJoinedAsDate = new Date(arr[0], arr[1]-1, arr[2], arr[3], arr[4], arr[5]);
      arr = user.dateDownloaded.split(/[- :]/);
      user.dateDownloadedAsDate = new Date(arr[0], arr[1]-1, arr[2], arr[3], arr[4], arr[5]);
      user.name = '';
      if (user.firstName) {
        user.name += user.firstName + ' ';
      }
      if (user.lastName) {
        user.name += user.lastName;
      }
      if (!user.name) {
        user.name = user.username;
      }
      if (!user.name) {
        user.name = user.email;
      }
    });
  }, function(error) {
    console.error(error);
  });

  $http.post(SITE_ROOT + "/api/User/get_recent_uploads", {
  }).then(function(response) {
    $scope.recentUploads = response.data.results;
    $scope.recentUploads.forEach(function(user) {
      user.dateUploadedAsDate = Date.parse(user.dateUploaded);
      user.name = '';
      if (user.firstName) {
        user.name += user.firstName + ' ';
      }
      if (user.lastName) {
        user.name += user.lastName;
      }
      if (!user.name) {
        user.name = user.username;
      }
      if (!user.name) {
        user.name = user.email;
      }
    });
  }, function(error) {
    console.error(error);
  });

}]);