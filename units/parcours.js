/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "../deep"], function(require, deep, Unit) {

	//_______________________________________________________________ GENERIC STORE TEST CASES

	var example = {
		view: true,
		b: {

			c: {
				view: true
			},
			d: {
				e: {
					view: true
				}
			}
		},
		f: {
			view: true,
			g: {
				h: {
					view: true
				}
			}
		}
	};

	var unit = {
		title: "deepjs/units/parcours",
		tests: {
			depthFirst: function() {
				var r = deep.depthFirst(example, null, {
					excludeLeafs: true
				});
				return deep(deep.nodes.paths(r)).equal(["/", "/b", "/b/c", "/b/d", "/b/d/e", "/f", "/f/g", "/f/g/h"]);
			},
			breadthFirst: function() {
				var r = deep.breadthFirst(example, null, {
					excludeLeafs: true
				});
				return deep(deep.nodes.paths(r)).equal([
					"/",
					"/b",
					"/f",
					"/b/c",
					"/b/d",
					"/f/g",
					"/b/d/e",
					"/f/g/h"
				]);
			},
			hierarchy: function() {
				var test = function(v) {
					return v.view;
				};
                var result = [];
                var getPaths = function(childs){
                    childs.forEach(function(c){
                        result.push(c.path);
                        if(c.childs)
                            getPaths(c.childs);
                    });
                }
				var r = deep.depthFirst(example, test, {
					hierarchy: true,
					excludeLeafs: true
				});
                getPaths(r);
				return deep(result).equal(["/", "/b/c", "/b/d/e", "/f", "/f/g/h"]);
			}
		}
	};

	return unit;
});