app.controller("SigninPage", ["Site", '$scope', '$http', function($site, $scope, $http) {
  $scope.$site = $site;

  $scope.username = '';
  $scope.password = '';
  $scope.errorMessage = '';

  $scope.forgotEmail = '';
  $scope.forgotPasswordDialogIsDisplayed = false;
  $scope.isSending = false;

  $scope.clearErrorMessage = function() {
    $scope.errorMessage = '';
  }

  $scope.attemptSignin = function() {
    $site.authenticate($scope.username, $scope.password, function() {
      $site.navigateTo('home');
    }, function() {
      $scope.errorMessage = "Invalid username or password";
    });
  }

  $scope.toggleForgotPasswordDialog = function() {
    $scope.forgotPasswordDialogIsDisplayed = !$scope.forgotPasswordDialogIsDisplayed;
  }

  $scope.sendForgotPasswordEmail = function() {
    $scope.isSending = true;
    $http.post(SITE_ROOT + "/api/User/send_forgot_password_email", {
      email: $scope.forgotEmail
    }).then(function(response) {
      $scope.isSending = false;
      $scope.toggleForgotPasswordDialog();
      $site.displayNotification("If the email address provided matched our records, we sent a link to help reset your password.");
    }, function(error) {
      $scope.isSending = false;
      console.error(error);
    });
  }
}]);