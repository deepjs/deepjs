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
 * 		
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "./utils", "./protocol", "./compiler", "./errors"], function(require, utils, proto, compiler, errors) {
	var sheets = {};

	sheets.Sheet = function(obj) {
		obj._deep_sheet_ = true;
		return obj;
	};

	var applyDefault = function(catched, toApply, options){
		if(typeof toApply !== "function")
			return errors.Error(500, "You try to apply sheets with something that's not a function.");
		return deep.when(toApply.call(this, catched, options))
	}

	sheets.sheet = function(sheet, entry) {
		// console.log('Will apply : ', sheet);
		var options = options || {};
		options.entry = entry;
		options.fullOutput = true;
		var res = [];
		Object.keys(sheet).forEach(function(i) {
			if (i === '_deep_sheet_')
				return;
			// console.log("sheet will parse : ", i);
			var parsed = utils.parseRequest(i),
				toCatch = parsed.protocol + "::" + parsed.uri,
				toApply = sheet[i],
				method = applyDefault,
				catched = null;
			// console.log("sheet : ", parsed);
			if(parsed.method !== "get")
			{
				method = sheets.methods[parsed.method];
				if(!method)
				{
					deep.error("error no method : ", parsed)
					throw errors.Error(500, "you try to apply sheets with unknown method : "+parsed.method);
				}
			}
			var d = deep.get(toCatch, options)
			.done(function(catched) {
				return method.call(options.bind, catched, toApply)
			});
			res.push(d);
		});
		return deep.all(res)
		.elog()
		.done(function(success) {
			return entry;
		});
	};

	sheets.methods = {
		//________________________________________ SHEET PROTOCOLES
		up: function(catched, toApply, options) {
			return deep(catched).up(toApply);
		},
		bottom: function(catched, toApply, options) {
			return deep(catched).bottom(toApply);
		},
		equal: function(catched, toApply, options) {
			return deep(catched).equal(toApply);
		},
		transform: function(catched, toApply, options) {
			return deep(catched).transform(toApply);
		}
	};
	return sheets;
});