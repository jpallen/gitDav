/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV             = require("./../../support/jsDav/lib/jsdav"),
    jsDAV_Git_Node    = require("./node").jsDAV_Git_Node,
    jsDAV_Git_File    = require("./file").jsDAV_Git_File,
    jsDAV_Directory   = require("./../../support/jsDav/lib/DAV/directory").jsDAV_Directory,
    jsDAV_iCollection = require("./../../support/jsDav/lib/DAV/iCollection").jsDAV_iCollection,
    jsDAV_iQuota      = require("./../../support/jsDav/lib/DAV/iQuota").jsDAV_iQuota,

    Fs                = require("fs"),
    Async             = require("./../../support/jsDav/support/async.js/lib/async/index"),
    Exc               = require("./../../support/jsDav/lib/DAV/exceptions"),
    Path              = require("path"),
    
    exec              = require("child_process").exec,
    
    Git               = require("./../git");

function jsDAV_Git_Directory(path, basePath, author) {
    this.path = path;
    this.relativePath = path.slice(basePath.length + 1);
    this.basePath = basePath;
    this.git  = new Git(basePath);
    this.author = author;
}

exports.jsDAV_Git_Directory = jsDAV_Git_Directory;

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
        var newPath = Path.join(this.path, name);
        var newRelativePath = Path.join(this.relativePath, name);
        if (data.length === 0) { //new node version will support writing empty files?
            data = "empty file.";
            enc  = "utf8";
        }
        
        var _self = this;
        Fs.writeFile(newPath, data, enc || "utf8", function(error) {
            if (error) {
                cbfscreatefile(error);
                return;
            }
            
            _self.git.addAndCommit(newPath, "Created " + newRelativePath, _self.author, cbfscreatefile);
        });
    };

    /**
     * Creates a new subdirectory
     *
     * @param string name
     * @return void
     */
    this.createDirectory = function(name, cbfscreatedir) {
        var newPath = Path.join(this.path, name);
        var newRelativePath = Path.join(this.relativePath, name);
        
        var _self = this;
        Fs.mkdir(newPath, 0755, function(error) {
            if (error) {
                cbfscreatedir(error);
                return;
            }
            
            // git only adds files so we need to create a file in the
            // directory in order to commit it.
            var placeholderPath = newPath + '/.placeholder';
            var placeholderMessage = "Git doesn't like empty directories"
            Fs.writeFile(placeholderPath, placeholderMessage, "utf8", function(error) {
                if (error) {
                    cbfscreatedir(error);
                    return;
                }
                
                _self.git.addAndCommit(placeholderPath, "Created " + newRelativePath, _self.author, cbfscreatedir);
            });
        });
    };

    /**
     * Returns a specific child node, referenced by its name
     *
     * @param string name
     * @throws Sabre_DAV_Exception_FileNotFound
     * @return Sabre_DAV_INode
     */
    this.getChild = function(name, cbfsgetchild) {
        var path = Path.join(this.path, name);
        var _self = this;

        Fs.stat(path, function(err, stat) {
            if (err || typeof stat == "undefined") {
                return cbfsgetchild(new Exc.jsDAV_Exception_FileNotFound("File with name "
                    + path + " could not be located"));
            }
            cbfsgetchild(null, stat.isDirectory()
                ? new jsDAV_Git_Directory(path, _self.basePath, _self.author)
                : new jsDAV_Git_File(path, _self.basePath, _self.author))
        });
    };

    /**
     * Returns an array with all the child nodes
     *
     * @return Sabre_DAV_INode[]
     */
    this.getChildren = function(cbfsgetchildren) {
        var nodes = [];
        var _self = this;
        Async.readdir(this.path)
             .stat()
             .each(function(file, cbnextdirch) {
                 nodes.push(file.stat.isDirectory()
                     ? new jsDAV_Git_Directory(file.path, _self.basePath)
                     : new jsDAV_Git_File(file.path, _self.basePath)
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
        var _self = this;
        this.git.rm_r(this.path, function(error, stdout, stderr) {
            console.log(error, stdout, stderr);
            if (error) {
                cbfsdel(error);
                return;
            }
            
            _self.git.commit("Deleted " + _self.relativePath, _self.author, cbfsdel);
        });
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
}).call(jsDAV_Git_Directory.prototype = new jsDAV_Git_Node());
