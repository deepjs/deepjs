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
			res += " - report : "+JSON.stringify(this.report);
		return res;
	}
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
			MethodNotAllowed:function(msg, report, fileName, lineNum){
				var error = new Error(msg, fileName, lineNum);
				error.status = 405;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Internal:function(msg, report, fileName, lineNum){
				var error = new Error(msg, fileName, lineNum);
				error.status = 500;
				error.report = report;
				error.toString = toString;
				return error;
			},
			PreconditionFail:function(msg, report, fileName, lineNum)
			{
				var error = new Error(msg, fileName, lineNum);
				error.status = 412;
				error.report = report;
				error.toString = toString;
				//console.log("precondition failed : ", error.toString());
				return error;
			},
			NotFound:function(msg, report, fileName, lineNum)
			{
				var error = new Error(msg, fileName, lineNum);
				error.status = 404;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Forbidden:function(msg, report, fileName, lineNum)
			{
				var error = new Error(msg, fileName, lineNum);
				error.status = 403;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Range:function(msg, report, fileName, lineNum)
			{
				var error = new Error(msg, fileName, lineNum);
				error.status = 416;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Assertion:function(msg, report, fileName, lineNum)
			{
				var error = new Error("AssertionError : "+msg, fileName, lineNum);
				error.status = 412;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Mode:function  (msg, report, fileName, lineNum) {
				var error = new Error("ModeError : "+msg, fileName, lineNum);
				error.status = 500;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Watch:function  (msg, report, fileName, lineNum) {
				var error = new Error("FileWatchError : "+msg, fileName, lineNum);
				error.status = 500;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Store:function  (msg, report, fileName, lineNum) {
				var error = new Error("StoreError : "+msg, fileName, lineNum);
				error.status = 400;
				error.toString = toString;
				error.report = report;
				return error;
			},
			Protocole:function  (msg, report, fileName, lineNum) {
				var error = new Error("ProtocoleError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				error.toString = toString;
				return error;
			},
			OCM:function  (msg, report, fileName, lineNum) {
				var error = new Error("OCMError : "+msg, fileName, lineNum);
				error.status = 403;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Post:function  (msg, report, fileName, lineNum) {
				var error = new Error("PostError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Put:function  (msg, report, fileName, lineNum) {
				var error = new Error("PutError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Patch:function  (msg, report, fileName, lineNum) {
				var error = new Error("PatchError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Delete:function  (msg, report, fileName, lineNum) {
				var error = new Error("DeleteError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				error.toString = toString;
				return error;
			},
			RPC:function  (msg, report, fileName, lineNum) {
				var error = new Error("RPCError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				error.toString = toString;
				return error;
			},
			ChainEnded:function  (msg, report, fileName, lineNum) {
				var error = new Error("ChainEndedError : "+msg, fileName, lineNum);
				error.status = 1001;
				error.report = report;
				error.toString = toString;
				return error;
			},
			ChainListened:function  (msg, report, fileName, lineNum) {
				var error = new Error("ChainListenedError : "+msg, fileName, lineNum);
				error.status = 1002;
				error.report = report;
				error.toString = toString;
				return error;
			},
			Login:function  (msg, report, fileName, lineNum) {
				var error = new Error("LoginError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				error.toString = toString;
				return error;
			}
		};
		return deep;
	};
});
