if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/interpret",
        stopOnError:false,
        setup:function(){},
        tests : {
            a:function(){
                // 2
                return deep({
                    msg:"hello { name }"
                })
                .query("./msg")
                .interpret({ name:"john" })
                .equal("hello john");
            },
            b:function(){
                return deep("mystring { id }")
                .interpret({id:12})
                .equal("mystring 12");
            },
            c:function(){
                return deep("mystring { id | 'hello world' } after")
                .interpret({id:undefined})
                .equal("mystring hello world after");
            },
            d:function(){
                return deep("mystring { id | '0' } after")
                .interpret({id:12})
                .equal("mystring 12 after");
            }
        }
    };

    return unit;
});
