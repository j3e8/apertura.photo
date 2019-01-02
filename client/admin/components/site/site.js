app.factory("Site", ['$http', '$window', 'signinService', '$rootScope', function($http, $window, signinService, $rootScope) {
  var username = '';
  var userid = 0;
  var isSignedIn = false;
  var userstatus = '';
  var cookiestr = document.cookie;
  var cookieparts = cookiestr.split(';');
  for (var i=0; i<cookieparts.length; i++) {
    var fields = cookieparts[i].split('=');
    var fieldname = fields[0].replace(/^\s+/, '').replace(/\s+$/, '');
    if (fieldname.toLowerCase() == 'username')
      username = fields[1];
    if (fieldname.toLowerCase() == 'userid')
      userid = fields[1];
    if (fieldname.toLowerCase() == 'status')
      userstatus = fields[1];
  }
  if (userid) {
    isSignedIn = true;
  }

  function userAgentContains(str) {
    var pos = navigator.userAgent.toLowerCase().indexOf(str.toLowerCase());
    return pos >= 0 ? true : false;
  }
  
  var isApp = false;
  if (userAgentContains("Mozilla") && userAgentContains("iPhone") && userAgentContains("AppleWebKit") && userAgentContains("Mobile") && !userAgentContains("Safari")) {
    isApp = true;
  }

  var obj = {
    userid: userid,
    username: username,
    isSignedIn: isSignedIn,
    isApp: isApp,
    userstatus: userstatus,

    authenticate: function(u, p, successFunc, errorFunc) {
      var self = this;
      $http.post(SITE_ROOT + "/api/User/signin", {
        username: u,
        password: p,
      }).error(function(data) {
        if (errorFunc)
          errorFunc();
      }).success(function(data) {
        self.username = data.results.username;
        self.userid = data.results.userId;
        self.isSignedIn = true;
        self.userstatus = data.results.status;

        /*if (data.results.status == 'suspended') {
          self.navigateTo('renew');
        }
        else */if (successFunc) {
          successFunc();
        }
      });
    },

    signOut: function() {
      var self = this;
      $http.post(SITE_ROOT + "/api/User/signout", {})
      .then(function(response) {
        self.navigateTo("signin");
      }, function(error) {
        self.displayNotification("We couldn't sign you out for some reason. Try again.");
      });
    },

    ajax: function(method, url, payload) {
      var MyPromise = function() {
        var resolve = null;
        var reject = null;

        this.then = function(thenFunc) {
          resolve = thenFunc;
          return this;
        };
        this.catch = function(catchFunc) {
          reject = catchFunc;
          return this;
        };

        var ajaxMethod = $http.get;
        if (method == "POST") {
          ajaxMethod = $http.post;
        }
        ajaxMethod(url, payload)
        .then(function(response) {
          if (resolve) {
            resolve(response.data);
          }
        }, function(response) {
          if (response && ((response.data && response.data.code == 401) || response.code == "401")) {
            signinService.requestSignin(method, url, payload, resolve);
          }
          else {
            if (reject) {
              reject(response.data);
            }
          }
        });
      }
      return new MyPromise();
    },

    navigateTo: function(page) {
      $window.location.href = SITE_PATH + '/' + page;
    },

    displayNotification: function(msg) {
      $rootScope.$broadcast("notification", msg);
    },

    paramsFromQuerystring: function() {
      var query = null;
      var querystring = window.location.search;
      if (querystring.length) {
        query = {};
        var pairs = querystring.substring(1).split('&');
        pairs.forEach(function(pair) {
          var keyValues = pair.split('=');
          if (keyValues[0]) {
            query[keyValues[0]] = keyValues.length > 1 ? keyValues[1] : undefined;
          }  
        });
      }
      return query;
    }
  };
   
  return obj;
}]);
