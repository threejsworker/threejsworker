var blobs = require("./blobs");
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));
var mkdirp = Promise.promisify(require('mkdirp'));
var Path = require("path");
var uglify = require("uglify-js");
var crypto = require('crypto');


var basepath= "./storage/Builder/";

exports.buildTree = function(tree){
    return createTree(tree)
        .then(function() {build(false,basepath + "build/three.js");})
        .then(function() {build(false,basepath + "build/three.min.js");})
        .then(function() {return updateTree(tree, "build/three.js");})
        .then(function(tree) {return updateTree(tree, "build/three.min.js");});
        
};
function createTree(tree){
    var promises = [];
    
    for (var path in tree.paths) {
        (function(path){
            promises.push(mkdirp(Path.dirname(basepath + path))
                .then(function() {
                    //console.log(path);
                    return blobs.get(tree.paths[path]);
                    
                }).then(function(blob) {
                
                 return fs.writeFileAsync(basepath + path ,blob);
                    
                }).catch(function(err){
                    console.log(err);
                })
            );
        }(path));
        
        
    }
    
    return Promise.all(promises);
    
}

function build(minify,output) {

    var includes = ["common", "extras" ];

	var buffer = [];
	var sources = []; // used for source maps with minification

	for ( var i = 0; i < includes.length; i ++ ){
		
		var contents = fs.readFileSync( basepath + 'utils/build/includes/' + includes[i] + '.json', 'utf8' );
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

			sources.push( { file: file, contents: contents } );
			buffer.push( contents );
			buffer.push( '\n' );
		}

	}
	
	var temp = buffer.join( '' );
	
	if ( !minify ){

		fs.writeFileSync( output, temp, 'utf8' );

	} else {

		var LICENSE = "threejs.org/license";

		// Parsing

		var toplevel = null;

		toplevel = uglify.parse( '// ' + LICENSE + '\n' );

		sources.forEach( function( source ) {

			toplevel = uglify.parse( source.contents, {
				filename: source.file,
				toplevel: toplevel
			} );

		} );

		// Compression

		toplevel.figure_out_scope();
		var compressor = uglify.Compressor( {} );
		var compressed_ast = toplevel.transform( compressor );

		// Mangling

		compressed_ast.figure_out_scope();
		compressed_ast.compute_char_frequency();
		compressed_ast.mangle_names();

		// Output

		var source_map_options = {
			file: 'three.min.js',
			root: 'src'
		};

		var source_map = uglify.SourceMap( source_map_options );
		var stream = uglify.OutputStream( {
			source_map: source_map,
			comments: new RegExp( LICENSE )
		} );

		compressed_ast.print( stream );
		var code = stream.toString();

		fs.writeFileSync( output, code, 'utf8' );

	}
    
}
function updateTree(tree, file){
    
    fs.readFileAsync(basepath + file)
        .then(function(content){
            var sha =  getsha(content)
            tree.paths[file] =sha;
            return blobs.save(sha, content);
        })
    
    return tree
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