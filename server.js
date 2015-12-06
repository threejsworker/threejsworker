require("bluebird").longStackTraces();

var config = require("./config");
var express = require('express');
var path = require('path');
var mimeType = require("mime-types");
var app = express();

app.use(express.static('static'));


require("./lib/init").then(function(){
  
  app.get('/api/pullrequests', function (req, res) {
    require("./lib/pullrequests").getAllPullRequests().then(function(json){
        
      var result = "";
      if (req.query.callback){
        result += req.query.callback + "("
      }
      result += JSON.stringify(json);
      
      if (req.query.callback){
        result += ");"
      }
      res.send(result);
    });
  });
  
  app.get('/api/pullrequests/:id/*', function (req, res, next) {
    
    var compression = false;
    if (req.headers['accept-encoding'].indexOf("gzip") > -1) {
      compression = true;
    }
    require("./lib/pullrequests").get(req.params.id).then(function(pr){
      if (!pr){
        
        require("./lib/github").getPullRequests(req.params.id);
        res.send("This needs to be uploaded. Give me 20 seconds to load it.");
      } else {
      
        require("./lib/trees").get(pr.sha).then(function(tree){
          var path = req.params[0];
          if (tree.paths[path]){
            if (compression){
              res.setHeader("Content-Encoding", "gzip");
              res.setHeader('Content-Type', mimeType.lookup(path));
              require("./lib/blobs").getCompressed(tree.paths[path]).then(function(blob) {res.send(blob)});
            } else {
              
              res.setHeader('Content-Type', mimeType.lookup(path));
              require("./lib/blobs").get(tree.paths[path]).then(function(blob) {res.send(blob)});
            }
          } else {
            next();
          }
        });
      };
    });
  });
  
  
  app.get('/api/branch/:id/*', function (req, res, next) {
    
    var compression = false;
    if (req.headers['accept-encoding'].indexOf("gzip") > -1) {
      compression = true;
    }
    require("./lib/branches").get(req.params.id).then(function(br){
      if (br){
      
        require("./lib/trees").get(br.sha).then(function(tree){
          var path = req.params[0];
          if (tree.paths[path]){
            if (compression){
              res.setHeader("Content-Encoding", "gzip");
              res.setHeader('Content-Type', mimeType.lookup(path));
              require("./lib/blobs").getCompressed(tree.paths[path]).then(function(blob) {res.send(blob)});
            } else {
              
              res.setHeader('Content-Type', mimeType.lookup(path));
              require("./lib/blobs").get(tree.paths[path]).then(function(blob) {res.send(blob)});
            }
          } else {
            next();
          }
        });
      };
    });
  });
  
  app.get("*", function (req, res, next) {
    res.send("Not Found");
  });
  
  var server = app.listen( config.PORT || process.env.PORT, config.IP || process.env.IP, function (){
    
    console.log("ThreejsWorker started");
    
  });
  
  
  if (config.SINGLE_PROCESS) {
      
      require("./lib/jobs/githubdatafetch");
      
  };
});
