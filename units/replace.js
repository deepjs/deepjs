if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/replace",
        stopOnError:false,
        setup:function(){
			return {
				aString : "Hello",
				anInt : 5,
				anArray : ["1","2","3"],
				anObject : {
					anArray : ["4","5","6"],
					aString : "World"
				}
			};
        },
        tests : {
			a:function(){
				return deep(this)
				.replace("./anArray/1","replaceString")
				.valuesEqual({
					aString : "Hello",
					anInt : 5,
					anArray : ["1","replaceString","3"],
					anObject : {
						anArray : ["4","5","6"],
						aString : "World"
					}
				});
			},
			b:function(){
				return deep(this)
				.replace("/anObject/aString",12)
				.valuesEqual({
					aString : "Hello",
					anInt : 5,
					anArray : ["1","replaceString","3"],
					anObject : {
						anArray : ["4","5","6"],
						aString : 12
					}
				});
			}
        }
    };

    return new Unit(unit);
});