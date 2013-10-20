if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/promises",
        stopOnError:false,
        setup:function(){},
        tests : {
            delayed_arg_injection:function(){
                return deep.when(deep(" world ").delay(5))
                .then(function(arg){
                    return deep.when(deep(1).delay(6))
                    .then(function(arg2){
                        return "hello"+arg+arg2;
                    });
                })
                .equal("hello world 1");
            },
            modif_injection:function(){
                return deep.when({
                    test:1
                })
                .done(function(s){
                   s.e = 2;
                })
                .equal({test:1,e:2})
                .done(function(s){
                    return "changed value";
                })
                .equal("changed value");
            },
            error_injection:function(){
                return deep.when({})
                .done(function(){
                    return new Error("the injected error");
                })
                .done(function(s){
                    return "should not see this";
                })
                .fail(function(e){
                    return e.message;
                })
                .equal("the injected error");
            },
            error_catch:function(){
                return deep.when({})
                .done(function(){
                    throw new Error("the thrown error");
                })
                .done(function(s){
                    return "should not see this";
                })
                .fail(function(e){
                    return e.message;
                })
                .equal("the thrown error");
            },
            done_add_handle:function(){
                return deep.when({})
                .done(function(s){
                    this.done(function(s){
                        return "passed through";
                    });
                    return "should not see this";
                })
                .equal("passed through");
            }
        }
    };

    return new Unit(unit);
});
