app.directive("tagBox", ["Site", "$timeout", "$rootScope", "$http", function($site, $timeout, $rootScope, $http) {
  return {
    restrict: 'E',
    scope: {
      photos: '=photos',
      keyDown: '=onKeyDown',
      keyUp: '=onKeyUp',
      keyPress: '=onKeyPress'
    },
    templateUrl: "components/tagbox/tagbox.html",
    link: function (scope, element, attrs) {
      scope.$site = $site;
      scope.tag = "";
      scope.tagSuggestions = [];
      scope.highlightedIndex = undefined;
      scope.needsFocus = false;

      $rootScope.$on('focus', function(event, photo) {
        if (scope.photos.indexOf(photo) != -1) {
          scope.needsFocus = true;
        }
      });

      scope.handleKeyPress = function(event) {
        if (event.keyCode == 13) {
          if (scope.highlightedIndex !== undefined) {
            addTagToPhotos(scope.tagSuggestions[scope.highlightedIndex].tagName);
          }
          else {
            addTagToPhotos(scope.tag);
          }
          scope.tag = "";
          scope.tagSuggestions = [];
        }
        if (scope.keyPress) {
          scope.keyPress(event, scope.photos);
        }
        scope.needsFocus = false;
      }

      scope.handleKeyDown = function(event) {
        if (scope.keyDown) {
          scope.keyDown(event, scope.photos);
        }
      }

      scope.handleKeyUp = function(event) {
        if (event.keyCode == 40) { // down
          if (scope.highlightedIndex === undefined) {
            scope.highlightedIndex = 0;
          }
          else {
            scope.highlightedIndex++;
          }
          if (scope.highlightedIndex > scope.tagSuggestions.length - 1) {
            scope.highlightedIndex = scope.tagSuggestions.length - 1;
          }
          // scope.tag = scope.tagSuggestions[scope.highlightedIndex].tagName;
        }
        else if (event.keyCode == 38) { // up
          if (scope.highlightedIndex) {
            scope.highlightedIndex--;
          }
          if (scope.highlightedIndex < 0) {
            scope.highlightedIndex = 0;
          }
          // scope.tag = scope.tagSuggestions[scope.highlightedIndex].tagName;
        }
        else {
          scope.highlightedIndex = undefined;
        }

        loadTagsByPrefix();
        if (scope.keyUp) {
          scope.keyUp(event, scope.photos);
        }
      }

      scope.handleTagClick = function(tagName) {
        addTagToPhotos(tagName);
        scope.tag = "";
        scope.tagSuggestions = [];
        scope.needsFocus = true;
      }

      scope.handleAddTagButtonClick = function() {
        addTagToPhotos(scope.tag);
        scope.tag = "";
        scope.tagSuggestions = [];
        scope.needsFocus = true;
      }

      scope.unfocus = function() {
        scope.needsFocus = false;
      }

      function addTagToPhotos(tagName) {
        if (!tagName) {
          return;
        }
        if (scope.photos && scope.photos.length) {
          scope.photos.forEach(function(eachPhoto) {
            savePhotoTag(eachPhoto, tagName);
          });
        }
      }

      function savePhotoTag(photo, tag) {
        var photoFileId = photo.id;
        $http.post(SITE_ROOT + "/api/Tag/save_tag", {
          tag: tag,
          photoFileId: photoFileId
        }).then(function(response) {
          var newTag = { id: response.data.results.id, tagName: response.data.results.tagName };
          if (!photo.tags) {
            photo.tags = [newTag];
          }
          else {
            photo.tags.push(newTag);
          }
        }, function(error) {
          console.error(error);
        });
      }

      function loadTagsByPrefix() {
        if (scope.tag == '') {
          scope.tagSuggestions = [];
          return;
        }

        $http.post(SITE_ROOT + "/api/Tag/get_tags_by_prefix", {
          prefix: scope.tag
        }).then(function(response) {
          scope.tagSuggestions = response.data.results;
        }, function(error) {
          scope.tagSuggestions = [];
        });
      }

    }
  }
}]);