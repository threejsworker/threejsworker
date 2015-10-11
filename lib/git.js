
var crypto = require('crypto');


exports.getBlobSha = function getsha(content) {
    var size = content.length.toString();    
    
    var header = "blob " + size + "\u0000";
    //var store = header + content;  
    // Use node crypto library to create sha1 hash
    var hash = crypto.createHash('sha1');
    hash.update(header, 'utf8');
    hash.update(content, 'utf8');
    // Return the hash digest
    var sha1 = hash.digest('hex');
    hash = null;
    return sha1;
}