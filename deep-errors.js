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
	return function(deep)
	{
		deep.errors = {
			Internal:function(msg, fileName, lineNum){
				var error = new Error(msg, fileName, lineNum);
				error.status = 500;
				//error.report = report;
				return error;
			},
			PreconditionFail:function(msg, report, fileName, lineNum)
			{
				var error = new Error(msg, fileName, lineNum);
				error.status = 412;
				error.report = report;
				return error;
			},
			NotFound:function(msg, report, fileName, lineNum)
			{
				var error = new Error(msg, fileName, lineNum);
				error.status = 404;
				error.report = report;
				return error;
			},
			Forbidden:function(msg, report, fileName, lineNum)
			{
				var error = new Error(msg, fileName, lineNum);
				error.status = 403;
				error.report = report;
				return error;
			},
			Range:function(msg, report, fileName, lineNum)
			{
				var error = new Error(msg, fileName, lineNum);
				error.status = 416;
				error.report = report;
				return error;
			},
			Assertion:function(msg, report, fileName, lineNum)
			{
				var error = new Error("AssertionError : "+msg, fileName, lineNum);
				error.status = 412;
				error.report = report;
				return error;
			},
			Mode:function  (msg, report, fileName, lineNum) {
				var error = new Error("ModeError : "+msg, fileName, lineNum);
				error.status = 500;
				error.report = report;
				return error;
			},
			Watch:function  (msg, report, fileName, lineNum) {
				var error = new Error("FileWatchError : "+msg, fileName, lineNum);
				error.status = 500;
				error.report = report;
				return error;
			},
			Store:function  (msg, report, fileName, lineNum) {
				var error = new Error("StoreError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				return error;
			},
			Protocole:function  (msg, report, fileName, lineNum) {
				var error = new Error("ProtocoleError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				return error;
			},
			OCM:function  (msg, report, fileName, lineNum) {
				var error = new Error("OCMError : "+msg, fileName, lineNum);
				error.status = 403;
				error.report = report;
				return error;
			},
			Post:function  (msg, report, fileName, lineNum) {
				var error = new Error("PostError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				return error;
			},
			Put:function  (msg, report, fileName, lineNum) {
				var error = new Error("PutError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				return error;
			},
			Patch:function  (msg, report, fileName, lineNum) {
				var error = new Error("PatchError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				return error;
			},
			Delete:function  (msg, report, fileName, lineNum) {
				var error = new Error("DeleteError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				return error;
			},
			RPC:function  (msg, report, fileName, lineNum) {
				var error = new Error("RPCError : "+msg, fileName, lineNum);
				error.status = 400;
				error.report = report;
				return error;
			},
			ChainEnded:function  (msg, report, fileName, lineNum) {
				var error = new Error("ChainEndedError : "+msg, fileName, lineNum);
				error.status = 1001;
				error.report = report;
				return error;
			},
			ChainListened:function  (msg, report, fileName, lineNum) {
				var error = new Error("ChainListenedError : "+msg, fileName, lineNum);
				error.status = 1002;
				error.report = report;
				return error;
			}
		};
		return deep;
	};
});
