app.controller("BrowseSharedCollectionPage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;

  $scope.collection = null;
  $scope.photos = [];

  $scope.photosAreLoading = true;
  $scope.collectionInfoIsLoading = true;

  $scope.lightBoxPhoto = null;

  var params = $site.paramsFromQuerystring();

  var hasSeenSharedPhotosDialog = (localStorage.getItem("sharedPhotosDialog[" + params.t + "]") == 'yes');
  $scope.sharedPhotosDialogIsDisplayed = !hasSeenSharedPhotosDialog;
  $scope.photosCopiedDialogIsDisplayed = undefined;

  $scope.importedPhotoCount = 0;
  $scope.isCopyingPhotos = false;

  if (params && params.t) {
    $http.post(SITE_ROOT + "/api/Collection/get_shared_collection_info", {
      token: params.t
    }).then(function(response) {
      $scope.collectionInfoIsLoading = false;
      $scope.collection = response.data.results;

      loadPhotos();
    }, function(error) {
      $scope.collectionInfoIsLoading = false;
      console.error(error);
    });
  }
  else {
    $site.navigateTo('home');
  }

  function loadPhotos() {
    $http.post(SITE_ROOT + "/api/Collection/get_photos_for_shared_collection", {
      collectionId: $scope.collection.id,
      token: params.t
    }).then(function(response) {
      $scope.photos = response.data.results;
      $scope.photosAreLoading = false;
    }, function(error) {
      $scope.photosAreLoading = false;
      console.error(error);
    });
  }

  $scope.goToRecentlyAdded = function() {
    $site.navigateTo('browse-recent');
  }

  $scope.selectAllPhotos = function() {
    $scope.photos.forEach(function(photo) {
      photo.selected = true;
    });
  }

  $scope.deselectAllPhotos = function() {
    $scope.photos.forEach(function(photo) {
      photo.selected = false;
    });
  }

  $scope.importPhotos = function() {
    var selectedPhotos = $scope.photos.filter(function(photo) {
      return photo.selected;
    });
    if (!selectedPhotos.length) {
      selectedPhotos = $scope.photos;
    }

    var selectedPhotoFileIds = selectedPhotos.map(function(photo) {
      return photo.id;
    });

    $scope.importedPhotoCount = selectedPhotoFileIds.length;

    $scope.isCopyingPhotos = true;
    $http.post(SITE_ROOT + "/api/Collection/import_photos_from_shared_collection", {
      photoFileIds: selectedPhotoFileIds
    }).then(function(response) {
      $scope.isCopyingPhotos = false;
      $scope.photosCopiedDialogIsDisplayed = true;
    }, function(error) {
      console.error(error);
    });
  }

  $scope.displaySignInDialog = function() {
    $scope.$emit('signinRequest');
  }

  $scope.displaySignUpDialog = function() {
    $scope.$emit('signupRequest');
  }

  $scope.toggleSharedPhotosDialog = function() {
    $scope.sharedPhotosDialogIsDisplayed = $scope.sharedPhotosDialogIsDisplayed ? false : true;
    localStorage.setItem("sharedPhotosDialog[" + params.t + "]", "yes");
  }

  $scope.togglePhotosCopiedDialog = function() {
    $scope.photosCopiedDialogIsDisplayed = $scope.photosCopiedDialogIsDisplayed ? false : true;
    if (!$scope.photosCopiedDialogIsDisplayed) {
      window.location.reload();
    }
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
