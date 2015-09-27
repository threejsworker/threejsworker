
var Promise = require("bluebird");

function poll(fn, time) {  
    var fullfilled = function(){
        return Promise
            .delay(time)
            .then(function(){
                poll(fn,time);
            });
    };
    fn().then(fullfilled).catch(fullfilled);
}
  
module.exports = poll;