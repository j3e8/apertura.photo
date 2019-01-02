app.controller("BrowseCollectionPage", ["Site", '$scope', '$http', '$location', '$timeout', function($site, $scope, $http, $location, $timeout) {
  $scope.$site = $site;

  $scope.collection = null;
  $scope.photos = [];

  $scope.photosAreLoading = true;
  $scope.collectionInfoIsLoading = true;
  $scope.shareCollectionDialogIsDisplayed = undefined;
  $scope.shareLink = null;
  $scope.notice = '';

  $scope.lightBoxPhoto = null;
  $scope.emailAddressesToShareWith = '';

  $scope.emailAddressesPattern = /([a-z0-9\.\-_]+@[a-z0-9\.\-_]+\.[a-z]+)/gi;

  var params = $site.paramsFromQuerystring();
  if (params && params.id) {
    $http.post(SITE_ROOT + "/api/Collection/get_collection_info", {
      id: params.id
    }).then(function(response) {
      $scope.collectionInfoIsLoading = false;
      $scope.collection = response.data.results;
      $scope.shareLink = "https://" + DOMAIN + "/app/browse-shared-collection?t=" + $scope.collection.shareToken;
    }, function(error) {
      $scope.collectionInfoIsLoading = false;
      console.error(error);
    });

    $http.post(SITE_ROOT + "/api/Collection/get_photos_for_collection", {
      collectionId: params.id
    }).then(function(response) {
      $scope.photos = response.data.results;
      $scope.photosAreLoading = false;
    }, function(error) {
      $scope.photosAreLoading = false;
      console.error(error);
    });
  }
  else {
    $site.navigateTo('collections');
  }

  $scope.toggleShareCollectionDialog = function() {
    $scope.shareCollectionDialogIsDisplayed = $scope.shareCollectionDialogIsDisplayed ? false : true;
  }

  $scope.shareCollection = function() {
    var emailString = document.getElementById('emailAddressesToShareWith').value;

    var emails = [];
    var r = /([a-z0-9\.\-_]+@[a-z0-9\.\-_]+\.[a-z]+)/gi;

    var match;
    while ((match = r.exec(emailString)) !== null) {
      emails.push(match[0]);
    }

    $http.post(SITE_ROOT + "/api/Collection/share_collection", {
      collectionId: params.id,
      emails: emails
    }).then(function(response) {
      $scope.emailAddressesToShareWith = '';
      $scope.notice = "An email was sent to the email addresses you provided with the shared link.";
      $timeout($scope.hideNotice, 3000);
    }, function(error) {
      console.error(error);
    });
  }

  $scope.hideNotice = function() {
    $scope.notice = '';
  }

  $scope.openLightBox = function(photo) {
    $scope.lightBoxPhoto = photo;
    $scope.photos.forEach(function(eachPhoto) {
      eachPhoto.displayCollectionForm = false;
    });
  }
  
  $scope.startSlideshow = function() {
    var photoSrcArray = $scope.photos.map(function(photo) {
      return photo.filename + "/1920";
    });
    $scope.$broadcast("slideshow", photoSrcArray);
  }
  
  $scope.stopSlideshow = function() {
    $scope.$broadcast("slideshow", null);
  }

}]);
