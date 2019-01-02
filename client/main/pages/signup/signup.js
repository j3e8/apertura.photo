app.controller("SignUpPage", ['$scope', '$http', '$location', function($scope, $http, $location) {
  Stripe.setPublishableKey('pk_live_7PXiaL4diCcRWwqmizuNGSwM');
  $scope.phase = undefined;
  
  $scope.email = null;
  $scope.username = null;
  $scope.password = '';
  $scope.password2 = '';

  $scope.passwordsMatch = true;
  $scope.isSubmitting = false;

  $scope.emailIsAvailable = null;
  $scope.emailIsValid = null;
  $scope.usernameIsAvailable = null;
  $scope.usernameIsValid = null;
  $scope.passwordIsValid = null;

  $scope.firstName = '';
  $scope.lastName = '';
  $scope.cardNumber = '';
  $scope.securityCode = '';
  $scope.expMonth = String(new Date().getMonth() + 1);
  $scope.expYear = String(new Date().getFullYear());

  $scope.cardIsValid = true;
  $scope.securityCodeIsValid = true;

  var cardRegex = /^[0-9]{15,16}$/;
  var cvcRegex = /^[0-9]{3,4}$/;
  var emailRegex = /^[0-9_\-\.a-z]+@[0-9_\-\.a-z]+?\.[a-z]+$/i;
  var usernameRegex = /^[0-9_\-\.a-z]+$/i;

  $scope.expirationYears = [];
  var currentYear = new Date().getFullYear();
  for (var i=currentYear; i < currentYear+20; i++) {
    $scope.expirationYears.push(String(i));
  }

  $scope.subscription = {
    name: 'Standard subscription',
    id: 'monthly0.99',
    price: 0.99,
    storage: 50
  };


  $scope.catchEnter = function(e) {
    if (e.keyCode == 13) {
      $scope.validatePersonalInfo();
    }
  }

  $scope.doPasswordsMatch = function() {
    if ($scope.password == $scope.password2) {
      $scope.passwordsMatch = true;
    }
    else {
      $scope.passwordsMatch = false;
    }
    return $scope.passwordsMatch;
  }

  $scope.checkEmailAvailability = function() {
    if (!$scope.email || !emailRegex.test($scope.email)) {
      $scope.emailIsAvailable = null;
      $scope.emailIsValid = false;
      return;
    }
    else {
      $scope.emailIsValid = true;
    }
    console.log("checkEmailAvailability: " + $scope.email);
    $http.post(SITE_ROOT + "/api/User/email_is_available", {
      email: $scope.email
    }).then(function(response) {
      $scope.emailIsAvailable = response.data.results;
      console.log($scope.emailIsAvailable);
    }, function(error) {});
  }

  $scope.checkUsernameAvailability = function() {
    if (!$scope.username) {
      $scope.usernameIsAvailable = null;
      return;
    }
    else if (!usernameRegex.test($scope.username)) {
      $scope.usernameIsAvailable = null;
      $scope.usernameIsValid = false;
      return;
    }
    else {
      $scope.usernameIsValid = true;
    }
    console.log("checkUsernameAvailability: " + $scope.username);
    $http.post(SITE_ROOT + "/api/User/username_is_available", {
      username: $scope.username
    }).then(function(response) {
      $scope.usernameIsAvailable = response.data.results;
      console.log($scope.usernameIsAvailable);
    }, function(error) {});
  }

  $scope.validatePersonalInfo = function() {
    var isValid = true;
    if (!emailRegex.test($scope.email) || !$scope.emailIsAvailable) {
      isValid = false;
      $scope.emailIsValid = false;
    }
    else {
      $scope.emailIsValid = true;
    }
    if ($scope.username && (!usernameRegex.test($scope.username) || !$scope.usernameIsAvailable)) {
      isValid = false;
      $scope.usernameIsValid = false;
    }
    else {
      $scope.usernameIsValid = true;
    }
    if (!$scope.doPasswordsMatch() || !$scope.password) {
      $scope.passwordIsValid = false;
      isValid = false;
    }
    else {
      $scope.passwordIsValid = true;
    }
    if (isValid) {
      // $scope.phase = 2;
      createUser();
    }
  }

  function createUser() {
    $scope.isSubmitting = true;
    $http.post(SITE_ROOT + "/api/User/signup", {
      email: $scope.email,
      username: $scope.username,
      password: $scope.password,
      firstName: $scope.firstName,
      lastName: $scope.lastName
    }).then(function(userData) {
      $scope.isSubmitting = false;
      window.location.href = SITE_PATH + "/app/downloads?welcome=true";
    }, function(error) {
      $scope.isSubmitting = false;
      console.warn("There was an error while trying to sign up");
      console.log(error);
    });
  }

/*
  $scope.validatePaymentInfo = function() {
    var isValid = true;

    if (!$scope.cardNumber || !cardRegex.test($scope.cardNumber)) {
      isValid = false;
      $scope.cardIsValid = false;
    }
    else {
      $scope.cardIsValid = true;
    }

    if (!$scope.securityCode || !cvcRegex.test($scope.securityCode)) {
      isValid = false;
      $scope.securityCodeIsValid = false;
    }
    else {
      $scope.securityCodeIsValid = true;
    }

    if (isValid) {
      $scope.isSubmitting = true;
      Stripe.card.createToken({
        number: $scope.cardNumber,
        cvc: $scope.securityCode,
        exp_month: $scope.expMonth,
        exp_year: $scope.expYear
      }, function(status, response) {
        if (status == 200) {
          $http.post(SITE_ROOT + "/api/User/signup", {
            email: $scope.email,
            username: $scope.username,
            password: $scope.password,
            firstName: $scope.firstName,
            lastName: $scope.lastName,
            cardToken: response.id,
            subscription: $scope.subscription.id
          }).then(function(userData) {
            window.location.href = "https://apertura.photo/app/downloads?welcome=true";
          }, function(error) {
            console.warn("There was an error while trying to sign up");
            console.log(error);
          });
        }
        else {
          // TODO: if not, give an error and allow the user to try again
          alert("There was a problem processing your payment information: " + response);
          $scope.isSubmitting = false;
        }
      });
    }
  }*/

}]);