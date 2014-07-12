/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/restful/collection", "../lib/schema"], function (require, deep) {

    var unit = {
        title:"deepjs/units/collections",
        stopOnError:false,
        setup:function(){
            delete deep.context.session;
        },
        clean:function(){
            delete deep.context.session;
        },
        tests : {
            get:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"gilles.coomans@gmail.com" }]);
                return deep.rest(store)
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" });
            },
            getWithPath:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"gilles.coomans@gmail.com" }]);
                return deep.rest(store)
                .get("u1/email")
                .equal("gilles.coomans@gmail.com");
            },
            query:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"gilles.coomans@gmail.com" }]);
                return deep.rest(store)
                .get("?id=u1")
                .equal([{ id:"u1", email:"gilles.coomans@gmail.com" }]);
            },
            post:function(){
                var store = deep.Collection(null, []);
                return deep.rest(store)
                .post({ id:"u1", email:"gilles.coomans@gmail.com" })
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" });
            },
            postErrorIfExists:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"gilles.coomans@gmail.com" }]);
                return deep.rest(store)
                .post({ id:"u1", email:"gilles.coomans@gmail.com" })
                .fail(function(error){
                    if(error && error.status == 409)   // conflict
                        return "lolipop";
                })
                .equal("lolipop");
            },
            postProducesId:function(){
                var store = deep.Collection(null, []);
                return deep.rest(store)
                .post({ id:"u1", email:"gilles.coomans@gmail.com" })
                .done(function(s){
                    if(!s.id || typeof s.id !== "string")
                        return deep.errors.Internal("no id produced by deep.rest.Collection on post");
                });
            },
            postValidationFailed:function(){
                var store = deep.Collection(null, [], {
                    properties:{
                        id:{ type:"string", required:true },
                        title:{ type:"number", required:true }
                    }
                });
                return deep.rest(store)
                .post({ id:"u1", title:"gilles.coomans@gmail.com" })
                .fail(function(error){
                    if(error && error.status == 412)   // Precondition
                        return "lolipop";
                })
                .equal("lolipop");
            },
            postValidationOk:function(){
                var store = deep.Collection(null, [], {
                    properties:{
                        id:{ type:"string", required:true },
                        title:{ type:"string", required:true }
                    }
                });
                return deep.rest(store)
                .post({ id:"u1", title:"gilles.coomans@gmail.com" })
                .equal({ id:"u1", title:"gilles.coomans@gmail.com" });
            },
            put:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"toto@gmail.com" }]);
                return deep.rest(store)
                .put({ id:"u1", email:"gilles@gmail.com" })
                .equal({ id:"u1", email:"gilles@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles@gmail.com" });
            },
            putWithQuery:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"toto@gmail.com" }]);
                return deep.rest(store)
                .put("gilles@gmail.com", "u1/email")
                .equal({ id:"u1", email:"gilles@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles@gmail.com" });
            },
            putErrorIfNotExists:function(){
                var store = deep.Collection(null, []);
                return deep.rest(store)
                .put({ id:"u1", email:"gilles@gmail.com" })
                .fail(function(error){
                     if(error.status == 404)    // not found
                        return "lolipop";
                })
                .equal("lolipop");
            },
            putValidationFailed:function(){
                var store = deep.Collection(null, [{ id:"u1", title:"testezzzzz" }], {
                    properties:{
                        id:{ type:"string", required:true },
                        title:{ type:"string", required:true }
                    },
                    additionalProperties:false
                });
                return deep.rest(store)
                .put({ id:"u1", titles:"test" })
                .fail(function(error){
                    if(error && error.status == 412)   // Precondition
                        return "lolipop";
                })
                .equal("lolipop");
            },
            putValidationOk:function(){
                var store = deep.Collection(null, [{ id:"u1", title:"testezzzzz" }], {
                    properties:{
                        id:{ type:"string", required:true },
                        title:{ type:"string", required:true }
                    },
                    additionalProperties:false
                });
                return deep.rest(store)
                .put({ id:"u1", title:"test" })
                .equal({ id:"u1", title:"test" });
            },
            patch:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"toto@gmail.com" }]);
                return deep.rest(store)
                .patch({ email:"gilles@gmail.com" }, "u1")
                .equal({ id:"u1", email:"gilles@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles@gmail.com" });
            },
            patchWithQuery:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"toto@gmail.com" }]);
                return deep.rest(store)
                .patch("gilles@gmail.com", "u1/email")
                .equal({ id:"u1", email:"gilles@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles@gmail.com" });
            },
            patchErrorIfNotExists:function(){
                var store = deep.Collection(null, []);
                return deep.rest(store)
                .patch({ email:"gilles@gmail.com" }, "u1")
                .fail(function(error){
                    if(error.status == 404) // not found
                        return "lolipop";
                })
                .equal("lolipop");
            },
            del:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"gilles@gmail.com" }]);
                return deep.rest(store)
                .del('u1')
                .equal(true)
                .get("u1")
                .fail(function(error){
                     if(error && error.status == 404)
                        return "lolipop";
                })
                .equal("lolipop");
            },
            delWithQuery:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"gilles@gmail.com", test:true }]);
                return deep.rest(store)
                .del('u1/test')
                .equal(true)
                .get("u1")
                .equal({ id:"u1", email:"gilles@gmail.com" });
            },
            delFalseIfNotExists:function(){
                var store = deep.Collection(null, []);
                return deep.rest(store)
                .del('u1')
                .equal(false);
            },
            range:function(){
                var store = deep.Collection(null, [
                    { id:"u1", count:1 },
                    { id:"u2", count:2 },
                    { id:"u3", count:3 },
                    { id:"u4", count:4 },
                    { id:"u5", count:5 },
                    { id:"u6", count:6 }
                ]);
                return deep.rest(store)
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
                });
            },
            rangeWithQuery:function(){
                var store = deep.Collection(null, [
                    { id:"u1", count:1 },
                    { id:"u2", count:2 },
                    { id:"u3", count:3 },
                    { id:"u4", count:4 },
                    { id:"u5", count:5 },
                    { id:"u6", count:6 }
                ]);
                return deep.rest(store)
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
                });
            },
            rpc:function(){
                var checker = {};
                var store = deep.Collection(null, [{ id:"u1", base:"was there before"}], null, {
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
                return deep.rest(store)
                .rpc("testrpc", [1456, "world"], "u1")
                .equal({ id:"u1", base:"was there before", decorated:"hello rpc" })
                .get("u1")
                .equal({ id:"u1", base:"was there before", decorated:"hello rpc" })
                .deep(checker)
                .equal({
                    throughRPC:true,
                    args:[1456, "world"],
                    base:"was there before"
                });
            },
            rpcErrorIfNotExists:function(){
                var checker = {};
                var store = deep.Collection(null, [{ id:"u1", base:"was there before"}], null, {
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
                return deep.rest(store)
                .rpc("testrpc", [1456, "world"], "u2")
                .fail(function(error){
                     if(error.status == 404)    // not found
                        return "lolipop";
                })
                .equal("lolipop");
            },
            rpcMethodNotAllowed:function(){
                var checker = {};
                var store = deep.Collection(null, [{ id:"u1", base:"was there before"}], null, {
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
                return deep.rest(store)
                .rpc("testrpco", [1456, "world"], "u2")
                .fail(function(error){
                     if(error.status == 405)    // MethodNotAllowed
                        return "lolipop";
                })
                .equal("lolipop");
            },
            rpcCopy:function(){
                var checker = {};
                var store = deep.Collection(null, [{ id:"u1", base:"was there before"}], null, {
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
                return deep.rest(store)
                .rpc("testrpc", [1456, "world"], "u1")
                .equal("lolipop")
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
                var store = deep.Collection(null, [{ id:"u1", email:"gilles.coomans@gmail.com" }]);
                return deep.rest(store)
                .get("u1")
                .done(function(s){
                    s.hello = "world";
                })
                .equal({ id:"u1", email:"gilles.coomans@gmail.com", hello:"world" })
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com"});
            },
            queryCopy:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"gilles.coomans@gmail.com" }]);
                return deep.rest(store)
                .get("?id=u1")
                .done(function(s){
                    s[0].hello = "world";
                })
                .equal([{ id:"u1", email:"gilles.coomans@gmail.com", hello:"world" }])
                .get("?id=u1")
                .equal([{ id:"u1", email:"gilles.coomans@gmail.com"}]);
            },
            rangeCopy:function(){
                var store = deep.Collection(null, [
                    { id:"u1", count:1 },
                    { id:"u2", count:2 },
                    { id:"u3", count:3 },
                    { id:"u4", count:4 },
                    { id:"u5", count:5 },
                    { id:"u6", count:6 }
                ]);
                return deep.rest(store)
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
                var store = deep.Collection(null, [{ id:"u1", email:"gilles.coomans@gmail.com", password:"test"}], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.rest(store)
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" });
            },
            privateQuery:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"gilles.coomans@gmail.com", password:"test"}], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.rest(store)
                .get("?id=u1")
                .equal([{ id:"u1", email:"gilles.coomans@gmail.com" }]);
            },
            privatePost:function(){
                var store = deep.Collection(null, [], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.rest(store)
                .post({ id:"u2", email:"john.doe@gmail.com", password:"test"})
                .equal({ id:"u2", email:"john.doe@gmail.com" });
            },
            privatePatch:function(){
                var store = deep.Collection(null, [{ id:"u1", email:"gilles.coomans@gmail.com", password:"test"}], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.rest(store)
                .patch({ id:"u1", email:"john.doe@gmail.com" })
                .equal({ id:"u1", email:"john.doe@gmail.com" });
            },
            readOnly:function(){
                var store = deep.Collection(null, [{ id:"i1", title:"hello" }], {
                    properties:{
                        title:{ readOnly:true, type:"string" }
                    }
                });
                return deep.rest(store)
                .patch({ id:"i1", title:"should produce error" })
                .fail(function(e){
                    if(e && e.status == 412)    // Precondition
                        return "lolipop";
                })
                .equal("lolipop");
            },
            ownerPatchFail:function(){
                var store = deep.Collection(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:"userID"
                });
                return deep.rest(store)
                .patch({ id:"i1", label:"yesssss" })
                .fail(function(e){
                    if(e && e.status == 403)    // forbidden because no session.
                        return "choxy";
                })
                .equal("choxy");
            },
            "ownerPatchOk":function(){
                var store = deep.Collection(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:"userID"
                });
                deep.context.session = {
                    user:{ id:"u1" }
                };
                return deep.rest(store)
                .patch({ id:"i1", label:"yesssss" })
                .equal({ id:"i1", label:"yesssss", userID:"u1"});
            },
            "ownerPutFail":function(){
                var store = deep.Collection(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:"userID"
                });
                deep.context.session = {
                    user:{ id:"u2" }
                };
                return deep.rest(store)
                .put({ id:"i1", label:"yesssss", userID:"u1" })
                .fail(function(e){
                    if(e && e.status == 404)    // not found because restriciton
                        return "ploup";
                })
                .equal("ploup");
            },
            "ownerPutOk":function(){
                var store = deep.Collection(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:"userID"
                });
                deep.context.session = {
                    user:{ id:"u1" }
                };
                return deep.rest(store)
                .put({ id:"i1", label:"yesssss", userID:"u1" })
                .equal({ id:"i1", label:"yesssss", userID:"u1"});
            },
            "ownerDelFail":function(){
                var store = deep.Collection(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:"userID"
                });
                deep.context.session = {
                    user:{ id:"u2" }
                };
                return deep.rest(store)
                .del("i1")
                .equal(false);
            },
            ownerDelOk:function(){
                var store = deep.Collection(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:"userID"
                });
                deep.context.session = {
                    user:{ id:"u1" }
                };
                return deep.rest(store)
                .del("i1")
                .equal(true);
            },
            filterGet:function(){
                var store = deep.Collection(null, [{ id:"i1", label:"weee", status:"draft", userID:"u1" }], {
                    filter:"&status=published"
                });
                deep.context.session = {};
                return deep.rest(store)
                .get("i1")
                .fail(function(e){
                    if(e && e.status == 404)
                        return "yolli";
                })
                .equal('yolli');
            },
            filterQuery:function(){
                var store = deep.Collection(null, [{ id:"i1", label:"weee", status:"draft", userID:"u1" }], {
                    filter:"&status=published"
                });
                return deep.rest(store)
                .get("?id=i1")
                .equal([]);
            },
            filterDel:function(){
                var store = deep.Collection(null, [{ id:"i1", label:"weee", status:"draft", userID:"u1" }], {
                    filter:"&status=published"
                });
                return deep.rest(store)
                .del("i1")
                .equal(false);
            },
            transformers:function(){
                var store = deep.Collection(null, [], {
                    properties:{
                        label:{ 
                            type:"string",
                            transformers:[
                            function(node){
                                return node.value+":hello"
                            }]
                        }
                    }
                });
                return deep.rest(store)
                .post({ id:"i1", label:"weee", status:"draft", userID:"u1" })
                .done(function(success){
                     return success.label;
                })
                .equal("weee:hello");
            }
        }
    };

    return unit;
});
