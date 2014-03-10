/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Think about CSS. This module provides way to write real code sheets in js object format, 
 * that applies codes (up, bottom, etc) on part of object catched with queries (or selectors).
 *
 * Exactly as CSS applies style properties on part of DOM catched with selectors.
 *
 * Take a look to documenation on github.
 *
 * Frankly, its one of the gems of deeps : where Queried Layered AOP mixed with Protocols take all its sens.
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "./utils", "./protocol", "./compiler"], function (require, utils, proto)
{
	var sheet = {};
	sheet.sheet = function applySheet(sheet, entry, options)
	{
		options = options || {};
		options.entry = entry;
		var res = [];
		var report = {};
		Object.keys(sheet).forEach(function(i){
			if(i === '_deep_sheet_')
				return;
			var d = deep.get(i, options)
			.done(function(handler){
				return handler(sheet[i], options);
			})
			.done(function(s){
				report[i] = s;
			});
			res.push(d);
		});
		return deep.all(res)
		.done(function(success){
			return report;
		});
	};

	sheet.Sheet = function(obj){
		obj._deep_sheet_ = true;
		return obj;
	};

	function getSheeter(obj){
		var sheeter = obj;
		if(!sheeter._deep_sheeter_)
		{
			sheeter = {
				_deep_sheeter_:true,
				queue:[]
			};
			utils.up(sheet.sheeter, sheeter);
		}
		return sheeter;
	}

	sheet.sheeter = {
		deepLoad:function(context, destructive)
		{
			var sheeter = getSheeter(this);
			sheeter.queue.push(function(entry){
				return deep(entry).deepLoad(context, destructive);
			});
			return sheeter;
		},
		load:function(context, destructive)
		{
			var sheeter = getSheeter(this);
			sheeter.queue.push(function(entry){
				return deep(entry).load(context, destructive)
				.done(function(success){
					return entry;
				});
			});
			return sheeter;
		},
		up:function(){
			var args = arguments;
			var sheeter = getSheeter(this);
			sheeter.queue.push(function(entry){
				var d = deep(entry);
				return d.up.apply(d, args);
			});
			return sheeter;
		},
		bottom:function(){
			var args = arguments;
			var sheeter = getSheeter(this);
			sheeter.queue.push(function(entry){
				var d = deep(entry);
				return d.bottom.apply(d, args);
			});
			return sheeter;
		},
		backgrounds:function(){
			var args = Array.prototype.slice.call(arguments);
			var sheeter = getSheeter(this);
			sheeter.queue.push(function(entry){
				utils.bottom({backgrounds:args}, entry.value);
				return deep.extendsBackgrounds(entry);
			});
			return sheeter;
		},
		flatten:function(){
			var sheeter = getSheeter(this);
			sheeter.queue.push(function(entry){
				return deep(entry).flatten();
			});
			return sheeter;
		},
		sheet:function(){
			var args = arguments;
			var sheeter = getSheeter(this);
			sheeter.queue.push(function(entry){
				var d = deep(entry);
				return d.sheet.apply(d, args)
				.done(function(success){
					return entry;
				});
			});
			return sheeter;
		},
		transform:function(fn){
			var sheeter = getSheeter(this);
			sheeter.queue.push(function(item){
				var value = item;
				if(item._deep_query_node_)
					value = item.value;
				var r = fn(value);
				return deep.when(r)
				.done(function(r){
					if(item._deep_query_node_)
					{
						if(item.ancestor)
							item.ancestor.value[item.key] = r;
						item.value = r;
					}
					else
						item = r;
					return r;
				});
			});
			return sheeter;
		}
	};

	proto.protocols.SheetProtocoles = {
		//________________________________________ SHEET PROTOCOLES
		up:function (request, options) {
			options = options || {};
			var self = this;
			return function dodqUP(layer){
				options.allowStraightQueries = false;
				options.resultType = "full";
				return deep.when(self.get(request, options))
				.done(function(r){
					var modified = [];
					//console.log("sheet up protocol : getted : ", r );
					if(r)
						r.forEach(function(item){
							var value = item;
							if(item._deep_query_node_)
								value = item.value;
							var f = utils.up(layer, value);
							if(item.ancestor)
								item.ancestor.value[item.key] = f;
							modified.push(f);
						});
					return modified;
				});
			};
		},
		bottom:function (request, options) {
			options = options || {};
			var self = this;
			return function dodqBottom(layer){
				options.allowStraightQueries = false;
				options.resultType = "full";
				return deep.when(self.get(request, options))
				.done(function(r){
					var modified = [];
					if(r)
						r.forEach(function(item){
							var value = item;
							if(item._deep_query_node_)
								value = item.value;
							var f = utils.bottom(layer, value);
							if(item.ancestor)
								item.ancestor.value[item.key] = f;
							modified.push(f);
						});
					return modified;
				});
			};
		},
		backgrounds:function (request, options) {
			options = options || {};
			var self = this;
			return function dodqBottom(layer){
				options.allowStraightQueries = false;
				options.resultType = "full";
				return deep.when(self.get(request, options))
				.done(function(r){
					var modified = [], promises = [];
					if(r)
						r.forEach(function(item){
							var value = item;
							if(item._deep_query_node_)
								value = item.value;
							utils.bottom({backgrounds:(layer.forEach?layer:[layer])}, value);
							promises.push(deep.extendsBackgrounds(item));
							modified.push(item);
						});
					return deep.all(promises)
					.done(function(){
						return modified;
					});
				});
			};
		},
		sheeter:function(request, options){
			options = options || {};
			var self = this;
			return function doDQSheeter(sheeter){
				options.allowStraightQueries = false;
				options.resultType = "full";
				return deep.when(self.get(request, options))
				.done(function(r){
					var promises = [];
					if(r)
						r.forEach(function(item){
							var value = item;
							if(item._deep_query_node_)
								value = item.value;
							var d = deep.wired(sheeter.queue, [item], {})
							.done(function(res){
								item.value = res;
								if(item.ancestor)
									item.ancestor.value[item.key] = res;
							});
							promises.push(d);
						});
					return deep.all(promises);
				});
			};
		},
		seriesCall:function (request, options) {
			options = options || {};
			var self = this;
			return function dodqSeries(fn){
				options.allowStraightQueries = false;
				options.resultType = null;
				return deep.when(self.get(request, options))
				.done(function(r){
					var results = [];
					var err = null;
					if(r && r.length > 0)
					{
						var def = deep.Deferred();
						var end = function(){
							if(err)
								def.reject(err);
							else
								def.resolve(results);
						};
						var cycle = function(){
							var item = r.shift();
							var output = null;
							if(typeof fn === 'string')
							{
								if(typeof item[fn] === 'function')
									output = item[fn]();
							}
							else
								output = fn.apply(item);
							if(output instanceof Error)
							{
								err = output;
								return end();
							}
							if(output && output.then)
								deep.when(output)
								.done(function (s){
									results.push(s);
									if(r.length > 0)
										cycle();
									else end();
								})
								.fail(function (error) {
									def.reject(error);
								});
							else {
								results.push(output);
								if(r.length > 0)
									cycle();
								else end();
							}
						};
						cycle();
						return def.promise();
					}
					return results;
				});
			};
		},
		paralleleCall:function (request, options) {
			options = options || {};
			var self = this;
			return function dodqCall(fn){
				options.allowStraightQueries = false;
				options.resultType = null;
				return deep.when(self.get(request, options))
				.done(function(r){
					//console.log("sheet call protocol : getted : ", r );
					if(!r)
						return [];
					var res = [];
					r.forEach(function(item){
						if(typeof fn === 'string')
						{
							if(typeof item[fn] === 'function')
								res.push(item[fn]());
							else
								res.push(undefined);
						}
						else
							res.push(fn.apply(item));
					});
					return deep.all(res);
				});
			};
		},
		transform:function (request, options) {
			options = options || {};
			var self = this;
			return function doDqTransform(fn){
				options.allowStraightQueries = false;
				options.resultType = "full";
				return deep.when(self.get(request, options))
				.done(function(r){
					var res = [];
					if(r)
						r.forEach(function(item){
							var value = item;
							if(item._deep_query_node_)
								value = item.value;
							var r = fn(value);
							if(r && (r.then || r.promise))
								r = deep.when(r)
								.done(function(r){
									if(item._deep_query_node_)
									{
										item.value = r;
										if(item.ancestor)
											item.ancestor.value[item.key] = r;
									}
								});
							else if(item._deep_query_node_){
								item.value = r;
								if(item.ancestor)
									item.ancestor.value[item.key] = r;
							}
							res.push(r);
						});
					return deep.all(res);
				});
			};
		},
		through:function (request, options) {
			options = options || {};
			var self = this;
			return function doDqTransform(fn){
				options.allowStraightQueries = false;
				options.resultType = "full";
				return deep.when(self.get(request, options))
				.done(function(r){
					var res = [];
					if(r)
						r.forEach(function(item){
							var value = item;
							if(item._deep_query_node_)
								value = item.value;
							var r = fn(value);
							res.push(r);
						});
					return res;
				});
			};
		},
		equal:function (request, options) {
			options = options || {};
			var self = this;
			return function dodqEqual(compare){
				options.allowStraightQueries = false;
				options.resultType = null;
				var res = [];
				return deep.when(self.get(request, options))
				.done(function(r){
					var ok = true;
					if(r)
						ok = r.every(function(item){
							return utils.deepEqual(item, compare);
						});
					return ok || deep.errors.PreconditionFail("sheet equality failed");
				});
			};
		}
	};
	utils.bottom(proto.protocols.SheetProtocoles, proto.protocols.dq);
	return sheet;
});

