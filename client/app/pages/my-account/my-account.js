app.controller("MyAccountPage", ["Site", '$scope', '$http', '$timeout', function($site, $scope, $http, $timeout) {
  Stripe.setPublishableKey('pk_live_7PXiaL4diCcRWwqmizuNGSwM');
  $scope.$site = $site;

  $scope.username = '';
  $scope.newUsername = '';
  $scope.isEditingUsername = false;
  $scope.isSavingUsername = false;

  $scope.email = '';
  $scope.newEmail = '';
  $scope.isEditingEmail = false;
  $scope.isSavingEmail = false;

  $scope.firstName = '';
  $scope.lastName = '';
  $scope.newFirstName = '';
  $scope.newLastName = '';
  $scope.isEditingName = false;
  $scope.isSavingName = false;

  $scope.oldPassword = '';
  $scope.newPassword = '';
  $scope.newPassword2 = '';
  $scope.isEditingPassword = false;
  $scope.isSavingPassword = false;
  $scope.passwordsDoNotMatch = false;

  $scope.isEditingBilling = false;
  $scope.isSavingBillingInfo = false;
  $scope.cardNumber = '';
  $scope.securityCode = '';
  $scope.expMonth = String(new Date().getMonth() + 1);
  $scope.expYear = String(new Date().getFullYear());
  $scope.cardIsValid = true;
  $scope.securityCodeIsValid = true;
  var cardRegex = /^[0-9]{15,16}$/;
  var cvcRegex = /^[0-9]{3,4}$/;
  $scope.expirationYears = [];
  var currentYear = new Date().getFullYear();
  for (var i=currentYear; i < currentYear+20; i++) {
    $scope.expirationYears.push(String(i));
  }

  $scope.subscription = null;
  $scope.usage = null;
  $scope.billing = null;


  $http.post(SITE_ROOT + "/api/User/get_user_info", {
    userId: $scope.$site.userid
  }).then(function(response) {
    $scope.username = response.data.results.username;
    $scope.email = response.data.results.email;
    $scope.firstName = response.data.results.firstName;
    $scope.lastName = response.data.results.lastName;
  }, function(error) {
    console.error(error);
  });

  $http.post(SITE_ROOT + "/api/User/get_subscription_info", {
    userId: $scope.$site.userid
  }).then(function(response) {
    $scope.usage = response.data.results.usage;
    $scope.subscription = response.data.results.subscription;
    $scope.billing = response.data.results.billing;

    if (!$scope.billing) {
      $scope.isEditingBilling = true;
    }

    $scope.subscription.subscriptionStartAsDate = Date.parse($scope.subscription.subscriptionStart);
    $scope.subscription.nextBillDateAsDate = Date.parse($scope.subscription.nextBillDate);
  }, function(error) {
    console.error(error);
  });

  $scope.editEmail = function() {
    $scope.newEmail = $scope.email;
    $scope.isEditingEmail = true;
    $timeout(function() {
      document.getElementById('newEmail').focus();
    }, 0, false);
  }

  $scope.editUsername = function() {
    $scope.newUsername = $scope.username;
    $scope.isEditingUsername = true;
    $timeout(function() {
      document.getElementById('newUsername').focus();
    }, 0, false);
  }

  $scope.editName = function() {
    $scope.newFirstName = $scope.firstName;
    $scope.newLastName = $scope.lastName;
    $scope.isEditingName = true;
    $timeout(function() {
      document.getElementById('newFirstName').focus();
    }, 0, false);
  }

  $scope.editPassword = function() {
    $scope.oldPassword = '';
    $scope.newPassword = '';
    $scope.newPassword2 = '';
    $scope.isEditingPassword = true;
    $timeout(function() {
      document.getElementById('oldPassword').focus();
    }, 0, false);
  }

  $scope.editBillingInfo = function() {
    $scope.isEditingBilling = true;
    $scope.cardNumber = '';
    $scope.cvc = '';
  }

  $scope.cancelEditBillingInfo = function() {
    $scope.isEditingBilling = false;
  }


  $scope.saveEmail = function() {
    $scope.isSavingEmail = true;
    $http.post(SITE_ROOT + "/api/User/update_email", {
      email: $scope.newEmail
    }).then(function(response) {
      $scope.isSavingEmail = false;
      $scope.email = $scope.newEmail;
      $scope.isEditingEmail = false;
    }, function(error) {
      $scope.isSavingEmail = false;
      console.error(error);
    });
  }

  $scope.saveName = function() {
    $scope.isSavingName = true;
    $http.post(SITE_ROOT + "/api/User/update_name", {
      firstName: $scope.newFirstName,
      lastName: $scope.newLastName
    }).then(function(response) {
      $scope.isSavingName = false;
      $scope.firstName = $scope.newFirstName;
      $scope.lastName = $scope.newLastName;
      $scope.isEditingName = false;
    }, function(error) {
      $scope.isSavingName = false;
      console.error(error);
    });
  }

  $scope.checkPasswordsMatch = function() {
    $scope.passwordsDoNotMatch = false;
    if ($scope.newPassword != $scope.newPassword2) {
      $scope.passwordsDoNotMatch = true;
      return false;
    }
    return true;
  }

  $scope.savePassword = function() {
    $scope.isSavingPassword = true;
    if (!$scope.checkPasswordsMatch()) {
      return;
    }
    $http.post(SITE_ROOT + "/api/User/update_password", {
      oldPassword: $scope.oldPassword,
      newPassword: $scope.newPassword
    }).then(function(response) {
      $scope.isSavingPassword = false;
      $scope.isEditingPassword = false;
    }, function(error) {
      $scope.isSavingPassword = false;
      console.error(error);
    });
  }

  $scope.saveUsername = function() {
    $scope.isSavingUsername = true;
    $http.post(SITE_ROOT + "/api/User/update_username", {
      username: $scope.newUsername
    }).then(function(response) {
      $scope.isSavingUsername = false;
      $scope.username = $scope.newUsername;
      $scope.isEditingUsername = false;
    }, function(error) {
      $scope.isSavingUsername = false;
      console.error(error);
    });
  }

  $scope.validatePaymentInfo = function() {
    var isValid = true;

    console.log("validatePaymentInfo");
    if (!$scope.cardNumber || !cardRegex.test($scope.cardNumber)) {
      console.log("invalid card");
      isValid = false;
      $scope.cardIsValid = false;
    }
    else {
      console.log("valid card");
      $scope.cardIsValid = true;
    }

    if (!$scope.securityCode || !cvcRegex.test($scope.securityCode)) {
      console.log("invalid cvc");
      isValid = false;
      $scope.securityCodeIsValid = false;
    }
    else {
      console.log("valid cvc");
      $scope.securityCodeIsValid = true;
    }

    if (isValid) {
      console.log("is valid. saving...");
      $scope.isSavingBillingInfo = true;
      Stripe.card.createToken({
        number: $scope.cardNumber,
        cvc: $scope.securityCode,
        exp_month: $scope.expMonth,
        exp_year: $scope.expYear
      }, function(status, response) {
        if (status == 200) {
          $http.post(SITE_ROOT + "/api/User/renew_subscription", {
            token: response.id
          }).then(function(response) {
            console.log(response);
            $site.displayNotification("Your billing information has been updated. Thanks!");
            $scope.isSavingBillingInfo = false;
            $scope.isEditingBilling = false;
            $scope.billing = response.data.results.billing;
          }, function(error) {
            console.warn("There was an error while trying to sign up");
            console.log(error);
            $scope.isSavingBillingInfo = false;
          });
        }
        else {
          console.log("error");
          $site.displayNotification("There was a problem saving your payment information: " + response.error.message);
          $scope.isSavingBillingInfo = false;
          $scope.$apply();
        }
      });
    }
  }
  
}]);