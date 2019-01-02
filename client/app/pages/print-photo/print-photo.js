app.controller("PrintPhotoPage", ["$scope", "$http", "Site", function($scope, $http, $site) {
  $scope.filename = null;
  $scope.img = new Image();

  $scope.sizeOptions = [
    { display: "2x2", width: 2, height: 2 },
    { display: "3.5x5", width: 3.5, height: 5 },
    { display: "4x6", width: 4, height: 6 },
    { display: "5x7", width: 5, height: 7 },
    { display: "6x9", width: 6, height: 9 },
    { display: "8x10", width: 8, height: 10 },
    { display: "8.5x11", width: 8.5, height: 11 }
  ];
  $scope.printSize = $scope.sizeOptions[1];
  $scope.printUnits = "in";

  var imageOrientation = 'portrait';
  var originalImageSize = {};
  var pageStyleElement;

  function convertSizeToOrientedSize(size) {
    var newSize = Object.assign({}, size);
    if (imageOrientation == 'landscape') {
      newSize.width = size.width > size.height ? size.width : size.height;
      newSize.height = size.width > size.height ? size.height : size.width;
    }
    else {
      newSize.width = size.width > size.height ? size.height : size.width;
      newSize.height = size.width > size.height ? size.width : size.height;
    }
    return newSize;
  }

  function updateCssPageSize() {
    var newPrintSize = convertSizeToOrientedSize($scope.printSize);
    if (!pageStyleElement) {
      pageStyleElement = document.createElement("style");
      pageStyleElement.type = "text/css";
      document.head.appendChild(pageStyleElement);
    }
    pageStyleElement.innerHTML = "@page { size: " + newPrintSize.width + $scope.printUnits + " " + newPrintSize.height + $scope.printUnits + "; margin: 0; }";
  }

  function updateContainerSize() {
    var newPrintSize = convertSizeToOrientedSize($scope.printSize);
    var cont = document.getElementById('img-container');
    cont.style.width = newPrintSize.width + $scope.printUnits;
    cont.style.height = newPrintSize.height + $scope.printUnits;

    var sizeChooser = document.getElementById('size-chooser');
    sizeChooser.style.width = newPrintSize.width + $scope.printUnits;
  }

  function updateImageSize() {
    var orientedPrintSize = convertSizeToOrientedSize($scope.printSize);
    var orientedOriginalImageSize = convertSizeToOrientedSize(originalImageSize);
    var imageSize = Object.assign({}, orientedPrintSize);

    var containerRatio = orientedPrintSize.width / orientedPrintSize.height;
    var imageRatio = orientedOriginalImageSize.width / orientedOriginalImageSize.height;
    if (imageRatio > containerRatio) {
      imageSize.width = imageSize.height * imageRatio;
    }
    else {
      imageSize.height = imageSize.width / imageRatio;
    }

    var img = document.getElementById('print-image');
    img.style.width = imageSize.width + $scope.printUnits;
    img.style.height = imageSize.height + $scope.printUnits;
    img.style.top = (orientedPrintSize.height - imageSize.height) / 2 + $scope.printUnits;
    img.style.left = (orientedPrintSize.width - imageSize.width) / 2 + $scope.printUnits;
  }

  $scope.img.onload = function() {
    var imageRatio = this.width / this.height;
    originalImageSize = {
      width: this.width,
      height: this.height
    };
    if (imageRatio > 1) {
      imageOrientation = 'landscape';
    }
    else {
      imageOrientation = 'portrait';
    }
    updateContainerSize();
    updateCssPageSize();
    updateImageSize();
  }

  $scope.$watch("printSize", function() {
    updateContainerSize();
    updateCssPageSize();
    updateImageSize();
  });

  var params = $site.paramsFromQuerystring();
  if (params && params.pfid) {
    console.log("getting photo info");
    $http.post(SITE_ROOT + "/api/Photo/get_photo_info", {
      photoFileId: params.pfid
    }).then(function(response) {
      console.log(response.data);
      $scope.filename = response.data.results.filename;
      $scope.img.src = $scope.filename;
    }, function(error) {
      console.error(error);
    });
  }

  $scope.printImage = function() {
    window.print();
  }

  $scope.cancelPrint = function() {
    window.close();
  }

}]);
