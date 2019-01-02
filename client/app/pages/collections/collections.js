app.controller("CollectionsPage", ["Site", '$scope', '$http', '$timeout', function($site, $scope, $http, $timeout) {
  $scope.$site = $site;
  $scope.collections = [];
  $scope.visibleCollections = [];

  $scope.collectionFilter = '';

  $scope.collectionToDelete = null;

  $scope.isLoadingCollections = true;

  $http.get(SITE_ROOT + "/api/Collection/get_collections_for_user_with_sample_photos"
  ).then(function(response) {
    $scope.collections = response.data.results;
    sortCollectionsAlphabetically();
    $scope.visibleCollections = $scope.collections.slice(0);
    $scope.isLoadingCollections = false;
  }, function(error) {
    $scope.isLoadingCollections = false;
    console.error(error);
  });

  $scope.filterCollections = function() {
    $scope.visibleCollections = $scope.collections.filter(function(collection) {
      if (collection.name.toLowerCase().indexOf($scope.collectionFilter.toLowerCase()) != -1) {
        return true;
      }
      return false;
    });
  }

  $scope.handleCollectionClick = function(collection) {
    if (!collection.isEditing) {
      $site.navigateTo('browse-collection?id=' + collection.id);
    }
  }

  $scope.handleCollectionEditKeyPress = function($event, collection) {
    if ($event.keyCode == 13) {
      $scope.saveNewCollectionName(collection);
    }
  }

  $scope.toggleCollectionOptions = function(collection) {
    collection.optionsAreDisplayed = collection.optionsAreDisplayed ? false : true;
  }

  $scope.toggleEditCollectionBox = function(collection) {
    collection.isEditing = collection.isEditing ? false : true;
    if (collection.isEditing) {
      collection.newCollectionName = collection.name;
    }
  }

  $scope.toggleDeleteCollectionDialog = function(collection) {
    $scope.collectionToDelete = collection;
  }

  $scope.deleteCollection = function() {
    $http.post(SITE_ROOT + "/api/Collection/delete_collection", {
      id: $scope.collectionToDelete.id
    }).then(function(response) {
      $scope.collections.splice($scope.collections.indexOf($scope.collectionToDelete), 1);
      $scope.collectionToDelete = null;
    }, function(error) {
      console.error(error);
    });
  }

  $scope.saveNewCollectionName = function(collection) {
    if (collection.isSaving || collection.name.toLowerCase() == collection.newCollectionName.toLowerCase()) {
      collection.isEditing = false;
      return;
    }
    collection.isSaving = true;
    $http.post(SITE_ROOT + "/api/Collection/update_collection", {
      id: collection.id,
      collectionName: collection.newCollectionName
    }).then(function(response) {
      collection.isSaving = false;
      if (response.data.success) {
        collection.name = collection.newCollectionName;
        collection.isEditing = false;
      }
    }, function(error) {
      collection.isSaving = false;
      console.error(error);
    });
  }






  function sortCollectionsAlphabetically() {
    $scope.collections.sort(function(a, b) {
      return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
    });
  }

  function sortCollectionsByCount() {
    $scope.collections.sort(function(a, b) {
      return b.totalPhotoFiles - a.totalPhotoFiles;
    });
  }

}]);