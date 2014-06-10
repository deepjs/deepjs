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
		if (deep.context.protocols) {
			//console.log("***************Context Protocols : ", deep.context.protocols[name])
			var protocs = deep.context.protocols;
			if (protocs._deep_ocm_)
				protocs = protocs();
			if (protocs[name])
				return protocs[name];
		}
		if (proto.protocols[name])
			return proto.protocols[name];
		return null;
	};

	var prepare = proto.protocol.prepare = function(proto)
    {
    	// console.log("prepare : ", proto);
        if(typeof proto === 'string')
            proto = deep.protocol(proto);
        if(!proto)
            return errors.Protocol("no protocol provided for preparation.");
        //console.log("PREPARE CONTEXT --------> ", deep.context.modes, proto._deep_ocm_);
        if(proto._deep_ocm_)
            return proto.flatten()
            .done(function(proto){
                proto = proto();
                //console.log("Store prepare OCM flattened : ", deep.context.modes, proto);
                if(proto.init)
                    return proto.init() || proto;
                return proto;
            });
        if(proto.init)
            return proto.init() || proto;
        return proto;
    };
	//_______________________________________________________________________________ GET/GET ALL  REQUESTS


	proto.protocol.parse = function(protocol, opt) {
		var handler = {
			//protocol:protocol,
			_deep_protocol_handler_:true,
			method: "get",
			provider: null
		};
		opt = opt || {};
		if (protocol._deep_ocm_)
			protocol = protocol();
		if (typeof protocol === 'object')
			handler.provider = protocol;
		else {
            var protocs = deep.context.protocols || {};
            if (protocs._deep_ocm_)
                protocs = protocs();
			var argsPresence = protocol.indexOf("(");
			if (argsPresence > -1) {
				var parenthesisRes = utils.catchParenthesis(protocol.substring(argsPresence));
				protocol = protocol.substring(0, argsPresence);
				if (parenthesisRes) {
					var rangeSplit = parenthesisRes.value.split(",");
					handler.range = {
						start: parseInt(rangeSplit[0], 10),
						end: parseInt(rangeSplit[1], 10)
					};
					handler.method = "range";
				}
			}
			handler.provider = protocs[protocol] || proto.protocols[protocol];
			if (!handler.provider)
            {
				var splitted = protocol.split(".");
				if(splitted.length == 2)
				{
	                protocol = splitted[0];
					handler.provider = protocs[protocol] || proto.protocols[protocol];
					handler.method = splitted[1];
				}
			}
		}
		if (!handler.provider)
			return deep.errors.Protocol("no provider found with : " + protocol);
		if(typeof handler.provider === 'function')
			handler.provider = {
				get:handler.provider
			};
		handler.protocol = protocol;
		return handler;
	};

	/**
	 * parse 'retrievable' string request (e.g. "json::test.json")
	 * @for deep
	 * @method parseRequest
	 * @static
	 * @param  {String} request
	 * @return {Object} infos an object containing parsing result
	 */
	utils.parseRequest = function(request, options) {
		if (!request)
			throw deep.errors.Error(500, "request parsing error : request undefined");
		if (request[0] == '<')
			return {
				_deep_request_: true,
				request: request,
				uri: request
			};
		var protoIndex = request.substring(0, 50).indexOf("::");
		var protoc = null;
		var uri = request;
		var handler = null;
		if (protoIndex > -1) {
			protoc = request.substring(0, protoIndex);
			uri = request.substring(protoIndex + 2);
		} else
			return {
				_deep_request_: true,
				request: request,
				uri: uri
			};
		if (request[0] == '#' || protoc == "this")
			protoc = "dq";
		return {
			_deep_request_: true,
			request: request,
			handler: proto.protocol.parse(protoc),
			protocol: protoc,
			uri: uri
		};
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
		if(!requests.forEach)
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
		if (!request || (typeof request !== "string" && !request._deep_request_))
			return deep.when(request);


		options = options || {};
		var infos = request;
		if (typeof infos === 'string')
			infos = utils.parseRequest(request, options);

		var res = null;
		var handler = infos.handler;
		if (!handler && !infos.protocol)
			return deep.when(request);

		if(handler && handler instanceof Error)
			return handler;
		
		return deep.when(prepare(handler.provider))
		.done(function(provider) {
			var res = null;
			if (handler.range)
				res = provider.range(handler.range.start, handler.range.end, infos.uri, options);
			else
				res = provider[handler.method](infos.uri, options);
			if (options.wrap) {
				return deep.when(res)
					.done(function(res) {
						if (options.wrap.result) {
							if (typeof options.wrap.result.push === 'function')
								options.wrap.result.push(res);
							else
								options.wrap.result = [].concat(options.wrap.result);
						} else
							options.wrap.result = res;
						return options.wrap;
					});
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
			get: function dqGet(request, options) {
				var entry = options.entry;
				if (!entry)
					return undefined;
				var root = entry.root || entry;
				var infos = request;
				if (typeof infos === 'string')
					infos = utils.parseRequest(infos);
				if (infos.uri[0] == '#')
					infos.uri = infos.uri.substring(1);
				var res = null;
				options = options || {};
				options.keepCache = false;
				if (infos.uri.substring(0, 3) == "../") {
					infos.uri = ((entry.path != "/") ? (entry.path + "/") : "") + infos.uri;
					res = deep.query(root, infos.uri, options);
				} else if (infos.uri[0] == '/')
					res = deep.query(root, infos.uri, options);
				else
					res = deep.query(entry, infos.uri, options);
				return res;
			}
		},
		js: {
			get:function(path, options) {
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
		instance:{
			get:function(path, options) {
				return proto.protocols.js.get(path, options)
				.done(function(Cl) {
					if (typeof Cl === 'function')
						return new Cl();
					return utils.copy(Cl);
				});
			}
		},
		dummy:{
			get:function(request, options)
			{
				// console.log("DUMMY : request : ", request);
				return "You say '"+request+"' through dummy protocols";
			}
		}
	};
	return proto;
});