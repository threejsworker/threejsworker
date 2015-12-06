var Promise = require("bluebird");
var sqlite3 = require('sqlite3').verbose();
var db = Promise.promisifyAll(new sqlite3.Database(__dirname + "/../storage/Database/Database.db"));

exports.isChanged = function(br){
    
    return exports.get(br.name)
        .then(function(PrToCheck){
            if (!PrToCheck || JSON.stringify(PrToCheck) !== JSON.stringify(br)){
                return true;
            } else {
                return false;
            }
            
        });
};
exports.save = function(br){
    
    var sql = "";
    sql += "insert into branch (name,treeid)";
    sql += "select '" + br.name + "',(select treeid from tree where sha = '" + br.sha + "')";
    sql += "where not exists(select '1' from branch where name = '" + br.name + "');";

    sql += "update branch set name='"+ br.name +"',treeid =(select treeid from tree where sha = '" + br.sha + "')";
    sql += "where name = '" + br.name + "';";
    
    return db.execAsync(sql.toString())
        .then(function() {return br});
};

exports.get = function(name){
    var sql= "select b.name, (select sha from tree t where b.treeid = t.treeid) sha from branch b where name = ?"
    return db.getAsync(sql.toString(), [name])
        .catch(function(err) {console.log(err)});
};


exports.getAllBranches = function() {
    var sql= "select b.name, (select sha from tree t where b.treeid = t.treeid) sha from branch b"
    return db.allAsync(sql.toString());
};