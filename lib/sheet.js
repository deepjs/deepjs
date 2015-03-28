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
 *
 * TODO : 
 * - protocol sheet::a_dsl_to_describe_transformation_with_string
 *  - use directives parser
 * 	- allow to pass transformation as json :     "dq::./my/query":"sheet::up(bloupi) directive(arg)"
 *
 *
 * - allow direct deep.sheeter in _backgrounds and _foregrounds
 * e.g. : { _foregrounds:[ deep.compose.nodes.bottom(myLayer)] }
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "./utils", "./protocol", "./compiler", "./errors", "./promise", "./nodes/nodes"], 
function(require, utils, proto, compiler, errors, promise, nodes) {

	var sheets = {};

	sheets.Sheet = function(obj) {
		obj._deep_sheet_ = true;
		return obj;
	};

	var applyDefault = function(catched, toApply, options){
		if(typeof toApply !== "function")
			return errors.Error(500, "You try to apply sheets with something that's not a function.");
		return toApply.call(this, catched, options);
	};

	var applySheetEntry = function(sheet, key, options)
	{
		// console.log('sheet apply on entry : key :', key);
		var parsed = utils.parseRequest(key),
			toCatch = parsed.protocol + "::" + parsed.uri,
			toApply = sheet[key],
			method = applyDefault,
			catched = null;
		// console.log("sheet : ", parsed);
		if(parsed.method !== "get")
		{
			method = sheets.methods[parsed.method];
			if(!method)
				throw errors.Error(500, "you try to apply sheets with unknown method : "+parsed.method);
		}
		return this.when(proto.get(toCatch, options))
		.done(function(catched) {
			if(catched)
				return method.call(options.bind, catched, toApply, options);
		});
	};

	var linearSheet = function(entry, sheet, options)
	{
		if(typeof sheet === 'function')
			return promise.when(sheet(entry, options))
			.when(entry);
		var keys = Object.keys(sheet);
		var done = function(s){
			var key = keys.shift();
			if(key == "_deep_sheet_")
				key = keys.shift();
			if(!key)
				return s;
			return applySheetEntry.call(this, sheet, key, options)
			.done(done);
		};
		return new promise.Promise()
		.resolve(entry)
		.done(done)
		.elog()
		.done(function(success) {
			return entry;
		});
	};

	sheets.sheet = function() {
		var entry = arguments[0], sheet;
		if(arguments.length > 2)
		{
			var args = Array.prototype.slice.call(arguments);
			args.shift();
			var done = function (entry) {
				if(args.length)
				{
					this.done(done);
					return sheets.sheet(entry, args.shift());
				}
				return entry;
			};
			return promise.when(sheets.sheet(entry, args.shift()))
			.done(done)
			.elog();
		}
		else
			sheet = arguments[1];
		var options = options || {};
		options.entry = entry;
		options.fullOutput = true;
		options.bind = options.bind || {};
		//options.allowStraightQueries = false;
		return linearSheet(entry, sheet, options);
	};

	nodes.sheet = function(s, shts) {
		if(!s)
			return s;
		return promise.when(proto.getAll(shts))
		.done(function(objects) {
			if(s._deep_array_)
			{
				var promises = [];
				s.forEach(function(result) {
					promises.push(sheets.sheet.apply(sheets, [result].concat(objects)));
				});
				return promise.all(promises)
				.done(function(){ return s; });
			}
			else
				return sheets.sheet.apply(sheets, [s].concat(objects));
		});
	};	

	sheets.methods = {
		//________________________________________ SHEET PROTOCOLS
		up: function(catched, toApply, options) {
			return proto.getAll(toApply).done(function(objects){
				return nodes.ups(catched, objects);
			});
		},
		bottom: function(catched, toApply, options) {
			return proto.getAll(toApply).done(function(objects){
				return nodes.bottoms(catched, objects);
			});
		},
		equal: function(catched, toApply, options) {
			return new promise.Promise().resolve(catched).equal(toApply);
		},
		map: function(catched, toApply, options) {
			return nodes.map(catched, toApply);
		}
	};
	return sheets;
});