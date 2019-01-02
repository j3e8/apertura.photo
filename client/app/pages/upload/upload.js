app.controller("UploadPage", ["Site", '$scope', function($site, $scope) {
	$scope.$site = $site;
	console.log('constructor');
}]);

app.directive('photoUpload', ["Site", "$http", function($site, $http) {
  return {
  	restrict: 'A',
  	link: function(scope, element, attrs) {
  		var input = document.createElement("INPUT");
  		input.type = "file";
  		input.multiple = true;
  		input.style.display = "none";
  		input.accept = ".gif, .jpg, .png, .nef, .crw, .cr2, .dng, .pef, .arw, .mrw, .orf, .raf, .dcr";
  		input.addEventListener("change", function (event) {
      	scope.readFiles(event.target.files);
  		});

  		var maxFileUploadThreads = 2;

	    element.bind('click', function(event) {
	    	input.click();
	    });

	    element.bind('dragover', function(event) {
				event.dataTransfer.dropEffect = "copy";
	      event.preventDefault();
	      event.stopPropagation();
	    });

	    element.bind('drop', function(event) {
	      console.log('drop');
	      if (event.dataTransfer.files && event.dataTransfer.files.length) {
	      	scope.readFiles(event.dataTransfer.files);
	      }
	      event.preventDefault();
	      event.stopPropagation();
	    });

	    scope.getNgSrc = function(file) {
	    	if (file.type == "image/jpeg" || file.type == "image/jpg" || file.type == "image/png" || file.type == "image/gif") {
	    		return file.data;
	    	}
	    	return "assets/images/no-image.png";
	    }

	    scope.readFiles = function(files) {
	    	if (!files) {
	    		return;
	    	}
      	for (var f=0; f < files.length; f++) {
      		scope.addFileToQueue(files[f]);
      	}
      	for (var f=0; f < files.length; f++) {
      		scope.readFile(files[f]);
      	}
	    }

	    scope.readFile = function(file) {
      	var reader = new FileReader();
				reader.onload = function () {
					scope.updateThumbnailInQueue(file, reader.result);
				};      		
    		reader.readAsDataURL(file);
	    }

	    scope.photosQueue = [];
	    scope.recentlyUploadedPhotos = [];

	    scope.addFileToQueue = function(file) {
	    	scope.$apply(function() {
		    	scope.photosQueue.push({
		    		name: file.name,
	    			type: file.type,
	    			file: file,
	    			isUploading: false,
	    			isUploaded: false,
	    			failedUpload: false,
	    			uploadStatus: "",
	    			percentUploaded: "0%"
		    	});
		    });
	    	scope.processPhotosQueue();
	    }

	    scope.updateThumbnailInQueue = function(file, data) {
	    	scope.photosQueue.forEach(function (photo) {
	    		if (photo.file == file) {
	    			photo.data = data;
	    			scope.processPhotosQueue();
	    		}
	    	});
	    }

	    var isProcessingQueue = false;
	    scope.processPhotosQueue = function() {
	    	if (isProcessingQueue) {
	    		return;
	    	}
	    	isProcessingQueue = true;
	    	// first, remove any photos that are complete
	    	scope.photosQueue = scope.photosQueue.filter(function(photo) {
	    		return !photo.isUploaded;
	    	});

	    	// find the next photo to be processed
	    	var count = 0;
	    	for (var f=0; f < scope.photosQueue.length; f++) {
	    		var file = scope.photosQueue[f];
	    		if (!file.isUploading && !file.isUploaded && !file.failedUpload && file.data) {
	    			file.isUploading = true;
	    			file.isUploaded = false;
	    			file.failedUpload = false;
	    			file.uploadStatus = "uploading...";

		    		var httpreq = new XMLHttpRequest();
		    		httpreq.upload.onprogress = function(event) {
		    			scope.$apply(function() {
			    			if (event.total) {
			    				var pct = Math.round(event.loaded / event.total * 100);
				    			file.percentUploaded = pct + '%';
				    			if (pct == 100) {
				    				file.uploadStatus = "processing";
				    			}
				    		}
		    			});
		    		};
						httpreq.onreadystatechange = function() {
							console.log(httpreq.readyState + " : " + httpreq.status);
					    if (httpreq.readyState == 4) {
					    	var responseJSON = JSON.parse(httpreq.response);
					    	if (httpreq.status == 200 && responseJSON.success) {
						    	var results = responseJSON.results;
				    			file.isUploaded = true;
				    			file.failedUpload = false;
				    			file.isUploading = false;
				    			file.uploadStatus = "done";
				    			file.percentUploaded = "100%";
				    			scope.recentlyUploadedPhotos.push({
				    				photoId: results.photoId,
				    				photoFileId: results.photoFileId,
				    				src: results.src
				    			});
				    		}
				    		else {
				    			file.failedUpload = true;
				    			file.isUploading = false;
				    			file.message = responseJSON.message;
				    			file.uploadStatus = "Error";
				    		}
			    			setTimeout(scope.processPhotosQueue, 250);
			    		}
		    		};
		    		httpreq.ontimeout = function(event) {
		    			console.log("timeout while uploading file");
		    			file.isUploaded = false;
		    			file.failedUpload = false;
		    			file.isUploading = false;
		    			file.uploadStatus = "";
		    		}
		    		httpreq.onabort = httpreq.onerror = function(event) {
		    			console.log("error uploading file");
		    			file.isUploaded = false;
		    			file.failedUpload = true;
		    			file.isUploading = false;
		    			file.uploadStatus = "error";
		    		};
						httpreq.open("POST", SITE_ROOT + "/api/Photo/upload_photo", true);
		    		httpreq.send(JSON.stringify({
	    				base64Photo: file.data,
	    				originalFilename: file.name,
	    				fileType: file.type
		    		}));

		    	}
	    		if (file.isUploading) {
	    			count++;
		    		if (count >= maxFileUploadThreads) {
		    			break;
		    		}
		    	}
	    	}
	    	scope.$apply();
	    	isProcessingQueue = false;
	    }

			scope.createGuid = function() {
				var guid = '';
				var guid_chars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
				for (var i=0; i<10; i++) {
					guid += guid_chars[Math.floor(Math.random()*guid_chars.length-1)];
				}
				return guid;
			}
	  }
  };
}]);