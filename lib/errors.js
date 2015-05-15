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
define(function() {
	var errors = {
		toString: function() {
			var res = "Error : " + this.status + " - " + this.message;
			if (this.report)
				if (this.report.toString)
					res += this.report.toString();
				else
					res += " - report : " + JSON.stringify(this.report);
			return res;
		},
		Error: function(status, msg, report, fileName, lineNum) {
			var error = new Error(msg, fileName, lineNum);
			error.status = status;
			error.report = report;
			return error;
		},
		MethodNotAllowed: function(msg, report, fileName, lineNum) {
			return this.Error(405, msg || "MethodNotAllowed", report, fileName, lineNum);
		},
		Internal: function(msg, report, fileName, lineNum) {
			return this.Error(500, msg, report, fileName, lineNum);
		},
		PreconditionFail: function(msg, report, fileName, lineNum) {
			return this.Error(412, msg || "PreconditionFail", report, fileName, lineNum);
		},
		NotFound: function(msg, report, fileName, lineNum) {
			return this.Error(404, msg || "NotFound", report, fileName, lineNum);
		},
		Forbidden: function(msg, report, fileName, lineNum) {
			return this.Error(403, msg || "Forbidden", report, fileName, lineNum);
		},
		Range: function(msg, report, fileName, lineNum) {
			return this.Error(416, msg || "Range", report, fileName, lineNum);
		},
		Conflict: function(msg, report, fileName, lineNum) {
			return this.Error(409, "ConflictError : " + msg, report, fileName, lineNum);
		},
		Unsupported: function(msg, report, fileName, lineNum) {
			return this.Error(415, "UnsupportedMediaTypeError : " + msg, report, fileName, lineNum);
		},
		NotAcceptable: function(msg, report, fileName, lineNum) {
			return this.Error(406, "NotAcceptableError : " + msg, report, fileName, lineNum);
		},
		Unauthorized: function(msg, report, fileName, lineNum) {
			return this.Error(401, "UnauthorizedError : " + msg, report, fileName, lineNum);
		}
	};
	return errors;
});