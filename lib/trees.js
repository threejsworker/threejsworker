var storage = {};

exports.contains = function(sha){
    return !!storage[sha];
};

exports.get = function(sha){
    return storage[sha];
};

exports.save = function(tree){
    
    storage[tree.sha] = tree;
    return tree;
}