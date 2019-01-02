app.directive("slideshow", function() {
  var isPaused = true;
  var lastFrame = null;
  var previousPhoto = null;
  var currentPhoto = null;
  var nextPhoto = null;
  
  var sceneStart = null; // timestamp
  var sceneDuration = 6000; // ms
  var transitionDuration = 1000; // ms
  
  function getPhotoAfter(photos, photo) {
  	for (var i=0; i < photos.length; i++) {
    	if (photos[i] == photo) {
      	if (i < photos.length - 1) {
        	return photos[i+1];
        }
        return photos[0];
      }
    }
    return null;
  }
  
  function animateFrame(scope) {
    var thisFrame = new Date().getTime();
  	var elapsedTime = thisFrame - lastFrame;
    
    var sceneElapsedTime = thisFrame - sceneStart;
    var sceneElapsedPct = sceneElapsedTime / sceneDuration;
    
    var idx = scope.photos.indexOf(currentPhoto);
    if (idx && idx != -1) {
        for (var i=idx; i < idx + 5; i++) {
        	if (i < scope.photos.length) {
		        loadImage(scope.photos[i]);
          }
        }
    }
    
    if (sceneElapsedPct >= 1) {
    	nextScene(scope);
    }
    else {
      var transitionInElapsedTime = sceneElapsedTime < transitionDuration / 2
        ? sceneElapsedTime
        : 0;
      var transitionInElapsedPct = transitionInElapsedTime / transitionDuration;

      var transitionOutElapsedTime = sceneDuration - sceneElapsedTime < transitionDuration / 2
        ? transitionDuration / 2 - (sceneDuration - sceneElapsedTime)
        : 0;
      var transitionOutElapsedPct = transitionOutElapsedTime / transitionDuration;
      
      var previousTransitionOutElapsedTime = transitionDuration / 2 - sceneElapsedTime > 0
      	? transitionDuration / 2 - sceneElapsedTime
        : 0;
      var previousTransitionOutElapsedPct = previousTransitionOutElapsedTime / transitionDuration;

			currentPhoto.size = calculatePhotoSize(scope.slideshowElement, currentPhoto, sceneElapsedPct);
      if (previousPhoto) {
				previousPhoto.size = calculatePhotoSize(scope.slideshowElement, previousPhoto, sceneElapsedPct + 1);
      }
      
      if (transitionOutElapsedPct == 0) {
      	currentPhoto.opacity = 1;
      }
      else {
      	currentPhoto.opacity = 1 - transitionOutElapsedPct;
      }
      if (transitionInElapsedPct == 0) {
      	currentPhoto.opacity = 1;
      }
      else {
      	currentPhoto.opacity = transitionInElapsedPct;
      }
      
      if (previousPhoto) {
      	if (previousTransitionOutElapsedPct) {
	      	previousPhoto.opacity = previousTransitionOutElapsedPct;
	      	renderImage(scope.previousPhotoElement, null, previousPhoto.size, previousPhoto.opacity);
        }
        else {
        	removeImage(scope.previousPhotoElement);
        }
      }
      renderImage(scope.currentPhotoElement, null, currentPhoto.size, currentPhoto.opacity);
    }
    
    lastFrame = new Date().getTime();
    if (!isPaused) {
      requestAnimationFrame(animateFrame.bind(this, scope));
    }
  }

  function calculatePhotoSize(containerElement, photo, elapsedPct) {
    var containSize = calculatePhotoContainSize(containerElement, photo);
    var bleedSize = calculatePhotoStartSize(containerElement, photo);
    var startSize = photo.effect.style == 'zoom-out'
      ? bleedSize
      : containSize;
    var endSize = startSize == containSize
      ? bleedSize
      : containSize;
    var size = {
      width: startSize.width + elapsedPct * (endSize.width - startSize.width),
      height: startSize.height + elapsedPct * (endSize.height - startSize.height)
    };
    return size;
  }
  
  var __previousPhotoEffect = null;
  var __currentPhotoEffect = null;
  function nextPhotoEffect() {
    var zoomStyle = 'zoom-out';
    if (__previousPhotoEffect && __previousPhotoEffect.style == 'zoom-out') {
    	zoomStyle = 'zoom-in';
    }
    __currentPhotoEffect = {
			style: zoomStyle,
      xFocus: 0.5,
      yFocus: 0.5
    };
    __previousPhotoEffect = __currentPhotoEffect;
    return __currentPhotoEffect;
  }
  
  function nextScene(scope) {
  	previousPhoto = currentPhoto;
    currentPhoto = nextPhoto;
    renderImage(scope.previousPhotoElement, previousPhoto.src, previousPhoto.size, previousPhoto.opacity);
    if (currentPhoto.isLoaded) {
			currentPhoto.effect = nextPhotoEffect();
      var startSize = currentPhoto.effect.style == 'zoom-out'
      	? calculatePhotoStartSize(scope.slideshowElement, currentPhoto)
        : calculatePhotoContainSize(scope.slideshowElement, currentPhoto);
      currentPhoto.width = startSize.width;
      currentPhoto.height = startSize.height;
      renderImage(scope.currentPhotoElement, currentPhoto.src, startSize, 0);
    }
    nextPhoto = getPhotoAfter(scope.photos, currentPhoto);
    sceneStart = new Date().getTime();
  }
  
  function loadImage(photo) {
  	if (!photo.isLoaded) {
      photo.img.onload = function() {
        photo.isLoaded = true;
      }
      photo.img.src = photo.src;
    }
  }
  
  function goFullscreen(element) {
  	/*if (element.webkitRequestFullscreen)
	    element.webkitRequestFullscreen();
  	else if (element.mozRequestFullscreen)
	    element.mozRequestFullscreen();
  	else if (element.msRequestFullscreen)
	    element.msRequestFullscreen();
  	else if (element.requestFullscreen)
	    element.requestFullscreen();*/
	element.style.display = "block";
  }
  
  function exitFullscreen(element) {
/*    if (document.exitFullscreen)
      document.exitFullscreen();
    else if (document.webkitExitFullscreen)
      document.webkitExitFullscreen();
    else if (document.mozExitFullscreen)
      document.mozExitFullscreen();
    else if (document.msExitFullscreen)
      document.msExitFullscreen();*/
    element.style.display = "none";
  }
  
  function startSlideshow(scope) {
    if (!scope.photos || !scope.photos.length) {
      return false;
    }
    for (var i=0; i < 8; i++) {
      if (i < scope.photos.length) {
        loadImage(scope.photos[i]);
      }
    }
    isPaused = false;
    currentPhoto = scope.photos[0];
    nextPhoto = getPhotoAfter(scope.photos, currentPhoto);
    
    goFullscreen(scope.slideshowElement);
    
    var waitForFirstImageToLoad = setInterval(function() {
      if (currentPhoto.isLoaded) {
	clearInterval(waitForFirstImageToLoad);
        currentPhoto.effect = nextPhotoEffect();
        var startSize = calculatePhotoStartSize(scope.slideshowElement, currentPhoto);
        currentPhoto.size = startSize;
        currentPhoto.opacity = 0;
        removeImage(scope.previousPhotoElement);
        renderImage(scope.currentPhotoElement, currentPhoto.src, startSize, 0);
        removeImage(scope.nextPhotoElement);
        lastFrame = new Date().getTime();
        sceneStart = new Date().getTime();
        requestAnimationFrame(animateFrame.bind(this, scope));
      }
    }, 5);
  }
  
  function renderImage(element, src, size, opacity) {
  	element.style.backgroundSize = size.width + "px " + size.height + "px";
    if (src) {
	    element.style.backgroundImage = "url(" + src + ")";
    }
    if (size) {
      var x = element.offsetWidth / 2 - size.width / 2;
      var y = element.offsetHeight / 2 - size.height / 2;
      element.style.backgroundPosition = x + "px " + y + "px";
    }
    if (opacity < 0) {
	    opacity = 0;
    }
    else if (opacity > 1) {
    	opacity = 1;
    }
    element.style.opacity = opacity;
  }
  
  function removeImage(element) {
    element.style.opacity = 0;
    element.style.backgroundImage = "none";
  }
  
  function stopSlideshow(element) {
    isPaused = true;
    exitFullscreen(element);
  }
  
  function calculatePhotoContainSize(container, photo) {
  	if (!photo.img || !photo.isLoaded) {
    	return { width: 0, height: 0 };
    }
  	var containSize = {
    	width: container.offsetWidth,
      height: container.offsetHeight
    };
    var containerAspect = container.offsetWidth / container.offsetHeight;
    var photoAspect = photo.img.width / photo.img.height;
    if (containerAspect > photoAspect) {
    	containSize.width = containSize.height * photoAspect;
    }
    else {
    	containSize.height = containSize.width / photoAspect;
    }
    return containSize;
  }
  
  function calculatePhotoStartSize(container, photo) {
    if (!photo.img || !photo.isLoaded) {
    	return { width: 0, height: 0 };
    }
    var containSize = calculatePhotoContainSize(container, photo);
    var zoom = 1.4;
    var startSize = {
      width: containSize.width * zoom,
      height: containSize.height * zoom
    };
    return startSize;
  }

  return {
    restrict: 'E',
    template: "<div><div data-which=\"previous\"></div><div data-which=\"current\"></div><div data-which=\"next\"></div></div>",
    scope: {},
    link: function(scope, element, attr) {
      scope.slideshowElement = element[0].childNodes[0];
      scope.previousPhotoElement = scope.slideshowElement.childNodes[0];
      scope.currentPhotoElement = scope.slideshowElement.childNodes[1];
      scope.nextPhotoElement = scope.slideshowElement.childNodes[2];
      
      scope.slideshowElement.addEventListener("click", function() {
      	stopSlideshow(scope.slideshowElement);
      });
      
      scope.$on("slideshow", function($event, data) {
      	if (data && data.length) {
          scope.photos = data.map(function(photoSrc) {
            return {
              src: photoSrc,
              img: new Image(),
              isLoaded: false
            };
          });
          startSlideshow(scope);
        }
        else {
          stopSlideshow(scope.slideshowElement);
        }
      });
    }
  };
});
