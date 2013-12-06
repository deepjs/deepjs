if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deepjs/units/collections",
        stopOnError:false,
        setup:function(){},
        clean:function(){
            delete deep.context.session;
        },
        tests : {
            get:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com" }]);
                return deep.store(store)
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" })
                .valuesEqual({ id:"u1", email:"gilles.coomans@gmail.com" });
            },
            query:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com" }]);
                return deep.store(store)
                .get("?id=u1")
                .equal([{ id:"u1", email:"gilles.coomans@gmail.com" }])
                .valuesEqual([{ id:"u1", email:"gilles.coomans@gmail.com" }]);
            },
            post:function(){
                var store = deep.store.Collection.create(null, []);
                return deep.store(store)
                .post({ id:"u1", email:"gilles.coomans@gmail.com" })
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" })
                .valuesEqual({ id:"u1", email:"gilles.coomans@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" });
            },
            put:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"toto@gmail.com" }]);
                return deep.store(store)
                .put({ id:"u1", email:"gilles@gmail.com" })
                .equal({ id:"u1", email:"gilles@gmail.com" })
                .valuesEqual({ id:"u1", email:"gilles@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles@gmail.com" });
            },
            patch:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles@gmail.com" }]);
                return deep.store(store)
                .patch({ email:"gilles@gmail.com" }, { id:"u1"})
                .equal({ id:"u1", email:"gilles@gmail.com" })
                .valuesEqual({ id:"u1", email:"gilles@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles@gmail.com" });
            },
            del:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles@gmail.com" }]);
                return deep.store(store)
                .del('u1')
                .equal(true)
                .valuesEqual(true)
                .get("u1")
                .fail(function(error){
                     if(error && error.status == 404)
                        return "lolipop";
                })
                .equal("lolipop");
            },
            range:function(){
                var store = deep.store.Collection.create(null, [
                    { id:"u1", count:1 },
                    { id:"u2", count:2 },
                    { id:"u3", count:3 },
                    { id:"u4", count:4 },
                    { id:"u5", count:5 },
                    { id:"u6", count:6 }
                ]);

                return deep.store(store)
                .range(2,4)
                .equal({ _deep_range_: true,
                  total: 6,
                  count: 3,
                  results:
                    [
                        { id:"u3", count:3 },
                        { id:"u4", count:4 },
                        { id:"u5", count:5 }
                    ],
                  start: 2,
                  end: 4,
                  hasNext: true,
                  hasPrevious: true,
                  query: '&limit(3,2)'
                })
                .valuesEqual([
                    { id:"u3", count:3 },
                    { id:"u4", count:4 },
                    { id:"u5", count:5 }
                ]);
            },
            rangeWithQuery:function(){
                var store = deep.store.Collection.create(null, [
                    { id:"u1", count:1 },
                    { id:"u2", count:2 },
                    { id:"u3", count:3 },
                    { id:"u4", count:4 },
                    { id:"u5", count:5 },
                    { id:"u6", count:6 }
                ]);

                return deep.store(store)
                .range(2,4, '?count=ge=3')
                .equal({ _deep_range_: true,
                  total: 4,
                  count: 2,
                  results:
                    [
                        { id:"u5", count:5 },
                        { id:"u6", count:6 }
                    ],
                  start: 2,
                  end: 3,
                  hasNext: false,
                  hasPrevious: true,
                  query: "?count=ge=3&limit(2,2)"
                })
                .valuesEqual([
                    { id:"u5", count:5 },
                    { id:"u6", count:6 }
                ]);
            },
            rpc:function(){
                var checker = {};
                var store = deep.store.Collection.create(null, [{ id:"u1", base:"was there before"}], null, {
                    methods:{
                        testrpc:function(handler, arg1, arg2)
                        {
                            checker.throughRPC = true;
                            checker.args = [arg1, arg2];
                            checker.base = this.base;
                            this.decorated = "hello rpc";
                            return handler.save();
                        }
                    }
                });
                return deep.store(store)
                .rpc("testrpc", [1456, "world"], "u1")
                .equal({ id:"u1", base:"was there before", decorated:"hello rpc" })
                .valuesEqual({ id:"u1", base:"was there before", decorated:"hello rpc" })
                .get("u1")
                .equal({ id:"u1", base:"was there before", decorated:"hello rpc" })
                .deep(checker)
                .equal({
                    throughRPC:true,
                    args:[1456, "world"],
                    base:"was there before"
                });
            },
            rpcCopy:function(){
                var checker = {};
                var store = deep.store.Collection.create(null, [{ id:"u1", base:"was there before"}], null, {
                    methods:{
                        testrpc:function(handler, arg1, arg2)
                        {
                            checker.throughRPC = true;
                            checker.args = [arg1, arg2];
                            checker.base = this.base;
                            this.decorated = "hello rpc";
                            return "lolipop";
                        }
                    }
                });
                return deep.store(store)
                .rpc("testrpc", [1456, "world"], "u1")
                .equal("lolipop")
                .valuesEqual("lolipop")
                .get("u1")
                .equal({ id:"u1", base:"was there before" })
                .deep(checker)
                .equal({
                    throughRPC:true,
                    args:[1456, "world"],
                    base:"was there before"
                });
            },
            getCopy:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com" }]);
                return deep.store(store)
                .get("u1")
                .done(function(s){
                    s.hello = "world";
                })
                .equal({ id:"u1", email:"gilles.coomans@gmail.com", hello:"world" })
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com"});
            },
            queryCopy:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com" }]);
                return deep.store(store)
                .get("?id=u1")
                .done(function(s){
                    s[0].hello = "world";
                })
                .equal([{ id:"u1", email:"gilles.coomans@gmail.com", hello:"world" }])
                .get("?id=u1")
                .equal([{ id:"u1", email:"gilles.coomans@gmail.com"}]);
            },
            rangeCopy:function(){
                var store = deep.store.Collection.create(null, [
                    { id:"u1", count:1 },
                    { id:"u2", count:2 },
                    { id:"u3", count:3 },
                    { id:"u4", count:4 },
                    { id:"u5", count:5 },
                    { id:"u6", count:6 }
                ]);

                return deep.store(store)
                .range(2,4)
                .done(function(range){
                    var res = range.results;
                    res[0].hello = "world";
                    return res;
                })
                .equal(
                    [
                        { id:"u3", count:3, hello:"world" },
                        { id:"u4", count:4 },
                        { id:"u5", count:5 }
                    ]
                )
                .get("u3")
                .equal({ id:"u3", count:3 });
            },
            privateGet:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com", password:"test"}], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.store(store)
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" })
                .valuesEqual({ id:"u1", email:"gilles.coomans@gmail.com" });
            },
            privateQuery:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com", password:"test"}], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.store(store)
                .get("?id=u1")
                .equal([{ id:"u1", email:"gilles.coomans@gmail.com" }]);
            },
            privatePost:function(){
                var store = deep.store.Collection.create(null, [], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.store(store)
                .post({ id:"u2", email:"john.doe@gmail.com", password:"test"})
                .equal({ id:"u2", email:"john.doe@gmail.com" });
           },
           privatePatch:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com", password:"test"}], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.store(store)
                .patch({ id:"u1", email:"john.doe@gmail.com" })
                .equal({ id:"u1", email:"john.doe@gmail.com" });
           },
           readOnly:function(){
                var store = deep.store.Collection.create(null, [{ id:"i1", title:"hello" }], {
                    properties:{
                        title:{ readOnly:true, type:"string" }
                    }
                });
                return deep.store(store)
                .patch({ id:"i1", title:"should produce error" })
                .fail(function(e){
                    if(e && e.status == 412)
                        return "lolipop";
                })
                .equal("lolipop");
           },
           ownerPatchFail:function(){
                var store = deep.store.Collection.create(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:true
                });
                return deep.store(store)
                .patch({ id:"i1", label:"yesssss" })
                .fail(function(e){
                    if(e && e.status == 403)
                        return true;
                })
                .equal(true);
            },
            "ownerPatchOk":function(){
                var store = deep.store.Collection.create(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:true
                });
                deep.context.session = {
                    remoteUser:{ id:"u1" }
                };

                return deep.store(store)
                .patch({ id:"i1", label:"yesssss" })
                .equal({ id:"i1", label:"yesssss", userID:"u1"});
            },
            "ownerPutFail":function(){
                var store = deep.store.Collection.create(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:true
                });
                deep.context.session = {
                    remoteUser:{ id:"u2" }
                };
                return deep.store(store)
                .put({ id:"i1", label:"yesssss", userID:"u1" })
                .fail(function(e){
                    if(e && e.status == 403)
                        return true;
                })
                .equal(true);
            },
            "ownerPutOk":function(){
                var store = deep.store.Collection.create(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:true
                });
                deep.context.session = {
                    remoteUser:{ id:"u1" }
                };

                return deep.store(store)
                .put({ id:"i1", label:"yesssss", userID:"u1" })
                .equal({ id:"i1", label:"yesssss", userID:"u1"});
            },
            "ownerDelFail":function(){
                var store = deep.store.Collection.create(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:true
                });
                deep.context.session = {
                    remoteUser:{ id:"u2" }
                };
                return deep.store(store)
                .del("i1")
                .equal(false);
            },
            "ownerDelOk":function(){
                var store = deep.store.Collection.create(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:true
                });
                deep.context.session = {
                    remoteUser:{ id:"u1" }
                };
                return deep.store(store)
                .del("i1")
                .equal(true);
            }
        }
    };

    return new Unit(unit);
});