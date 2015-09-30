var blobs = require("./blobs");
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var mkdirp = Promise.promisify(require('mkdirp'));
var Path = require("path");
var uglify = require("uglify-js");
var crypto = require('crypto');


var basepath= "./storage/Builder/";
var includes = ["common", "extras" ];

exports.buildTree = function(tree){
    return createFilesBasedOnIncludes(tree)
        .then(function() {build(false,basepath + "build/three.js");})
        .then(function() {build(false,basepath + "build/three.min.js");})
        .then(function() {return updateTree(tree, "build/three.js");})
        .then(function(tree) {return updateTree(tree, "build/three.min.js");})
};
function createTree(tree){
    var promises = [];
    
    for (var path in tree.paths) {
    	promises.push(createFile(tree,path));
    }
    
    return Promise.all(promises);
    
}

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
            //console.log(path);
            return blobs.get(tree.paths[path]);
            
        }).then(function(blob) {
        
         return fs.writeFileAsync(basepath + path ,blob);
            
        }).catch(function(err){
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

		console.log("output complete");
	} else {

		var LICENSE = "//threejs.org/license \n";
		var code = uglify.minify(temp, {fromString: true});

		fs.writeFileSync( output, LICENSE + code, 'utf8' );

	}
    
}
function updateTree(tree, file){
    
    return fs.readFileAsync(basepath + file)
        .then(function(content){
            var sha =  getsha(content);
            tree.paths[file] =sha;
            console.log(file);
            console.log(sha);
            return blobs.save(sha, content)
            	.then(function(){
            		return tree;
            	});
        });
}

function getsha(content) {
    var size = content.length.toString();    
    
    var header = "blob " + size + "\0";
    var store = header + content;  
    // Use node crypto library to create sha1 hash
    var hash = crypto.createHash('sha1');
    hash.update(store, 'binary');
    // Return the hash digest
    var sha1 = hash.digest('hex');
    return sha1;
}