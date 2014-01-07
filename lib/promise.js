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
     * @return {deep.Promise} a promise
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
        var prom = new deep.Promise();
        return prom._start(result);
    };

    /**
     * return a promise that will be fullfilled when all args are ready (resolve or immediat)
     * @for deep
     * @static
     * @method all
     * @param  {Object} arg an array of objects to waiting for
     * @return {deep.Promise} a promise
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

    //_____________________________________________________________________ PROMISED CHAIN MECANIC

    var addInChain = deep.utils.addInChain = function (handle) {
        var self = this;
        if (!this.oldQueue && self.deferred && self.deferred._promises && self.deferred._promises.length > 0)
            throw deep.errors.ChainEnded("you try to add handles in ended chain ! aborting and throw.");
        self._queue.push(handle);
        if (self._initialised && !self._running && !self._executing)
            self._forceHandle();
        return this;
    };

    var forceHandle = deep.utils.forceHandle = function forceChainHandle() {
        if (!this._initialised)
            return;
        var self = this;
        if (this.oldQueue) {
            this._queue = this._queue.concat(this.oldQueue);
            delete this.oldQueue;
        }

        if (self._queue.length > 0) {
            self._executing = true; //  synch flag
            while (!self._running) // while not asynch
            {
                var previousContext = deep.context;
                try {
                    if (previousContext !== self._context) {
                        if (previousContext && previousContext.suspend)
                            previousContext.suspend();
                        deep.context = self._context;
                        if (self._context && self._context.resume)
                            self._context.resume();
                    }
                    var next = self._queue.shift();
                    if (self._error)
                        while (next && next._isDone_)
                            next = self._queue.shift();
                    else
                        while (next && next._isFail_)
                            next = self._queue.shift();
                    if (!next)
                        break;

                    self._running = true; //  asynch flag
                    var res = next(self._success, self._error);
                    if (res && (res.then || res.promise)) {
                        deep.when(res)
                        .done(function (res) {
                            if (typeof res !== 'undefined') {
                                self._success = (res instanceof Error) ? null : res;
                                self._error = (res instanceof Error) ? res : null;
                            }
                            self._running = false; // asynch flag
                            if (!self._executing) // real asynch event
                                self._forceHandle();
                        })
                        .fail(function (e) {
                            self._running = false; // asynch flag
                            self._success = null;
                            self._error = e;
                            if (!self._executing) // real asynch event
                                self._forceHandle();
                        });
                    } else {
                        self._running = false;
                        if (typeof res !== 'undefined') {
                            self._success = (res instanceof Error) ? null : res;
                            self._error = (res instanceof Error) ? res : null;
                        }
                    }
                } catch (e) {
                    var msg = "Internal chain error : rethrow ? " + self._rethrow;
                    if(deep.debug)
                        console.error(msg);
                    if(deep.debug)
                        deep.utils.dumpError(e);
                    if (self.rethrow)
                        throw e;
                    self._success = null;
                    self._error = e;
                    self._running = false; // asynch flag
                    //self._executing = false;
                    //return forceHandle.call(this);
                } finally {
                    if (previousContext !== self._context) {
                        if (self._context && self._context.suspend)
                            self._context.suspend();
                        if (previousContext && previousContext.resume)
                            previousContext.resume();
                        deep.context = previousContext;
                    }
                    if (self.oldQueue) {
                        self._queue = self._queue.concat(self.oldQueue);
                        delete self.oldQueue;
                    }
                }
            }
            self._executing = false;
        }
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
         * @return {deep.Promise}
         */
        promise: function promiseDef() {
            var prom = new deep.Promise({ context:this._context});
            //console.log("deep2.Deffered.promise : ", prom, " r,r,c : ", this.rejected, this.resolved, this.canceled)
            if (this.resolved || this.rejected || this.canceled)
                return prom._start(this._success, this._error);
            this._promises.push(prom);
            return prom;
        }
    };

    deep.Promise = function deepPromiseConstructor(options) {
        options = options || {};
        this._context = options.context || deep.context;
        this._queue = [];
        this.oldQueue = null;
        this._success = options._success || null;
        this._error = options._error || null;
        this._rethrow = (typeof options.rethrow !== "undefined") ? options.rethrow : deep.rethrow;
        this._running = false;
        this._executing = false;
        this._initialised = false;
        this._deep_promise_ = true;
    };

    deep.Promise.prototype = {
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
            var self = this;
            //console.log("chain.mode : ", arg, arg2, deep.context.modes);

            if(typeof arg === 'string')
            {
                var obj = {};
                obj[arg] = arg2;
                arg = obj;
            }
            //console.log("chain.mode obj: ", arg);
            var func = function(s,e)
            {
                if(!self._contextCopied)
                    deep.context = self._context = deep.utils.simpleCopy(self._context);
                self._contextCopied = true;
                self._context.modes = deep.utils.simpleCopy(self._context.modes) || {};
                for(var i in arg)
                    self._context.modes[i] = arg[i];
                //console.log("deep.context.mode setted : ",self._context.modes);
                return s;
            };
            func._isDone_ = true;
            deep.chain.addInChain.apply(self,[func]);
            return this;
        }
    };

    deep.wrapNodeAsynch = function(parent, cmd, args)
    {
        var def = deep.Deferred();
        //console.log("wrapNodeAsynch : ", typeof parent, cmd);
        var callback = function(){
            var argus = Array.prototype.slice.apply(arguments);
            //console.log("wrapNode callBack direct response : ",argus);
            var err = argus.shift();
            if(err)
                def.reject(err);
            else
                def.resolve(argus);
        };
        args.push(callback);
        if(parent)
        {
            if(typeof cmd === 'string')
                parent[cmd].apply(parent, args);
            else
                cmd.apply(parent, args);
        }
        else
            cmd.apply({}, args);
        return def.promise();
    };

/**
     * execute array of funcs sequencially
     * @for deep
     * @static
     * @method sequence
     * @param  {String} funcs an array of functions to execute sequentially
     * @param  {Object} args (optional) some args to pass to first functions
     * @return {deep.Promise} a promise
     */
    deep.series = function (funcs, context, args) {
        if (!funcs || funcs.length === 0)
            return args;
        var current = funcs.shift();
        var def = deep.Deferred();
        context = context || {};
        var doIt = function (r) {
            deep.when(r).then(function (r) {
                if (funcs.length === 0) {
                    if (typeof r === 'undefined') {
                        r = args;
                        if (args.length == 1)
                            r = args[0];
                    }
                    def.resolve(r);
                    return r;
                }
                if (typeof r === 'undefined')
                    r = args;
                else
                    r = [r];
                current = funcs.shift();
                doIt(current.apply(context, r));
            }, function (error) {
                if (!def.rejected && !def.resolved && !def.canceled)
                    def.reject(error);
            });
        };
        doIt(current.apply(context, args));
        return def.promise();
    };

    deep.iterate = function (collection, done, fail)
    {
        var coll = collection.concat([]);
        var res = [];
        var doneAndIterate = function(s){
            if(coll.length > 0)
                this.done(function(s){ res.push(s); })
                .when(coll.shift())
                .done(doneAndIterate);
            return done.call(this, s);
        };
        var failAndIterate = function(e){
            if(!fail)
                return e;
            if(coll.length > 0)
                this.when(coll.shift())
                .done(doneAndIterate);
            var self = this;
            return deep.when(fail.call(this, e))
            .done(function(s){
                if(typeof s === 'undefined' || s instanceof Error)
                    return s || e;
                res.push(s || e);
                self.fail(failAndIterate);
            });
        };
        var iterator = deep.when(coll.shift())
        .done(doneAndIterate)
        .fail(failAndIterate)
        .done(function(s){
            res.push(s);
            return res;
        });
        return iterator;
    };

    deep.wired = function (functions, args, context, done, fail)
    {
        //console.log("wired : ", functions, args, context, done, fail);
        var ctx = context || {};
        if(args && !args.forEach)
            args = [args];
        var coll = functions.concat([]);
        var doneAndIterate = function(s){
            //console.log("done and wired : ",s)
            if(done)
                this.done(function(s){
                    return done.call(this, s);
                });
            if(coll.length > 0)
                this.done(function(s){
                    args = s;
                    if(args && !args.forEach)
                        args = [args];
                    this.when(coll.shift())
                    .done(doneAndIterate);
                });
            if(s._deep_query_node_)
                return s.value.apply(context || (s.ancestor)?s.ancestor.value:{}, args);
            return s.apply(ctx, args);
        };
        var failAndIterate = function(e){
            if(!fail)
                return e;
            if(coll.length > 0)
                this.when(coll.shift())
                .done(doneAndIterate);
            var self = this;
            return deep.when(fail.call(this, e))
            .done(function(s){
                if(typeof s === 'undefined' || s instanceof Error)
                    return s || e;
                args = s;
                if(args && !args.forEach)
                    args = [args];
                self.fail(failAndIterate);
            });
        };
        var iterator = deep.when(coll.shift())
        .done(doneAndIterate)
        .fail(failAndIterate);
        return iterator;
    };
};
});