var Promise = require("bluebird");
var sqlite3 = require('sqlite3').verbose();
var db = Promise.promisifyAll(new sqlite3.Database(__dirname + "/../storage/Database/Database.db"));

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
    
    var sql = "";
    sql += "insert into pullrequest (pullrequestid,treeid,state,title,repositoryName,created,updated)";
    sql += "select " + pr.id + ",(select treeid from tree where sha = '" + pr.sha + "'),'"+ pr.state +"','" + pr.title.replace(/\'/g,"''") + "','" + pr.repositoryName + "','" + pr.created + "','" + pr.updated + "'";
    sql += "where not exists(select '1' from pullrequest where pullrequestid = " + pr.id + ");";

    sql += "update pullrequest set treeid =(select treeid from tree where sha = '" + pr.sha + "'), state='"+ pr.state +"', title='" + pr.title.replace(/\'/g,"''") + "',repositoryName= '" + pr.repositoryName + "', created='" + pr.created + "',updated='" + pr.updated + "'";
    sql += "where pullrequestid = " + pr.id + ";";
    
    return db.execAsync(sql.toString())
        .then(function() {return pr});
};

exports.get = function(id){
    var sql= "select p.pullrequestid id,p.state,p.title,p.repositoryName,p.created,p.updated,(select sha from tree t where p.treeid = t.treeid) sha from pullrequest p where pullrequestid = ?"
    return db.getAsync(sql.toString(), [id])
        .catch(function(err) {console.log(err)});
};


exports.getAllPullRequests = function() {
    var sql= "select pullrequestid id,state,title,repositoryName,created,updated,(select sha from tree t where treeid = t.treeid) sha from pullrequest"
    return db.allAsync(sql.toString());
};