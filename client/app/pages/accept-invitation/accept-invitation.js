app.controller("AcceptInvitationPage", ["Site", '$scope', '$location', '$http', function($site, $scope, $location, $http) {
	$scope.$site = $site;

	$scope.email = '';
	$scope.username = '';
	$scope.password = '';
	$scope.password2 = '';
	$scope.invitationToken = '';

  var params = $site.paramsFromQuerystring();
	if (params && params.token) {
		$scope.invitationToken = params.token;
	}
	if (!$scope.invitationToken) {
		$site.navigateTo('signin');
	}

	$scope.errorMessage = '';
	$scope.creatingAccount = false;

	$site.ajax("POST", SITE_ROOT + "/api/User/get_email_for_invitation", {
		invitationToken: $scope.invitationToken
	}).then(function(data) {
		$scope.email = data.results;
	}).catch(function(data) {
	});

	$scope.clearErrorMessage = function() {
		$scope.errorMessage = '';
	}

	$scope.createAccount = function() {
		$scope.creatingAccount = true;
		$scope.errorMessage = '';
		$site.ajax("POST", SITE_ROOT + "/api/User/create_user_from_invitation", {
			email: $scope.email,
			username: $scope.username,
			password: $scope.password,
			password2: $scope.password2,
			invitationToken: $scope.invitationToken
		}).then(function(data) {
			if (data.success) {
				logUserIn();
			}
			else {
				$scope.errorMessage = "There was a problem creating your account. Try again.";
			}
			$scope.creatingAccount = false;
		}).catch(function(data) {
		});
	}

	function logUserIn() {
		$site.authenticate($scope.username, $scope.password, function() {
			$site.navigateTo('downloads?welcome=true');
		}, function() {
			$scope.errorMessage = "There was a problem signing you in right now. Try again.";
		});
	}
}]);