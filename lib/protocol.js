/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "./utils", "./errors", "./promise", "./context", "./utils/path", "./utils/string", "./utils/schema"], function(require, utils, errors, Prom, context) {
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
		var protoc;
		if (typeof name === 'object' || name._deep_ocm_)
			protoc = name;
		if (!protoc && Prom.Promise.context.protocols) 
			protoc = Prom.Promise.context.protocols[name];
		if (!protoc)
			protoc = proto.protocols[name];
		if (!protoc)
			return errors.Protocol("no provider found with : " + name);
		if (protoc._deep_ocm_)
			return protoc.flatten()
				.done(function(protoc) {
					protoc = protoc();
					if (protoc && protoc.init) {
						this.when(protoc);
						return protoc.init();
					}
					return protoc || errors.Protocol("no provider found with : " + name);
				});
		if (protoc.init)
			return Prom.when(protoc.init()).when(protoc);
		return protoc;
	};
	//_______________________________________________________________________________ GET/GET ALL  REQUESTS


	var parseProtocol = utils.parseProtocol = function(protocol, output) {
		output = output || {};
		var argsPresence = protocol.indexOf("(");
		if (argsPresence > -1) {
			var parenthesisRes = utils.catchParenthesis(protocol.substring(argsPresence));
			protocol = protocol.substring(0, argsPresence);
			if (parenthesisRes)
				output.args = parenthesisRes.value.split(",");
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
				this.provider = proto.protocol(this.protocol);
				if (!this.provider)
					return errors.Protocol("no provider found with : " + this.protocol);
				return Prom.when(this.provider)
					.done(function(provider) {
						if (!provider[self.method])
							return errors.Protocol("no associate method found in provider " + self.protocol + " with : " + self.method);
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
	 * @return {deep.NodesChain} a handler that hold result
	 */
	proto.getAll = function(requests, options) {
		var alls = [];
		if (!requests.forEach)
			requests = [requests];
		requests.forEach(function(request) {
			//console.log("get all : ", request, options);
			alls.push(proto.get(request, options));
		});
		return Prom.all(alls);
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
	 * @return {deep.NodesChain} a handler that hold result
	 */
	proto.get = function(request, options) {
		var requestType = typeof request;
		if (!request || (requestType !== "string" && !request._deep_request_))
			return Prom.when(request);
		options = options || {};
		if (requestType === 'string')
			request = utils.parseRequest(request);
		if (!request._deep_request_)
			return Prom.when(request);
		return Prom.when(request.execute(options))
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
		js: {
			get: function(path, options) {
				if (typeof path === 'object')
					path = path.uri;
				//path = (Prom.Promise.context.cwd || "")+path;
				var prom = new Prom.Promise();
				try {
					require([path], function(obj) {
						prom.resolve(obj);
					}, function(err) {
						prom.reject(err);
					});
				} catch (e) {
					prom.reject(e);
				}
				return prom;
			}
		},
		text:{
			get:function(path, options){
				return proto.protocols.js.get("text!"+path);
			}
		},
		instance: {
			get: function(path, options) {
				return proto.protocols.req.get(path, options)
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
		},
		context: {
			get:function(request, options)
			{
				return utils.fromPath(Prom.Promise.context, request);
			}
		}
	};
	return proto;
});