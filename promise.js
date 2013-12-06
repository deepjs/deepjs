/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"], function PromiseDefine(require){
return function(deep)
{
        /**
     * return a promise that will be fullfilled when arg are ready (resolve or immediat)
     * @for deep
     * @static
     * @method when
     * @param  {Object} arg an object to waiting for
     * @return {deep.when} a promise
     */
    deep.when = function deepPromise(arg) {
        //console.log("deep.when : ", arg)
        if (typeof arg === "undefined" || arg === null)
            return deep.when.immediate(arg);
        if(arg._deep_chain_)
            return arg.promise();
        if (typeof arg.then === 'function') //any promise compliant object
        {
            //if (arg._deep_promise_)
              //  return arg;
            //console.log("doing simple promise (no promise and then is present) on : ", arg);
            var def = deep.Deferred();
            arg.then(function (s) {
                def.resolve(s);
            }, function (e) {
                def.reject(e);
            });
            return def.promise();
        }
        if (typeof arg.promise === "function") // deep.Deferred, deep.Chain and jquery deferred case
            return arg.promise();
        if (typeof arg.promise === 'object')
            return arg.promise;
        return deep.when.immediate(arg);
    };
    deep.when.immediate = function (result) {
        var prom = new deep.when();
        return prom._start(result);
    };

    /**
     * return a promise that will be fullfilled when all args are ready (resolve or immediat)
     * @for deep
     * @static
     * @method all
     * @param  {Object} arg an array of objects to waiting for
     * @return {deep.when} a promise
     */
    deep.all = function deepAll() {
        var arr = [];
        for (var i  = 0; i < arguments.length; ++i)
            arr = arr.concat(arguments[i]);
        if (arr.length === 0)
            return deep.when.immediate([]);
        var def = deep.Deferred();
        var count = arr.length;
        var c = 0,
            d = -1;
        var res = [];
        var rejected = false;
        arr.forEach(function (a) {
            if (def.rejected)
                return;
            var i = d + 1;
            if (!a || (!a.then && !a.promise)) {
                if (a instanceof Error) {
                    rejected = true;
                    if (!def.rejected && !def.resolved && !def.canceled)
                        def.reject(a);
                    return;
                }
                res[i] = a;
                c++;
                if (c == count)
                    def.resolve(res);
            } else
                deep.when(a).then(function (r) {
                    if (r instanceof Error) {
                        if (!def.rejected && !def.resolved && !def.canceled)
                            def.reject(r);
                        return;
                    }
                    res[i] = r;
                    c++;
                    if (c == count)
                        def.resolve(res);
                }, function (error) {
                    if (!def.rejected && !def.resolved && !def.canceled)
                        def.reject(error);
                });
            d++;
        });
        return def.promise();
    };

    //_____________________________________________________________________ DEFERRED

    /**
     * A deep implementation of Deferred object (see promise on web)
     * @class deep.Deferred
     * @constructor
     */
    deep.Deferred = function deepDeferred() {
        if (!(this instanceof deep.Deferred))
            return new deep.Deferred();
        this._context = deep.context;
        this._promises = [];
        this._deep_deferred_ = true;
        return this;
    };

    deep.Deferred.prototype = {
        _deep_deferred_: true,
        _promises: null,
        rejected: false,
        resolved: false,
        canceled: false,
        _success: null,
        _error: null,
        ended:function(){
            return this.rejected || this.resolved || this.canceled;
        },
        /**
         * resolve the Deferred and so the associated promise
         * @method resolve
         * @param  {Object} argument the resolved object injected in promise
         * @return {deep.Deferred} this
         */
        resolve: function resolveDef(argument) {
            //console.log("deep.Deferred.resolve : ", argument);
            if (this.rejected || this.resolved || this.canceled)
                throw new Error("DeepDeferred (resolve) has already been ended ! could not recolve anymore.");
            if (argument instanceof Error)
                return this.reject(argument);
            this._success = argument;
            this.resolved = true;
            this._promises.forEach(function (promise) {
                promise._start(argument);
            });
        },
        /**
         * reject the Deferred and so the associated promise
         * @method reject
         * @param  {Object} argument the rejected object injected in promise
         * @return {deep.Deferred} this
         */
        reject: function rejectDef(argument) {
            //	console.log("DeepDeferred.reject");
            if (this.rejected || this.resolved || this.canceled)
                throw new Error("DeepDeferred has already been ended ! could not reject anymore.");
            this._error = argument;
            this.rejected = true;
            this._promises.forEach(function (promise) {
                promise._start(null, argument);
            });
        },
        /**
         * return a promise for this deferred
         * @method promise
         * @return {deep.when}
         */
        promise: function promiseDef() {
            var prom = new deep.when();
            //console.log("deep2.Deffered.promise : ", prom, " r,r,c : ", this.rejected, this.resolved, this.canceled)
            if (this.resolved || this.rejected || this.canceled)
                return prom._start(this._success, this._error);
            this._promises.push(prom);
            return prom;
        }
    };

    deep.when = function deepPromiseConstructor(options) {
        options = options || {};
        this._context = deep.context;
        this._queue = [];
        this.oldQueue = null;
        this._success = options._success || null;
        this._error = options._error || null;
        this._running = false;
        this._executing = false;
        this._initialised = false;
        this._rethrow = (typeof options.rethrow !== "undefined") ? options.rethrow : deep.rethrow;
        this._deep_promise_ = true;
    };

    deep.when.prototype = {
        _forceHandle: deep.utils.forceHandle,
        _queue: null,
        _success: null,
        _error: null,
        _running: false,
        _executing: false,
        _initialised: false,

        _start: function chainStart(s, e) {
            this._initialised = true;
            this._success = (s instanceof Error) ? null : s;
            this._error = (s instanceof Error) ? s : e;
            this._forceHandle();
            return this;
        },

        catchError: function (arg) {
            var self = this;
            if (self._initialised) {
                var func = function catchErrorHandler(s, e) {
                    self._rethrow = (typeof arg !== 'undefined') ? !arg : false;
                };
                deep.utils.addInChain.apply(this, [func]);
            } else
                self._rethrow = (typeof arg !== 'undefined') ? !arg : false;
            return this;
        },

        pushHandlerTo: function (array) {
            var self = this;
            if (self._initialised) {
                var func = function (s, e) {
                    array.push(self);
                };
                deep.utils.addInChain.apply(this, [func]);
            } else
                array.push(self);
            return this;
        },

        condition: function (cond, manager) {

            /*
                equivalent to (without loading manager if needed)
                .always(function(s,e){
                    if(cond)
                        manager.apply(self)
                })

                .condition(deep.mode.dev, "dev::/dumpError")
                

                deep(1)
                .condition(deep.mode.dev, function(){
                    this.fail(function(e){
                        // handle error for dev
                    })
                })

                .each("swig::./items.tpl", req.accept.contain("html"))
             */

            var self = this;
            var func = function (s, e) {        // WARNING : it's an always
                if(typeof cond === 'function')
                    cond = cond();
                if(!cond)
                    return;
                var applyCondition = function(manager)
                {
                    self.oldQueue = self._queue;
                    self._queue = [];
                    var res = manager.call(self, s, e);
                    if (res === self)
                        return;
                    return res;
                };
                if (typeof manager === 'string')
                {
                    return deep.when(deep.get(manager))
                    .done(function (manager){
                        if(cond)
                            return applyCondition(manager);
                    });
                }
                return applyCondition(manager);
            };
            deep.utils.addInChain.call(this, func);
            return this;
        },

        done: function chainDone(callBack) {
            if(!callBack)
                return this._success;
            var self = this;
            var func = function chainDoneHandle(s, e)
            {
                //console.log("deep.done : ",s,e)
                self.oldQueue = self._queue;
                self._queue = [];
                var a = callBack.apply(self, [s]);
                if (a === self)
                    return;
                return a;
            };
            func._isDone_ = true;
            return deep.utils.addInChain.apply(this, [func]);
        },

        fail: function chainFail(callBack) {
            if(!callBack)
                return this._error;
            var self = this;
            var func = function chainFailHandle(s, e) {
                self.oldQueue = self._queue;
                self._queue = [];
                var a = callBack.apply(self, [e]);
                if (a === self)
                    return;
                return a;
            };
            func._isFail_ = true;
            return deep.utils.addInChain.apply(this, [func]);
        },

        always: function chainAlways(callBack)
        {
            var self = this;
            var func = function chainAlwaysHandle(s, e) {
                self.oldQueue = self._queue;
                self._queue = [];
                var a = callBack.apply(self, [s, e]);
                if (a === self)
                    return;
                return a;
            };
            return deep.utils.addInChain.apply(this, [func]);
        },

        then: function chainThen(successCallBack, errorCallBack)
        {
            if (successCallBack)
                this.done(successCallBack);
            if (errorCallBack)
                this.fail(errorCallBack);
            return this;
        },

        // __________________________________________________ LOG
        /**
         *
         * log any provided arguments.
         * If no arguments provided : will log current success or error state.
         *
         * transparent true
         *
         * @method  log
         * @return {deep.Chain} this
         * @chainable
         */
        log: function chainLog() {
            var self = this;
            var args = Array.prototype.slice.call(arguments);
            var func = function chainLogHandle(s, e) {
                if (args.length === 0) {
                    if (e)
                    {
                        if (deep.debug)
                            deep.utils.dumpError(e);
                        else if (e.report)
                            args.push("deep.log : error : (" + e.status + "): ", e.message, e.report);
                        else
                            args.push("deep.log : error : (" + e.status + "): ", e.message);
                    }
                    else
                        args.push("deep.log : success : ", s);
                }
                console.log.apply(console, args);
            };
            return deep.utils.addInChain.apply(this, [func]);
        },
        // __________________________________________________ LOG
        /**
         *
         * log any chain errors
         *
         * @method  log
         * @return {deep.Chain} this
         * @chainable
         */
        logError: function chainLogError() {
            var self = this;
            var func = function chainLogHandle(s, e) {
                if (e)
                {
                    if (deep.debug)
                        deep.utils.dumpError(e);
                    else if (e.report)
                        args.push("deep.log : error : (" + e.status + "): ", e.message, e.report);
                    else
                        args.push("deep.log : error : (" + e.status + "): ", e.message);
                }
            };
            func._isFail_ = true;
            return deep.utils.addInChain.apply(this, [func]);
        },
        /**
         * will wait xxxx ms before contiuing chain
         *
         * transparent true
         *
         *
         * @chainable
         * @method delay
         * @param  {number} ms
         * @return {deep.Chain} this
         */
        delay: function chainDelay(ms) {
            var self = this;
            var func = function (s, e) {
                //console.log("deep.delay : ", ms)
                var def = deep.Deferred();
                setTimeout(function () {
                    console.log("deep.delay.end : ", ms);
                    def.resolve(undefined);
                }, ms);
                return def.promise();
            };
            func._isDone_ = true;
            return deep.utils.addInChain.apply(this, [func]);
        },

        /**
         * set key/value in current deep.context
         *
         * @chainable
         * @method context
         * @param  {String} key
         * @param  {*} value
         * @return {deep.Chain} this
         */
        context:function (key, val) {
            var self = this;
            var create = function (s, e) {
                if(!self._contextCopied)
                    deep.context = self._context = deep.utils.simpleCopy(self._context);
                self._contextCopied = true;
                self._context[key] = val;
            };
            if(!val)
            {
                if(key)
                    return self._context[key];
                return self._context;
            }
            create._isDone_ = true;
            return deep.utils.addInChain.call(this, create);
        },
        /**
         * log current deep.context. If key is provided : log only this property.
         *
         * @chainable
         * @method logContext
         * @param  {String} key (optional)
         * @return {deep.Chain} this
         */
        logContext: function (key) {
            var self = this;
            var func = function chainLogHandle(s, e) {
               if(key)
                    console.log("deep.chain.context."+key+" : ", self._context[key]);
                else
                    console.log("deep.chain.context : ", self._context);
            };
            return deep.utils.addInChain.apply(this, [func]);
        },
                /**
         * wait promise resolution or rejection before continuing chain
         *
         *  asynch
         *  transparent false
         *
         * @method  when
         * @param  {deep.when} prom the promise to waiting for
         * @chainable
         * @return {deep.Chain}
         */
        when: function (prom) {
            var self = this;
            var func = function (s, e) {
                return prom;
            };
            func._isDone_ = true;
            return deep.utils.addInChain.apply(this, [func]);
        },
        /**
         * equal test strict equality on each entry value against provided object
         *
         *  Chain Success injection : the valid report
         *  Chain Error injection : the unvalid report
         *
         *
         * @method  equal
         * @param  {*} obj      the object to test
         * @param  {Function}   optional. callBack a callBack to manage report
         * @chainable
         * @return {deep.Chain}        this
         */
        equal: function chainEqual(obj) {
            var self = this;
            var func = function (s,e) {
                //var toTest = deep.chain.val(self);
                var ok = deep.utils.deepEqual(s, obj);
                var report = {
                    equal: ok,
                    value: s,
                    needed: obj
                };
                if (ok)
                    return s;
                else
                    return deep.errors.PreconditionFail("deep.equal failed ! ", report);
            };
            func._isDone_ = true;
            deep.utils.addInChain.apply(this, [func]);
            return self;
        },

        /**
         * set current context modes. See OCM docs and Asynch context management.
         * @param  {String|Object} arg  if it's an object : will use it as a map. If it's a string : use it as key (need second arguments)
         * @param  {String} arg2 (optional) the value for the key (if provided)
         * @return {deep.Chain}        this
         */
        modes : function(arg, arg2)
        {
            // console.log("chain.mode : ", arguments, deep.context);
            var self = this;
            if(typeof arg === 'string')
            {
                var obj = {};
                obj[arg] = arg2;
                arg = obj;
            }
            var func = function(s,e)
            {
                if(!self._contextCopied)
                    deep.context = self._context = deep.utils.simpleCopy(self._context);
                self._contextCopied = true;

                for(var i in deep.context.modes)
                    if(!arg[i] && deep.context.modes.hasOwnProperty(i))
                        arg[i] = deep.context.modes[i];
                deep.context.modes = arg;
                return s;
                // console.log("deep.context.mode setted : ",deep.context.mode);  
            };
            func._isDone_ = true;
            deep.chain.addInChain.apply(self,[func]);
            return this;
        }
    };

}
});