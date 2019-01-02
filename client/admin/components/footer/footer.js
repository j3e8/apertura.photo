app.directive("pageFooter", ["Site", function($site) {
  return {
    restrict: 'E',
    templateUrl: "components/footer/footer.html",
    link: function (scope, element, attrs) {
      scope.$site = $site;
    }
  }
}]);

