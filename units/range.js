if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/range",
        stopOnError:false,
        tests : {
            "1-4":function(){
                return deep([0,1,2,3,4,5])
                .range(1,4)
                .valuesEqual([1,2,3,4]);
            },
            "3-5":function(){
                return deep([0,1,2,3,4,5])
                .range(3,5)
                .valuesEqual([3,4,5]);
            }
        }
    };

    return new Unit(unit);
});