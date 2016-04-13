
var Promise = require("bluebird");

function poll(fn, time, timeout) {  
    var fullfilled = function(){
        return Promise
            .delay(time)
            .then(function(){
                poll(fn,time);
            }).timeout(timeout || 300000).catch(Promise.TimeoutError, function(e) {
                console.log("TimedOut");
            });
    };
    fn().then(fullfilled).catch(fullfilled);
}
  
module.exports = poll;