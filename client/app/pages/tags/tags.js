app.controller("TagsPage", ["Site", '$scope', '$http', '$timeout', function($site, $scope, $http, $timeout) {
  $scope.$site = $site;
  $scope.tags = [];
  $scope.visibleTags = [];

  $scope.tagFilter = '';

  $scope.tagToMerge = null;
  $scope.tagToMergeInto = null;
  $scope.tagToDelete = null;

  $scope.isLoadingTags = true;

  $http.get(SITE_ROOT + "/api/Tag/get_tags_for_user"
  ).then(function(response) {
    $scope.tags = response.data.results;
    sortTagsAlphabetically();
    $scope.visibleTags = $scope.tags.slice(0);
    $scope.isLoadingTags = false;
  }, function(error) {
    $scope.isLoadingTags = false;
    console.error(error);
  });

  $scope.filterTags = function() {
    $scope.visibleTags = $scope.tags.filter(function(tag) {
      if (tag.tagName.toLowerCase().indexOf($scope.tagFilter.toLowerCase()) != -1) {
        return true;
      }
      return false;
    });
  }

  $scope.handleTagClick = function(tag) {
    if (!tag.isEditing) {
      $site.navigateTo('browse-by-tag?id=' + tag.id);
    }
  }

  $scope.handleTagEditKeyPress = function($event, tag) {
    if ($event.keyCode == 13) {
      $scope.saveNewTagName(tag);
    }
  }

  $scope.toggleTagOptions = function(tag) {
    tag.optionsAreDisplayed = tag.optionsAreDisplayed ? false : true;
  }

  $scope.toggleEditTagBox = function(tag) {
    tag.isEditing = tag.isEditing ? false : true;
    if (tag.isEditing) {
      tag.newTagName = tag.tagName;
    }
  }

  $scope.toggleMergeTagDialog = function(tag) {
    $scope.tagToMerge = tag;
    $scope.tagToMergeInto = tag;
    $scope.tagToDelete = null;
  }

  $scope.toggleDeleteTagDialog = function(tag) {
    $scope.tagToDelete = tag;
    $scope.tagToMerge = null;
  }

  $scope.deleteTag = function() {
    $http.post(SITE_ROOT + "/api/Tag/delete_tag", {
      id: $scope.tagToDelete.id
    }).then(function(response) {
      $scope.tags.splice($scope.tags.indexOf($scope.tagToDelete), 1);
      $scope.tagToDelete = null;
    }, function(error) {
      console.error(error);
    });
  }

  $scope.mergeTags = function() {
    if ($scope.tagToMerge == $scope.tagToMergeInto) {
      $site.displayNotification("You can't merge a tag into itself, silly!");
      return;
    }
    if (!$scope.tagToMerge) {
      $site.displayNotification("Can't merge tags you haven't chosen!");
      return;
    }
    else if (!$scope.tagToMergeInto) {
      $site.displayNotification("You need to choose a tag to merge " + $scope.tagToMerge.tagName + " into.");
      return;
    }
    $http.post(SITE_ROOT + "/api/Tag/merge_tags", {
      sourceId: $scope.tagToMerge.id,
      destinationId: $scope.tagToMergeInto.id
    }).then(function(response) {
      var duplicates = response.data.results.duplicates;
      $site.displayNotification("Success! All the photos that had the tag " + $scope.tagToMerge.tagName + " now have the tag " + $scope.tagToMergeInto.tagName + ".");
      $scope.tags.splice($scope.tags.indexOf($scope.tagToMerge), 1);
      $scope.tagToMergeInto.totalPhotoFiles = Number($scope.tagToMergeInto.totalPhotoFiles) + Number($scope.tagToMerge.totalPhotoFiles) - duplicates;
      $scope.tagToMerge = null;
      $scope.tagToMergeInto = null;
    }, function(error) {
      console.error(error);
    });
  }

  $scope.saveNewTagName = function(tag) {
    if (tag.isSaving || tag.tagName.toLowerCase() == tag.newTagName.toLowerCase()) {
      tag.isEditing = false;
      return;
    }
    tag.isSaving = true;
    $http.post(SITE_ROOT + "/api/Tag/update_tag", {
      id: tag.id,
      tagName: tag.newTagName
    }).then(function(response) {
      tag.isSaving = false;
      if (response.data.success) {
        tag.tagName = tag.newTagName;
        tag.isEditing = false;
      }
      else if (!response.data.success && response.data.code == 406) {
        // TODO: ask if you want it merged
      }
    }, function(error) {
      tag.isSaving = false;
      console.error(error);
    });
  }






  function sortTagsAlphabetically() {
    $scope.tags.sort(function(a, b) {
      return a.tagName.toLowerCase() < b.tagName.toLowerCase() ? -1 : 1;
    });
  }

  function sortTagsByCount() {
    $scope.tags.sort(function(a, b) {
      return b.totalPhotoFiles - a.totalPhotoFiles;
    });
  }

}]);