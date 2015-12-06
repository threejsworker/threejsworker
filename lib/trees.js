var Promise = require("bluebird");
var sqlite3 = require('sqlite3').verbose();
var db = Promise.promisifyAll(new sqlite3.Database(__dirname + "/../storage/Database/Database.db"));


exports.contains = function(sha){
    var sql = "select * from  tree t where t.sha = ?";
    return db.getAsync(sql.toString(), [sha])
        .then(function(row){
            return !!row;
        });
};

exports.get = function(sha){
    var sql =  " select p.path,B.sha from treeBlob tb ";
    sql += "Inner join path p ON p.pathid = tb.pathid ";
    sql += "Inner join blob b ON b.blobID = tb.blobID ";
    sql += "Inner join tree t ON t.treeID = tb.treeID and t.sha = ? ";
    
    return db.allAsync(sql.toString(), [sha])
        .then(function(rows){
            var returnValue = {sha:sha,paths:{}};
            rows.forEach(function(row){
                returnValue.paths[row.path] = row.sha;
            });
            return returnValue;
        });
};

exports.save = function(tree){
    
    var sql = "insert Into tree (sha)select '"+tree.sha+"' WHERE NOT EXISTS (SELECT '1' FROM tree WHERE sha = '"+tree.sha+"');";
    
    sql += "create temp TABLE _table (path NVARCHAR(256),blobsha NVARCHAR(100));";
    for (var path in tree.paths) {
        sql += "INSERT INTO _table (path,blobsha) VALUES ('"+ path+ "','" + tree.paths[path] +"');";
    }
    sql += "insert into path(path) select t.path from _table t where not exists(select '1' from path p where p.path = t.path);";
    sql += "insert into blob(sha) select distinct t.blobsha from _table t where not exists(select '1' from blob b where b.sha = t.blobsha);";
    
    sql += "create temp TABLE _treeBlob (treeID INTEGER,pathID INTEGER, blobID INTEGER);";
    sql += "create INDEX IX__treeBlob_treeID_pathid ON _treeBlob(treeID,pathid);";
    
    
    sql += "insert into _treeBlob(treeID,pathID,blobID) "; 
    sql += "select t.treeID, p.pathID, b.blobID from _table tt ";
    sql += "inner join path p ON p.path = tt.path ";
    sql += "inner join blob b ON b.sha = tt.blobsha ";
    sql += "Inner join tree t ON t.sha = '" + tree.sha + "'; ";
    
    sql += "create temp TABLE _usedPaths (pathID INTEGER);";
    sql += "insert into _usedPaths(pathID) select tb.pathID from treeBlob tb Inner join tree t on  tb.treeid = t.treeId where t.sha = '"+tree.sha+"';";
                
    sql += "insert into treeBlob(treeID,pathID,blobID) "; 
    sql += "select ttb.treeID, ttb.pathID, ttb.blobID from _treeBlob ttb ";
    sql += "left join _usedPaths tb ON ttb.pathId = tb.pathid where tb.pathid is null; ";
                

    sql += "create temp TABLE _usedtreeblobids (treeBlobid INTEGER);";
    sql += "insert into _usedtreeblobids(treeBlobid) select tb.treeBlobid from treeBlob tb Inner join tree t on  tb.treeid = t.treeId where t.sha = '"+tree.sha+"';";
    
    sql += "update treeBlob set   ";
    sql += "blobID = (select blobID from _treeBlob where _treeBlob.treeId = treeBlob.treeid and _treeBlob.pathId = treeBlob.pathid ) ";
    sql += "where treeblobid in (select utb.treeBlobid from _usedtreeblobids utb);";

    sql += "DROP TABLE _usedtreeblobids;";
    sql += "DROP TABLE _usedPaths;";
    sql += "DROP TABLE _treeBlob;";
    sql += "DROP TABLE _table;";
    //console.log(sql);
    return db.execAsync(sql.toString())
        .then(function() {return tree});
};