/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "./utils", "./errors"], function(require, utils, errors) {
	if (typeof requirejs !== 'undefined')
		requirejs.onError = function(err) {
			utils.dumpError(err);
			console.log(err.requireType);
			if (err.requireType === 'timeout')
				console.log('modules: ' + err.requireModules);
		};
	var proto = {};

	/**
	 * get or assign protocol
	 */
	proto.protocol = function(name, ctrl) {
		if (ctrl) {
			proto.protocols[name] = ctrl;
			return ctrl;
		}
		//console.log("*************** Protocols : ", proto.protocols[name])
		var protoc;
		if (typeof name === 'object' || name._deep_ocm_)
			protoc = name;
		if (!protoc && deep.context.protocols) {
			//console.log("***************Context Protocols : ", deep.context.protocols[name])
			protoc = deep.context.protocols;
			if (protoc._deep_ocm_)
				protoc = protoc();
			protoc = protoc[name];
		}
		if (!protoc)
			protoc = deep.protocols[name];
		if (!protoc)
			return deep.errors.Protocol("no provider found with : " + name);
		if (protoc._deep_ocm_)
			return protoc.flatten()
				.done(function(protoc) {
					protoc = protoc();
					//console.log("Store prepare OCM flattened : ", deep.context.modes, proto);
					if (protoc && protoc.init) {
						this.done(function() {
							return protoc;
						});
						return protoc.init();
					}
					return protoc || deep.errors.Protocol("no provider found with : " + name);
				});
		if (protoc.init)
			return deep.when(protoc.init())
				.done(function() {
					return protoc;
				});
		return protoc;
	};
	//_______________________________________________________________________________ GET/GET ALL  REQUESTS


	var parseProtocol = utils.parseProtocol = function(protocol, output) {
		output = output || {};
		var argsPresence = protocol.indexOf("(");
		if (argsPresence > -1) {
			var parenthesisRes = utils.catchParenthesis(protocol.substring(argsPresence));
			protocol = protocol.substring(0, argsPresence);
			if (parenthesisRes) {
				output.args = parenthesisRes.value.split(",");
				// output.method = "range";
			}
		}
		var splitted = protocol.split(".");
		if (splitted.length == 2) {
			protocol = splitted[0];
			output.method = splitted[1];
		}
		output.protocol = protocol;
		return output;
	};


	/**
	 * parse 'retrievable' string request (e.g. "json::test.json")
	 * @for deep
	 * @method parseRequest
	 * @static
	 * @param  {String} request
	 * @return {Object} infos an object containing parsing result
	 */
	utils.parseRequest = function(request) {
		if (!request || request[0] == '<')
			return request;
		var protoIndex = request.substring(0, 50).indexOf("::");
		var protoc = null;
		var uri = request;
		if (protoIndex > -1) {
			protoc = request.substring(0, protoIndex);
			uri = request.substring(protoIndex + 2);
		} else
			return request;
		if (request[0] == '#' || protoc == "this")
			protoc = "dq";
		var response = {
			_deep_request_: true,
			request: request,
			protocol: protoc,
			provider: null,
			method: "get",
			uri: uri,
			execute: function(options) {
				var self = this;
				// console.log("request execute : ", this);
				this.provider = deep.protocol(this.protocol);
				if (!this.provider)
					return deep.errors.Protocol("no provider found with : " + this.protocol);
				return deep.when(this.provider)
					.done(function(provider) {
						if (!provider[self.method])
							return deep.errors.Protocol("no associate method found in provider " + self.protocol + " with : " + self.method);
						// if (self.method === "range")
							// return provider.range(self.range.start, self.range.end, self.uri, options);
						if(self.args)
						{
							var args = self.args.slice();
							args.push(self.uri, options);
							return provider[self.method].apply(provider, args);
						}
						return provider[self.method](self.uri, options);
					});
			}
		};
		parseProtocol(protoc, response);
		return response;
	};

	/**
	 * retrieve an array of retrievable strings (e.g. "json::test.json")
	 * if request is not a string : will just return request
	 * @for deep
	 * @static
	 * @method getAll
	 * @param  {String} requests a array of strings to retrieve
	 * @param  {Object} options (optional)
	 * @return {deep.Chain} a handler that hold result
	 */
	proto.getAll = function(requests, options) {
		var alls = [];
		if (!requests.forEach)
			requests = [requests];
		requests.forEach(function(request) {
			//console.log("get all : ", request, options);
			alls.push(proto.get(request, options));
		});
		return deep.all(alls);
	};

	/**
	 * retrieve request (if string in retrievable format) (e.g. "json::test.json")
	 * perform an http get
	 * if request is not a string OR string doesn't start with protocols 'xxx::' : will just return request
	 * @for deep
	 * @static
	 * @method get
	 * @param  {String} request a string to retrieve
	 * @param  {Object} options (optional)
	 * @return {deep.Chain} a handler that hold result
	 */
	proto.get = function(request, options) {
		var requestType = typeof request;
		if (!request || (requestType !== "string" && !request._deep_request_))
			return deep.when(request);
		options = options || {};
		if (requestType === 'string')
			request = utils.parseRequest(request);
		if (!request._deep_request_)
			return deep.when(request);
		return deep.when(request.execute(options))
			.done(function(res) {
				if (options.wrap) {
					if (options.wrap.result) {
						if (typeof options.wrap.result.push === 'function')
							options.wrap.result.push(res);
						else
							options.wrap.result = [].concat(options.wrap.result);
					} else
						options.wrap.result = res;
					return options.wrap;
				} else
					return res;
			});
	};
	// ___________________________________________________________________________ CORE PROTOCOLS
	proto.protocols = {
		/**
		 * deep-query protocol :
		 * for code-sheet usage.
		 *
		 * options must contain the entry from where start query
		 * @param  {[type]} request [description]
		 * @param  {[type]} options [description]
		 * @return {[type]}         [description]
		 */
		dq: {
			get: function (request, options) {
				options = options || {};
				options.keepCache = false;
				var entry = options.entry;
				if (!entry)
					return undefined;
				var root = entry.root || entry,
					uri = request;
				if (request._deep_request_)
					uri = request.uri;
				if (uri[0] == '#')
					uri = uri.substring(1);
				var res = null;
				if (uri.substring(0, 3) == "../") {
					uri = ((entry.path != "/") ? (entry.path + "/") : "") + uri;
					res = deep.query(root, uri, options);
				} else if (uri[0] == '/')
					res = deep.query(root, uri, options);
				else
					res = deep.query(entry, uri, options);
				return res;
			}
		},
		js: {
			get: function(path, options) {
				if (typeof path === 'object')
					path = path.uri;
				//path = (deep.context.cwd || "")+path;
				var def = deep.Deferred();
				try {
					require([path], function(obj) {
						def.resolve(obj);
					}, function(err) {
						def.reject(err);
					});
				} catch (e) {
					def.reject(e);
				}
				return def.promise();
			}
		},
		instance: {
			get: function(path, options) {
				return proto.protocols.js.get(path, options)
				.done(function(Cl) {
					if (typeof Cl === 'function')
						return new Cl();
					return utils.copy(Cl);
				});
			}
		},
		dummy: {
			get: function(request, options) {
				// console.log("DUMMY : request : ", request);
				return "You say '" + request + "' through dummy protocol";
			}
		},
		eval: {
			get: function(request, options) {
				return eval(request);
			}
		}

	};
	return proto;
});