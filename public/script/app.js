
$(document).ready(function() {

  var mapTiles = "http://{s}.tile.osm.org/{z}/{x}/{y}.png";
  var mapAttrib = "&copy; <a href=\"http://osm.org/copyright\">OpenStreetMap</a> contributors";

  var map = L.map("map").setView([0, 0], 2);
  map.addLayer(L.tileLayer(mapTiles, {attribution: mapAttrib}));

  var template = Handlebars.compile($("#cat-template").html());

  $("#map").hide();

  $("#toggle").click(function(e) {
    $("#toggle .button").removeClass("selected");
    $(e.target).addClass("selected");
    
    if (e.target.id == "grid-button") $("#map").hide();
    else $("#map").show();
  });

  function addCat(cat) {
    cat.date = moment.unix(cat.created_time).format("MMM DD, h:mm a");
    $("#cats").prepend(template(cat));

    if (cat.place) {
      var marker = L.marker(L.latLng(
          cat.place.coordinates[1],
          cat.place.coordinates[0]));

      map.addLayer(marker);
      marker.bindPopup(
          "<img src=\"" + cat.images.thumbnail.url + "\">",
          {minWidth: 150, minHeight: 150});
      
      marker.openPopup();
    }
  }

  var socket = io.connect();
  
  socket.on("cat", addCat); 
  socket.on("recent", function(data) {
    data.forEach(addCat);
  });

});
