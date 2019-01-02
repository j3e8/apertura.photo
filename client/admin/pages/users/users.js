app.controller("UsersPage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;

  $scope.recentUsers = [];

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
  
}]);