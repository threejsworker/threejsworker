var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var mkdirp = Promise.promisify(require('mkdirp'));


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
    
    return createDirectories()
        .then(function(){
            return fs.writeFileAsync(getPath(sha),blob);
        });
};


function getPath(sha){
    return basepath + sha[0] + sha[1] + "/" + sha; 
}

var initDone = false;
function createDirectories(){
    if (initDone) {
        return Promise.resolve();
    }
    var promises = [];
    for (var i = 0; i < 256; i++) {
        var directoryName = i.toString(16);
        if (directoryName.length < 2) {
            directoryName = "0" + directoryName;
        }
        promises.push(mkdirp(basepath + directoryName));
    }
    
    return Promise.all(promises).then(function(){ initDone = true;});
}