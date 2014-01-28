/**
 * attr dico
 * 		partials="html::.... || swig::....  || views::myView || ..."
 *
 * 		edit-on-click="true"
 *
 *
 * 		data-bind="mp3::id/my/path"
 *
 * 		required, minLength, maxLength, .. or any json-schema related stuffs
 *
 * 		<div show-on-error="/my/path#required">my custom message</div>
 *
 *
 */
"use strict";
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "deepjs/deep"], function(require, deep) {

	deep.ui.View = deep.compose.Classes(function(layer) {
		deep.utils.up(layer, this);
	}, {
		//what:"this::!",
		_deep_view_: true,
		how: function(what, routeParams) {
			return this.toString();
		},
		//where:"dom.appendTo::#ng-view",
		done: function(success) {
			// success == { what:.., rendered:"...", placed:jQuery }
			// should seek after particular deep.ui html attributs and tag to interpret as 'partials' or 'data-bind')...

		},
		fail: function(e) {
			console.error("error while rendering : ", e);
		},
		load: function(params) {
			var self = this;
			if (!this.how || this.condition === false)
				return null;
			if (this.condition)
				if (typeof this.condition === "function" && !this.condition.apply(params))
					return null;
			var has = {
				what:this.what,
				how:this.how,
				where:this.where
			};
			return deep(has)
				.deepLoad(params, true)
				.done(function(res) {
					//console.log("view deep load done : ", res);
					res.controller = self;
					res.params =params;
					res._deep_render_node_ = true;
					return res;
				});
		},
		refresh: function(query, params, loaded) {
			if(typeof query === 'object' && query !== null)
			{
				loaded = params;
				params = query;
				query = null;
			}
			//console.log("view refresh : params : ", params, " - loaded : ", loaded);
			var self = this;
			params = params || this.params;
			if (params && !deep.isNode)
				this.params = params;
			var render = function(loaded) {
				console.log("view render : ", loaded)
				if (!loaded)
					return;
				var what = loaded.controller, how=null, where=null,rendered = null,placed = null;
				if(loaded.what)
					what = loaded.what;
				if(what.how)
					how = loaded.how;
				if(what.where)
					where = loaded.where;
				what = (what && what._deep_query_node_) ? what.value : what;
				how = (how && how._deep_query_node_) ? how.value : how;
				where = (where && where._deep_query_node_) ? where.value : where;
				placed = self.placed ? self.placed() : null;

				loaded.placed =  placed;
				loaded.getRoute = function(path) {};
				if(!how)
					return loaded;
				try {
					if(typeof how === 'function')
					{
						what._params = params;
						what._getRoute = loaded.getRoute;
						rendered = loaded.rendered = how.call(self, what);
					}
					else
						rendered = loaded.rendered = how;
					if (where)
						placed = loaded.placed = where.call(self, loaded.rendered, loaded.placed);
					else
						placed = loaded.placed = null;
				} catch (e) {
					if (typeof self.fail === 'function')
						return self.fail(e) || e;
					return e;
				}

				if (placed && !deep.isNode)
					self.placed = function() {
						return placed;
					};

				var promises = [];
				if (placed)
					for(var i in deep.ui.View.htmlEnhancers)
					{
						var enhancer = deep.ui.View.htmlEnhancers[i];
						promises.push(enhancer.call(self,loaded));
					}
				if(promises.length > 0)
					return deep.all(promises)
					.done(function(){
						if (typeof self.done === "function")
							return self.done(loaded) || loaded;
						return loaded;
					});
				if (typeof self.done === "function")
					return self.done(loaded) || loaded;
				return loaded;
			};
			if (loaded)
				return render(loaded);
			return deep.when(this.load(params))
			.done(render);
		},
		toString: function(pretty) {
			return "default view render.";
		}
	});

	deep.View = function (layer) {
		return new deep.ui.View(layer);
	};

	deep.Chain.addHandle("refresh", function()
	{
		var args= arguments;
		var self = this;
		var func = function(s,e)
		{
			var alls = [];
			deep.chain.each(self, function (v) {
				if(typeof v.refresh === "function")
					alls.push(v.refresh.apply(v,args));
				else
					alls.push(v);
			});
			return deep.all(alls)
			.done(function(alls){
				if(!self._queried)
					return alls.shift();
				return alls;
			});
		};
		func._isDone_ = true;
		deep.chain.addInChain.call(self,func);
		return this;
	});

	deep.ui.View.htmlEnhancers = {
		partials:function(success){
			var promises = [];
			success.placed
			.find("div[partials]") //  <div partials="swig::...." >
			.each(function() {
				var node = $(this);
				promises.push(deep.get(node.attr("partials"))
				.done(function(partials) {
					if (typeof partials === 'function')
						node.html(partials());
					node.html(partials);
				}));
			});
			return deep.all(promises);
		}
	};
	return deep.View;
});



