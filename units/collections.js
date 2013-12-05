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
           "private":function(){
                var store = deep.store.Collection.create(null, [{ id:"u1", email:"gilles.coomans@gmail.com", password:"test"}], {
                    properties:{
                        password:{ type:"string", "private":true }
                    }
                });
                return deep.store(store)
                .get("u1")
                .equal({ id:"u1", email:"gilles.coomans@gmail.com" });
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
           "ownerFail":function(){
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
                .equal({ id:"i1", label:"yesssss", userID:"u1"})
            }
        }
    };

    return new Unit(unit);
});
