app.controller("ForgotPasswordPage", ['$scope', '$http', function($scope, $http) {
  $scope.email = '';
  $scope.password = '';
  $scope.password2 = '';
  $scope.errorMessage = '';

  $scope.isSaving = false;

  var params = null;
  var querystring = window.location.search;
  if (querystring.length) {
    params = {};
    var pairs = querystring.substring(1).split('&');
    pairs.forEach(function(pair) {
      var keyValues = pair.split('=');
      if (keyValues[0]) {
        params[keyValues[0]] = keyValues.length > 1 ? keyValues[1] : undefined;
      }  
    });
  }

  $scope.clearErrorMessage = function() {
    $scope.errorMessage = '';
  }

  $scope.resetPassword = function() {
    $scope.errorMessage = '';
    $scope.isSaving = true;
    $http.post(SITE_ROOT + "/api/User/reset_password", {
      email: $scope.email,
      password: $scope.password,
      password2: $scope.password2,
      token: params.token
    }).then(function(response) {
      $scope.isSaving = false;
      window.location = '/app/home';
    }, function(error) {
      $scope.isSaving = false;
      $scope.errorMessage = "There was an error while trying to save your new password.";
    });
  }

}]);