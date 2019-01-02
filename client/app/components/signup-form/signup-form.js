app.directive("signUpForm", ["Site", "$http", function($site, $http) {
  return {
    restrict: 'E',
    templateUrl: "components/signup-form/signup-form.html",
    link: function (scope, element, attrs) {
      scope.$site = $site;

      scope.signupFormIsDisplayed = false;

      scope.email = '';
      scope.emailIsAvailable = undefined;
      scope.emailIsValid = undefined;

      scope.username = '';
      scope.usernameIsAvailable = undefined;
      scope.usernameIsValid = undefined;

      scope.password = '';

      scope.isSubmitting = false;

      var emailRegex = /^[0-9_\-\.a-z]+@[0-9_\-\.a-z]+?\.[a-z]+$/i;
      var usernameRegex = /^[0-9_\-\.a-z]+$/i;

      scope.$on("signupRequest", function() {
        scope.signupFormIsDisplayed = true;
      });

      scope.cancelSignup = function() {
        scope.signupFormIsDisplayed = false;
      }

      scope.catchEnter = function(e) {
        if (e.keyCode == 13) {
          scope.validatePersonalInfo();
        }
      }

      scope.checkEmailAvailability = function() {
        if (!scope.email || !emailRegex.test(scope.email)) {
          scope.emailIsAvailable = null;
          scope.emailIsValid = false;
          return;
        }
        else {
          scope.emailIsValid = true;
        }
        $http.post(SITE_ROOT + "/api/User/email_is_available", {
          email: scope.email
        }).then(function(response) {
          scope.emailIsAvailable = response.data.results;
        }, function(error) {});
      }

      scope.checkUsernameAvailability = function() {
        if (!scope.username) {
          scope.usernameIsAvailable = null;
          return;
        }
        else if (!usernameRegex.test(scope.username)) {
          scope.usernameIsAvailable = null;
          scope.usernameIsValid = false;
          return;
        }
        else {
          scope.usernameIsValid = true;
        }
        $http.post(SITE_ROOT + "/api/User/username_is_available", {
          username: scope.username
        }).then(function(response) {
          scope.usernameIsAvailable = response.data.results;
        }, function(error) {});
      }

      scope.validatePersonalInfo = function() {
        var isValid = true;
        if (!emailRegex.test(scope.email) || !scope.emailIsAvailable) {
          isValid = false;
          scope.emailIsValid = false;
        }
        else {
          scope.emailIsValid = true;
        }
        if (scope.username && (!usernameRegex.test(scope.username) || !scope.usernameIsAvailable)) {
          isValid = false;
          scope.usernameIsValid = false;
        }
        else {
          scope.usernameIsValid = true;
        }
        if (isValid) {
          createUser();
        }
      }

      function createUser() {
        scope.isSubmitting = true;
        $http.post(SITE_ROOT + "/api/User/signup", {
          email: scope.email,
          username: scope.username,
          password: scope.password
        }).then(function(userData) {
          scope.isSubmitting = false;
          window.location.reload();
        }, function(error) {
          scope.isSubmitting = false;
          console.error(error);
        });
      }

    }
  };
}]);

