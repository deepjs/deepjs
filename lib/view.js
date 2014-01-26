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
			var self = this;
			if (success.placed) {
				for(var i in deep.ui.View.htmlEnhancers)
				{
					var enhancer = deep.ui.View.htmlEnhancers[i];
					enhancer.call(this,success);
				}
				success.placed
				.find("div[partials]") //  <div partials="swig::...." >
				.each(function() {
					var node = $(this);
					deep.get(node.attr("partials")).done(function(partials) {
						if (typeof partials === 'function')
							node.html(partials());
						node.html(partials);
					});
				});
			}
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
			return deep(this).query("./[what,how,where]")
				.deepLoad(params)
				.done(function(res) {
					//console.log("view deep load done : ", res);
					return {
						context: self,
						params: params,
						res:res
					};
				});
		},
		refresh: function(params, loaded) {
			//console.log("view refresh : params : ", params, " - loaded : ", loaded);
			var self = this;
			params = params || this.params;
			if (params)
				this.params = params;
			var render = function(loaded) {
				//console.log("view render : ", loaded)
				if (!loaded || !loaded.res)
					return;
				var what = self, how=null, where=null,rendered = null,placed = null;
				if(self.what)
					what=loaded.res.shift();
				if(self.how)
					how=loaded.res.shift();
				if(self.where)
					where=loaded.res.shift();
				what = (what && what._deep_query_node_) ? what.value : what;
				how = (how && how._deep_query_node_) ? how.value : how;
				where = (where && where._deep_query_node_) ? where.value : where;
				placed = self.placed ? self.placed() : null;
				var o = {
					what: what,
					params: params,
					placed: placed,
					getRoute: function(path) {}
				};
				if(!how)
					return o;
				try {
					if(typeof how === 'function')
						rendered = o.rendered = how.call(self, o);
					else
						rendered = o.rendered = how;
					if (where)
						placed = where.call(self, o.rendered, o.placed);
					else
						placed = null;
					o.placed = placed;
				} catch (e) {
					if (typeof self.fail === 'function')
						return self.fail(e) || e;
					return e;
				}
				if (placed)
					self.placed = function() {
						return placed;
					};
				if (typeof self.done === "function")
					return self.done(o) || o;
				return o;
			};
			if (loaded)
				return render(loaded);
			return deep.when(this.load(params))
				.done(render);
		},
		toString: function(pretty) {
			return "default render";
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
		deep.chain.addInChain.apply(self,[func]);
		return this;
	});
	deep.ui.View.htmlEnhancers = {};
	return deep.View;
});



