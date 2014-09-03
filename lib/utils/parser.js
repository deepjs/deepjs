/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "./path", "../utils"], function(require, dppaths, utils){
	var outputToString = function() {
		return "?" + utils.toQueryString(this);
	};

	var queryStringReg1 = /\+/g;
	utils.parseQueryString = function(q) {
		var query = q;
		if (q[0] == "?")
			q = q.substring(1);
		q = q.replace(queryStringReg1, ' ');
		var x = q.split('&'),
			i, name, t, value, entry, output = {};
		for (i = 0, len = x.length; i < len; i++) {
			t = x[i].split('=', 2);
			if (t.length > 1)
				value = unescape(t[1]);
			else
				value = true;
			name = unescape(t[0]);
			dppaths.toPath(output, name, value, ".", true);
		}
		//output.toString = outputToString;
		//console.log("query string : ", output, ""+output);
		return output;
	};

	utils.toQueryString = function(obj, prefix) {
		var str = [],
			env = null;
		if (obj.forEach)
			for (var i = 0, len = obj.length; i < len; ++i) {
				env = encodeURIComponent(obj[i]);
				str.push(encodeURIComponent(prefix) + ((env == "true") ? "" : ("=" + env)));
			} else
			for (var p in obj) {
				if (p == 'toString')
					continue;
				var k = prefix ? prefix + "." + p : p,
					v = obj[p];
				if (typeof v == "object")
					str.push(utils.toQueryString(v, k));
				else {
					env = encodeURIComponent(v);
					str.push(encodeURIComponent(k) + ((env == "true") ? "" : ("=" + env)));
				}
			}
		return str.join("&");
	};


	//_________________________________________________ HTTP RELATED

	utils.parseJson = function(body) {
		//console.log("Parsing JSON body ", body);
		if (typeof body === 'string')
			return JSON.parse(body);
		else
			return body;
	};

	utils.parseBody = function(body, headers) {

		if (typeof body === 'undefined' || body === null)
			return null;
		var res = body;
		if (res instanceof Array) {
			res = "";
			body.forEach(function(b) {
				res += b.toString();
			});
		}
		body = res;

		var contentType = headers["content-type"] || headers["Content-Type"] || "application/json";

		contentType = contentType.split(";")[0];
		//console.log("deep.utils.parseBody : type : ", contentType, " - ", body)
		try {
			switch (contentType) {
				case "application/json-rpc":
					return utils.parseJson(body);
				case "application/json":
					return utils.parseJson(body);
				case "application/javascript": // TODO : should be parsed by json-extended parser
					return utils.parseJson(body);
				default:
					return body;
			}
		} catch (e) {
			return new Error("error while parsing body : " + e.toString());
		}
	};

	function parseUri(str) {
		var o = parseUri.options,
			m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
			uri = {},
			i = 14;
		while (i--)
			uri[o.key[i]] = m[i] || "";
		uri[o.q.name] = {};
		uri[o.key[12]].replace(o.q.parser, function($0, $1, $2) {
			if ($1) uri[o.q.name][$1] = $2;
		});
		return uri;
	}

	parseUri.options = {
		strictMode: true,
		key: ["href", "protocol", "host", "userInfo", "user", "password", "hostname", "port", "relative", "pathname", "directory", "file", "search", "hash"],
		q: {
			name: "query",
			parser: /(?:^|&)([^&=]*)=?([^&]*)/g
		},
		parser: {
			strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
			loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
		}
	};

	utils.parseURL = function(url) {
		var obj = parseUri(url);
		if (obj.search)
			obj.search = "?" + obj.search;
		obj.path = obj.pathname + obj.search;
		return obj;
	};



});