var express = require('express');
var path = require('path');
var mimeType = require("mime-types");
var app = express();

require("./lib/githubdatafetch");

app.use(express.static('static'));
/*
app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname , "./static/index.html"));
});

app.get('/pullrequests.html', function (req, res) {
  res.sendFile(path.resolve(__dirname , "./static/pullrequests.html"));
});
*/
app.get('/api/pullrequests', function (req, res) {
  
  var result = "";
  if (req.query.callback){
    result += req.query.callback + "("
  }
  result += JSON.stringify(require("./lib/pullrequests").getAllOpenPullRequests());
  
  if (req.query.callback){
    result += ");"
  }
  res.send(result);
});

app.get('/api/pullrequests/:id/*', function (req, res, next) {
  var pr = require("./lib/pullrequests").get( req.params.id);
  if (!pr){
    
    require("./lib/github").getPullRequests(req.params.id);
    res.send("This needs to be uploaded. Give me 20 seconds to load it.");
  } else {
  
    require("./lib/trees").get(pr.sha).then(function(tree){
      var path = req.params[0];
      if (tree.paths[path]){
        res.set('Content-Type', mimeType.lookup(path));
        require("./lib/blobs").get(tree.paths[path]).then(function(blob) {res.send(blob)});
      } else {
        next();
      }
    });
  };
});

app.get("*", function (req, res, next) {
  res.send("Not Found");
});

var server = app.listen( process.env.PORT,process.env.IP, function () {
  console.log("ThreejsWorker started");
});