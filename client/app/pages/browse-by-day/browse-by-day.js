app.controller("BrowseByDayPage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;

  $scope.today = new Date();
  $scope.currentDate = new Date();
  $scope.prevDate = subtractDate($scope.currentDate);
  $scope.nextDate = addDate($scope.currentDate);

  $scope.tagSuggestions = [];
  $scope.tag = "";

  $scope.deletePhotoDialogIsDisplayed = false;
  $scope.lightBoxPhoto = undefined;
  $scope.lightBoxImageX = 'center';
  $scope.lightBoxImageSrc = '';

  $scope.photos = [];
  $scope.isLoadingPhotos = true;

  var params = $site.paramsFromQuerystring();
  if (params && params.date) {
    $scope.currentDate = new Date(params.date);
    $scope.currentDate.setTime( $scope.currentDate.getTime() + $scope.currentDate.getTimezoneOffset()*60*1000 );
    $scope.prevDate = subtractDate($scope.currentDate);
    $scope.nextDate = addDate($scope.currentDate);
  }
  
  $scope.startSlideshow = function() {
    var photoSrcArray = $scope.photos.map(function(photo) {
      return photo.filename + "/1920";
    });
    $scope.$broadcast("slideshow", photoSrcArray);
  }
  
  $scope.stopSlideshow = function() {
    $scope.$broadcast("slideshow", null);
  }


  get_photos_for_day();

  $scope.jumpToYear = function() {
    var year = $scope.currentDate.getFullYear();
    $site.navigateTo("browse-by-year?year=" + year);
  }

  $scope.jumpToMonth = function() {
    var year = $scope.currentDate.getFullYear();
    var monthString = String($scope.currentDate.getMonth() + 1);
    while (monthString.length < 2) {
      monthString = "0" + monthString;
    }
    var dateString = String($scope.currentDate.getDate());
    while (dateString.length < 2) {
      dateString = "0" + dateString;
    }
    $site.navigateTo("browse-by-month?date=" + year + "-" + monthString + "-" + dateString);
  }

  $scope.getNextDay = function() {
    var tomorrow = $scope.currentDate;
    tomorrow.setDate($scope.currentDate.getDate()+1);
    var dateString = String(tomorrow.getDate());
    while (dateString.length < 2) {
      dateString = "0" + dateString;
    }
    var monthString = String(tomorrow.getMonth()+1);
    while (monthString.length < 2) {
      monthString = "0" + monthString;
    }
    $site.navigateTo("browse-by-day?date=" + tomorrow.getFullYear() + "-" + monthString + "-" + dateString);
  }

  $scope.getPrevDay = function() {
    var yesterday = $scope.currentDate;
    yesterday.setDate($scope.currentDate.getDate()-1);
    var dateString = String(yesterday.getDate());
    while (dateString.length < 2) {
      dateString = "0" + dateString;
    }
    var monthString = String(yesterday.getMonth()+1);
    while (monthString.length < 2) {
      monthString = "0" + monthString;
    }
    $site.navigateTo("browse-by-day?date=" + yesterday.getFullYear() + "-" + monthString + "-" + dateString);
  }

  $scope.openLightBox = function(photo) {
    $scope.lightBoxPhoto = photo;
    $scope.photos.forEach(function(eachPhoto) {
      eachPhoto.displayTagForm = false;
    });
  }

  function subtractDate(date) {
    var prevDate = new Date(date);
    prevDate.setDate(date.getDate()-1);
    return prevDate;
  }

  function addDate(date) {
    var nextDate = new Date(date);
    nextDate.setDate(date.getDate()+1);
    return nextDate;
  }

  function get_photos_for_day() {
    $scope.isLoadingPhotos = true;
    $site.ajax("POST", SITE_ROOT + "/api/Photo/get_photos_for_day", {
      date: $scope.currentDate
    }).then(function(data) {
      $scope.isLoadingPhotos = false;
      $scope.photos = data.results;
    }).catch(function(data) {
    });
  }

}]);