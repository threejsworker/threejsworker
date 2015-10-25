
var Promise = require("bluebird");
var retry = require('bluebird-retry');
var poll = require("bluebird-poll");
var github = require("../github");
var pullrequests = require("../pullrequests");
var trees = require("../trees");
var blobs = require("../blobs");
var builder = require("../builder");
var git = require("../git");
var Queue = require('data-structures').Queue;
var Pullrequestqueue = new Queue();
var Commentqueue = new Queue();


github.onChangedPullRequests = function(prs){
    
    return Promise.resolve(prs).map(function(pr){
        return pullrequests.isChanged(pr).then(function(changed){
                       
            if (!changed) {
                return pr;
            } else {
                return pullrequests.isShaChanged(pr).then(function(changed){
                    if (!changed) {
                        return pullrequests.save(pr);
                    } else {
                        Pullrequestqueue.enqueue(pr);
                        return Promise.resolve(true);
                    }
                });
            }
        }, {"concurrency": 1});
        
    }).catch(function(err){ console.log(err);});
    
};

poll(function(){
    if (Pullrequestqueue.size){
        
        var pr = Pullrequestqueue.dequeue();
        var start = new Date();
        console.log("Start updating pullrequest.");
        return UpdatePullRequest(pr)
            .then(function() { return sendComment(pr);})
            .then(function(){
                console.log("time to get PR: " + (+(new Date())-start));
                console.log("PR done -> " + pr.id + ":" + pr.title);
                return pullrequests.save(pr);
            });
        
    } else {
        
        return  Promise.resolve(true);

    }

}, 1000);

function sendComment(pr) {
    
    Commentqueue.enqueue(pr);
    return  Promise.resolve(true);

}
poll(function(){
    
    if (Commentqueue.size){
        var pr = Commentqueue.dequeue();
        return github.getCommentsFromIssue(pr.id)
            .then(function(comments){
                var hascomment = false;
                comments.forEach(function(comment){
                    if (comment.user === "threejsworker"){
                        hascomment = true;
                    }
                });
                if (!hascomment){
                    return github.sendCommentToIssue(pr.id,"The examples of this pullrequest are now built and visible in threejsworker. To view them, go to the following link: \n\n http://threejsworker.com/viewpullrequest.html#" + pr.id);
                } else {
                    return true;
                } 
                
            }).catch(function(){/* better to go through then failing here */ return true;});
            
    } else {
        
        return  Promise.resolve(true);

    }

});  

function UpdatePullRequest(pullrequest){

    return trees.contains(pullrequest.sha)
        .then(function(exists){
            if (exists) {
                return trees.get(pullrequest.sha);
            } else {
                return github.getTree(pullrequest.repositoryName, pullrequest.sha)
                    .then(saveTree)
                    .then(function(tree) { 
                        return retry(function(){ 
                            return getBlobs(pullrequest.repositoryName, tree);
                        }, { max_tries: 999, interval: 2000 });
                    })
                    .then(function(tree) { return buildTree(tree)})
                    .then(saveTree);
            }
        });
    
       //.then(function(data){console.log(data);})
    
}

function saveTree(tree) {
    return trees.save(tree);
}

function getBlobs(repositoryName, tree) {
    var start = new Date();
    var failureCounter = 0;
    var paths = [];
    
    for (var path in tree.paths){
        paths.push(path);
    }
    
    return Promise.resolve(paths).map(function(path){
        var sha = tree.paths[path];
        var tempPath = path;
        
        return blobs.contains(sha)
            .then(function(stat){
                if (stat){
                    return;
                }
                
                return github.getBlob(repositoryName,tree.sha,tempPath)
                    .then(function(source){
                        
                        if (sha !== git.getBlobSha(source)){
                            throw "failed";
                        }
                        return source;
                    }).then(function(source){
                        return blobs.save(sha,source);
                    }).catch(function(err){
                        failureCounter++;
                        return true;
                    });
                
            });

    }, {"concurrency": 10})
        .then(function(a){
            if (failureCounter > 0) {
                console.log(failureCounter + " failures left");
                throw "failed";
                /*return Promise
                    .delay(1000)
                    .then(function(){
                        console.log("retrying...");
                        return getBlobs(repositoryName, tree);
                    });*/
            }
            return a;
        }).then(function() {console.log("time to check all files: " + (+(new Date())-start));return tree});
        
    
}

function buildTree(tree) {
    
    var start = new Date();
    return builder.buildTree(tree).then(function(tree) {
        console.log("time to build files: " + (+(new Date())-start));
        return tree;
    });
    
    
}