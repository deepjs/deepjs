if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../deep"], function(require, deep) {
	var unit = {
		title: "deepjs/units/views",
		stopOnError: false,
		setup: function() {},
		tests: {
			how: function() {
				return deep.View({
					how:"hello"
				})
				.refresh()
				.done(function(output){
					return output.rendered;
				})
				.equal("hello");
			},
			where: function() {
				var view = deep.View({
					how:"hello",
					where:function(rendered, node){
						return { wasPlaced:true, value:rendered };
					}
				})
				return view.refresh()
				.done(function(output){
					return output.placed;
				})
				.equal({ wasPlaced:true, value:"hello" })
				.done(function(){
					return view.placed();
				})
				.equal({ wasPlaced:true, value:"hello" });
			},
			whereTwice: function() {
				var view = deep.View({
					how:"hello",
					where:function(rendered, node){
						return { wasPlaced:true, value:rendered, old:(node && node.value=='hello')?true:false };
					}
				})
				return view.refresh()
				.done(function(output){
					return output.placed;
				})
				.equal({ wasPlaced:true, value:"hello", old:false })
				.done(function(){
					return view.refresh();
				})
				.done(function(output){
					return output.placed;
				})
				.equal({ wasPlaced:true, value:"hello", old:true });
			},
			params: function() {
				var view = deep.View({
					how:"hello { test }"
				})
				return view.refresh({ test:"world" })
				.done(function(output){
					return output.rendered;
				})
				.equal("hello world");
			},
			whatHideParams: function() {
				var view = deep.View({
					what:{ test:"from what" },
					how:function(node){ return "hello "+node.what.test; }
				})
				return view.refresh({ test:"world" })
				.done(function(output){
					return output.rendered;
				})
				.equal("hello from what");
			},
			whatLoaded: function() {
				var view = deep.View({
					what:"dummy::hello",
					how:function(node){ return "hello "+node.	what; }
				})
				return view.refresh({ test:"world" })
				.done(function(output){
					return output.rendered;
				})
				.equal("hello dummy:hello");
			}
		}
	};
	return unit;
});