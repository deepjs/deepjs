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
            deep.Promise.context = {};
        },
        tests : {
            setvar:function(){
                deep.Promise.context = {};
                var p1 = deep.nodes(9999)
                .contextualise()
                .toContext("test",1)
                .done(function(){
                    return deep.Promise.context.test;
                })
                .equal(1)
                .done(function(){
                    return this.fromContext('test');
                })
                .equal(1);
                var p2 = deep.nodes(deep.Promise.context).equal({});
                return deep.all([p1,p2]);
            },
            setvar2:function(){
                deep.Promise.context = {};
                var p1 = deep.nodes(9999)
                .contextualise()
                .toContext("test",1)
                .done(function(){
                    return deep.nodes(true)
                    .contextualise()
                    .toContext("hello","world")
                    .done(function(){
                        return deep.Promise.context;
                    })
                    .equal({test:1,hello:"world"});
                })
                .done(function(){
                    return deep.Promise.context;
                })
                .equal({test:1});
                var p2 = deep.nodes(deep.Promise.context).equal({});
                return deep.all([p1,p2]);
            },
            delayed:function(){
                deep.Promise.context = {};
                var p1 = deep.nodes(9999)
                .contextualise()
                .toContext("test",1)
                .delay(1)
                .done(function(){
                    return deep.Promise.context;
                })
                .equal({test:1});

                var p2 = deep.nodes(9999)
                .contextualise()
                .toContext("test",2)
                .delay(3)
                .done(function(){
                    return deep.Promise.context;
                })
                .equal({test:2});

                var p3 = deep.nodes(9999)
                .contextualise()
                .toContext("test",3)
                .delay(2)
                .done(function(){
                    return deep.Promise.context;
                })
                .equal({test:3});

                var p4 = deep.nodes(deep.Promise.context).equal({});
                return deep.all([p1,p2,p3,p4]);
            },
            delayed2:function(){
                deep.Promise.context = {};
                var ocm = deep.ocm({
                    a:{ hello:"world" },
                    b:{ _backgrounds:["this::../a"] }
                });
                deep.Modes("roles", "a");
                deep.flatten(ocm);

                return deep.modes("roles", "b")
                .done(function(success){
                    return ocm.flatten()
                    .done(function(){
                        return deep.currentModes("roles");
                    })
                    .equal(["b"])
                })
                .done(function(){
                    return deep.currentModes("roles");
                })
                .equal(["b"]);
            }
        }
    };

    return unit;
});
