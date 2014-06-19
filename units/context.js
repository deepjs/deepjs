/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deepjs/units/context",
        stopOnError:false,
        setup:function(){},
        clean:function(){
            deep.context = {};
        },
        tests : {
            setvar:function(){
                deep.context = {};
                var p1 = deep(9999)
                .toContext("test",1)
                .done(function(){
                    return deep.context.test;
                })
                .equal(1)
                .done(function(){
                    return this.fromContext('test');
                })
                .equal(1);
                var p2 = deep(deep.context).equal({});
                return deep.all(p1,p2);
            },
            setvar2:function(){
                deep.context = {};
                var p1 = deep(9999)
                .toContext("test",1)
                .done(function(){
                    return deep(true)
                    .toContext("hello","world")
                    .done(function(){
                        return deep.context;
                    })
                    .equal({test:1,hello:"world"});
                })
                .done(function(){
                    return deep.context;
                })
                .equal({test:1});
                var p2 = deep(deep.context).equal({});
                return deep.all(p1,p2);
            },
            delayed:function(){
                deep.context = {};
                var p1 = deep(9999)
                .toContext("test",1)
                .delay(1)
                .done(function(){
                    return deep.context;
                })
                .equal({test:1});

                var p2 = deep(9999)
                .toContext("test",2)
                .delay(3)
                .done(function(){
                    return deep.context;
                })
                .equal({test:2});

                var p3 = deep(9999)
                .toContext("test",3)
                .delay(2)
                .done(function(){
                    return deep.context;
                })
                .equal({test:3});

                var p4 = deep(deep.context).equal({});
                return deep.all(p1,p2,p3,p4);
            },
            delayed2:function(){
                deep.context = {};
                var ocm = deep.ocm({
                    a:{ hello:"world" },
                    b:{ backgrounds:["this::../a"] }
                });
                deep.Roles("a");
                deep.flatten(ocm);

                return deep.roles("b")
                .done(function(success){
                    return ocm.flatten()
                    .done(function(){
                        return deep.getModes("roles");
                    })
                    .equal(["b"])
                })
                .done(function(){
                    return deep.getModes("roles");
                })
                .equal(["b"]);
            }
        }
    };

    return unit;
});
