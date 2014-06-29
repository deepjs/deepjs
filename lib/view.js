/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
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
/**
 * view refresh sequence : arg = route params
 * 	if(!initialised)
 * 		init()
 * 	then
 * 		load(params);
 * 			deepLoad what, how, where
 * 		render(loaded);
 * 			how(context);
 * 		 	where(context);
 * 		  	enhance(context);
 * 		   	done(context);
 *
 * View remove sequence : 
 * 		remove each subs
 * 		remove each dp-controlled
 * 		remove html node
 * 		clean();
 */

	deep.ui.View = deep.compose.Classes(function(layer) {
		deep.utils.up(layer, this);
	}, {
		//what:"this::!",
		_deep_view_: true,
		how:undefined,
		//where:"dom.appendTo::#ng-view",
		done:undefined,
		fail: function(e) {
			deep.utils.dumpError(e);
			if(!this.where)
				return e;
			if(typeof this.where === 'string')
				return deep(this.where).done(function(s){
					if(typeof s === 'function')
						s(e.toString());
					else
						$(s).replaceWith(e.toString());
					return e;
				});
			else if(typeof this.where === 'function')
				this.where(e.toString());
			else if(typeof jQuery !== 'undefined' && this.where instanceof jQuery)
				$(this.where).html(e.toString());
		},
		remove: function() {
			//console.log("VIEW REMOVE : ", this.placed);
			if(this.subs)
				for(var i in this.subs)
					this.subs[i].remove();
			if(this._deep_controlled_)
			{
				for(var i in this._deep_controlled_)
					this._deep_controlled_[i].remove();
				this._deep_controlled_ = null;
			}
			if (this.placed)
				deep.context.$(this.placed()).remove();
			if(this.clean)
				this.clean();
			this.initialised = false;
			this.placed = null;
		},
		load: function(opt) {
			opt = opt || {};
			var params = opt.params;
			var config = this.config || {};
			if(params && Object.keys(params).length === 0)
				params = null;
			if(config.scope && config.scope != "both")
				if(!deep.isBrowser)
				{
					if(config.scope != "server")
						return;
				}
				else if(config.scope != "browser")
					return;
			var self = this;
			if(this.init && (deep.context.concurrency || !this.initialised))
				return deep.when(this.init())
				.done(function(success){
					self.initialised = true;
					return self.load({ params:params });
				});
			if (this.condition === false)
				return null;
			if (this.condition)
				if (typeof this.condition === "function" && !this.condition.apply(params))
					return null;
			var promises = [];
			if (this.what)
				promises.push(deep(this).query("./what").deepLoad(params, false));
			else
				promises.push(null);

			if (typeof this.how === 'string')
				promises.push(deep(this).query("./how").deepLoad(params, false, true));
			else
				promises.push(this.how);

			if (this.where)
				if (typeof this.where === 'string')
					promises.push(deep(this).query("./where").deepLoad(params, false, true));
				else
					promises.push(this.where);

			// console.log("launch deep load");
			return deep.all(promises)
				.done(function(res) {
					//console.log("view deep load : res  : ", res);
					var result = {
						_deep_render_node_: true,
						what: res[0],
						how: res[1],
						where: res[2],
						params: params
					};
					// console.log("view deep load done : ", self.how);
					return result;
				})
				.fail(function(e){
					if (typeof self.fail === 'function')
						return self.fail(e) || e;
					return e;
				});
		},
		refresh: function(arg /* params, loaded, routeMatch */) {
			var config = this.config || {};
			if(config.scope && config.scope != "both")
				if(deep.isBrowser)
				{
					if(config.scope != "browser")
						return;
				}
				else if(config.scope != "server")
					return;
			// console.log("view refresh : params : ", params, " - loaded : ", loaded);
			var self = this;
			if(this.init && (deep.context.concurrency || !this.initialised))
				return deep.when(this.init())
				.done(function(success){
					self.initialised = true;
					return self.refresh(arg);
				});
			var loaded, params, routeMatch;
			if(arg)
				if(arg._deep_render_node_)
				{
					loaded = arg;
					params = loaded.params;
				}
				else if(arg._deep_matched_node_)
				{
					loaded = arg.loaded;
					params = arg.output;

					routeMatch = arg;
				}
				else
					params = arg;
			params = params || this.params;
			if (params && deep.isBrowser)
				this.params = params;

			var render = function(loaded) {
				// console.log("view render : ", loaded)
				if (!loaded)
					return;
				if(self._deep_controlled_)
				{
					for(var i in self._deep_controlled_)
						self._deep_controlled_[i].remove();
					self._deep_controlled_ = null;
				}
				var what = null,
					how = null,
					where = null,
					rendered = null,
					placed = null;
				if (loaded.what)
					what = loaded.what;
				if (loaded.how)
					how = loaded.how;
				if (loaded.where)
					where = loaded.where;
				what = (what && what._deep_query_node_) ? what.value : what;
				how = (how && how._deep_query_node_) ? how.value : how;
				where = (where && where._deep_query_node_) ? where.value : where;

				if (what && what._deep_ocm_)
					what = what();
				if (how && how._deep_ocm_)
					how = how();
				if (where && where._deep_ocm_)
					where = where();

				loaded.what = what;
				loaded.how = how;
				loaded.where = where;
				loaded.params = params;

				placed = self.placed ? self.placed() : null;

				loaded.placed = placed;
				loaded.ctrl = self;
				// console.log("render with : how : ", how, what)
				try {
					// console.log("XHAT : ", what);
					if (routeMatch) {
						loaded.route = routeMatch;
					}
					if (typeof how === 'function')
						rendered = loaded.rendered = how.call(self, loaded);
					else
						rendered = loaded.rendered = how;
					if (where && typeof where === 'function')
						placed = loaded.placed = where.call(self, loaded.rendered, loaded.placed);
					else if(typeof jQuery !== 'undefined' && where instanceof jQuery)
						placed = loaded.placed = where;
					else if(typeof where === 'string' && deep.context.$)
						placed = loaded.placed = deep.context.$(where);
					/*else
						placed = loaded.placed = null;*/
				} catch (e) {
					// console.log("error while rendering :  ",e);
					if (typeof self.fail === 'function')
						return self.fail(e) || e;
					return e;
				}

				if (placed && !deep.context.concurrency)
					self.placed = function() {
						return placed;
					};

				var promise = null;
				if (config.enhance !== false && placed && deep.context.$) {
					//console.log("view placed : placed = ", placed);					
					if (placed._deep_html_merged_) {
						var subprom = [];
						for (var i in placed) {
							if (i === '_deep_html_merged_')
								continue;
							subprom.push(self.enhance(placed[i]))
						}
						promise = deep.all(subprom);
					} else
						promise = self.enhance(placed);
				}
				// console.log("rendered : ", loaded);
				if (promise)
					return promise
						.done(function() {
							if (typeof self.done === "function") {
								var done = self.done;
								if (done._deep_ocm_)
									done = done();
								return done.call(self, loaded) || loaded;
							}
							return loaded;
						})
						.fail(function(e){
							if (typeof self.fail === 'function')
								return self.fail(e) || e;
							return e;
						});
				if (typeof self.done === "function") {
					var done = self.done;
					if (done._deep_ocm_)
						done = done();
					return done.call(self, loaded) || loaded;
				}
				return loaded;
			};
			var  p;
			if (loaded)
				p = deep.when(render(loaded))
				.fail(function(e) {
					if (typeof self.fail === 'function') {
						var fail = self.fail;
						if (fail._deep_ocm_)
							fail = fail();
						return fail.call(self, e) || e;
					}
				});
			else
				p = deep.when(this.load({params:params}))
				.done(function(){
					this.done(render)
					.fail(function(e) {
						if (typeof self.fail === 'function') {
							var fail = self.fail;
							if (fail._deep_ocm_)
								fail = fail();
							return fail.call(self, e) || e;
						}
					});
				});			
			return	p;
		},
		enhance: function(selector, currentRoute) {
			//console.log("enhance : ", selector);
			var promises = [];
			var self = this;
			deep.context.$(selector)
				.find("*")
				.each(function(index, element) {
					
					//console.log("try enhance on : ", this);
					var attr, i, len, enhancer, node = this;
					if (!deep.isBrowser) 		// ____________________ CHEERIO specific
					{
						for (i = 0, len = this.length; i < len; ++i) {
							var e = this[i];
							if (!e.attribs)
								continue;
							for (var j in e.attribs) {
								attr = e.attribs[j];
								//console.log("attr : ",attr.name);
								if (j.indexOf("dp-") === 0 && deep.ui.View.htmlEnhancers[j]) {
									// console.log("HTML enhancer matched : ", attr.name);
									var scope = $(this).attr("dp-scope");
									if(scope && scope != 'both' && scope != 'server')
										break;
									enhancer = deep.ui.View.htmlEnhancers[j];
									promises.push(enhancer.call(self, this, currentRoute))
									break;
								}
							}
						}
						return true;
					}

					if (!this.attributes)
						return;
					for (i = 0, len = this.attributes.length; i < len; ++i) {
						attr = this.attributes[i];
						//console.log("attr : ",attr.name);
						if (attr.name.indexOf("dp-") === 0 && deep.ui.View.htmlEnhancers[attr.name]) {
							// console.log("HTML enhancer matched : ", attr.name);
							var scope = $(this).attr("dp-scope");
							if(scope && scope != 'both' && scope != 'browser')
								break;
							enhancer = deep.ui.View.htmlEnhancers[attr.name];
							promises.push(enhancer.call(self, this, currentRoute));
							break;
						}
					}
				});
			if (promises.length === 0)
				return null;
			return deep.all(promises);
		},
		toString: function() {
			return "default view render.";
		}
	});

	deep.ui.enhance = function(selector, ctrl, route){
		return deep.ui.View.prototype.enhance.call(ctrl || {}, selector, route);
	}

	deep.View = function(layer) {
		return new deep.ui.View(layer);
	};

	if (deep.isBrowser)
		deep.Chain.add("refresh", function() {
			var args = arguments;
			var self = this;
			var func = function(s, e) {
				var alls = [];
				deep.chain.each(self, function(v) {
					if (typeof v.refresh === "function")
						alls.push(v.refresh.apply(v, args));
					else
						alls.push(v);
				});
				return deep.all(alls)
					.done(function(alls) {
						if (!self._queried)
							return alls.shift();
						return alls;
					});
			};
			func._isDone_ = true;
			deep.chain.addInChain.call(self, func);
			return this;
		});

	deep.ui.View.htmlEnhancers = {
		"dp-partial": function(node, route) {
			//console.log("dp-partial")
			var $ = deep.context.$;
			var controller = this;
			var args = $(node).attr("dp-args") || null;
			return deep.getAll([$(node).attr("dp-partial"), args])
				.done(function(results) {
					//console.log("dp-partial get : ", results)
					var partials = results[0];
					var args = results[1];
					if (args)
						args._ctrl = controller;
					else
						args = {
							_ctrl: controller
						};
					if (typeof partials === 'function')
						$(node).html(partials(args));
					else
						$(node).html(partials);
					$(node).removeAttr("dp-partial");
					return controller.enhance(node);
				});
		},
		"dp-click": function(node, route) {
			if (!deep.isBrowser)
				return;
			//console.log("DPCLICK : descriptor = ", controller, "attributes : ", node);
			var $ = deep.context.$;
			var controller = this;
			var action = $(node).attr("dp-click");
			var args = $(node).attr("dp-args");
			if (args)
				args = args.split(",");
			$(node).click(function(e) {
				e.preventDefault();
				controller[action].apply(controller, args);
				return false;
			});
			//console.log("inside a dpclick tag : Action = ", action, " Args : ", args);
		},
		"dp-repeat": function(node, route) {
			//console.log("DP-REPEAT : descriptor = ", controller);
			var $ = deep.context.$;
			var controller = this;
			var rowNode = $(node);
			var rowHtml = deep.ui.swig(deep.jquery(rowNode));
			controller.myDatas.forEach(function(data) {
				rowNode.after(rowHtml(data));
			});
			rowNode.remove();
		},
		"dp-from": function(node, route) {
			var $ = deep.context.$;
			var controller = this;
			var from = $(node).attr("dp-from");
			return deep.get(from)
				.done(function(result) {
					//console.log("dp-from ", from," : get : ", result)
					if (typeof result === 'function')
						$(node).html(result({
							_ctrl: controller
						}));
					else
						$(node).html(result);
					$(node).removeAttr("dp-from");
					return controller.enhance(node);
				});
		},
		"dp-translate": function(node, route) {
			var $ = deep.context.$;
			var controller = this;
			var from = $(node).attr("dp-from");
			return deep.get(from)
				.done(function(result) {
					//console.log("dp-from ", from," : get : ", result)
					$(node).html(result[deep.context.language]);
					$(node).removeAttr("dp-translate");
				});
		},
		"dp-control":function(node, route){
			var $ = deep.context.$,
				controller = this,
				from = $(node).attr("dp-control").split(",");
				$(node).removeAttr("dp-control");
			return deep.compile.apply(deep, from)
			.done(function(ctrl) {
				if(!ctrl)
					return deep.errors.Internal("dp-control has retrieved nothing");
				var config = ctrl.config || {};
				if(config.scope && config.scope != "both")
					if(!deep.isBrowser)
					{
						if(config.scope != "server")
							return;
					}
					else if(config.scope != "browser")
							return;
				var label = "view"+Date.now().valueOf();
				controller._deep_controlled_ = controller._deep_controlled_ || {};
				controller._deep_controlled_[label] = ctrl;
				ctrl.placed = function(){ return node; };
				//console.log("dp-control : ", from);
				return ctrl.refresh();
			});
		}
	};

	/* SHOULD DO the same as dp-control*/
	deep.ui.control = function(selector, ctrl)
	{

	}

	deep.coreUnits = deep.coreUnits || [];
	deep.coreUnits.push("js::deepjs/units/views");

	return deep.ui.View;
});