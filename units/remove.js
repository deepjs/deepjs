/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    var unit = {
        title:"deepjs/units/remove",
        stopOnError:false,
        tests : {
			a:function(){
				var a = {
					aString : "Hello",
					anInt : 5,
					anArray : ["1","2","3"],
					anObject : {
						anArray : ["4","5","6"],
						aString : "World"
					}
				};
				return deep.nodes(a)
				.remove("./anArray/1")
				.equal({
					aString : "Hello",
					anInt : 5,
					anArray : ["1","3"],
					anObject : {
						anArray : ["4","5","6"],
						aString : "World"
					}
				});
			},
			b:function(){
				var obj = {
					email: 'test@test.com',
					password: 'test54',
					id: '51013dec530e96b112000001'
				};
				var schema = {
					properties:
					{
						id: { type: 'string', required: false, minLength: 1 },
						email: { type: 'string', required: true, minLength: 1 },
						password: { type: 'string', required: true, "private": true }
					},
					additionalProperties : false
				};
				return deep.nodes(obj, schema)
				.remove(".//*?_schema.private=true")
				.equal({
					email: 'test@test.com',
					id: '51013dec530e96b112000001'
				});
			},
			c:function(){
				var objs = [{
					email: 'test@test.com',
					password: 'test54',
					id: '51013dec530e96b112000001'
				}];
				var schema2 = {
					type:"array",
					items:{
						properties:
						{
							id: { type: 'string', required: false, minLength: 1 },
							email: { type: 'string', required: true, minLength: 1 },
							password: { type: 'string', required: true, "private": true }
						},
						additionalProperties: false
					}
				};
				return deep.nodes(objs, schema2)
				.remove(".//?_schema.private=true")
				.equal([{
					email: 'test@test.com',
					id: '51013dec530e96b112000001'
				}]);
			},
			d:function(){
				var objs = [{
					email: 'test@test.com',
					password: 'test54',
					id: '51013dec530e96b112000001'
				}];
				var schema2 = {
					type:"array",
					items:{
						properties:
						{
							id: { type: 'string', required: false, minLength: 1 },
							email: { type: 'string', required: true, minLength: 1 },
							password: { type: 'string', required: true, "readOnly": true }
						},
						additionalProperties: false
					}
				};
				return deep.nodes(objs, schema2)
				.remove(".//?_schema.readOnly=true")
				.equal([{
					email: 'test@test.com',
					id: '51013dec530e96b112000001'
				}]);
           }
        }
    };

    return unit;
});
