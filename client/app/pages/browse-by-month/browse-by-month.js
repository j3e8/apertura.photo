app.controller("BrowseByMonthPage", ["Site", '$scope', '$http', '$location', function($site, $scope, $http, $location) {
  $scope.$site = $site;

  $scope.today = new Date();
  $scope.currentMonth = new Date();
  $scope.prevMonth = subtractMonth($scope.currentMonth);
  $scope.nextMonth = addMonth($scope.currentMonth);

  var params = $site.paramsFromQuerystring();
  if (params && params.date) {
    $scope.currentMonth = new Date(params.date);
    $scope.currentMonth.setTime( $scope.currentMonth.getTime() + $scope.currentMonth.getTimezoneOffset()*60*1000 );
    $scope.prevMonth = subtractMonth($scope.currentMonth);
    $scope.nextMonth = addMonth($scope.currentMonth);
  }

  get_photos_for_month();

  $scope.jumpToYear = function() {
    var year = $scope.currentMonth.getFullYear();
    $site.navigateTo("browse-by-year?year=" + year);
  }

  $scope.jumpToDate = function(dayOfMonth) {
    var year = $scope.currentMonth.getFullYear();
    var monthString = String($scope.currentMonth.getMonth() + 1);
    while (monthString.length < 2) {
      monthString = "0" + monthString;
    }
    while (String(dayOfMonth).length < 2) {
      dayOfMonth = "0" + dayOfMonth;
    }
    $site.navigateTo("browse-by-day?date=" + year + "-" + monthString + "-" + dayOfMonth);
  }

  $scope.getNextMonth = function() {
    var nextMonth = addMonth($scope.currentMonth);
    var monthString = String(nextMonth.getMonth()+1);
    while (monthString.length < 2) {
      monthString = "0" + monthString;
    }
    var year = nextMonth.getFullYear();
    $site.navigateTo("browse-by-month?date=" + year + "-" + monthString + "-01");
  }

  $scope.getPrevMonth = function() {
    var prevMonth = subtractMonth($scope.currentMonth);
    var monthString = String(prevMonth.getMonth()+1);
    while (monthString.length < 2) {
      monthString = "0" + monthString;
    }
    var year = prevMonth.getFullYear();
    $site.navigateTo("browse-by-month?date=" + year + "-" + monthString + "-01");
  }

  function subtractMonth(month) {
    var prevMonth = new Date(month);
    prevMonth.setMonth(prevMonth.getMonth()-1);
    return prevMonth;
  }

  function addMonth(month) {
    var nextMonth = new Date(month);
    nextMonth.setMonth(nextMonth.getMonth()+1);
    return nextMonth;
  }

  function reset_calendar() {
    var dt = new Date($scope.currentMonth);
    var firstDayOfMonth = new Date( dt.setDate(1) );
    var firstDayOfNextMonth = new Date( dt.setMonth(dt.getMonth()+1) );
    var lastDayOfMonth = new Date( new Date(firstDayOfNextMonth).setDate(0) );
    $scope.weeks = [];
    for (var w=0; w < 5; w++) {
      $scope.weeks[w] = {
        days: []
      };
      for (var d=0; d < 7; d++) {
        var dayOfMonth = w * 7 + d + 1 - firstDayOfMonth.getDay();
        var date = null;
        if (dayOfMonth > 0 && dayOfMonth <= lastDayOfMonth.getDate()) {
          date = new Date(firstDayOfMonth.getFullYear(), firstDayOfMonth.getMonth(), dayOfMonth);
        }
        $scope.weeks[w].days[d] = {
          date: date,
          dayOfMonth: date ? String(date.getDate()) : "",
          backgroundImage: "none",
          photoCount: 0
        };
      }
    };
  }

  function get_photos_for_month() {
    reset_calendar();
    $site.ajax("POST", SITE_ROOT + "/api/Photo/get_photos_for_month", {
      monthAsDate: $scope.currentMonth
    }).then(function(data) {
      data.results.forEach(function(dateFolder) {
        var d = new Date(Date.parse(dateFolder.dateTaken));
        $scope.weeks.forEach(function(week) {
          week.days.forEach(function(day) {
            if (day.date) {
              if (day.date.getFullYear() == d.getUTCFullYear()
                && day.date.getMonth() == d.getUTCMonth()
                && day.date.getDate() == d.getUTCDate()) {
                day.backgroundImage = "url(" + dateFolder.filename + "/500)";
                day.photoCount = dateFolder.numPhotos;
              }
            }
          });
        });
      });
    }).catch(function(data) {
    });
  }

}]);