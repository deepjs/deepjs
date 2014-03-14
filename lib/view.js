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

/*
	TODO
    put a map in Views that says : 
    destructive : {
        what:false,
        how:true,
        where:true
    }
    interpretable : {
        what:true,
        how:true,
        where:true
    }
    loadable:{
        what:"deepload::func,string",
        how:"load::string",
        where:"load::string"
    }
    ==> or similar (maybe one only map that contains both parameters)
*/


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
			deep.utils.dumpError(e);
		},
		remove:function () {
			//console.log("VIEW REMOVE : ", this.placed);
			if(this.placed && deep.jquery.DOM.isInDOM(this.placed()))
				deep.context.$(this.placed()).remove();
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
					var result = {
						_deep_render_node_:true,
						what:res[0] || self,
						how:res[1],
						where:res[2],
						params:params,
						controller:self
					};
					//console.log("view deep load done : ", res);
					return result;
				})
				.logError();
		},
		refresh: function(params, loaded, routeMatch) {
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

				if(what && what._deep_ocm_)
					what = what();
				if(how && how._deep_ocm_)
					how = how();
				if(where && where._deep_ocm_)
					where = where();

				placed = self.placed ? self.placed() : null;

				loaded.placed =  placed;
				// console.log("render with : how : ", how, what)
				if(!how)
					return loaded;
				try {
					what._ctrl = self;
					if(routeMatch)
					{
						what._route = routeMatch;
						loaded.getRoute = self.getRoute = routeMatch.get;
						loaded.go = self.go = routeMatch.go;
					}
					if(typeof how === 'function')
						rendered = loaded.rendered = how.call(self, what);
					else
						rendered = loaded.rendered = how;
					if (where)
						placed = loaded.placed = where.call(self, loaded.rendered, loaded.placed);
					else
						placed = loaded.placed = null;
				} catch (e) {
					// console.log("error while rendering :  ",e);
					if (typeof self.fail === 'function')
						return self.fail(e) || e;
					return e;
				}

				if (placed && !deep.isNode)
					self.placed = function() {
						return placed;
					};

				var promise = null;
				if (placed)
				{
					//console.log("view placed : placed = ", placed);
					promise = self.enhance(placed);
				}
				// console.log("rendered : ", loaded);
				if(promise)
					return promise
					.done(function(){
						if (typeof self.done === "function")
						{
							var done = self.done;
							if(done._deep_ocm_)
								done = done();
							return done.call(self, loaded) || loaded;
						}
						return loaded;
					});
				if (typeof self.done === "function")
				{
					var done = self.done;
					if(done._deep_ocm_)
						done = done();
					return done.call(self, loaded) || loaded;
				}
				return loaded;
			};
			if (loaded)
				return render(loaded);
			return deep.when(this.load(params))
			.done(render)
			.fail(function(e){
				if (typeof self.fail === 'function')
				{
					var fail = self.fail;
					if(fail._deep_ocm_)
						fail = fail();
					return fail.call(self, e) || e;
				}
			});
		},
		enhance:function(selector){
			//console.log("enhance : ", selector);
			var promises = [];
			var self = this;
			deep.context.$(selector)
			.find("*")
			.each(function(index, element){
				//console.log("try enhance on : ", this);
				var attr, i, len, enhancer;
				if(deep.isNode)
				{
					for(i = 0, len = this.length; i<len; ++i)
					{
						var e = this[i];
						if(!e.attribs)
							continue;
						for(var j in e.attribs)
						{
							attr = e.attribs[j];
							//console.log("attr : ",attr.name);
							if(j.indexOf("dp-") === 0 && deep.ui.View.htmlEnhancers[j])
							{
								// console.log("HTML enhancer matched : ", attr.name);
								enhancer = deep.ui.View.htmlEnhancers[j];
								promises.push(enhancer.call(self,this));
								break;
							}
						}
					}
					return true;
				}

				if(!this.attributes)
					return;
				for(i = 0, len = this.attributes.length; i< len;++i)
				{
					attr = this.attributes[i];
					//console.log("attr : ",attr.name);
					if(attr.name.indexOf("dp-") === 0 && deep.ui.View.htmlEnhancers[attr.name])
					{
						// console.log("HTML enhancer matched : ", attr.name);
						enhancer = deep.ui.View.htmlEnhancers[attr.name];
						promises.push(enhancer.call(self,this));
						break;
					}
				}
			});
			if(promises.length === 0)
				return null;
			return deep.all(promises);
		},
		toString: function(pretty) {
			return "default view render.";
		}
	});

	deep.View = function (layer) {
		return new deep.ui.View(layer);
	};

	if(!deep.isNode)
		deep.Chain.add("refresh", function()
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
		"dp-partial":function(node){
			//console.log("dp-partial")
			var $ = deep.context.$;
			var controller = this;
			var args = $(node).attr("dp-args") || null;
			return deep.getAll([$(node).attr("dp-partial"),args])
			.done(function(results) {
				//console.log("dp-partial get : ", results)
				var partials = results[0];
				var args = results[1];
				if(args)
					args._ctrl = controller;
				else
					args = { _ctrl:controller };
				if (typeof partials === 'function')
					$(node).html(partials(args));
				else
					$(node).html(partials);
				$(node).removeAttr("dp-partial");
				controller.enhance(node);
			});
		},
		"dp-click":function(node){
			if(deep.isNode)
				return;
			//console.log("DPCLICK : descriptor = ", controller, "attributes : ", node);
			var $ = deep.context.$;
			var controller = this;
			var action = $(node).attr("dp-click");
			var args = $(node).attr("dp-args");
			if(args)
				args = args.split(",");
			$(node).click(function (e) {
				e.preventDefault();
				controller[action].apply(controller,args);
				return false;
			});
			//console.log("inside a dpclick tag : Action = ", action, " Args : ", args);
		},
		"dp-repeat":function(node){
			//console.log("DP-REPEAT : descriptor = ", controller);
			var $ = deep.context.$;
			var controller = this;
			var rowNode = $(node);
			var rowHtml = deep.ui.swig(deep.jquery(rowNode));
			controller.myDatas.forEach(function (data) {
				rowNode.after(rowHtml(data));
			});
			rowNode.remove();
		}
	};
	return deep.ui.View;
});



