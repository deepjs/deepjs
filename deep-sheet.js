if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","./deep", "./utils"], function (require, deep) {
    
return function(deep){
      function getSheeter(obj){
            var sheeter = obj;
            if(!sheeter._deep_sheeter_)
            {
                sheeter = {
                    _deep_sheeter_:true,
                    queue:[]
                };
                deep.utils.up(deep.sheeter, sheeter);
            }
            return sheeter;
        }

        deep.sheeter = {
            deepLoad:function(context, destructive)
            {
                var sheeter = getSheeter(this);
                sheeter.queue.push(function(entry){
                    return deep(entry).deepLoad(context, destructive);
                });
                return sheeter;
            },
            load:function(context, destructive)
            {
                var sheeter = getSheeter(this);
                sheeter.queue.push(function(entry){
                    return deep(entry).load(context, destructive);
                });
                return sheeter;
            },
            up:function(){
                var args = arguments;
                var sheeter = getSheeter(this);
                sheeter.queue.push(function(entry){
                    var d = deep(entry);
                    return d.up.apply(d, args);
                });
                return sheeter;
            },
            bottom:function(){
                var args = arguments;
                var sheeter = getSheeter(this);
                sheeter.queue.push(function(entry){
                    var d = deep(entry);
                    return d.bottom.apply(d, args);
                });
                return sheeter;
            }
        };

        deep.protocole.SheetProtocoles = {
                //________________________________________ SHEET PROTOCOLES
                up:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqUP(layer){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var modified = [];
                            //console.log("sheet up protocole : getted : ", r );
                            if(r)
                                r.forEach(function(item){
                                    var value = item;
                                    if(item._isDQ_NODE_)
                                        value = item.value;
                                    var f = deep.utils.up(layer, value, options.shema);
                                    if(item.ancestor)
                                        item.ancestor.value[item.key] = f;
                                    modified.push(f);
                                });
                            return modified;
                        });
                    };
                },
                bottom:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqBottom(layer){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var modified = [];
                            if(r)
                                r.forEach(function(item){
                                    var value = item;
                                    if(item._isDQ_NODE_)
                                        value = item.value;
                                    var f = deep.utils.bottom(layer, value, options.shema);
                                    if(item.ancestor)
                                        item.ancestor.value[item.key] = f;
                                    modified.push(f);
                                });
                            return modified;
                        });
                    };
                },
                sheeter:function(request, options){
                    options = options || {};
                    var self = this;
                    return function doDQSheeter(sheeter){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var promises = [];
                            if(r)
                                r.forEach(function(item){
                                    var value = item;
                                    if(item._isDQ_NODE_)
                                        value = item.value;
                                    var d = deep.utils.wired(sheeter.queue, [item], {})
                                    .done(function(res){
                                        item.value = res;
                                        if(item.ancestor)
                                            item.ancestor.value[item.key] = res;
                                    });
                                    promises.push(d);
                                });
                            return deep.all(promises);
                        });
                    };
                },
                seriesCall:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqSeries(fn){
                        options.allowStraightQueries = false;
                        options.resultType = null;
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var results = [];
                            var err = null;
                            if(r && r.length > 0)
                            {
                                var def = deep.Deferred();
                                var end = function(){
                                    if(err)
                                        def.reject(err);
                                    else
                                        def.resolve(results);
                                };
                                var cycle = function(){
                                    var item = r.shift();
                                    var output = null;
                                    if(typeof fn === 'string')
                                    {
                                        if(typeof item[fn] === 'function')
                                            output = item[fn]();
                                    }
                                    else
                                        output = fn.apply(item);
                                    if(output instanceof Error)
                                    {
                                        err = output;
                                        return end();
                                    }
                                    if(output && output.then)
                                        deep.when(output)
                                        .done(function (s){
                                            results.push(s);
                                            if(r.length > 0)
                                                cycle();
                                            else end();
                                        })
                                        .fail(function (error) {
                                            def.reject(error);
                                        });
                                    else {
                                        results.push(output);
                                        if(r.length > 0)
                                            cycle();
                                        else end();
                                    }
                                };
                                cycle();
                                return def.promise();
                            }
                            return results;
                        });
                    };
                },
                paralleleCall:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqCall(fn){
                        options.allowStraightQueries = false;
                        options.resultType = null;
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            //console.log("sheet call protocole : getted : ", r );
                            if(!r)
                                return [];
                            var res = [];
                            r.forEach(function(item){
                                if(typeof fn === 'string')
                                {
                                    if(typeof item[fn] === 'function')
                                        res.push(item[fn]());
                                    else
                                        res.push(undefined);
                                }
                                else
                                    res.push(fn.apply(item));
                            });
                            return deep.all(res);
                        });
                    };
                },
                transform:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function doDqTransform(fn){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var res = [];
                            if(r)
                                r.forEach(function(item){
                                    var value = item;
                                    if(item._isDQ_NODE_)
                                        value = item.value;
                                    var r = fn(value);
                                    if(item.ancestor)
                                        item.ancestor.value[item.key] = r;
                                    res.push(r);
                                });
                            return res;
                        });
                    };
                },
                through:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function doDqTransform(fn){
                        options.allowStraightQueries = false;
                        options.resultType = "full";
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var res = [];
                            if(r)
                                r.forEach(function(item){
                                    var value = item;
                                    if(item._isDQ_NODE_)
                                        value = item.value;
                                    var r = fn(value);
                                    res.push(r);
                                });
                            return res;
                        });
                    };
                },
                equal:function (request, options) {
                    options = options || {};
                    var self = this;
                    return function dodqEqual(compare){
                        options.allowStraightQueries = false;
                        options.resultType = null;
                        var res = [];
                        return deep.when(self.get(request, options))
                        .done(function(r){
                            var ok = true;
                            if(r)
                                ok = r.every(function(item){
                                    return deep.utils.deepEqual(item, compare);
                                });
                            return ok || new Error("sheet equality failed");
                        });
                    };
                }
        };
        deep.utils.bottom(deep.protocole.SheetProtocoles, deep.protocoles.dq);
        return deep;
	};
});

