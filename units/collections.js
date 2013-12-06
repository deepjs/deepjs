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
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" });
            },
            post:function(){
                var store = deep.store.Collection.create(null, []);
                return deep.store(store)
                .post({ id:"u1", email:"gilles.coomans@gmail.com" })
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" });
            },
            put:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles@gmail.com" }]);
                return deep.store(store)
                .put({ id:"u1", email:"gilles@gmail.com" })
                .equal({ id:"u1", email:"gilles@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles@gmail.com" });
            },
            patch:function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles@gmail.com" }]);
                return deep.store(store)
                .patch({ email:"gilles@gmail.com" }, { id:"u1"})
                .equal({ id:"u1", email:"gilles@gmail.com" })
                .get("u1")
                .equal({ id:"u1", email:"gilles@gmail.com" });
            },
           "privateGet":function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com", password:"test"}], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.store(store)
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" });
           },
           "privateQuery":function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com", password:"test"}], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.store(store)
                .get("?id=u1")
                .equal([{ id:"u1", email:"gilles.coomans@gmail.com" }]);
           },
           "privatePost":function(){
                var store = deep.store.Collection.create(null, [], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.store(store)
                .post({ id:"u2", email:"john.doe@gmail.com", password:"test"})
                .equal({ id:"u2", email:"john.doe@gmail.com" });
           },
           "privatePatch":function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com", password:"test"}], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.store(store)
                .patch({ id:"u1", email:"john.doe@gmail.com" })
                .equal({ id:"u1", email:"john.doe@gmail.com" });
           },
           "readOnly":function(){
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
           "ownerPatchFail":function(){
                var store = deep.store.Collection.create(null, [{ id:"i1", label:"weee", userID:"u1" }], {
                    ownerRestriction:true,
                    properties:{
                        label:{ type:"string" }
                    }
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
                    ownerRestriction:true,
                    properties:{
                        label:{ type:"string" }
                    }
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
                    ownerRestriction:true,
                    properties:{
                        label:{ type:"string" }
                    }
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
                    ownerRestriction:true,
                    properties:{
                        label:{ type:"string" }
                    }
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
                    ownerRestriction:true,
                    properties:{
                        label:{ type:"string" }
                    }
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
                    ownerRestriction:true,
                    properties:{
                        label:{ type:"string" }
                    }
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
