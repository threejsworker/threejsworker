
var config = require("../config");
var Promise = require("bluebird");
var poll = require("bluebird-poll");
var request = Promise.promisify(require("request"));
var EventEmitter = require( "events" ).EventEmitter;


var githubApiRequest = request.defaults({
	baseUrl : "https://api.github.com",
	qs: {
		"per_page":100
	},
	headers: {
		"User-Agent": "threejsworker",
		"Authorization" : "token " + config.GITHUB_TOKEN
	}
});

var github = new EventEmitter();

github.getBlob = function(repositoryName, treesha, path ){
	
	var options = {
		url : "https://raw.githubusercontent.com/"+ repositoryName+ "/" + treesha+ "/"+ path,
		encoding: null
	};

	return request(options).spread(function(response,body) {
		
		return body;
		
	});
};

github.getCommentsFromIssue = function( id ){
	
	var options = {
		url : "/repos/mrdoob/three.js/issues/" + id + "/comments"
	};

	return githubApiRequest(options).spread(function(response,body) {
		
		return JSON.parse(body);
		
	}).then(function(body){
		var comments = [];
		
		body.forEach(function(comment){

				comments.push({
					user: comment.user.login,
					body: comment.body
				});

		});
		
		return comments;
	});
};


github.sendCommentToIssue = function( id, body ){
	

	return exports.getUser().then(function(user){
		var options;
		if (user === "threejsworker"){
			
			options = {
				method: "POST",
				url : "/repos/mrdoob/three.js/issues/" + id + "/comments",
				body : JSON.stringify({ body : body})
				
			};
			
		} else {
						
			options = {
				method: "POST",
				url : "/repos/threejsworker/threejsworker/issues/12/comments",
				body : JSON.stringify({ body : body})
			};
			
		}
		return githubApiRequest(options).spread(function(response,body) {
			
			return JSON.parse(body);
			
		});
	})
};

github.getUser = function(){
	
	var options = {
		url : "/user"
	};

	return githubApiRequest(options).spread(function(response,body) {
		
		//console.log(body);
		return JSON.parse(body);
	}).then(function(body){
		return body.login;
	});
};

github.getTree = function(repositoryName, sha){
	var start = Date.now();
	var options = {
		url : "/repos/" + repositoryName + "/git/trees/" + sha,
		qs: {
			recursive: 1	
		}
	};
	
	return githubApiRequest(options).spread(function(response,body) {
		
		return JSON.parse(body);
		//console.log(body);
	}).then(function(body){
		var tree = {
			sha: body.sha,
			paths: {}
		};
		
		body.tree.forEach(function(path){
			if (path.type === "blob") {
				
				tree.paths[path.path] = path.sha;
				
			}
		});
		
		console.log("tree from github itself: "  + (+(new Date())-start));
		return tree;
	});
};

github.getPullRequests = function(pullrequestID){
	
	var options = {
		url : "/repos/mrdoob/three.js/pulls/"+ pullrequestID
	};

	return githubApiRequest(options).spread(function(response,body) {
		return JSON.parse(body);
	}).then(function(pr){
		if (pr && pr.head && pr.head.repo) {
			var pullrequests = [];
			pullrequests.push({
				"id": pr.number,
				"state": pr.state,
				"title": pr.title,
				"repositoryName": pr.head.repo.full_name,
				"created":pr.created_at,
				"updated":pr.updated_at,
				"sha": pr.head.sha
			});
			
			github.emit("pullrequests",pullrequests);
		}
		
	}).catch(function(err){
		console.error(err);	
	});
};



poll((function(){
	
	var lastmodified;
	return function(){
		var options = {
			url : "/repos/mrdoob/three.js/pulls",
			qs: {
				state: "all",
				sort: "updated",
				direction: "desc"
			},
			headers: {
				'If-None-Match' : lastmodified
			}
		};
	 
		return githubApiRequest(options).spread(function(response,bodyString) {
			
			//check if it is the same response as before and quit if it is  
			if (lastmodified === response.headers.etag) {
				return;
			}
			lastmodified = response.headers.etag;
			
			//console.log(response.headers);
			
			//console.log(body.length);
			var body = JSON.parse(bodyString);
			
			var pullrequests = [];
			if (body){
				
				body.forEach(function(pr){
					if (pr && pr.head && pr.head.repo) {
						pullrequests.push({
							"id": pr.number,
	    					"state": pr.state,
	    					"title": pr.title,
	    					"repositoryName": pr.head.repo.full_name,
	    					"created":pr.created_at,
	    					"updated":pr.updated_at,
	    					"sha": pr.head.sha
						});
					}
				});
				
				github.emit("pullrequests",pullrequests);
				
			} 
			
			
		}).catch(function(err){
			console.error(err);	
		});
		
	
	};
	
})(), 5000);


poll((function(){
	
	var lastmodified;
	return function(){
		var options = {
			url : "/repos/mrdoob/three.js/branches",
			headers: {
				'If-None-Match' : lastmodified
			}
		};
	 
		return githubApiRequest(options).spread(function(response,bodyString) {
			
			//check if it is the same response as before and quit if it is  
			if (lastmodified === response.headers.etag) {
				return;
			}
			lastmodified = response.headers.etag;
			
			//console.log(response.headers);
			
			//console.log(body.length);
			var body = JSON.parse(bodyString);
			
			var branches = [];
			if (body){
				body.forEach(function(branch){
					
					branches.push({
						name:branch.name,
						sha:branch.commit.sha
					});
					
				});
				
				github.emit("branches",branches);
				
			} 
			
		}).catch(function(err){
			console.error(err);	
		});
		
	
	};
	
})(), 5000);



function getAllBranches(){
	
	var options = {
		url : "/repos/mrdoob/three.js/branches"
	};

	return githubApiRequest(options).spread(function(response,body) {
		return JSON.parse(body);
	}).then(function(branches){
		var returnValue = [];
		branches.forEach(function(branch){
			
			returnValue.push({
				name:branch.name,
				sha:branch.commit.sha
			});
			
		});
		
		return returnValue
		
	}).catch(function(err){
		console.error(err);	
	});
};

function getAllPullrequests(page){
	
	var options = {
		url : "/repos/mrdoob/three.js/pulls",
		qs: {
			state: "all",
			sort: "updated",
			direction: "desc",
			page:page
		}
	};
 
	return githubApiRequest(options).spread(function(response,body) {

		return JSON.parse(body);
	}).then(function(body){
		
		var pullrequests = [];
		if (body){
			
			body.forEach(function(pr){
				if (pr && pr.head && pr.head.repo) {
					pullrequests.push({
						"id": pr.number,
    					"state": pr.state,
    					"title": pr.title,
    					"repositoryName": pr.head.repo.full_name,
    					"created":pr.created_at,
    					"updated":pr.updated_at,
    					"sha": pr.head.sha
					});
				}
			});
			github.emit("pullrequests",pullrequests);
			
		} 
		
		
	}).catch(function(err){
		console.error(err);	
	});
		
		
}


/*
for (var i= 2; i< 25;i++){
	getAllPullrequests(i);
}
*/


module.exports = github;