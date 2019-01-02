app.directive("selection", ["Site", "$rootScope", "$http", function($site, $rootScope, $http) {
  return {
    restrict: 'E',
    scope: {
      // photos: '=photos'
    },
    templateUrl: "components/selection/selection.html",
    link: function (scope, element, attrs) {
      scope.$site = $site;
      scope.selectionIsDisplayed = undefined;
      scope.selectedPhotos = [];
      scope.photos = [];

      var params = $site.paramsFromQuerystring();

      scope.actions = [
        { id: 'tag', displayName: 'Add tag' },
        { id: 'delete', displayName: 'Delete' },
        { id: 'collection', displayName: 'Add to collection' }
      ];
      scope.selectedAction = scope.actions[0];

      scope.deletePhotoDialogIsDisplayed = false;

      scope.collections = [{
        id: null,
        name: "Start new collection..."
      }];
      scope.selectedCollection = scope.collections[0];
      scope.newCollectionName = '';

      if ($site.isSignedIn) {
        $http.post(SITE_ROOT + "/api/Collection/get_collections_for_user", {
        }).then(function(response) {
          scope.collections = response.data.results.concat(scope.collections);
          scope.selectedCollection = scope.collections[0];
        }, function(error) {
          console.error(error);
        });
      }

      scope.$on('photoSelectionChanged', function($event, photos) {
        scope.selectedAction = scope.actions[0];
        scope.photos = photos;
        scope.updateSelection();
      });

      scope.selectAll = function() {
        scope.photos.forEach(function(photo) {
          photo.selected = true;
        });
        scope.updateSelection();
      }

      scope.selectNone = function() {
        scope.photos.forEach(function(photo) {
          photo.selected = false;
        });
        scope.updateSelection();
      }

      scope.updateSelection = function() {
        scope.selectedPhotos = scope.photos.filter(function(photo) {
          return photo.selected;
        });
        if (scope.selectedPhotos.length) {
          scope.selectionIsDisplayed = true;
        }
        else {
          scope.selectionIsDisplayed = false;
        }
      }

      scope.toggleDeletePhotoDialog = function($event) {
        scope.deletePhotoDialogIsDisplayed = !scope.deletePhotoDialogIsDisplayed;
      }

      scope.deleteSelectedPhotos = function() {
        scope.selectedPhotos.forEach(function(photo) {
          $http.post(SITE_ROOT + "/api/Photo/delete_photo", {
            photoFileId: photo.id
          }).then(function(response) {
            if (response.data.success) {
              scope.photos.splice(scope.photos.indexOf(photo), 1);
              photo = null;
              scope.deletePhotoDialogIsDisplayed = false;
              scope.updateSelection();
            }
          }, function(error) {
          });
        });
      }

      scope.addToCollection = function() {
        var photoFileIds = scope.selectedPhotos.map(function(photo) {
          return photo.id;
        });
        if (!scope.selectedCollection.id) {
          createCollectionWithSelectedPhotos(scope.newCollectionName, photoFileIds);
        }
        else {
          addPhotosToCollection(scope.selectedCollection, photoFileIds);
        }
      }

      function createCollectionWithSelectedPhotos(collectionName, photoFileIds) {
        $http.post(SITE_ROOT + "/api/Collection/create_collection_with_photos", {
          collectionName: collectionName,
          photoFileIds: photoFileIds
        }).then(function(response) {
          $site.displayNotification("New collection " + collectionName + " was created with " + photoFileIds.length + " photo(s)");
        }, function(error) {
          console.error(error);
        });
      }

      function addPhotosToCollection(collection, photoFileIds) {
        $http.post(SITE_ROOT + "/api/Collection/add_photos_to_collection", {
          collectionId: collection.id,
          photoFileIds: photoFileIds
        }).then(function(response) {
          if (photoFileIds.length == 1) {
            $site.displayNotification("One photo was added to the collection " + collection.name + ".");
          }
          else {
            $site.displayNotification(photoFileIds.length + " photos were added to the collection " + collection.name + ".");
          }
        }, function(error) {
          console.error(error);
        });
      }
    }
  };
}]);
