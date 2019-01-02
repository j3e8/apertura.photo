app.directive('focusWhen',function($timeout) {
  return {
    restrict : 'A',
    link : function($scope, $element, $attr) {
      $scope.$watch($attr.focusWhen, function(_focusVal) {
        $timeout(function() {
          if (_focusVal) {
            $element[0].focus();
          }
        });
      });
    }
  }
});
