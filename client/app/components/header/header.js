app.directive("pageHeader", ["Site", "$http", "signinService", function($site, $http, signinService) {
  return {
    restrict: 'E',
    templateUrl: "components/header/header.html",
    controller: ["$scope", function (scope) {
      scope.$site = $site;
      scope.myAccountMenuIsDisplayed = false;
      scope.signinFormIsDisplayed = false;
      scope.signupFormIsDisplayed = false;
      scope.errorMessage = '';
      scope.username = '';
      scope.password = '';
      scope.searchText = '';
      scope.popupMenuIsDisplayed = undefined;
      scope.standardMenuIsDisplayed = document.body.offsetWidth > 768 ? true : false;
      scope.accountName = $site.username ? $site.username : $site.email;

      // NOTIFICATION SUPPORT
      scope.isNotificationDisplayed = undefined;
      scope.notificationMessage = '';

      var hideTimeout = null;
      scope.hideNotification = function() {
        scope.isNotificationDisplayed = false;
      }

      scope.$on("notification", function(event, message) {
        clearTimeout(hideTimeout);
        scope.notificationMessage = message;
        scope.isNotificationDisplayed = true;
        hideTimeout = setTimeout(function() {
          scope.hideNotification()
          scope.$apply();
        }, 3000);
      });
      // END NOTIFICATION

      scope.togglePopupMenu = function() {
        scope.popupMenuIsDisplayed = scope.popupMenuIsDisplayed ? false : true;
      }

      scope.toggleDisplayInviteFriendDialog = function() {
        scope.inviteFriendDialogIsDisplayed = !scope.inviteFriendDialogIsDisplayed;
      }

      scope.toggleMyAccountMenu = function() {
        scope.myAccountMenuIsDisplayed = !scope.myAccountMenuIsDisplayed;
      }

      scope.searchOnEnter = function($event) {
        if ($event.keyCode == 13) {
          $site.navigateTo('search?query=' + scope.searchText);
        }
      }

      scope.$on("signinRequest", function() {
        scope.signinFormIsDisplayed = true;
      });

      scope.signin = function() {
        if (!scope.username || !scope.password) {
          scope.errorMessage = "Please provide a valid username and password";
          return;
        }
        $site.authenticate(scope.username, scope.password, function() {
          scope.signinFormIsDisplayed = false;

          window.location.reload();
          // if (signinService.ajaxQueue && signinService.ajaxQueue.length) {
          //   signinService.ajaxQueue.forEach(function(queued) {
          //     if (queued.method && queued.url) {
          //       $site.ajax(queued.method, queued.url, queued.payload)
          //       .then(function(data) {
          //         if (queued.resolve) {
          //           queued.resolve(data)
          //         }
          //       });
          //     }
          //   });
          // }
        }, function() {
          scope.errorMessage = "Invalid username and/or password";
        });
      }

      scope.cancelSignin = function() {
        scope.signinFormIsDisplayed = false;
      }

      var params = $site.paramsFromQuerystring();
      if (params && params.query) {
        scope.searchText = params.query;
      }
    }]
  }
}]);

