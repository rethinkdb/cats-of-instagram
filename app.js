
var requestify = require("requestify");
var bodyParser = require("body-parser");
var express = require("express");
var sockio = require("socket.io");
var r = require("rethinkdb");
var q = require("q");

var config = require("./config");

var app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

var api = "https://api.instagram.com/v1/";
var lastUpdate = 0;

var io = sockio.listen(app.listen(config.port), {log: false});
console.log("Server started on port " + config.port);

r.connect(config.database).then(function(conn) {
  this.conn = conn;
  return r.dbCreate(config.database.db).run(conn);
})
.then(function() {
  return r.tableCreate("instacat").run(this.conn);
})
.then(function() {
  return q.all([
    r.table("instacat").indexCreate("created_time").run(this.conn),
    r.table("instacat").indexCreate("place", {geo: true}).run(this.conn)
  ]);
})
.error(function(err) {
  if (err.msg.indexOf("already exists") == -1)
    console.log(err);
})
.finally(function() {
  r.table("instacat").changes().run(this.conn)
  .then(function(cursor) {
    cursor.each(function(err, item) {
      console.log(item);
      if (item && item.new_val)
        io.sockets.emit("cat", item.new_val);
    })
  })
  .error(function(err) {
    console.log("Error:", err);
  });
});

io.sockets.on("connection", function(socket) {
  r.connect(config.database).then(function(conn) {
    this.conn = conn;
    return r.table("instacat")
      .orderBy({index: r.desc("created_time")})
      .hasFields("place").limit(60).run(conn)
  })
  .then(function(cursor) { return cursor.toArray(); })
  .then(function(result) {
    socket.emit("recent", result);
  })
  .error(function(err) { console.log("Failure:", err); })
  .finally(function() {
    if (this.conn)
      this.conn.close();
  });
});

app.get("/subscribe/:tag", function(req, res) {
  var params = {
    client_id: config.instagram.client,
    client_secret: config.instagram.secret,
    verify_token: config.instagram.verify,
    object: "tag", aspect: "media",
    object_id: req.params.tag,
    callback_url: "http://" + config.host + "/publish/photo"
  };
  
  requestify.post(api + "subscriptions", params, {dataType: "form-url-encoded"})
  .then(function(response) {
    res.json({subscribed: req.params.tag});
  })
  .fail(function(err) {
    res.status(500).json({err: err});
  });
});

app.get("/publish/photo", function(req, res) {
  res.send(req.param("hub.challenge"));
});

app.post("/publish/photo", function(req, res) {
  var update = req.body[0];
  res.json({success: true, kind: update.object});

  if (update.time - lastUpdate < 1) return;
  lastUpdate = update.time;

  var path = api + "tags/" + update.object_id +
             "/media/recent?client_id=" + 
             config.instagram.client;

  r.connect(config.database).then(function(conn) {
    this.conn = conn;
    return r.table("instacat").insert(
      r.http(path)("data").merge(function(item) {
        return {place: r.point(
          item("location")("longitude"),
          item("location")("latitude")).default(null)}
      })).run(conn)
  })
  .error(function(err) { console.log("Failure:", err); })
  .finally(function() {
    if (this.conn)
      this.conn.close();
  });
});



