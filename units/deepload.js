/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deepjs/units/deepload",
        stopOnError:false,
        clean:function(){
            delete deep.protocols.test;
        },
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
            deeploadObjectNonDestructive:function(){
				var store = deep.store.Collection.create("test", [{id:"e1", title:"hello"}]);
				var a = { how:"test::e1" };
				return deep(a)
				.deepLoad(null, false)
				.done(function(r){
					return [r,a];
				})
				.equal([{ how:{id:"e1", title:"hello"} },{ how:"test::e1" }]);
            },
            deeploadObjectDestructive:function(){
				var store = deep.store.Collection.create("test", [{id:"e1", title:"hello"}]);
				var a = { how:"test::e1" };
				return deep(a)
				.deepLoad(null, true)
				.done(function(r){
					return [r,a];
				})
				.equal([{ how:{id:"e1", title:"hello"} },{ how:{id:"e1", title:"hello"} }]);
            }
        }
    };

    return unit;
});


