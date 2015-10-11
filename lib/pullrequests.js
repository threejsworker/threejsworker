var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var mkdirp = Promise.promisify(require('mkdirp'));
var Path = require("path");


var tablePath = __dirname + "/../storage/PullRequests/PullRequests.json";

exports.isShaChanged = function(pr){
    return exports.get(pr.id)
        .then(function(PrToCheck){
            if (!PrToCheck || PrToCheck.sha !== pr.sha){
                return true;
            } else {
                return false;
            }
            
        });
};

exports.isChanged = function(pr){
    
    return exports.get(pr.id)
        .then(function(PrToCheck){
            if (!PrToCheck || JSON.stringify(PrToCheck) !== JSON.stringify(pr)){
                return true;
            } else {
                return false;
            }
            
        });
};
exports.save = function(pr){
    
    return mkdirp(Path.dirname(tablePath))
        .then(function(){
            return fs.readFileAsync(tablePath).then(function(str) {
                return JSON.parse(str);
            }).catch(function(){ 
                return {};
            }).then(function(json){
                json[pr.id] = pr;
                return fs.writeFileAsync(tablePath,JSON.stringify(json));
            });
        }).then(function() {return pr});
};

exports.get = function(id){
    return fs.readFileAsync(tablePath).then(function(str) {
        var json = JSON.parse(str)
        return json[id];
    }).catch(function(){ return undefined;});
};


exports.getAllPullRequests = function() {
    
    return fs.readFileAsync(tablePath).then(function(str) {
        var json = JSON.parse(str);
        var returnValue = [];
        for (var id in json){
            returnValue.push(json[id]);
        }
        return returnValue
    }).catch(function(){ return [];});
    
    
    
};