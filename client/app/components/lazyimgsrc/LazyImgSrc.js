app.factory('lazyLoader', ['$rootScope', '$http', function($rootScope, $http) {
  var allImages = [];
  var refreshTimer = null;
  var resizeTimer = null;
  var scrollTimer = null;

  function loadImage() {
    this.element.onerror = loadImageError.bind(this, this);
    this.element.src = this.src;
    this.isLoaded = true;
    this.loadTimer = null;
  }

  function loadImageError(img) {
    $http.post(SITE_ROOT + "/api/Error/thumbnail_error", {
      filename: img.src
    });
  }

  function lazyLoadImages() {
    // console.log(document.body.scrollTop, window.innerHeight);
    var range = {
      top: -300,
      bottom: window.innerHeight + 300
    };

    allImages.forEach(function(image) {
      if (!image.isLoaded) {
        var rect = image.element.getBoundingClientRect();
        if (rect.bottom > range.top && rect.top < range.bottom) {
          image.loadTimer = setTimeout(loadImage.bind(image), 25);
        }
        else if (image.loadTimer) {
          clearTimeout(image.loadTimer);
        }
      }
    });
  }

  window.addEventListener("scroll", function() {
    if (scrollTimer) {
      clearTimeout(scrollTimer);
    }
    setTimeout(lazyLoadImages, 25);
  });
  window.addEventListener("resize", function() {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    setTimeout(lazyLoadImages, 25);
  });

  return {
    images: allImages,
    addImage: function(src, element) {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      this.images.push({
        src: src,
        element: element,
        isLoaded: false,
        loadTimer: null
      });
      refreshTimer = setTimeout(lazyLoadImages, 25);
    }
  };
}]);

app.directive("lazyImgSrc", ['lazyLoader', function($lazyLoader) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      $lazyLoader.addImage(attrs.lazyImgSrc, element[0]);

      attrs.$observe('lazyImgSrc', function() {
        $lazyLoader.addImage(attrs.lazyImgSrc, element[0]);
      });
    }
  };
}]);
