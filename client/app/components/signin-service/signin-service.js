app.factory('signinService', ['$rootScope', function($rootScope) {
  var signinService = {};

  signinService.ajaxQueue = [];

  signinService.requestSignin = function(method, url, payload, resolve) {
    this.ajaxQueue.push({
      method: method,
      url: url,
      payload: payload,
      resolve: resolve
    });
    $rootScope.$broadcast('signinRequest');
  };

  return signinService;
}]);
