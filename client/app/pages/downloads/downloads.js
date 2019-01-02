app.controller("DownloadsPage", ["Site", '$scope', '$http', function($site, $scope, $http) {
  $scope.$site = $site;
  $scope.welcome = false;

	var params = $site.paramsFromQuerystring();
  if (params && params.welcome && params.welcome == "true") {
  	$scope.welcome = true;
  }

}]);