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
            deeploadObject_NonDestructive:function(){
				var store = deep.Collection("test", [{id:"e1", title:"hello"}]);
				var a = { how:"test::e1" };
				return deep(a)
				.deepLoad(null, false)
				.done(function(r){
					return [r,a];
				})
				.equal([{ how:{id:"e1", title:"hello"} },{ how:"test::e1" }]);
            },
            deeploadObject_Destructive:function(){
				var store = deep.Collection("test", [{id:"e1", title:"hello"}]);
				var a = { how:"test::e1" };
				return deep(a)
				.deepLoad(null, true)
				.done(function(r){
					return [r,a];
				})
				.equal([{ how:{id:"e1", title:"hello"} },{ how:{id:"e1", title:"hello"} }]);
            },
            deepLoadWithQuery_NonDestructive:function(){
                var obj = {
                    how:'dummy::bloup'
                };
                return deep(obj)
                .query("./how")
                .deepLoad(null, false)
                .done(function(){
                    return obj.how;
                })
                .equal("dummy::bloup");
            }
        }
    };

    return unit;
});


