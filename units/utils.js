if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep"], function (require, deep) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/utils",
        stopOnError:false,
        tests : {
            parseQueryString:function(){
                return deep(deep.utils.parseQueryString("jos&jos=2&a.bloup=3"))
                .done(function(s){
                    delete s.toString;
                })
                .equal({
                    jos:[true,"2"],
                    a:{
                        bloup:"3"
                    }
                });
            },
            toQueryString:function(){
                return deep(deep.utils.toQueryString({
                    jos:[true,2],
                    a:{
                        bloup:3
                    }
                }))
                .equal("jos&jos=2&a.bloup=3");
            }
        }
    };

    return unit;
});

