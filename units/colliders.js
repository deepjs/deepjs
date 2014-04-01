/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/colliders",
        stopOnError:false,
        tests : {
            /*replace:function(){
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
            },*/
            replace2:function(){
                var a = { b:[1,2,3] };
                var c = {
                    b:deep.collider.replace([4,5])
                };
                deep.utils.up(c,a);
                return deep(a).equal({ b:[4,5] });
            },
            "array.insertAt2":function(){
                var a = { b:[1,2,3] };
                var c = {
                    b:deep.collider["array.insertAt"]([4,5],2)
                };
                deep.utils.up(c,a);
                return deep(a).equal({ b:[1,2,4,5,3] });
            }
        }
    };

    return unit;
});

