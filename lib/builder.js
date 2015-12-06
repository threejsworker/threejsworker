var blobs = require("./blobs");
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var mkdirp = Promise.promisify(require('mkdirp'));
var rmdir = Promise.promisify(require('rmdir'));
var Path = require("path");
var uglify = require("uglify-js");
var git = require("./git");


var basepath= __dirname + "/../storage/Builder/";
var includes = ["common", "extras" ];

exports.buildTree = function(tree){
    return createFilesBasedOnIncludes(tree)
    	.then(function() { return createFile(tree,"build/three.js")})
    	.then(function() { return createFile(tree,"build/three.min.js")})
        .then(function() {build(false,basepath + "build/three.js");})
        .then(function() {build(false,basepath + "build/three.min.js");})
        .then(function() {return updateTree(tree, "build/three.js");})
        .then(function(tree) {return updateTree(tree, "build/three.min.js");})
        .then(function(tree) {
        	return rmdir(basepath).then(function(){
        		return tree;
        	});
        });
};

function createFilesBasedOnIncludes(tree){
	
    var promises = [];
    
	includes.forEach(function(include){
		(function(include){
			promises.push(createFile(tree, 'utils/build/includes/' + include + '.json')
				.then(function(){
					return fs.readFileAsync( basepath + 'utils/build/includes/' + include + '.json', 'utf8' );
				}).then(function(contents){
					
    				var promises = [];
					var files = JSON.parse( contents );
					
					files.forEach(function(file){
						promises.push(createFile(tree, file));
					});
					
					return Promise.all(promises);
				}));
		}(include));
		
	});
	

    return Promise.all(promises);
	
}
function createFile(tree,path) {
	
	return mkdirp(Path.dirname(basepath + path))
        .then(function() {
            return blobs.get(tree.paths[path]);
            
        }).then(function(blob) {
        
         return fs.writeFileAsync(basepath + path ,blob);
            
        }).catch(function(err){
        	console.log(path + ": " + tree.paths[path]);
            console.log(err);
        });
}



function build(minify,output) {

	console.log(output);
	var buffer = [];

	for ( var i = 0; i < includes.length; i ++ ){
		
		try {
			var contents = fs.readFileSync( basepath + 'utils/build/includes/' + includes[i] + '.json', 'utf8' );
		} catch(e) {
			contents = "[]";
		}
		
		var files = JSON.parse( contents );

		for ( var j = 0; j < files.length; j ++ ){

			var file = basepath + files[ j ];
			
			buffer.push('// File:' + files[ j ]);
			buffer.push('\n\n');

			contents = fs.readFileSync( file, 'utf8' );

			if( file.indexOf( '.glsl') >= 0 ) {

				contents = 'THREE.ShaderChunk[ \'' +
					Path.basename( file, '.glsl' ) + '\' ] =' +
					JSON.stringify( contents ) + ';\n';

			}

			buffer.push( contents );
			buffer.push( '\n' );
		}

	}
	
	var temp = buffer.join( '' );
	
	if ( !minify ){

		fs.writeFileSync( output, temp, 'utf8' );
		
	} else {

		try {
			
			var LICENSE = "//threejs.org/license \n";
			var code = uglify.minify(temp, {fromString: true});
			fs.writeFileSync( output, LICENSE + code, 'utf8' );
		
		} catch(e) {
			
			fs.writeFileSync( output, temp, 'utf8' );
			
		}
		
	}
    
}
function updateTree(tree, file){
    
    return fs.readFileAsync(basepath + file)
        .then(function(content){
            var sha =  git.getBlobSha(content);
            tree.paths[file] =sha;
            return blobs.save(sha, content)
            	.then(function(){
            		return tree;
            	});
        });
}
