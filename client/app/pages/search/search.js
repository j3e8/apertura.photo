app.controller("SearchPage", ["Site", '$scope', '$http', function($site, $scope, $http) {
  $scope.$site = $site;
  $scope.searchResults = undefined;
  $scope.query = '';
  $scope.lightBoxPhoto = undefined;

  function init() {
    var params = $site.paramsFromQuerystring();
    if (params && params.query) {
      $scope.query = params.query;
      $scope.search();
    }
  }

  $scope.startSlideshow = function() {
    var photoSrcArray = $scope.searchResults.map(function(photo) {
      return photo.filename + "/1920";
    });
    $scope.$broadcast("slideshow", photoSrcArray);
  }
  
  $scope.stopSlideshow = function() {
    $scope.$broadcast("slideshow", null);
  }

  $scope.openLightBox = function(photo) {
    $scope.lightBoxPhoto = photo;
    $scope.searchResults.forEach(function(eachPhoto) {
      eachPhoto.displayTagForm = false;
    });
  }

  $scope.onKeypress = function($event) {
    if ($event.keyCode == 13) {
      $scope.search();
    }
    else {
      $scope.searchTags($scope.query);
    }
  }

  $scope.searchTags = function(prefix) {
    /*$http.post(SITE_ROOT + "/api/Tag/get_tags_by_prefix", {
      prefix: prefix
    }).then(function(response) {
      console.log(response);
    }, function(error) {
      console.error(error);
    });*/
  }

  $scope.search = function() {
    $http.post(SITE_ROOT + "/api/Photo/search", {
      query: $scope.query
    }).then(function(response) {
      console.log(response);
      $scope.searchResults = response.data.results.map(function(result) {
        if (result.dateTaken) {
          var arr = result.dateTaken.split(/[- :]/);
          result.dateTakenAsDate = new Date(arr[0], arr[1]-1, arr[2], arr[3], arr[4], arr[5]);
        }
        return result;
      });
    }, function(error) {
      console.error(error);
    });
  }

  init();
}]);