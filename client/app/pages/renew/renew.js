app.controller("RenewPage", ["Site", '$scope', '$http', '$timeout', function($site, $scope, $http, $timeout) {
  Stripe.setPublishableKey('pk_live_7PXiaL4diCcRWwqmizuNGSwM');
  $scope.$site = $site;

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

  $scope.validatePaymentInfo = function() {
    var isValid = true;

    console.log("validatePaymentInfo");
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
            // $site.navigateTo("my-account");
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