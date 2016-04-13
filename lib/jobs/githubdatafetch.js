
var Promise = require("bluebird");
var retry = require('bluebird-retry');
var poll = require("bluebird-poll");
var github = require("../github");
var pullrequests = require("../pullrequests");
var branches = require("../branches");
var trees = require("../trees");
var blobs = require("../blobs");
var builder = require("../builder");
var git = require("../git");
var Queue = require('data-structures').Queue;
var Branchqueue = new Queue();
var Pullrequestqueue = new Queue();
var Commentqueue = new Queue();


github.on("pullrequests",function(prs){
    
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
        });
        
    }).catch(function(err){ console.log(err);});
    
});

github.on("branches",function(brs){
    
    return Promise.resolve(brs).map(function(pr){
        return branches.isChanged(pr).then(function(changed){
                       
            if (!changed) {
                return pr;
            } else {
                Branchqueue.enqueue(pr);
                return Promise.resolve(true);
            }
        });
        
    }).catch(function(err){ console.log(err);});
    
});


poll(function(){
    if (Branchqueue.size){
        var br = Branchqueue.dequeue();
        var start = new Date();
        console.log("Start updating branch -> " + br.name);
        return UpdateBranch(br)
            .then(function(){
                
                console.log("time to get branch: " + (+(new Date())-start));
                console.log("branch done -> " + br.name);
                return branches.save(br);
                
            }).catch(function(err){console.log(err)});
        
    } else if (Pullrequestqueue.size){
        
        var pr = Pullrequestqueue.dequeue();
        var start = new Date();
        console.log("Start updating pullrequest-> " + pr.id + ":" + pr.title);
        return UpdatePullRequest(pr)
            .then(function() { return sendComment(pr);})
            .then(function(){
                
                console.log("time to get PR: " + (+(new Date())-start));
                console.log("PR done -> " + pr.id + ":" + pr.title);
                return pullrequests.save(pr);
                
            }).catch(function(err){console.log(err)});
        
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
                
            }).catch(function(){ return true;});
            
    } else {
        
        return  Promise.resolve(true);

    }
}, 1000);  


function UpdateBranch(branch){

    return trees.contains(branch.sha)
        .then(function(exists){
            if (exists) {
                return trees.get(branch.sha);
            } else {
                
                var start = new Date();
                return github.getTree("mrdoob/three.js", branch.sha)
                    .then(saveTree)
                    .then(function(tree) { 
                        console.log("time to get tree from github: " + (+(new Date())-start));
                        return retry(function(){ 
                            return getBlobs("mrdoob/three.js", branch.name, tree);
                        }, { max_tries: 10, interval: 2000 });
                    })
                    .then(function(tree) { return buildTree(tree)})
                    .then(saveTree);
            }
        });
    
       //.then(function(data){console.log(data);})
    
}

function UpdatePullRequest(pullrequest){

    return trees.contains(pullrequest.sha)
        .then(function(exists){
            if (exists) {
                return trees.get(pullrequest.sha);
            } else {
                
                var start = new Date();
                return github.getTree(pullrequest.repositoryName, pullrequest.sha)
                    .then(saveTree)
                    .then(function(tree) { 
                        console.log("time to get tree from github: " + (+(new Date())-start));
                        return retry(function(){ 
                            return getBlobs(pullrequest.repositoryName, "pull/" + pullrequest.id + "/head", tree);
                        }, { max_tries: 10, interval: 2000 });
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

function getBlobs(repositoryName,ref, tree) {
    var start = new Date();
    var failureCounter = [];
    var paths = [];
    
    for (var path in tree.paths){
        paths.push(path);
    }

    return git.fetchRepository("mrdoob/three.js",ref,tree).then(function(repo){

        return Promise.resolve(paths).map(function(path){
            var sha = tree.paths[path];
            var tempPath = path;
            
            return blobs.contains(sha)
                .then(function(stat){
                    if (stat){
                        return;
                    }

                    return git.getBlobContent(repo,sha).then(function(source){
                            return blobs.save(sha,source);
                        }).catch(function(err){
                            console.log("repo data failed -> " + path );
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

                    
                });
    
        }, {"concurrency": 10})
        .then(function(a){
            if (failureCounter.length > 0) {
                console.log(failureCounter.length + " failures left: \n   " + failureCounter.join("\n   "));
                throw "failed";
            }
            return a;
        });
            
    }).then(function() {console.log("time to check all files: " + (+(new Date())-start));return tree});
        
    
}

function buildTree(tree) {
    
    var start = new Date();
    return builder.buildTree(tree).then(function(tree) {
        console.log("time to build files: " + (+(new Date())-start));
        return tree;
    });
    
    
}