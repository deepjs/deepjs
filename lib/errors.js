/**
 *
 * 
 * @module deep
 * @submodule deep-errors
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(function(require)
{
	var toString = function(){
		var res = "Error : "+this.status + " - " + this.message;
		if(this.report)
			if(this.report.toString)
				res += this.report.toString();
			else
				res += " - report : "+JSON.stringify(this.report);
		return res;
	};
	return function(deep)
	{
		deep.errors = {
			Error:function(status, msg, report, fileName, lineNum){
				var error = new Error(msg, fileName, lineNum);
				error.status = status;
				error.report = report;
				error.toString = toString;
				return error;
			},
			RQL:function(msg, report, fileName, lineNum){
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "RQLError";
				return this.Error(500, msg, report, fileName, lineNum);
			},
			MethodNotAllowed:function(msg, report, fileName, lineNum){
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "MethodNotAllowed";
				return this.Error(405, msg, report, fileName, lineNum);
			},
			Internal:function(msg, report, fileName, lineNum){
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Internal";
				return this.Error(500, msg, report, fileName, lineNum);
			},
			PreconditionFail:function(msg, report, fileName, lineNum){
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "PreconditionFail";
				return this.Error(412, msg, report, fileName, lineNum);
			},
			NotFound:function(msg, report, fileName, lineNum){
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "NotFound";
				return this.Error(404, msg, report, fileName, lineNum);
			},
			Forbidden:function(msg, report, fileName, lineNum){
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Forbidden";
				return this.Error(403, msg, report, fileName, lineNum);
			},
			Range:function(msg, report, fileName, lineNum){
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Range";
				return this.Error(416, msg, report, fileName, lineNum);
			},
			Conflict:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Conflict";
				return this.Error(409, "ConflictError : "+msg, report, fileName, lineNum);
			},
			Unsupported:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Unsupported";
				return this.Error(415, "UnsupportedMediaTypeError : "+msg, report, fileName, lineNum);
			},
			NotAcceptable:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "NotAcceptable";
				return this.Error(406, "NotAcceptableError : "+msg, report, fileName, lineNum);
			},
			Unauthorized:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Unauthorized";
				return this.Error(401, "UnauthorizedError : "+msg, report, fileName, lineNum);
			},
			Mode:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Mode";
				return this.Error(500, "ModeError : "+msg, report, fileName, lineNum);
			},
			Watch:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Watch";
				return this.Error(500, "FileWatchError : "+msg, report, fileName, lineNum);
			},
			Store:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Store";
				return this.Error(400, "StoreError : "+msg, report, fileName, lineNum);
			},
			Protocole:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Protocole";
				return this.Error(400, "ProtocoleError : "+msg, report, fileName, lineNum);
			},
			OCM:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "OCM";
				return this.Error(403, "OCMError : "+msg, report, fileName, lineNum);
			},
			Owner:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "OwnerError";
				else
					msg = "OwnerError : "+msg;
				return this.Error(403, msg, report, fileName, lineNum);
			},
			Post:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Post";
				return this.Error(400, "PostError : "+msg, report, fileName, lineNum);
			},
			Put:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Put";
				return this.Error(400, "PutError : "+msg, report, fileName, lineNum);
			},
			Patch:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Patch";
				return this.Error(400, "PatchError : "+msg, report, fileName, lineNum);
			},
			Delete:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Delete";
				return this.Error(400, msg, report, fileName, lineNum);
			},
			RPC:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "RPC";
				return this.Error(400, msg, report, fileName, lineNum);
			},
			ChainEnded:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "ChainEnded";
				return this.Error(1001, msg, report, fileName, lineNum);
			},
			ChainListened:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "ChainListened";
				return this.Error(1002, msg, report, fileName, lineNum);
			},
			Login:function  (msg, report, fileName, lineNum) {
				if(typeof msg === 'object')
					report = msg;
				if(!msg)
					msg = "Login";
				return this.Error(400, msg, report, fileName, lineNum);
			}
		};
		return deep;
	};
});
