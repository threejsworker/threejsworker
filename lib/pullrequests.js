var storage = {};

exports.isShaChanged = function(pr){
    if (!storage[pr.id]){
        return true;
    }
    if (storage[pr.id].sha !== pr.sha){
        return true;
    }
    return false;
};

exports.isChanged = function(pr){
    if (!storage[pr.id]){
        return true;
    }
    if (JSON.stringify(storage[pr.id]) !== JSON.stringify(pr.sha)){
        return true;
    }
    return false;
};
exports.save = function(pr){
    
    storage[pr.id] = pr;
    
};
exports.get = function(id){
    
    return storage[id];
    
};

exports.getAllOpenPullRequests = function() {
    var returnValue = [];
    for (var id in storage){
        //if (storage[id].state === "open"){
            returnValue.push(storage[id]);
        //}
    }
    
    return returnValue;
    
};