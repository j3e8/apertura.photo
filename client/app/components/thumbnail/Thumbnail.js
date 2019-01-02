app.directive("thumbnail", ["Site", "$rootScope", "$http", function($site, $rootScope, $http) {
  return {
    restrict: 'E',
    scope: {
      photo: '=photo',
      photos: '=photos',
      editing: '@editing',
      click: '=onClick'
    },
    templateUrl: "components/thumbnail/thumbnail.html",
    link: function (scope, element, attrs) {
      scope.$site = $site;
      scope.allowEditing = scope.editing == 'disabled' ? false : true;

      scope.openLightBox = function(photo) {
        if (scope.click) {
          scope.click(photo);
        }
      }

      scope.showAddTagDialog = function(photo) {
        scope.photos.forEach(function(eachPhoto) {
          eachPhoto.displayTagForm = false;
          eachPhoto.allTagsAreDisplayed = false;
        });
        photo.displayTagForm = true;
        $rootScope.$broadcast('focus', photo);
      }

      scope.handleKeyDownOnTagInput = function(event, photos) {
        if (event.keyCode == 9) { // tab
          if (photos.length == 1) {
            tabThroughImages(event, photos[0]);
          }
          event.stopPropagation();
        }
      }

      scope.handleKeyUpOnTagInput = function(event, photos) {
        if (event.keyCode == 27) { // esc
          photos.forEach(function(photo) {
            photo.displayTagForm = false;
          });
        }
      }

      scope.removeTagFromPhoto = function(tag, photo) {
        $http.post(SITE_ROOT + "/api/Tag/remove_tag_from_photo", {
          tagId: tag.id,
          photoFileId: photo.id
        }).then(function(response) {
          photo.tags.splice(photo.tags.indexOf(tag), 1);
        }, function(error) {
          console.error(error);
        });
      }

      scope.togglePhotoSelection = function(photo) {
        photo.selected = photo.selected ? false : true;
        $rootScope.$broadcast('photoSelectionChanged', scope.photos);
      }

      scope.toggleTagList = function(photo) {
        var currentState = photo.allTagsAreDisplayed;
        scope.photos.forEach(function(eachPhoto) {
          eachPhoto.displayTagForm = false;
          eachPhoto.allTagsAreDisplayed = false;
        });
        photo.allTagsAreDisplayed = !currentState;
      }

      scope.stringifyTags = function(photo) {
        return photo.tags.map(function(tag) {
          return tag.tagName;
        }).join(", ");
      }

      function tabThroughImages(event, photo) {
        for (var i=0; i<scope.photos.length; i++) {
          if (scope.photos[i].filename == photo.filename) {
            if (event.shiftKey) {
              nextPhotoIndex = i-1;
              if (nextPhotoIndex < 0) {
                nextPhotoIndex = 0;
              }
            }
            else {
              nextPhotoIndex = i+1;
              if (nextPhotoIndex >= scope.photos.length) {
                nextPhotoIndex = scope.photos.length - 1;
              }
            }
            if (i != nextPhotoIndex) {
              var nextPhoto = scope.photos[nextPhotoIndex];
              scope.showAddTagDialog(nextPhoto);
            }
            break;
          }
        }
      }

    }
  };
}]);
