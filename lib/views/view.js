/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../../deep", "../errors", "./directives"], function(require, deep, errors) {
"use strict";

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
	
	deep.errors.UI = function(msg, report, fileName, lineNum){
		if(typeof msg === 'object')
			report = msg;
		if(!msg)
			msg = "UIError";
		return errors.Error(1500, msg, report, fileName, lineNum);
	};

	deep.ui.View = deep.Classes(function(layer) {
		deep.up(layer, this);
	}, {
		_deep_view_: true,
		how: undefined,
		done: undefined,
		fail: function(e) {
			deep.utils.dumpError(e);
			if (!this.where)
				return e;
			if (typeof this.where === 'string')
				return deep(this.where).done(function(s) {
					if (typeof s === 'function')
						s(e.toString());
					else
						$(s).replaceWith(e.toString());
					return e;
				});
			else if (typeof this.where === 'function')
				this.where(e.toString());
			else if (typeof jQuery !== 'undefined' && this.where instanceof jQuery) // WARNING : cheerio case not managed
				$(this.where).html(e.toString());
		},
		addSubControlled:function(ctrl){
			var label = "view" + Date.now().valueOf();
			this._deep_controlled_ = this._deep_controlled_ || {};
			this._deep_controlled_[label] = ctrl;
		},
		remove: function() {
			//console.log("VIEW REMOVE : ", this.placed);
			if (this.subs)
				for (var i in this.subs)
					this.subs[i].remove();
			if (this._deep_controlled_) {
				for (var i in this._deep_controlled_)
					this._deep_controlled_[i].remove();
				this._deep_controlled_ = null;
			}
			if (deep.context.$ && this.placed)
				deep.context.$(this.placed()).remove();
			if (this.clean)
				this.clean();
			this.initialised = false;
			this.placed = null;
		},
		load: function(opt) {
			opt = opt || {};
			var params = opt.params;
			var config = this.config || {};
			if (params && Object.keys(params).length === 0)
				params = null;
			if (config.scope && config.scope != "both")
				if (!deep.isBrowser) {
					if (config.scope != "server")
						return;
				} else
			if (config.scope != "browser")
				return;
			var self = this;
			if (this.init && (deep.context.concurrency || !this.initialised))
				return deep.when(this.init())
					.done(function(success) {
						self.initialised = true;
						return self.load({
							params: params
						});
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
				.fail(function(e) {
					if (typeof self.fail === 'function')
						return self.fail(e) || e;
					return e;
				});
		},
		refresh: function(arg /* params, loaded, routeMatch */ ) {
			var config = this.config || {};
			if (config.scope && config.scope != "both")
				if (deep.isBrowser) {
					if (config.scope != "browser")
						return;
				} else
			if (config.scope != "server")
				return;
			// console.log("view refresh : params : ", params, " - loaded : ", loaded);
			var self = this;
			if (this.init && (deep.context.concurrency || !this.initialised))
				return deep.when(this.init())
					.done(function(success) {
						self.initialised = true;
						return self.refresh(arg);
					});
			var loaded, params, routeMatch;
			if (arg)
				if (arg._deep_render_node_) {
					loaded = arg;
					params = loaded.params;
				} else
			if (arg._deep_matched_node_) {
				loaded = arg.loaded;
				params = arg.output;

				routeMatch = arg;
			} else
				params = arg;
			params = params || this.params;
			if (params && deep.isBrowser)
				this.params = params;

			var render = function(loaded) {
				// console.log("view render : ", loaded)
				if (!loaded)
					return;
				if (self._deep_controlled_) {
					for (var i in self._deep_controlled_)
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
					else if (typeof jQuery !== 'undefined' && where instanceof jQuery)
						placed = loaded.placed = where;
					else if (typeof where === 'string' && deep.context.$)
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
							subprom.push(deep.ui.enhance(self, placed[i], loaded))
						}
						promise = deep.all(subprom);
					} else
						promise = deep.ui.enhance(self, placed, loaded);
				}

				// console.log("rendered : ", loaded);
				if (promise)
					return promise
						.done(function() {
							if(deep.isBrowser && placed && deep.route && deep.route.relink)
								deep.route.relink(placed);
							if (typeof self.done === "function") {
								var done = self.done;
								if (done._deep_ocm_)
									done = done();
								return done.call(self, loaded) || loaded;
							}
							return loaded;
						})
						.fail(function(e) {
							if (typeof self.fail === 'function')
								return self.fail(e) || e;
							return e;
						});
				if(deep.isBrowser && placed && deep.route && deep.route.relink)
					deep.route.relink(placed);
				if (typeof self.done === "function") {
					var done = self.done;
					if (done._deep_ocm_)
						done = done();
					return done.call(self, loaded) || loaded;
				}
				return loaded;
			};
			var p;
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
				p = deep.when(this.load({
					params: params
				}))
					.done(function() {
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
			return p;
		}
	});
	deep.View = function(layer) {
		return new deep.ui.View(layer);
	};
	deep.coreUnits = deep.coreUnits || [];
	deep.coreUnits.push("js::deepjs/units/views");
	return deep.ui.View;
});