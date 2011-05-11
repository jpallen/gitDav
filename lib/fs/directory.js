/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV             = require("./../../support/jsDav/lib/jsdav"),
    jsDav_Git_Node    = require("./node").jsDav_Git_Node,
    jsDav_Git_File    = require("./file").jsDav_Git_File,
    jsDAV_Directory   = require("./../../support/jsDav/lib/DAV/directory").jsDAV_Directory,
    jsDAV_iCollection = require("./../../support/jsDav/lib/DAV/iCollection").jsDAV_iCollection,
    jsDAV_iQuota      = require("./../../support/jsDav/lib/DAV/iQuota").jsDAV_iQuota,

    Fs                = require("fs"),
    Async             = require("./../../support/jsDav/support/async.js/lib/async/index"),
    Exc               = require("./../../support/jsDav/lib/DAV/exceptions");

function jsDav_Git_Directory(path) {
    this.path = path;
}

exports.jsDav_Git_Directory = jsDav_Git_Directory;

(function() {
    this.implement(jsDAV_Directory, jsDAV_iCollection, jsDAV_iQuota);

    /**
     * Creates a new file in the directory
     *
     * data is a readable stream resource
     *
     * @param string name Name of the file
     * @param resource data Initial payload
     * @return void
     */
    this.createFile = function(name, data, enc, cbfscreatefile) {
        var newPath = this.path + "/" + name;
        if (data.length === 0) { //new node version will support writing empty files?
            data = "empty file.";
            enc  = "utf8";
        }
        Fs.writeFile(newPath, data, enc || "utf8", cbfscreatefile)
    };

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    this.createDirectory = function(name, cbfscreatedir) {
        var newPath = this.path + "/" + name;
        Fs.mkdir(newPath, 0755, cbfscreatedir);
    };

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    this.getChild = function(name, cbfsgetchild) {
        var path = this.path + "/" + name;

        Fs.stat(path, function(err, stat) {
            if (err || typeof stat == "undefined") {
                return cbfsgetchild(new Exc.jsDAV_Exception_FileNotFound("File with name "
                    + path + " could not be located"));
            }
            cbfsgetchild(null, stat.isDirectory()
                ? new jsDav_Git_Directory(path)
                : new jsDav_Git_File(path))
        });
    };

    /**
     * Returns an array with all the child nodes
     *
     * @return Sabre_DAV_INode[]
     */
    this.getChildren = function(cbfsgetchildren) {
        var nodes = [];
        Async.readdir(this.path)
             .stat()
             .each(function(file, cbnextdirch) {
                 nodes.push(file.stat.isDirectory()
                     ? new jsDav_Git_Directory(file.path)
                     : new jsDav_Git_File(file.path)
                 );
                 cbnextdirch();
             })
             .end(function() {
                 cbfsgetchildren(null, nodes);
             });
    };

    /**
     * Deletes all files in this directory, and then itself
     *
     * @return void
     */
    this["delete"] = function(cbfsdel) {
        Async.rmtree(this.path, cbfsdel);
    };

    /**
     * Returns available diskspace information
     *
     * @return array
     */
    this.getQuotaInfo = function(cbfsquota) {
        if (!("statvfs" in Fs))
            return cbfsquota(null, [0, 0]);
        if (this.$statvfs) {
            return cbfsquota(null, [
                (this.$statvfs.blocks - this.$statvfs.bfree),// * this.$statvfs.bsize,
                this.$statvfs.bavail// * this.$statvfs.bsize
            ]);
        }
        var _self = this;
        Fs.statvfs(this.path, function(err, statvfs) {
            if (err || !statvfs)
                cbfsquota(err, [0, 0]);
            //_self.$statvfs = statvfs;
            cbfsquota(null, [
                (statvfs.blocks - statvfs.bfree),// * statvfs.bsize,
                statvfs.bavail// * statvfs.bsize
            ]);
        });
    };
}).call(jsDav_Git_Directory.prototype = new jsDav_Git_Node());
