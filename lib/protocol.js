/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require"], function (require) {

	return function(deep){
    //________________________________________________________________________________________
    if (typeof requirejs !== 'undefined')
        requirejs.onError = function (err) {
            console.log('requirejs OnError : ' + err);
            console.log(err.requireType);
            if (err.requireType === 'timeout')
                console.log('modules: ' + err.requireModules);
            //throw err;
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

    deep.protocol.getStoreHandler = function(protocol, opt)
    {
        //console.log("deep.protocol.getStoreHandler : protocol : ", protocol);
        var handler = {
            method:"get",
            store:null
        };
        opt = opt || {};
        if(protocol._deep_ocm_)
            protocol = protocol();
        if(typeof protocol === 'object')
            handler.store = protocol;
        else if(deep.protocols[protocol])
            handler.store = deep.protocols[protocol];
        else
        {
            var splitted = protocol.split(".");
            handler.store = deep.protocols[splitted.shift()];
            if(!handler.store)
                return deep.when(deep.errors.Store("no store found with : "+protocol));
            handler.method = splitted.shift();
            if(!handler.store[handler.method])
                return deep.when(deep.errors.Store("no method found in store with : "+protocol));
        }
        if(handler.store._deep_ocm_ && !opt.ignoreOCM)
            handler.store = handler.store();
        if(typeof handler.store === 'function')
            handler.store = {
                _deep_store_:true,
                get:handler.store
            };
        if(handler.store.init && !opt.ignoreInit)
            return deep.when(handler.store.init())
            .done(function(){
                return handler;
            });
        return deep.when(handler);
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
        // console.log("parse request : ", request);
        var protoIndex = request.substring(0,50).indexOf("::");
        var protoc = null;
        var uri = request;
        var store = null;
        if (protoIndex > -1) {
            protoc = request.substring(0, protoIndex);
            uri = request.substring(protoIndex + 2);
        }
        //console.log("protoco found : ", protoc, " - uri : ", uri);
        //var queryThis = false;
        if (request[0] == '#' || protoc == "first" || protoc == "last" || protoc == "this") {
            store = deep.protocol.getStoreHandler(deep.protocols.dq);
          //  queryThis = true;
        } else if (!protoc) {
            //console.log("no protocol : try extension");
            var founded = deep.extensions.some(function (storez)
            {
                if (!storez.extensions)
                    return;
                for (var j = 0; j < storez.extensions.length; ++j)
                {
                    var extension = storez.extensions[j];
                    if (uri.match(extension)) {
                        store = storez.store;
                        break;
                    }
                }
                if (store)
                    return true;
                return false;
            });
            if(founded)
                store = deep.protocol.getStoreHandler(store);
        }
        else
            store = deep.protocol.getStoreHandler(protoc);
        //console.log("parseRequest : protocol used : ",protoc, " - uri :",uri);
        //console.log("parseRequest : store : ", store);
        var res = {
            _deep_request_: true,
            request: request,
            store: store,
            protocol: protoc,
            uri: uri
        };
        return res;
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
     * if request is not a string : will just return request
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
        if (!infos.store && !infos.protocol)
            return deep.when(request);
        var doAction = function(storeHandler){
            var res = storeHandler.store[storeHandler.method](infos.uri, options);
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
        };
        return deep.when(infos.store)
        .done(doAction);
    };
    // ___________________________________________________________________________ BASICAL PROTOCOLES
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
                //console.log("deep.stores.queryThis : ", request, " - root ? ", entry.root)

                var infos = request;
                if (typeof infos === 'string')
                    infos = deep.utils.parseRequest(infos);
                if (infos.uri[0] == '#')
                    infos.uri = infos.uri.substring(1);
                var res = null;
                options = options || {};
                options.keepCache = false;
                //console.log("uri : ", infos.uri);
                if (infos.uri.substring(0, 3) == "../") {
                    infos.uri = ((entry.path != "/") ? (entry.path + "/") : "") + infos.uri;
                    //console.log("queryThis with ../ start : ",root.value)
                    res = deep.query(root, infos.uri, options);
                    //console.log("res : ",res);
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
                    //console.log("require get error : ", err);
                    def.reject(err);
                });
            } catch (e) {
                //console.log("require get errors catched : ", e);
                def.reject(e);
            }
            return def.promise();
        },
        instance: function (path, options) {
            return deep.protocols.js(path, options)
                .done(function (Cl) {
                if (typeof Cl === 'function')
                    return new Cl();
                //console.log("deep.stores.instance  : could not instanciate : "+JSON.stringify(id));
                return deep.errors.Internal("deep.protocols.instance  : could not instanciate : " + JSON.stringify(path));
            });
        }
    };
};
});

