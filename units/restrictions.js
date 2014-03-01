if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/stores/collection-store"], function (require, deep) {
	
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
				deep.utils.up(deep.store.Restrictions('get'), a);
				return deep(a.get())
				.fail(function(e){
					if(e.status === 403)
						return "lolipop";
				})
				.equal("lolipop");
			},
			restriction_up_collection:function(){
				var a = deep.utils.up(deep.store.Restrictions('get'), deep.store.Collection.create());
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
					}, deep.store.Restrictions('get')]
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
					backgrounds:[deep.store.Collection.create(), deep.store.Restrictions('get')]
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
						backgrounds:["this::../role1", deep.store.Restrictions('get')]
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
			}
		}
	};

	return unit;
});

