var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var path = require("path");


var basepath= "./storage/Blobs/";


exports.contains = function(sha){
    //console.log(path.normalize(getPath(sha)));
    return fs.statAsync(getPath(sha))
        .then(function(stat) {
            if (stat.size === 0){
                return false;
            } else {
                return true;
            }
        }).catch(function(err) { 
            return false;
        });
};

exports.get = function(sha){
    return fs.readFileAsync(getPath(sha));
};

exports.save = function(sha, blob){
    
    return fs.statAsync(path.dirname(getPath(sha)))
        .then(function() {return true;})
        .catch(function() { return false;})
        .then(function(directoryExists){
            if (!directoryExists){
                return fs.mkdirAsync(path.dirname(getPath(sha)))
                    .then(function(){
                        return fs.writeFileAsync(getPath(sha),blob);
                    });
            } else {
                return fs.writeFileAsync(getPath(sha),blob);
            };
        
        });
    
    
};


function getPath(sha){
    return basepath + sha[0] + sha[1] + "/" + sha; 
}
