var spawn = require('child_process').spawn;

function GitRepository(path) {
    this.path = path;
}

module.exports = GitRepository;

(function() {
    this.add = function(path, callback) {
        this.git(['add', path], callback);
    };
    
    this.rm = function(path, callback) {
        this.git(['rm', path], callback);
    };
    
    this.commit = function(message, author, callback) {
        this.git(['commit', '-m', message], {
            env : {
                'GIT_COMMITTER_NAME'  : author.committerName,
                'GIT_COMMITTER_EMAIL' : author.committerEmail,
                'GIT_AUTHOR_NAME'     : author.authorName,
                'GIT_AUTHOR_EMAIL'    : author.authorEmail
            }
        }, callback);
    };
    
    this.addAndCommit = function(path, message, author, callback) {
        var _self = this;
        this.add(path, function(error, stdout, stderr) {
            if (error) {
                callback(error, stdout, stderr);
                return;
            }
            
            _self.commit(message, author, callback);
        });
    };
    
    /* 
     * Call git with the given arguments, buffer the output and
     * return it in a callback. The options arguments is optional
     * and is passed to the spawn command.
    */
    this.git = function(command_arguments, options, callback) {
        if (!callback) {
            callback = options;
            options = {};
        } else {
            options = (options || {});
        }
        
        options.cwd = this.path;
        
        var process = spawn('git', command_arguments, options);
        var stdout = '', stderr = '';
        process.stdout.on('data', function(chunk) {
            stdout += chunk; 
        });
        process.stderr.on('data', function(chunk) {
            stderr += chunk; 
        });
        process.on('exit', function(code) {
            var error;
            // git doesn't always return 0 on success, so check if stderr
            // is blank instead. 
            if (stderr !== '') {
                error = new Error();
                error.code = code;
            }
            callback(error, stdout, stderr);
        });
    };
}).call(GitRepository.prototype);