app.directive("lightbox", ["Site", "$http", function($site, $http) {
  return {
    restrict: 'E',
    scope: {
      photo: '=photo',
      photos: '=photos',
      editing: '@editing'
    },
    templateUrl: "components/lightbox/lightbox.html",
    link: function (scope, element, attrs) {
      scope.$site = $site;
      scope.allowDownload = document.body.offsetWidth <= 800 ? false : true;
      scope.allowPrint = document.body.offsetWidth <= 800 ? false : true;
      scope.actionsMenuIsDisplayed = false;

      scope.allowEditing = scope.editing == 'disabled' ? false : true;
      scope.isRotatingPhoto = false;

      scope.lightboxDate = null;
      scope.swipeReadyPhotos = [
        { photo: null, element: document.getElementById('light-box-a'), img: document.getElementById('light-box-image-a') },
        { photo: null, element: document.getElementById('light-box-b'), img: document.getElementById('light-box-image-b') },
        { photo: null, element: document.getElementById('light-box-c'), img: document.getElementById('light-box-image-c') }
      ];

      scope.$watch('photo', function() {
        scope.updatePhoto();
      });

      scope.$watch('photo.lastModified', function() {
        if (scope.photo && scope.photo.lastModified) {
          scope.updatePhoto();
        }
      });

      scope.updatePhoto = function() {
        if (scope.photo) {
          if (scope.photo.dateTaken) {
            var arr = scope.photo.dateTaken.split(/[- :]/);
            scope.lightboxDate = new Date(arr[0], arr[1]-1, arr[2], arr[3], arr[4], arr[5]);
          }
          scope.swipeReadyPhotos[1].photo = scope.photo;
          scope.swipeReadyPhotos[1].img.src = scope.photo.filename + '/1920?' + scope.photo.lastModified;
          scope.swipeReadyPhotos[0].photo = getPhotoBefore(scope.photo);
          if (scope.swipeReadyPhotos[0].photo) {
            scope.swipeReadyPhotos[0].img.src = scope.swipeReadyPhotos[0].photo.filename + '/1920?' + scope.photo.lastModified;
          }
          scope.swipeReadyPhotos[2].photo = getPhotoAfter(scope.photo);
          if (scope.swipeReadyPhotos[2].photo) {
            scope.swipeReadyPhotos[2].img.src = scope.swipeReadyPhotos[2].photo.filename + '/1920?' + scope.photo.lastModified;
          }
          applyOffsetToLightBox(0);
        }
      }

      scope.toggleActionsMenu = function() {
        scope.actionsMenuIsDisplayed = !scope.actionsMenuIsDisplayed;
      }

      var originalTouchTime = new Date().getTime();
      var swipeX = 0;
      var originalSwipeX = 0;
      var animationVelocity = 0;
      var lastAnimationFrame = new Date().getTime();
      var animationX = 0;
      var hasTouchMoved = false;
      scope.touchStart = function(event) {
        swipeDistance = 0;
        hasTouchMoved = false;
        if (event.touches.length) {
          originalSwipeX = event.touches[0].clientX;
          swipeX = originalSwipeX;
          originalTouchTime = new Date().getTime();
        }
      }
      scope.touchMove = function(event) {
        if (event.touches.length) {
          swipeX = event.touches[0].clientX;
          var swipeDistance = swipeX - originalSwipeX;
          hasTouchMoved = true;
          applyOffsetToLightBox(swipeDistance);
        }
        event.preventDefault();
        event.stopPropagation();
      }
      scope.touchEnd = function(event) {
        if (event.touches.length) {
          swipeX = event.touches[0].clientX;
        }
        if (hasTouchMoved) {
          var swipeDistance = swipeX - originalSwipeX;
          var parentWidth = scope.swipeReadyPhotos[1].element.offsetWidth;
          if (Math.abs(swipeDistance) / parentWidth >= 0.25) {
            var elapsedTime = new Date().getTime() - originalTouchTime;
            if (elapsedTime == 0)
              elapsedTime = 1;
            animationVelocity = (swipeX - originalSwipeX) / elapsedTime;
            if (Math.abs(animationVelocity) < 0.075) {
              animationVelocity = 0.075 * (-animationVelocity / Math.abs(animationVelocity));
            }
            animationX = swipeDistance;
            lastAnimationFrame = new Date().getTime();
            if (window.requestAnimationFrame) window.requestAnimationFrame(animateTowardPreviousOrNextImage);
            else if (window.webkitRequestAnimationFrame) window.webkitRequestAnimationFrame(animateTowardPreviousOrNextImage);
            else if (window.mozRequestAnimationFrame) window.mozRequestAnimationFrame(animateTowardPreviousOrNextImage);
          }
          else { // bounce back to current photo
            animationVelocity = 0.05 * (-swipeDistance / Math.abs(swipeDistance));
            animationX = swipeDistance;
            lastAnimationFrame = new Date().getTime();
            if (window.requestAnimationFrame) window.requestAnimationFrame(animateBounceBackToCurrentImage);
            else if (window.webkitRequestAnimationFrame) window.webkitRequestAnimationFrame(animateBounceBackToCurrentImage);
            else if (window.mozRequestAnimationFrame) window.mozRequestAnimationFrame(animateBounceBackToCurrentImage);
          }
        }
      }

      scope.closeLightBox = function() {
        scope.photo = undefined;
      }

      scope.toggleDeletePhotoDialog = function($event) {
        scope.deletePhotoDialogIsDisplayed = !scope.deletePhotoDialogIsDisplayed;
        scope.toggleActionsMenu();
        if ($event && $event.stopPropagation) {
          $event.stopPropagation();
        }
      }

      scope.rotatePhoto = function(degrees) {
        scope.toggleActionsMenu();
        scope.isRotatingPhoto = true;
        $http.post(SITE_ROOT + "/api/Photo/rotate_photo", {
          photoFileId: scope.photo.id,
          rotation: degrees
        }).then(function(response) {
          scope.photo.lastModified = response.data.results.lastModified;
          scope.isRotatingPhoto = false;
        }, function(error) {
          scope.isRotatingPhoto = false;
          console.error(error);
        });
      }

      scope.deleteLightboxPhoto = function() {
        if (scope.photo) {
          $site.ajax("POST", SITE_ROOT + "/api/Photo/delete_photo", {
            photoFileId: scope.photo.id
          }).then(function(data) {
            if (data.success) {
              scope.photos.splice(scope.photos.indexOf(scope.photo), 1);
              scope.photo = null;
              scope.deletePhotoDialogIsDisplayed = false;
            }
          }).catch(function(data) {
          });
        }
      }

      function animateTowardPreviousOrNextImage() {
        var elapsedTimeMs = new Date().getTime() - lastAnimationFrame;
        var movement = animationVelocity * elapsedTimeMs;
        // console.log(animationVelocity, elapsedTimeMs, movement + "px");

        animationX += movement;
        // console.log(animationX);

        var parentWidth = scope.swipeReadyPhotos[1].element.offsetWidth;
        if (animationX <= -parentWidth) { // done moving toward next image
          applyOffsetToLightBox(-parentWidth);
          var nextSwipeReadyPhoto = { photo: getPhotoAfter(scope.swipeReadyPhotos[2].photo), element: scope.swipeReadyPhotos[0].element, img: scope.swipeReadyPhotos[0].img };
          nextSwipeReadyPhoto.img.src = nextSwipeReadyPhoto.photo.filename + '/1920?' + scope.photo.lastModified;
          scope.swipeReadyPhotos.splice(0, 1);
          scope.swipeReadyPhotos.push(nextSwipeReadyPhoto);
          return;
        }
        else if (animationX >= parentWidth) { // done moving toward next image
          applyOffsetToLightBox(parentWidth);
          var prevSwipeReadyPhoto = { photo: getPhotoBefore(scope.swipeReadyPhotos[0].photo), element: scope.swipeReadyPhotos[2].element, img: scope.swipeReadyPhotos[2].img };
          prevSwipeReadyPhoto.img.src = prevSwipeReadyPhoto.photo.filename + '/1920?' + scope.photo.lastModified;
          scope.swipeReadyPhotos.splice(0, 0, prevSwipeReadyPhoto);
          scope.swipeReadyPhotos.pop();
          return;
        }

        applyOffsetToLightBox(animationX);

        lastAnimationFrame = new Date().getTime();
        if (window.requestAnimationFrame) window.requestAnimationFrame(animateTowardPreviousOrNextImage);
        else if (window.webkitRequestAnimationFrame) window.webkitRequestAnimationFrame(animateTowardPreviousOrNextImage);
        else if (window.mozRequestAnimationFrame) window.mozRequestAnimationFrame(animateTowardPreviousOrNextImage);
      }

      function animateBounceBackToCurrentImage() {
        var elapsedTimeMs = new Date().getTime() - lastAnimationFrame;
        var movement = animationVelocity * elapsedTimeMs;
        // console.log(animationVelocity, elapsedTimeMs, movement + "px");

        var prevAnimationX = animationX;
        animationX += movement;

        var parentWidth = scope.swipeReadyPhotos[1].element.offsetWidth;
        if (animationX / Math.abs(animationX) != prevAnimationX / Math.abs(prevAnimationX)) { // done moving toward next image
          applyOffsetToLightBox(0);
          return;
        }

        applyOffsetToLightBox(animationX);

        if (window.requestAnimationFrame) window.requestAnimationFrame(animateBounceBackToCurrentImage);
        else if (window.webkitRequestAnimationFrame) window.webkitRequestAnimationFrame(animateBounceBackToCurrentImage);
        else if (window.mozRequestAnimationFrame) window.mozRequestAnimationFrame(animateBounceBackToCurrentImage);
      }

      function applyOffsetToLightBox(offset) {
        var previousLighBoxImageX = offset > 0 ? "calc(-100% + " + offset + "px)" : "calc(-100% - " + Math.abs(offset) + "px)";
        scope.swipeReadyPhotos[0].element.style.left = previousLighBoxImageX;

        var lightBoxImageX = offset + "px";
        scope.swipeReadyPhotos[1].element.style.left = lightBoxImageX;

        var nextLighBoxImageX = offset > 0 ? "calc(100% + " + offset + "px)" : "calc(100% - " + Math.abs(offset) + "px)";
        scope.swipeReadyPhotos[2].element.style.left = nextLighBoxImageX;
      }

      function getPhotoBefore(ph) {
        if (scope.photos && scope.photos.length > 1) {
          for (var i=0; i < scope.photos.length; i++) {
            if (scope.photos[i] == ph) {
              return i > 0 ? scope.photos[i-1] : scope.photos[scope.photos.length - 1];
            }
          }
        }
        return null;
      }

      function getPhotoAfter(ph) {
        if (scope.photos && scope.photos.length > 1) {
          for (var i=0; i < scope.photos.length; i++) {
            if (scope.photos[i] == ph) {
              return i < scope.photos.length - 1 ? scope.photos[i+1] : scope.photos[0];
            }
          }
        }
        return null;
      }

    }
  }
}]);
