app.controller("howItWorksPage", function() {
  function onMouseWheel(event) {
    var videoElement = document.getElementById('video');
    var rect = videoElement.getBoundingClientRect();  
    var videoY = rect.top;
    var videoHeight = rect.height;

    if (videoY < window.innerHeight/2) {
      videoElement.play();
    }
  }

  window.addEventListener("scroll", onMouseWheel);
  document.body.addEventListener("scroll", onMouseWheel);
});
