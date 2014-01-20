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
	deep.ui = {
		appendTo: function(selector, force) {
			return function(rendered, nodes) {
				console.log("deep.ui.appendTo : ", rendered, nodes, selector)
				if (!force && nodes && nodes.parents('html').length > 0) {
					var newNodes = $(rendered);
					$(nodes).replaceWith(newNodes);
					return newNodes;
				}
				nodes = $(rendered).appendTo(selector);
				//console.log("appendto : appended : ", $(selector));
				return nodes;
			};
		},
		prependTo: function(selector, force) {
			return function(rendered, nodes) {
				if (!force && nodes && nodes.parents('html').length > 0) {
					var newNodes = $(rendered);
					$(nodes).replaceWith(newNodes);
					return newNodes;
				}
				return $(rendered).prependTo(selector);
			};
		},
		replace: function(selector) {
			return function(rendered, nodes) {
				var newNodes = $(rendered);
				$(selector).replaceWith(newNodes);
				return newNodes;
			};
		},
		htmlOf: function(selector) {
			return function(rendered, nodes) {
				$(selector).empty();
				return $(rendered).appendTo(selector);
			};
		}
	};


	deep.protocols.dom = {};
	deep.protocols.dom.appendTo = function (selector, options) {
		return deep.ui.appendTo(selector);
	}
	deep.protocols.dom.prependTo = function (selector, options) {
		return deep.ui.prependTo(selector);
	}
	deep.protocols.dom.htmlOf = function (selector, options) {
		return deep.ui.htmlOf(selector);
	}
	deep.protocols.dom.replace = function (selector, options) {
		return deep.ui.replace(selector);
	}


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
			console.log("INTO done() ", success);
			if (success.placed) {

				success.placed
				.find("div[partials]") //  <div partials="swig::...." >
				.each(function() {
					console.log("INTO partials", $(this).html());
					var node = $(this);
					deep.get(node.attr("partials")).done(function(partials) {
						if (typeof partials === 'function')
							node.html(partials());
						node.html(partials);
					});
				});

				success.placed
				.find("div[property-bind]") // <div  data-bind="mp3::id/meta/artist" />
				.each(function() {
					// apply bind
					// check if edit-on-click attr
					// check any schema related attrs
					deep.ui.bind(this, $(this).attr("data-bind"), {
						directPatch: true,
						callback: null
					});
				});

				success.placed
				.find("div[data-form]")
				.each(function() {
					// apply bind
					// check any schema related attrs
					// check sown-on-error or show-on-success
				});

				var schema ={};
				success.placed
				.find("div[object-bind]") // <div  object-bind="mp3::id" schema:"jsion::",  maxLength="12"> 
				.each(function() {
					// apply bind
					// use deep.ui.from/to
					deep.ui.fromJSONBind("#item-form", schema);

					// check any schema related attrs
					// check sown-on-error or show-on-success
				});
			}

			// var bindOptions = {
			// 	callback: function(prop) {},
			// 	directPatch: true
			// };
			// deep.ui.bindInput("#test-input", "mp3::527a03e0c9f5cf073d4d3570/meta/year", bindOptions);
		},
		fail: function(e) {
			console.log("error while rendering : ", e);
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
					return {
						context: self,
						params: params,
						what: res[0],
						how: res[1],
						where: res[2]
					};
				});
		},
		refresh: function(params, loaded) {
			var self = this;
			if (arguments.length == 1)
				params = query;

			params = params || this.params;

			if (params)
				this.params = params;
			var render = function(loaded) {
				if (!loaded)
					return;
				var what = loaded.what || self,
					how = loaded.how,
					where = loaded.where,
					rendered = null,
					placed = null;
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
				try {
					rendered = o.rendered = how.call(self, o);
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
			return JSON.stringify(this);
		}
	});

	return deep.ui;

});