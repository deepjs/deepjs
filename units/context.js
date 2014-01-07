if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/context",
        stopOnError:false,
        setup:function(){},
        clean:function(){
            deep.context = {};
        },
        tests : {
            setvar:function(){
                deep.context = {};
                var p1 = deep(9999)
                .context("test",1)
                .done(function(){
                    return deep.context.test;
                })
                .equal(1)
                .done(function(){
                    return this.context().test;
                })
                .equal(1);
                var p2 = deep(deep.context).equal({});
                return deep.all(p1,p2);
            },
            setvar2:function(){
                deep.context = {};
                var p1 = deep(9999)
                .context("test",1)
                .done(function(){
                    return deep(true)
                    .context("hello","world")
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
                .context("test",1)
                .delay(3)
                .done(function(){
                    return deep.context;
                })
                .equal({test:1});

                var p2 = deep(9999)
                .context("test",2)
                .delay(9)
                .done(function(){
                    return deep.context;
                })
                .equal({test:2});

                var p3 = deep(9999)
                .context("test",3)
                .delay(6)
                .done(function(){
                    return deep.context;
                })
                .equal({test:3});

                var p4 = deep(deep.context).equal({});
                return deep.all(p1,p2,p3,p4);
            }
        }
    };

    return unit;
});
