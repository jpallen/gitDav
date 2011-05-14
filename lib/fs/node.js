/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV       = require("./../../support/jsDav/lib/jsdav"),
    jsDAV_iNode = require("./../../support/jsDav/lib/DAV/iNode").jsDAV_iNode,

    Fs          = require("fs"),
    Path        = require("path"),
    Util        = require("./../../support/jsDav/lib/DAV/util"),
    Exc         = require("./../../support/jsDav/lib/DAV/exceptions"),
    Git         = require("./../git");

function jsDAV_Git_Node(path, basePath) {
    if (path && basePath) {
        this.path = path;
        this.relativePath = path.slice(basePath.length + 1);
        this.git  = new Git(basePath);
        this.author = {
            authorEmail    : 'james@scribtex.com',
            authorName     : 'James Allen',
            committerEmail : 'git@scribtex.com',
            committerName  : 'ScribTeX'
        };
    }
}

exports.jsDAV_Git_Node = jsDAV_Git_Node;

(function() {
    /**
     * Returns the name of the node
     *
     * @return {string}
     */
    this.getName = function() {
        return Util.splitPath(this.path)[1];
    };

    /**
     * Renames the node
     *
     * @param {string} name The new name
     * @return void
     */
    this.setName = function(name, cbfssetname) {
        var parentPath         = Util.splitPath(this.path)[0],
            relativeParentPath = Util.splitPath(this.relativePath)[0],
            newName            = Util.splitPath(name)[1];

        var newPath = Path.join(parentPath, newName);
        var newRelativePath = Path.join(relativeParentPath, newName);
        var _self = this;
        
        var message = "Renamed " + _self.relativePath + " to " + newRelativePath;
        this.git.mvAndCommit(this.path, newPath, message, this.author, function(error, stdout, stderr) {
            _self.path = newPath;
            cbfssetname(error);
        });
    };

    /**
     * Returns the last modification time, as a unix timestamp
     *
     * @return {Number}
     */
    this.getLastModified = function(cbfsgetlm) {
        if (this.$stat)
            return cbfsgetlm(null, this.$stat.mtime);
        var _self = this;
        Fs.stat(this.path, function(err, stat) {
            if (err || typeof stat == "undefined")
                return cbfsgetlm(err);
            //_self.$stat = stat;
            cbfsgetlm(null, stat.mtime);
        });
    };

    /**
     * Returns whether a node exists or not
     *
     * @return {Boolean}
     */
    this.exists = function(cbfsexist) {
        Path.exists(this.path, cbfsexist);
    };
}).call(jsDAV_Git_Node.prototype = new jsDAV_iNode());
