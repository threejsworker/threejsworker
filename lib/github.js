
var config = require("../config");
var Promise = require("bluebird");
var poll = require("bluebird-poll");
var request = Promise.promisify(require("request"));


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


exports.onChangedPullRequests= function(Prs){};


exports.getBlob = function(repositoryName, treesha, path ){
	
	var options = {
		url : "https://raw.githubusercontent.com/"+ repositoryName+ "/" + treesha+ "/"+ path,
		encoding: null
	};

	return request(options).spread(function(response,body) {
		
		return body;
		//console.log(body);
	});
};

exports.getCommentsFromIssue = function( id ){
	
	var options = {
		url : "/repos/mrdoob/three.js/issues/" + id + "/comments"
	};

	return githubApiRequest(options).spread(function(response,body) {
		
		//console.log(body);
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


exports.sendCommentToIssue = function( id, body ){
	

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
			
			//console.log(body);
			return JSON.parse(body);
		});
	})
};

exports.getUser = function(){
	
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

exports.getTree = function(repositoryName, sha){
	
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
		
		return tree;
	});
};

exports.getPullRequests = function(pullrequestID){
	
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
			exports.onChangedPullRequests(pullrequests);
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
	 
		return githubApiRequest(options).spread(function(response,body) {
			
			//check if it is the same response as before and quit if it is  
			if (lastmodified === response.headers.etag) {
				return;
			}
			lastmodified = response.headers.etag;
			
			//console.log(response.headers);
			
			return JSON.parse(body)
			//console.log(body);
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
				exports.onChangedPullRequests(pullrequests);
				
			} 
			
			
		}).catch(function(err){
			console.error(err);	
		});
		
		return false;
	
	}
	
})(), 5000);

