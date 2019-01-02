var SITE_ROOT = "";
var SITE_PATH = SITE_ROOT + "/admin";

var app = angular.module("AperturaAdmin", ['ngAnimate']);

Date.parse = function(datestring) {
  if (!datestring) {
    return null;
  }
  var arr = datestring.split(/[- :]/);
  var yr = arr[0];
  var mo = arr[1];
  var da = arr[2];
  var hr = arr.length > 3 ? arr[3] : 0;
  var mi = arr.length > 4 ? arr[4] : 0;
  var se = arr.length > 5 ? arr[5] : 0;
  return new Date(yr, mo-1, da, hr, mi, se);
}