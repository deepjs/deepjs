/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/stores/collection"], function (require, deep) {
	
	//_______________________________________________________________ GENERIC STORE TEST CASES


	var unit = {
		title:"deepjs/units/restrictions",
		stopOnError:false,
		tests : {
			restriction_up:function(){
				var a = {
					get:function(){
						return "hello";
					}
				};
				deep.utils.up(deep.Restrictions('get'), a);
				return deep(a.get())
				.fail(function(e){
					console.log("e")
					if(e.status === 403)
						return "lolipop";
				})
				.equal("lolipop");
			},
			restriction_up_collection:function(){
				var a = deep.utils.up(deep.Restrictions('get'), deep.store.Collection.create());
				return deep(a.get())
				.fail(function(e){
					if(e.status === 403)
						return "lolipop";
				})
				.equal("lolipop");
			},
			restriction_backgrounds:function(){
				var a = {
					backgrounds:[{
						get:function(){
							return "hello";
						}
					}, deep.Restrictions('get')]
				};
				return deep.flatten(a)
				.done(function(a){
					return a.get();
				})
				.fail(function(e){
					if(e.status === 403)
						return "lolipop";
				})
				.equal("lolipop");
			},
			restriction_backgrounds_collections:function(){
				var a = {
					backgrounds:[deep.store.Collection.create(), deep.Restrictions('get')]
				};
				return deep.flatten(a)
				.done(function(a){
					return a.get();
				})
				.fail(function(e){
					if(e.status === 403)
						return "lolipop";
				})
				.equal("lolipop");
			},
			restriction_ocm_collections:function(){
				var a = deep.ocm({
					role1:deep.store.Collection.create(),
					role2:{
						backgrounds:["this::../role1", deep.Restrictions('get')]
					}
				});
				return deep.flatten(a)
				.done(function(a){
					return a("role2").get();
				})
				.fail(function(e){
					if(e.status === 403)
						return "lolipop";
				})
				.equal("lolipop");
			},
			allow_only_up:function(){
				var obj = {
					a:true,
					b:"hello",
					c:function(){
						return "hello";
					}
				}
				obj = deep.utils.up(deep.AllowOnly("b"), obj);
				var a,b,c;
				try{
					a = obj.a;
					b = obj.b;
					c = obj.c().status;
				}
				catch(e)
				{

				}
				var r = [a, b, c];
				return deep(r)
				.equal([true, "hello", 403])
			},
			allow_only_backgrounds:function(){
				var obj = {
					a:true,
					b:"hello",
					c:function(){
						return "hello";
					}
				}
				var obj2 = {
					backgrounds:[obj, deep.AllowOnly("b")]
				}
				deep.flatten(obj2);
				var a,b,c;
				try{
					a = obj2.a;
					b = obj2.b;
					c = obj2.c().status;
				}
				catch(e)
				{

				}
				var r = [a, b, c];
				return deep(r)
				.equal([true, "hello", 403])
			},
			allow_only_backgrounds2:function(){
				var obj = {
					backgrounds:[deep.AllowOnly("b")],
					a:true,
					b:"hello",
					c:function(){
						return "world";
					}
				}
		
				deep.flatten(obj);
				var a,b,c, d;
				try{
					a = obj.a;
					b = obj.b;
					c = obj.c();
				}
				catch(e)
				{

				}
				var r = [a, b, c];
				return deep(r)
				.equal([true, "hello", "world"])
			}
		}
	};

	return unit;
});

