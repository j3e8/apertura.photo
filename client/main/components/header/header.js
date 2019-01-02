app.directive("pageHeader", ['$window', function($window) {
  return {
    restrict: 'E',
    templateUrl: "components/header/header.html",
    link: function(scope, element, attrs) {
      scope.popupMenuIsDisplayed = document.body.offsetWidth > 768 ? true : false;

      angular.element($window).bind('resize', function() {
        scope.popupMenuIsDisplayed = document.body.offsetWidth > 768 ? true : false;
      });

      scope.togglePopupMenu = function() {
        scope.popupMenuIsDisplayed = !scope.popupMenuIsDisplayed;
      }
    }
  }
}]);
