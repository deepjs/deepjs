if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/colliders",
        stopOnError:false,
        tests : {
            replace:function(){
                return deep({ b:[1,2,3] })
                .up({
                    b:deep.collider.replace([4,5])
                })
                .equal({ b:[4,5] });
            },
            "array.insertAt":function(){
                return deep({ b:[1,2,3] })
                .up({
                    b:deep.collider.array.insertAt([4,5],2)
                })
                .equal({ b:[1,2,4,5,3] });
            }
        }
    };

    return new Unit(unit);
});

