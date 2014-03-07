/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require"], function (require) {
return function(deep)
{
    if (typeof requirejs !== 'undefined')
        requirejs.onError = function (err) {
            deep.utils.dumpError(err);
            console.log(err.requireType);
            if (err.requireType === 'timeout')
                console.log('modules: ' + err.requireModules);
    };
     /**
     * get or assign protocol
     */
    deep.protocol = function (name, ctrl) {
        if(ctrl)
        {
            deep.protocols[name] = ctrl;
            return ctrl;
        }
        return deep.protocols[name];
    };
    //_______________________________________________________________________________ GET/GET ALL  REQUESTS

    deep.protocol.parse = function(protocol, opt)
    {
        var handler = {
            //protocol:protocol,
            method:"get",
            provider:null
        };
        opt = opt || {};
        if(protocol._deep_ocm_)
            protocol = protocol();
        if(typeof protocol === 'object')
            handler.provider = protocol;
        else
        {
            var argsPresence = protocol.indexOf("(");
            if(argsPresence > -1)
            {
                var parenthesisRes = deep.utils.catchParenthesis(protocol.substring(argsPresence));
                protocol = protocol.substring(0,argsPresence);
                if(parenthesisRes)
                {
                    var rangeSplit = parenthesisRes.value.split(",");
                    handler.range = { start:parseInt(rangeSplit[0], 10), end:parseInt(rangeSplit[1], 10) };
                    handler.method = "range";
                }
            }
            if(deep.context.protocols && deep.context.protocols[protocol])
                handler.provider = deep.context.protocols[protocol];
            else if(deep.protocols[protocol])
                handler.provider = deep.protocols[protocol];
            else
            {
                var splitted = protocol.split(".");
                handler.provider = deep.protocols[splitted[0]];
                if(!handler.provider)
                    return deep.errors.Protocol("no provider found with : "+protocol);
                handler.method = splitted[1];
            }
        }
        if(handler.provider._deep_ocm_ && !opt.ignoreOCM)
            handler.provider = handler.provider();
        if(typeof handler.provider === 'function' && handler.method == 'get')
            handler.provider = {
                _deep_store_:true,
                get:handler.provider
            };
        else if(!handler.provider[handler.method])
            return deep.errors.MethodNotAllowed("no method found in provider with : "+protocol);

        if(handler.provider.init && !opt.ignoreInit)
            return deep.when(handler.provider.init())
            .done(function(){
                return handler;
            });
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
    deep.utils.parseRequest = function (request, options) {
		if(!request)
			throw deep.errors.Error(500, "request parsing error : request undefined");
        if(request[0] == '<')
            return { _deep_request_:true, request:request, uri:request };
        var protoIndex = request.substring(0,50).indexOf("::");
        var protoc = null;
        var uri = request;
        var handler = null;
        if (protoIndex > -1) {
            protoc = request.substring(0, protoIndex);
            uri = request.substring(protoIndex + 2);
        }
        else
        {
            /*var founded = deep.extensions.some(function (storez)
            {
                if (!storez.extensions)
                    return false;
                for (var j = 0; j < storez.extensions.length; ++j)
                {
                    var extension = storez.extensions[j];
                    if (uri.match(extension)) {
                        handler = storez.store;
                        break;
                    }
                }
                if (handler)
                    return true;
                return false;
            });
            if(founded)
                handler = deep.protocol.parse(handler);*/   
            return {
                _deep_request_: true,
                request: request,
                handler:null,
                protocol: null,
                uri: uri
            };
        }
        var range = null;
        if (request[0] == '#' || protoc == "this") {
            handler = deep.protocol.parse(deep.protocols.dq);
        }
        else
            handler = deep.protocol.parse(protoc);
        return {
            _deep_request_: true,
            request: request,
            handler:handler,
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
    deep.getAll = function (requests, options) {
        var alls = [];
        requests.forEach(function (request) {
            //console.log("get all : ", request, options);
            alls.push(deep.get(request, options));
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
    deep.get = function (request, options) {
        if (!request || (typeof request !== "string" && !request._deep_request_))
            return deep.when(request);
        options = options || {};
        var infos = request;
        if (typeof infos === 'string')
            infos = deep.utils.parseRequest(request, options);
        var res = null;
        if (!infos.handler && !infos.protocol)
            return deep.when(request);
        return deep.when(infos.handler)
        .done(function(handler){
            var res = null;
            if(handler.range)
                res = handler.provider.range(handler.range.start, handler.range.end, infos.uri, options);
            else
                res = handler.provider[handler.method](infos.uri, options);
            if (options.wrap)
            {
                return deep.when(res)
                .done(function (res) {
                    if (options.wrap.result) {
                        if (typeof options.wrap.result.push === 'function')
                            options.wrap.result.push(res);
                        else
                            options.wrap.result = [].concat(options.wrap.result);
                    } else
                        options.wrap.result = res;
                    return options.wrap;
                });
            }
            else
                return res;
        });
    };
    // ___________________________________________________________________________ CORE PROTOCOLS
    deep.protocols = {
        /**
         * deep-query protocol :
         * for code-sheet usage.
         * 
         * options must contain the entry from where start query
         * @param  {[type]} request [description]
         * @param  {[type]} options [description]
         * @return {[type]}         [description]
         */
        dq:{
            get: function dqGet(request, options) {
                var entry = options.entry;
                if(!entry)
                    return undefined;
                var root = entry.root || entry;
                var infos = request;
                if (typeof infos === 'string')
                    infos = deep.utils.parseRequest(infos);
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
        js: function (path, options) {
            if (typeof path === 'object')
                path = path.uri;
            var def = deep.Deferred();
            try {
                require([path], function (obj) {
                    def.resolve(obj);
                }, function (err) {
                    def.reject(err);
                });
            } catch (e) {
                def.reject(e);
            }
            return def.promise();
        },
        instance: function (path, options) {
            return deep.protocols.js(path, options)
                .done(function (Cl) {
                if (typeof Cl === 'function')
                    return new Cl();
                return deep.utils.copy(Cl);
            });
        }
    };
};
});

