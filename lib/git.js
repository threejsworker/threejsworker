
var Promise = require("bluebird");
var crypto = require('crypto');
var Git = require("nodegit");
var fs = Promise.promisifyAll(require("fs"));


var repository;

var remoteCallbacks = {
  certificateCheck: function() {
    return 1;
  }
};


exports.getBlobSha = function getsha(content) {
    var size = content.length.toString();    
    
    var header = "blob " + size + "\u0000";
    //var store = header + content;  
    // Use node crypto library to create sha1 hash
    var hash = crypto.createHash('sha1');
    hash.update(header, 'utf8');
    hash.update(content, 'utf8');
    // Return the hash digest
    var sha1 = hash.digest('hex');
    hash = null;
    return sha1;
};

exports.fetchRepository = function(repositoryName,tree) {
    var promise;
    if (repository){
        promise = Promise.resolve(repository);
    } else {
        promise = fs.statAsync("./storage/gitRepository/.git/HEAD").then(function(stat) {return Git.Repository.open("./storage/gitRepository")})
            .catch(function(err) {return Git.Clone("https://github.com/" + repositoryName, "./storage/gitRepository");})
            .then(function(repo){ repository = repo; return repo;});
    }
    return promise.then(function(repo) {
            //console.log("fetch2"); 
            
            var remote = Git.Remote.create(repo, tree.sha, "https://github.com/" + repositoryName);
            if (remote) {
                return remote.connect(Git.Enums.DIRECTION.FETCH, remoteCallbacks).then(function(){
                    return remote.download().then(function() { remote.free();return Promise.resolve(repo)});
                });
            } else {
                return Promise.resolve(repo);
            }
            //return repo.fetch(Git.Remote.create(repo,repositoryName)) 
        }).catch(function(err){console.dir(err) });
    
};

exports.fetchRepository = function(repositoryName,ref,tree) {
    var promise;
    if (repository){
        promise = Promise.resolve(repository);
    } else {
        promise = fs.statAsync("./storage/gitRepository/.git/HEAD").then(function(stat) {return Git.Repository.open("./storage/gitRepository")})
            .catch(function(err) {return Git.Clone("https://github.com/" + repositoryName, "./storage/gitRepository");})
            .then(function(repo){ repository = repo; return repo;});
    }
    return promise.then(function(repo) {
            //console.log("fetch2"); 
            
            var remote = Git.Remote.create(repo, tree.sha, "https://github.com/" + repositoryName);
            if (remote) {
                return remote.connect(Git.Enums.DIRECTION.FETCH, remoteCallbacks).then(function(){
                    
                    return remote.fetch([ref],{callbacks:remoteCallbacks},"test", function(){console.log(arguments);}).then(function() {remote.free();return Promise.resolve(repo)});;
                    //return remote.download().then(function() { remote.free();return Promise.resolve(repo)});
                });
            } else {
                return Promise.resolve(repo);
            }
            //return repo.fetch(Git.Remote.create(repo,repositoryName)) 
        }).catch(function(err){console.dir(err) });
    
};

exports.getBlobContent = function(repo,sha){
    return repo.getBlob(sha)
        .then(function(blob) {
            //console.log(blob.content());
            var content = blob.content();
            blob.free();
            return Promise.resolve(content); 
        });    
};
