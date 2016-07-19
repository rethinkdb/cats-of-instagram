
var request = require("request");
var bodyParser = require("body-parser");
var express = require("express");
var sockio = require("socket.io");
var scmp = require("scmp");
var crypto = require("crypto");
var r = require("rethinkdb");
var q = require("q");

var config = require("./config");

var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

var api = "https://api.instagram.com/v1/";
var lastUpdate = 0;

var io = sockio.listen(app.listen(config.port), {log: false});
console.log("Server started on port " + config.port);

function subscribeToTag(tagName) {
  var params = {
    client_id: config.instagram.client,
    client_secret: config.instagram.secret,
    verify_token: config.instagram.verify,
    object: "tag", aspect: "media", object_id: tagName,
    callback_url: "http://" + config.host + "/publish/photo"
  };

  request.post({url: api + "subscriptions", form: params},
    function(err, response, body) {
      if (err) console.log("Failed to subscribe:", err)
      else console.log("Subscribed to tag:", tagName);
  });
}

var conn;
r.connect(config.database).then(function(c) {
  conn = c;
  return r.dbCreate(config.database.db).run(conn);
})
.then(function() {
  return r.tableCreate("instacat").run(conn);
})
.then(function() {
  return q.all([
    r.table("instacat").indexCreate("time").run(conn),
    r.table("instacat").indexCreate("place", {geo: true}).run(conn)
  ]);
})
.error(function(err) {
  if (err.msg.indexOf("already exists") == -1)
    console.log(err);
})
.finally(function() {
  r.table("instacat").changes().run(conn)
  .then(function(cursor) {
    cursor.each(function(err, item) {
      if (item && item.new_val)
        io.sockets.emit("cat", item.new_val);
    });
  })
  .error(function(err) {
    console.log("Error:", err);
  });

  subscribeToTag("catsofinstagram");
});

io.sockets.on("connection", function(socket) {
  var conn;
  r.connect(config.database).then(function(c) {
    conn = c;
    return r.table("instacat")
      .orderBy({index: r.desc("time")})
      .limit(60).run(conn)
  })
  .then(function(cursor) { return cursor.toArray(); })
  .then(function(result) {
    socket.emit("recent", result);
  })
  .error(function(err) { console.log("Failure:", err); })
  .finally(function() {
    if (conn)
      conn.close();
  });
});

app.get("/publish/photo", function(req, res) {
  if (scmp(req.param("hub.verify_token"), config.instagram.verify))
    res.send(req.param("hub.challenge"));
  else res.status(500).json({err: "Verify token incorrect"});
});

app.use("/publish/photo", bodyParser.json({
  verify: function(req, res, buf) {
    var hmac = crypto.createHmac("sha1", config.instagram.secret);
    var hash = hmac.update(buf).digest("hex");

    if (scmp(req.header("X-Hub-Signature"), hash))
      req.validOrigin = true;
  }
}));

app.post("/publish/photo", function(req, res) {
  if (!req.validOrigin)
    return res.status(500).json({err: "Invalid signature"});

  var update = req.body[0];
  res.json({success: true, kind: update.object});

  if (update.time - lastUpdate < 1) return;
  lastUpdate = update.time;

  var path = api + "tags/" + update.object_id +
             "/media/recent?client_id=" +
             config.instagram.client;

  var conn;
  r.connect(config.database).then(function(c) {
    conn = c;
    return r.table("instacat").insert(
      r.http(path)("data").merge(function(item) {
        return {
          time: r.now(),
          place: r.point(
            item("location")("longitude"),
            item("location")("latitude")).default(null)
        }
      })).run(conn)
  })
  .error(function(err) { console.log("Failure:", err); })
  .finally(function() {
    if (conn)
      conn.close();
  });
});

