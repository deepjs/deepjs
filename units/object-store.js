/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/stores/collection", "../lib/schema"], function (require, deep, Unit) {

    var unit = {
        title:"deepjs/units/object-store",
        stopOnError:false,
        setup:function(){
            delete deep.context.session;
        },
        clean:function(){
            delete deep.context.session;
        },
        tests : {
            get:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"gilles.coomans@gmail.com" } });
                return deep.rest(store)
                .get("key")
                .equal({ title:"hello",  email:"gilles.coomans@gmail.com" })
                // .valuesEqual({ title:"hello", email:"gilles.coomans@gmail.com" });
            },
            getWithPath:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"gilles.coomans@gmail.com" } });
                return deep.rest(store)
                .get("key/email")
                .equal("gilles.coomans@gmail.com")
                // .valuesEqual("gilles.coomans@gmail.com");
            },
            query:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"gilles.coomans@gmail.com" } });
                return deep.rest(store)
                .get("?title=hello")
                .equal([{ title:"hello", email:"gilles.coomans@gmail.com" }])
                // .valuesEqual([{ title:"hello", email:"gilles.coomans@gmail.com" }]);
            },
            post:function(){
                var store = deep.Object(null, { });
                return deep.rest(store)
                .post({ title:"hello", email:"gilles.coomans@gmail.com" }, "key")
                .equal({ title:"hello", email:"gilles.coomans@gmail.com" })
                // .valuesEqual({ title:"hello", email:"gilles.coomans@gmail.com" })
                .get("key")
                .equal({ title:"hello", email:"gilles.coomans@gmail.com" });
            },
            postErrorIfExists:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"gilles.coomans@gmail.com" } });
                return deep.rest(store)
                .post({ title:"hello", email:"gilles.coomans@gmail.com" }, "key")
                .fail(function(error){
                    if(error && error.status == 409)   // conflict
                        return "lolipop";
                })
                .equal("lolipop");
            },
            postValidationFailed:function(){
                var store = deep.Object(null, {},
                {
                    properties:{
                        key:{
                            properties:{
                                title:{ type:"string", required:true },
                                email:{ type:"string", required:true }
                            },
                            additionalProperties:false
                        }
                    }
                });
                return deep.rest(store)
                .post({ title:"hello", hop:"gilles.coomans@gmail.com" }, "key")
                .fail(function(error){
                    if(error && error.status == 412)   // Precondition
                        return "lolipop";
                })
                .equal("lolipop");
            },
            postValidationOk:function(){
                var store = deep.Object(null, {},
                {
                    properties:{
                        key:{
                            properties:{
                                title:{ type:"string", required:true },
                                email:{ type:"string", required:true }
                            },
                            additionalProperties:false
                        }
                    }
                });
                return deep.rest(store)
                .post({ title:"hello", email:"gilles.coomans@gmail.com" }, "key")
                .equal({ title:"hello", email:"gilles.coomans@gmail.com" });
            },
            put:function(){
                var store = deep.Object(null, { key:{ title:"bloup", email:"gilles.coomans@gmail.com" } });
                return deep.rest(store)
                .put({ title:"hello", email:"gilles@gmail.com" }, "key")
                .equal({ title:"hello", email:"gilles@gmail.com" })
                // .valuesEqual({ title:"hello", email:"gilles@gmail.com" })
                .get("key")
                .equal({ title:"hello", email:"gilles@gmail.com" });
            },
            putWithQuery:function(){
                var store = deep.Object(null, { key:{ title:"bloup", email:"gilles@gmail.com" } });
                return deep.rest(store)
                .put("hello", "key/title")
                .equal({ title:"hello", email:"gilles@gmail.com" })
                // .valuesEqual({ title:"hello", email:"gilles@gmail.com" })
                .get("key")
                .equal({ title:"hello", email:"gilles@gmail.com" });
            },
            putErrorIfNotExists:function(){
                var store = deep.Object(null, {  });
                return deep.rest(store)
                .put({ title:"hello", email:"gilles@gmail.com" }, "key")
                .fail(function(error){
                     if(error.status == 404)    // not found
                        return "lolipop";
                })
                .equal("lolipop");
            },
            putValidationFailed:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"testezzzzz" }}, {
                    properties:{
                        key:{
                            properties:{
                                email:{ type:"string", required:true },
                                title:{ type:"string", required:true }
                            },
                            additionalProperties:false
                        }
                    }
                });
                return deep.rest(store)
                .put({ title:"hello", bloup:"test" }, "key")
                .fail(function(error){
                    if(error && error.status == 412)   // Precondition
                        return "lolipop";
                })
                .equal("lolipop");
            },
            putValidationOk:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"testezzzzz" }}, {
                    properties:{
                        key:{
                            properties:{
                                email:{ type:"string", required:true },
                                title:{ type:"string", required:true }
                            },
                            additionalProperties:false
                        }
                    }
                });
                return deep.rest(store)
                .put({ title:"hello", email:"test" }, "key")
                .equal({ title:"hello", email:"test" });
            },
            patch:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"testezzzzz" }});
                return deep.rest(store)
                .patch({ email:"gilles@gmail.com" }, "key")
                .equal({ title:"hello", email:"gilles@gmail.com" })
                // .valuesEqual({ title:"hello", email:"gilles@gmail.com" })
                .get("key")
                .equal({ title:"hello", email:"gilles@gmail.com" });
            },
            patchWithQuery:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"testezzzzz" }});
                return deep.rest(store)
                .patch("gilles@gmail.com", "key/email")
                .equal({ title:"hello", email:"gilles@gmail.com" })
                // .valuesEqual({ title:"hello", email:"gilles@gmail.com" })
                .get("key")
                .equal({ title:"hello", email:"gilles@gmail.com" });
            },
            patchErrorIfNotExists:function(){
                var store = deep.Object(null, {});
                return deep.rest(store)
                .patch({ email:"gilles@gmail.com" }, "key")
                .fail(function(error){
                    if(error.status == 404) // not found
                        return "lolipop";
                })
                .equal("lolipop");
            },
            del:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"testezzzzz" }});
                return deep.rest(store)
                .del('key')
                .equal(true)
                // .valuesEqual(true)
                .get("key")
                .fail(function(error){
                     if(error && error.status == 404)
                        return "lolipop";
                })
                .equal("lolipop");
            },
            delWithQuery:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"testezzzzz" }});
                return deep.rest(store)
                .del('key/email')
                .equal(true)
                // .valuesEqual(true)
                .get("key")
                .equal({ title:"hello" });
            },
            delFalseIfNotExists:function(){
                var store = deep.Object(null, { });
                return deep.rest(store)
                .del('key')
                .equal(false);
            },
            range:function(){
                var store = deep.Object(null, {
                    a:{  count:1 },
                    b:{  count:2 },
                    c:{  count:3 },
                    d:{   count:4 },
                    e:{   count:5 },
                    f:{   count:6 }
                });
                return deep.rest(store)
                .range(2,4)
                .equal({ _deep_range_: true,
                  total: 6,
                  count: 3,
                  results:
                    [
                        { count:3 },
                        { count:4 },
                        { count:5 }
                    ],
                  start: 2,
                  end: 4,
                  hasNext: true,
                  hasPrevious: true,
                  query: '&limit(3,2)'
                })
                .valuesEqual([
                    { count:3 },
                    { count:4 },
                    { count:5 }
                ]);
            },
            rangeWithQuery:function(){
                var store = deep.Object(null, {
                    a:{  count:1 },
                    b:{  count:2 },
                    c:{  count:3 },
                    d:{   count:4 },
                    e:{   count:5 },
                    f:{   count:6 }
                });
                return deep.rest(store)
                .range(2,4, '?count=ge=3')
                .equal({ _deep_range_: true,
                  total: 4,
                  count: 2,
                  results:
                    [
                        { count:5 },
                        { count:6 }
                    ],
                  start: 2,
                  end: 3,
                  hasNext: false,
                  hasPrevious: true,
                  query: "?count=ge=3&limit(2,2)"
                })
                .valuesEqual([
                    { count:5 },
                    { count:6 }
                ]);
            },
            rpc:function(){
                var checker = {};
                var store = deep.Object(null, { key:{ title:"hello", base:"was there before" } }, null, {
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
                .rpc("testrpc", [1456, "world"], "key")
                .equal({ title:"hello", base:"was there before", decorated:"hello rpc" })
                .valuesEqual({ title:"hello", base:"was there before", decorated:"hello rpc" })
                .get("key")
                .equal({ title:"hello", base:"was there before", decorated:"hello rpc" })
                .deep(checker)
                .equal({
                    throughRPC:true,
                    args:[1456, "world"],
                    base:"was there before"
                });
            },
            rpcErrorIfNotExists:function(){
                var checker = {};
                var store = deep.Object(null, { }, null, {
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
                .rpc("testrpc", [1456, "world"], "key")
                .fail(function(error){
                     if(error.status == 404)    // not found
                        return "lolipop";
                })
                .equal("lolipop");
            },
            rpcMethodNotAllowed:function(){
                var checker = {};
                var store = deep.Object(null, { key:{ title:"hello", base:"was there before" } }, null, {
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
                .rpc("testrpco", [1456, "world"], "key")
                .fail(function(error){
                     if(error.status == 405)    // MethodNotAllowed
                        return "lolipop";
                })
                .equal("lolipop");
            },
            rpcCopy:function(){
                var checker = {};
                var store = deep.Object(null, { key:{ title:"hello", base:"was there before" } }, null, {
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
                .rpc("testrpc", [1456, "world"], "key")
                .equal("lolipop")
                .valuesEqual("lolipop")
                .get("key")
                .equal({ title:"hello", base:"was there before" })
                .deep(checker)
                .equal({
                    throughRPC:true,
                    args:[1456, "world"],
                    base:"was there before"
                });
            },
            getCopy:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"gilles.coomans@gmail.com" } });
                return deep.rest(store)
                .get("key")
                .done(function(s){
                    s.hello = "world";
                })
                .equal({ title:"hello", email:"gilles.coomans@gmail.com", hello:"world" })
                .get("key")
                .equal({ title:"hello", email:"gilles.coomans@gmail.com"});
            },
            queryCopy:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"gilles.coomans@gmail.com" } });
                return deep.rest(store)
                .get("?title=hello")
                .done(function(s){
                    s[0].hello = "world";
                })
                .equal([{ title:"hello", email:"gilles.coomans@gmail.com", hello:"world" }])
                .get("?title=hello")
                .equal([{ title:"hello", email:"gilles.coomans@gmail.com"}]);
            },
            rangeCopy:function(){
                var store = deep.Object(null, { 
                    a:{ count:1 },
                    b:{ count:2 },
                    c:{ count:3 },
                    d:{ count:4 },
                    e:{ count:5 },
                    f:{ count:6 }
                });
                return deep.rest(store)
                .range(2,4)
                .done(function(range){
                    var res = range.results;
                    res[0].hello = "world";
                    return res;
                })
                .equal(
                    [
                        { count:3, hello:"world" },
                        { count:4 },
                        { count:5 }
                    ]
                )
                .get("c")
                .equal({ count:3 });
            },
            privateGet:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"gilles.coomans@gmail.com" } }, {
                    properties:{ 
                        key:{
                            properties:{
                                title:{ type:"string", "private":true }
                            }
                        }
                    }     
                });
                return deep.rest(store)
                .get("key")
                .equal({ email:"gilles.coomans@gmail.com" })
                .valuesEqual({ email:"gilles.coomans@gmail.com" });
            },
            /*privateQuery:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"ksss" } }, {
                    properties:{ 
                        key:{
                            properties:{
                                title:{ type:"string", "private":true }
                            }
                        }
                    }
                });
                return deep.rest(store)
                .get("?email=ksss")
                .equal([{ email:"ksss" }]);
            }*/
            privatePost:function(){
                var store = deep.Object(null, {}, {
                    properties:{ 
                        key:{
                            properties:{
                                title:{ type:"string", "private":true }
                            }
                        }
                    }
                });
                return deep.rest(store)
                .post({ email:"john.doe@gmail.com", title:"test"}, "key")
                .equal({ email:"john.doe@gmail.com" });
            },
            privatePatch:function(){
                var store = deep.Object(null, { key:{ title:"hello", email:"ksss" } }, {
                    properties:{ 
                        key:{
                            properties:{
                                title:{ type:"string", "private":true }
                            }
                        }
                    }
                });
                return deep.rest(store)
                .patch({ email:"john.doe@gmail.com" }, "key")
                .equal({ email:"john.doe@gmail.com" });
            },
            readOnly:function(){
                var store = deep.Object(null, { key:{ title:"hello" }}, {
                    properties:{
                        key:{
                            properties:{
                                title:{ readOnly:true, type:"string" }
                            }
                        }
                    }
                });
                return deep.rest(store)
                .patch({ title:"should produce error" }, "key")
                .fail(function(e){
                    if(e && e.status == 412)    // Precondition
                        return "lolipop";
                })
                .equal("lolipop");
            }/*,
            ownerPatchFail:function(){
                var store = deep.rest.Collection.create(null, [{ id:"i1", label:"weee", usertitle:"hello" }], {
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
                var store = deep.rest.Collection.create(null, [{ id:"i1", label:"weee", usertitle:"hello" }], {
                    ownerRestriction:"userID"
                });
                deep.context.session = {
                    user:{ title:"hello" }
                };
                return deep.rest(store)
                .patch({ id:"i1", label:"yesssss" })
                .equal({ id:"i1", label:"yesssss", usertitle:"hello"});
            },
            "ownerPutFail":function(){
                var store = deep.rest.Collection.create(null, [{ id:"i1", label:"weee", usertitle:"hello" }], {
                    ownerRestriction:"userID"
                });
                deep.context.session = {
                    user:{ id:"u2" }
                };
                return deep.rest(store)
                .put({ id:"i1", label:"yesssss", usertitle:"hello" })
                .fail(function(e){
                    if(e && e.status == 404)    // not found because restriciton
                        return "ploup";
                })
                .equal("ploup");
            },
            "ownerPutOk":function(){
                var store = deep.rest.Collection.create(null, [{ id:"i1", label:"weee", usertitle:"hello" }], {
                    ownerRestriction:"userID"
                });
                deep.context.session = {
                    user:{ title:"hello" }
                };
                return deep.rest(store)
                .put({ id:"i1", label:"yesssss", usertitle:"hello" })
                .equal({ id:"i1", label:"yesssss", usertitle:"hello"});
            },
            "ownerDelFail":function(){
                var store = deep.rest.Collection.create(null, [{ id:"i1", label:"weee", usertitle:"hello" }], {
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
                var store = deep.rest.Collection.create(null, [{ id:"i1", label:"weee", usertitle:"hello" }], {
                    ownerRestriction:"userID"
                });
                deep.context.session = {
                    user:{ title:"hello" }
                };
                return deep.rest(store)
                .del("i1")
                .equal(true);
            },
            filterGet:function(){
                var store = deep.rest.Collection.create(null, [{ id:"i1", label:"weee", status:"draft", usertitle:"hello" }], {
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
                var store = deep.rest.Collection.create(null, [{ id:"i1", label:"weee", status:"draft", usertitle:"hello" }], {
                    filter:"&status=published"
                });
                return deep.rest(store)
                .get("?id=i1")
                .equal([]);
            },
            filterDel:function(){
                var store = deep.rest.Collection.create(null, [{ id:"i1", label:"weee", status:"draft", usertitle:"hello" }], {
                    filter:"&status=published"
                });
                return deep.rest(store)
                .del("i1")
                .equal(false);
            }*/
            , transformers:function(){
                var store = deep.Object(null, [], {
                    properties:{
                        key:{
                            properties:{
                                label:{ 
                                    type:"string",
                                    transformers:[
                                    function(node){
                                        return node.value+":hello"
                                    }]
                                }
                            }
                        }
                    }
                });
                return deep.rest(store)
                .post({ label:"weee", status:"draft", usertitle:"hello" }, "key")
                .done(function(success){
                     return success.label;
                })
                .equal("weee:hello");
            }
        }
    };

    return unit;
});
