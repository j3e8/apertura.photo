app.controller("HeadersPage", ["Site", '$scope', '$http', function($site, $scope, $http) {
  $scope.$site = $site;
  $scope.headers = '';
  $scope.userAgent = navigator.userAgent;

  var req = new XMLHttpRequest();
	req.open('GET', SITE_PATH);
  req.onreadystatechange = function() {
    if (req.readyState == 4) {
      $scope.headers = req.getAllResponseHeaders().toLowerCase().split("\r\n");
      $scope.$apply();
    }
  }
	req.send(null);
}]);