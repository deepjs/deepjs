/**
 * attr dico
 *      partials="html::.... || swig::....  || views::myView || ..."
 *
 *      edit-on-click="true"
 *
 *
 *      data-bind="mp3::id/my/path"
 *
 *      required, minLength, maxLength, .. or any json-schema related stuffs
 *
 *      <div show-on-error="/my/path#required">my custom message</div>
 *
 *
 */
"use strict";
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../deep"], function(require, deep) {

	jQuery.fn.outerHTML = function(s) {
		return s
			? this.before(s).remove()
			: jQuery("<p>").append(this.eq(0).clone()).html();
	};

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
		remove:function () {
			//console.log("VIEW REMOVE : ", this.placed);
			if(this.placed && deep.jquery.isInDOM(this.placed()))
				$(this.placed()).remove();
		},
		load: function(params) {
			// console.log("LOAD VIEW")
			var self = this;
			if (!this.how || this.condition === false)
				return null;
			if (this.condition)
				if (typeof this.condition === "function" && !this.condition.apply(params))
					return null;

			var promises = [];
			if(this.what)
				promises.push(deep(this).query("./what").deepLoad(params, false));
			else
				promises.push(null);

			if(typeof this.how === 'string')
				promises.push(deep(this).query("./how").load(params, false));
			else
				promises.push(this.how);

			if(this.where)
				if(typeof this.where === 'string')
					promises.push(deep(this).query("./where").load(params, false));
				else
					promises.push(this.where);

			// console.log("launch deep load");
			return deep.all(promises)
				.done(function(res) {
					//console.log("view deep load : res  : ", res);
					var res = {
						_deep_render_node_:true,
						what:res[0] || self,
						how:res[1],
						where:res[2],
						params:params,
						controller:self
					}
					//console.log("view deep load done : ", res);
					return res;
				})
				.logError();
		},
		refresh: function(params, loaded) {
			// console.log("view refresh : params : ", params, " - loaded : ", loaded);
			var self = this;
			params = params || this.params;
			if (params && !deep.isNode)
				this.params = params;
			var render = function(loaded) {
				// console.log("view render : ", loaded)
				if (!loaded)
					return;
				var what = loaded.controller, how=null, where=null,rendered = null,placed = null;
				if(loaded.what)
					what = loaded.what;
				if(loaded.how)
					how = loaded.how;
				if(loaded.where)
					where = loaded.where;
				what = (what && what._deep_query_node_) ? what.value : what;
				how = (how && how._deep_query_node_) ? how.value : how;
				where = (where && where._deep_query_node_) ? where.value : where;
				placed = self.placed ? self.placed() : null;

				loaded.placed =  placed;
				// console.log("render with : how : ", how, what)
				if(!how)
					return loaded;
				try {
					what.dp = {
						params:params,
						getRoute:self.getRoute
					};
					if(typeof how === 'function')
						rendered = loaded.rendered = how.call(self, what);
					else
						rendered = loaded.rendered = how;
					if (where)
						placed = loaded.placed = where.call(self, loaded.rendered, loaded.placed);
					else
						placed = loaded.placed = null;
				} catch (e) {
					// console.log("error while rendering")
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
				{
					
					console.log("view placed : placed = ", placed);

					$(placed).find("*").each(function(){
						//console.log("this.attributes :",this.attributes);
						for(var i in this.attributes)
						{
							if(!this.attributes.hasOwnProperty(i))
								continue;
							var attr = this.attributes[i];
							if(attr.name.indexOf("dp-") == 0 && deep.ui.View.htmlEnhancers[attr.name])
							{
								console.log("HTML enhancer matched : ", attr.name);
								var enhancer = deep.ui.View.htmlEnhancers[attr.name];
								promises.push(enhancer.call(self,loaded,this));
								break;
							}

						}
					});	









					//console.log("View placed");
					// for(var i in deep.ui.View.htmlEnhancers)
					// {
					// 	//console.log("run enhancer :", i);
					// 	var enhancer = deep.ui.View.htmlEnhancers[i];
					// 	promises.push(enhancer.call(self,loaded));
					// }
				}
				// console.log("rendered : ", loaded);
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
			.done(render)
			.fail(function(e){
				if (typeof self.fail === 'function')
					return self.fail(e) || e;
			});
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
		"dp-partial":function(renderOutput,node){
				var args = $(node).attr("dp-args") || null;
				return deep.getAll([$(node).attr("dp-partial"),args])
				.done(function(results) {
					var partials = results[0];
					var args = results[1];
					if(args)
						args._ctrl = renderOutput.controller;
					if (typeof partials === 'function')
						$(node).html(partials(args));
					$(node).html(partials);
				});
		},
		"dp-click":function(renderOutput,node){
			//console.log("DPCLICK : descriptor = ", renderOutput, "attributes : ", node);
				var action = $(node).attr("dp-click");
				var args = $(node).attr("dp-args").split(",") || [];
				$(node).click(function (e) {
					e.preventDefault();
					renderOutput.controller[action].apply(renderOutput.controller,args);
				});
				//console.log("inside a dpclick tag : Action = ", action, " Args : ", args);
		},
		"dp-repeat":function(renderOutput, node){
			//console.log("DP-REPEAT : descriptor = ", renderOutput);
			var promises = [];
			renderOutput.placed
			.find("div[dp-repeat]") //  <div partials="swig::...." >
			.each(function() {
				//console.log("inside a repeat tag");
				var rowNode = $(this);
				var rowHtml = deep.ui.swig(rowNode.outerHTML());

				renderOutput.controller.myDatas.forEach(function (data) {
					rowNode.after(rowHtml(data));
				});
			});
		}
	};
	return deep.View;
});



