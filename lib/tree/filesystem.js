/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV_Tree          = require("./../../support/jsDav/lib/DAV/tree").jsDAV_Tree,
    jsDAV_Git_Directory = require("./../../support/jsDav/lib/DAV/fs/directory").jsDAV_Git_Directory,
    jsDAV_Git_File      = require("./../../support/jsDav/lib/DAV/fs/file").jsDAV_Git_File,

    Fs                  = require("fs"),
    Async               = require("./../../support/jsDav/support/async.js/lib/async/index"),
    Util                = require("./../../support/jsDav/lib/DAV/util"),
    Exc                 = require("./../../support/jsDav/lib/DAV/exceptions");

/**
 * jsDAV_Tree_Filesystem
 *
 * Creates this tree
 * Supply the path you'd like to share.
 *
 * @param {String} basePath
 * @contructor
 */
function jsDAV_Tree_Filesystem(basePath) {
    this.basePath = basePath;
}

exports.jsDAV_Tree_Filesystem = jsDAV_Tree_Filesystem;

(function() {
    /**
     * Returns a new node for the given path
     *
     * @param string path
     * @return void
     */
    this.getNodeForPath = function(path, cbfstree) {
        var realPath = this.getRealPath(path);
        Fs.stat(realPath, function(err, stat) {
            if (!Util.empty(err))
                return cbfstree(new Exc.jsDAV_Exception_FileNotFound("File at location " + realPath + " not found"));
            cbfstree(null, stat.isDirectory()
                ? new jsDav_Git_Directory(realPath)
                : new jsDav_Git_File(realPath))
        });
    };

    /**
     * Returns the real filesystem path for a webdav url.
     *
     * @param string publicPath
     * @return string
     */
    this.getRealPath = function(publicPath) {
        return Util.rtrim(this.basePath, "/") + "/" + Util.trim(publicPath, "/");
    };

    /**
     * Copies a file or directory.
     *
     * This method must work recursively and delete the destination
     * if it exists
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.copy = function(source, destination, cbfscopy) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);
        this.realCopy(source, destination, cbfscopy);
    };

    /**
     * Used by self::copy
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.realCopy = function(source, destination, cbfsrcopy) {
        Fs.stat(source, function(err, stat) {
            if (!Util.empty(err))
                return cbfsrcopy(err);
            if (stat.isFile())
                Async.copyfile(source, destination, true, cbfsrcopy);
            else
                Async.copytree(source, destination, cbfsrcopy);
        });
    };

    /**
     * Moves a file or directory recursively.
     *
     * If the destination exists, delete it first.
     *
     * @param string source
     * @param string destination
     * @return void
     */
    this.move = function(source, destination, cbfsmove) {
        source      = this.getRealPath(source);
        destination = this.getRealPath(destination);
        Fs.rename(source, destination, cbfsmove);
    };
}).call(jsDAV_Tree_Filesystem.prototype = new jsDAV_Tree());