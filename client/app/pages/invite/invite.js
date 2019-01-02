app.controller("InvitePage", ["Site", '$scope', '$http', '$timeout', function($site, $scope, $http, $timeout) {
  $scope.$site = $site;
  $scope.invitationEmail = '';
  $scope.sendingInvitation = false;

  $scope.email = '';
  $scope.secretURL = '';

  $scope.sendInvitation = function() {
    $scope.sendingInvitation = true;
    $scope.email = '';
    $scope.secretURL = '';

    $http.post(SITE_ROOT + "/api/User/send_invitation", {
      invitationEmail: $scope.invitationEmail
    }).then(function(response) {
      $scope.sendingInvitation = false;
      $site.displayNotification("Your invitation was successfully created for " + $scope.invitationEmail);
      console.log(response);
      $scope.invitationEmail = '';

      $scope.email = response.data.results.email;
      $scope.secretURL = response.data.results.secretURL;
    }, function(error) {
      $scope.sendingInvitation = false;
    });
  }
}]);