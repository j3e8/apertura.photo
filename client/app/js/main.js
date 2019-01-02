var DOMAIN = "apertura.photo";
var SITE_ROOT = "";
var SITE_PATH = SITE_ROOT + "/app";

var app = angular.module("AperturaApp", ['ngAnimate']);

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

window._mostRecentBase64Image = {};

window.getImageSrcAtPoint = function(x, y) {
  var el = document.elementFromPoint(x, y);
  if (el.tagName.toLowerCase() == "img") {
    return el.src;
  }
  return null;
}

window.loadImageSrcAtPoint = function(x, y) {
  var key = window.createGuid(5);
  var el = document.elementFromPoint(x, y);
  if (el.tagName.toLowerCase() == "img") {
    window.base64FromImg(el, key);
    return key;
  }
  return null;
}

window.checkImageSrcResult = function(key) {
  return window._mostRecentBase64Image[key];
}

window.base64FromImg = function(imgElement, key) {
  var img = new Image();
  img.onload = function() {
    var canvas = document.createElement('CANVAS');
    var ctx = canvas.getContext('2d');
    canvas.height = this.height;
    canvas.width = this.width;
    ctx.drawImage(this, 0, 0);
    var base64 = canvas.toDataURL("image/jpeg", 1.0);
    window._mostRecentBase64Image[key] = base64.substring(base64.indexOf('base64,') + 7);
    canvas = null;
  }
  img.src = imgElement.src + "/noredirect=true";
}

window.createGuid = function(length) {
  var guid = '';
  var validChars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
  for (var i=0; i < length; i++) {
    var r = Math.floor(Math.random() * validChars.length);
    guid += validChars[r];
  }
  return guid;
}