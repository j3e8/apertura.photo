app.directive('ngTouchstart', ['$parse', function($parse) {
  return function(scope, element, attr) {
    var touchHandler = $parse(attr.ngTouchstart);
    element.on('touchstart', function(event) {
      scope.$apply(function() {
        touchHandler(scope, {$event: event});
      });
    });
  };
}]);

app.directive('ngTouchmove', ['$parse', function($parse) {
  return function(scope, element, attr) {
    var touchHandler = $parse(attr.ngTouchmove);
    element.on('touchmove', function(event) {
      scope.$apply(function() { 
        touchHandler(scope, {$event: event});
      });
    });
  };
}]);

app.directive('ngTouchend', ['$parse', function($parse) {
  return function(scope, element, attr) {
    var touchHandler = $parse(attr.ngTouchend);
    element.on('touchend', function(event) {
      scope.$apply(function() { 
        touchHandler(scope, {$event: event});
      });
    });
  };
}]);
