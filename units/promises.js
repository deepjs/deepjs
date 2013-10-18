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
           
        }
    };

    return new Unit(unit);
});
