/*
 * @package jsDAV
 * @subpackage DAV
 * @copyright Copyright (C) 2010 Mike de Boer. All rights reserved.
 * @author Mike de Boer <mike AT ajax DOT org>
 * @license http://github.com/mikedeboer/jsDAV/blob/master/LICENSE MIT License
 */

var jsDAV           = require("./../../support/jsDav/lib/jsdav"),
    jsDAV_Git_Node  = require("./node").jsDAV_Git_Node,
    jsDAV_Directory = require("./../../support/jsDav/lib/DAV/directory").jsDAV_Directory,
    jsDAV_iFile     = require("./../../support/jsDav/lib/DAV/iFile").jsDAV_iFile,

    Fs              = require("fs"),
    Util            = require("./../../support/jsDav/lib/DAV/util"),
    Exc             = require("./../../support/jsDav/lib/DAV/exceptions"),
    Git             = require("./../git");

function jsDAV_Git_File(path, basePath) {
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

exports.jsDAV_Git_File = jsDAV_Git_File;

(function() {
    this.implement(jsDAV_iFile);

    /**
     * Updates the data
     *
     * @param {mixed} data
     * @return void
     */
    this.put = function(data, type, cbfsput) {
        var _self = this;
        Fs.writeFile(this.path, data, type || "utf8", function(error) {
            if (error) {
                cbfsput(error);
                return;
            }
            
            _self.git.addAndCommit(_self.path, "Updated " + _self.relativePath, _self.author, cbfsput);
        });
        
    };

    /**
     * Returns the data
     *
     * @return Buffer
     */
    this.get = function(cbfsfileget) {
        if (this.$buffer)
            return cbfsfileget(null, this.$buffer);
        var _self  = this,
            onRead = function(err, buff) {
                if (err)
                    return cbfsfileget(err);
                // For older versions of node convert the string to a buffer.
                if (typeof buff === "string") {
                    var b = new Buffer(buff.length);
                    b.write(buff, "binary");
                    buff = b;
                }
                // Zero length buffers act funny, use a string
                if (buff.length === 0)
                    buff = "";
                //_self.$buffer = buff;
                cbfsfileget(null, buff);
            };
        
        // Node before 0.1.95 doesn't do buffers for fs.readFile
        if (process.version < "0.1.95" && process.version > "0.1.100") {
            // sys.debug("Warning: Old node version has slower static file loading");
            Fs.readFile(this.path, "binary", onRead);
        }
        else {
            Fs.readFile(this.path, onRead);
        }
    };

    /**
     * Delete the current file
     *
     * @return void
     */
    this["delete"] = function(cbfsfiledel) {
        var _self = this;
        this.git.rm(this.path, function(error, stdout, stderr) {
            if (error) {
                cbfsfiledel(error);
                return;
            }
            
            _self.git.commit("Deleted " + _self.relativePath, _self.author, cbfsfiledel);
        });
    };

    /**
     * Returns the size of the node, in bytes
     *
     * @return int
     */
    this.getSize = function(cbfsgetsize) {
        if (this.$stat)
            return cbfsgetsize(null, this.$stat.size);
        var _self = this;
        return Fs.stat(this.path, function(err, stat) {
            if (err || !stat) {
                return cbfsgetsize(new Exc.jsDAV_Exception_FileNotFound("File at location " 
                    + this.path + " not found"));
            }
            //_self.$stat = stat;
            cbfsgetsize(null, stat.size);
        });
    };

    /**
     * Returns the ETag for a file
     * An ETag is a unique identifier representing the current version of the file.
     * If the file changes, the ETag MUST change.
     * Return null if the ETag can not effectively be determined
     *
     * @return mixed
     */
    this.getETag = function(cbfsgetetag) {
        cbfsgetetag(null, null);
    };

    /**
     * Returns the mime-type for a file
     * If null is returned, we'll assume application/octet-stream
     *
     * @return mixed
     */
    this.getContentType = function(cbfsmime) {
        return cbfsmime(null, Util.mime.type(this.path));
    };
}).call(jsDAV_Git_File.prototype = new jsDAV_Git_Node());
