
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var mkdirp = Promise.promisify(require('mkdirp'));
module.exports = mkdirp('./storage/Database/').then(function(){

  var sqlite3 = require('sqlite3').verbose();
  var db = Promise.promisifyAll(new sqlite3.Database('./storage/Database/Database.db'));
  
  return db.getAsync("select * from version").catch(function(){
    return fs.readFileAsync("./sql/schema.sql").then(function(sql){
      return db.execAsync(sql.toString()).then(function(){console.log("database created");});
    });
  });

});

