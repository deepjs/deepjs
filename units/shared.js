/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
	
	//_______________________________________________________________ GENERIC STORE TEST CASES

	var unit = {
		title:"deep/units/shared",
		stopOnError:false,
		tests : {
			bottom_on_shared:function(){
				var a = {
					test:[1,2,3]
				};
				var b = {
					test:deep.Shared([4,5])
				};
				deep.utils.bottom(a,b);
				a.test.push(6,7);
				b.test.push(8,9);
				return deep(a.test).equal(b.test);
			},
			bottom_from_shared:function(){
				var a = {
					test:deep.Shared([1,2,3])
				};
				var b = {
					test:[4,5]
				};
				deep.utils.bottom(a,b);
				a.test.push(6,7);
				b.test.push(8,9);
				return deep(a.test).equal(b.test);
			},
			up_on_shared:function(){
				var a = {
					test:[1,2,3]
				};
				var b = {
					test:deep.Shared([4,5])
				};
				deep.utils.up(a,b);
				a.test.push(6,7);
				b.test.push(8,9);
				//console.log(a,b);
				return deep(a).equal(b);
			},
			up_from_shared:function(){
				var a = {
					test:deep.Shared([1,2,3])
				};
				var b = {
					test:[4,5]
				};

				deep.utils.up(a,b);
				a.test.push(6,7);
				b.test.push(8,9);
				//console.log(a,b);
				return deep(a).equal(b);
			}
		}
	};

	return unit;
});
