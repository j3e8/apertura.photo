app.controller("contactPage", function() {
  window.addEventListener("load", function() {
    var dm = "apertura.photo";
    var supportAddress = "support";
    supportAddress += "@";

    var el = document.getElementById('support-address');
    el.innerHTML = supportAddress + dm;

    var businessAddress = "business";
    businessAddress += "@";

    el = document.getElementById('business-address');
    el.innerHTML = businessAddress + dm;
  });
});