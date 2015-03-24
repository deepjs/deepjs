/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "./utils"], function(require, utils) {
	"use strict";
	var compiler = {

	};
	compiler.Shared = function(datas) {
		//console.log("CREATE DEEPSHARED")
		datas._deep_shared_ = true;
		return datas;
	};
	compiler.compile = function() {
		var base = utils.copy(arguments[0]);
		var len = arguments.length;
		for (var i = 1; i < len; ++i)
			compiler.aup(arguments[i], base);
		return base;
	};
	utils.decorateUpFrom = function(src, target, properties) {
		properties.forEach(function(prop) {
			if (typeof src[prop] !== 'undefined')
				target[prop] = compiler.aup(src[prop], target[prop]);
		});
	};
	utils.decorateBottomFrom = function(src, target, properties) {
		properties.forEach(function(prop) {
			if (typeof src[prop] !== 'undefined')
				target[prop] = compiler.abottom(src[prop], target[prop]);
		});
	};
	utils.upFromArgs = compiler.upFromArgs = function(base, args, opt) {
		var len = args.length - 1;
		for (; len > -1; --len)
			base = compiler.aup(args[len], base, opt);
		return base;
	};
	utils.bottomFromArgs = compiler.bottomFromArgs = function(base, args, opt) {
		var len = args.length - 1;
		for (; len > -1; --len)
			base = compiler.abottom(args[len], base, opt);
		return base;
	};
	/*
		utils.set = function(root, query, value)
		{
			var splitted = query;
			if(!query.forEach)
				splitted = query.replace("]", "[").split("[");
			split = splitted.shift();
			var tmp = root;
			while(split)
			{
				if(split[0] == '/')
				{
					var key = split.substring(1);
					if(key[key.length-1] == '/')
						key = key.substring(0,key.length-1);
					if(tmp[key])
						tmp = tmp[key];
					split = splitted.shift();
					continue;
				}
				var list = split.split(",");
				for(var i =0; i < list.length; ++i)
					if(tmp[list[i]])
						utils.set(tmp[list[i]]);

			}			
		}
*/

	compiler.aup = function(src, target, opt){
		// console.log("aup : ", src, target, opt)
		if (typeof src === 'undefined')
			return target;
		if (src === null)
			return null;
		opt = opt || {};
		if (typeof target === 'undefined' || target === null)
			return utils.copy(src, false, opt.excludeGrounds);
		/*if (src._deep_sheet_) {
			throw new Error("using sheets through up");
			if (!target._deep_sheet_) {
				deep.sheet(src, target);
				return target;
			}
		} else if (target._deep_sheet_) {
			throw new Error("using sheets through up");
			src = utils.copy(src);
			return src;
		}*/
		if (target._deep_compiler_) {
			target = target._up(src);
			return target;
		}
		if (src._deep_compiler_) {
			if (src._clone)
				src = src._clone()
			return src._bottom(target);
		}
		if (src._deep_shared_) {
			//console.log("up from shared");
			src._deep_shared_ = false;
			target = compiler.abottom(target, src);
			src._deep_shared_ = true;
			return target;
		}
		if (target._deep_shared_) {
			//console.log("up to shared : ", parent, key)
			target._deep_shared_ = false;
			target = compiler.abottom(target, src);
			target._deep_shared_ = true;
			return target;
		}
		var srcType = utils.getJSPrimitiveType(src);
		var targetType = utils.getJSPrimitiveType(target);
		if (srcType !== targetType) {
			//console.log("aup will copy : srctype != targetType : ", srcType, targetType)
			target = utils.copy(src, false, opt.excludeGrounds);
			return target;
		}
		switch (srcType) {
			case 'array':
				var result = compiler.upArray(src, target);
				return result;
			case 'object':
				// console.log("aup : merging object", src, target)
				if (src instanceof RegExp)
					return src;
				if (src instanceof Date) {
					target = new Date(src.valueOf());
					return target;
				}
				for (var i in src) {
					if(i == '_backgrounds' || i == '_foregrounds' || i == "_transformations")
						if(opt.excludeGrounds)
							continue;
						else
						{
							target[i] = target[i] ? target[i].concat(src[i]) : src[i].slice();
							continue;
						}
					if (typeof target[i] === 'undefined') {
						// console.log("aup merging object : target[i] is undefined : copy src[i]")
						target[i] = utils.copy(src[i]);
						continue;
					}
					if (src[i] === null) {
						target[i] = null;
						continue;
					}

					if (typeof src[i] === 'object' || typeof src[i] === 'function')
					{
						// console.log("aup object merge : src[i] is function")
						target[i] = compiler.aup(src[i], target[i]); //, target, i);
					}
					else
						target[i] = src[i];
					if(target[i] && target[i]._deep_remover_)
						delete target[i];
				}
				return target;
			default:
				return src;
		}
	}
	compiler.abottom = function(src, target, opt){
		opt = opt || {}; 
		if (src === null || typeof src === "undefined")
			return target;
		if (target === null)
			return target;
		if (typeof target === 'undefined') {
			target = utils.copy(src, false, opt.excludeGrounds);
			return target;
		}
		/*if (target._deep_sheet_) {
			throw new Error("using sheets through bottom");
			if (!src._deep_sheet_) {
				deep.sheet(target, src);
				return src;
			}
		} else if (src._deep_sheet_)
		{
			throw new Error("using sheets through bottom");
			return target;
		}*/	
		if (target._deep_compiler_) {
			target = target._bottom(src);
			return target;
		}
		if (src._deep_compiler_) {
			if(src._clone)
				src = src._clone();
			src._up(target);
			return src;
		}
		if (src._deep_shared_) {
			//console.log("bottom from shared");
			src._deep_shared_ = false;
			src = compiler.aup(target, src);
			src._deep_shared_ = true;
			return src;
		}
		if (target._deep_shared_) {
			//console.log("bottom to shared : ", parent, key)
			target._deep_shared_ = false;
			src = compiler.aup(target, src); //, parent, key);
			target._deep_shared_ = true;
			return src;
		}
		var srcType = utils.getJSPrimitiveType(src);
		var targetType = utils.getJSPrimitiveType(target);
		if (srcType !== targetType)
			return target;
		switch (srcType) {
			case 'array':
				var result = compiler.bottomArray(src, target);
				return result;
			case 'object':

				for (var i in src)
				{
					if(i == '_backgrounds' || i == '_foregrounds' || i == "_transformations")
						if(opt.excludeGrounds)
							continue;
						else
						{
							target[i] = target[i] ? src[i].concat(target[i]) : src[i].slice();
							continue;
						}
					if (src[i] !== null) {
						if (typeof target[i] === 'undefined')
							target[i] = utils.copy(src[i]);
						else if (typeof src[i] === 'object' || typeof src[i] === 'function')
							target[i] = compiler.abottom(src[i], target[i]); //, target, i);
						if(target[i] && target[i]._deep_remover_)
							delete target[i];
					}
				}
				var copied = utils.shallowCopy(target);
				var i = null;
				for (i in target)
					delete target[i];
				for (i in src) {
					if((i == '_backgrounds' || i == '_foregrounds' || i == '_transformations') && opt.excludeGrounds)
						continue;
					target[i] = copied[i];
					delete copied[i];
				}
				for (i in copied)
					target[i] = copied[i];
				return target;
			default:
				return target;
		}
	}

	/**
	 * up : merge object from up
	 * @param  {[type]} src     [description]
	 * @param  {[type]} target  [description]
	 * @return {[type]}         [description]
	 */
	utils.up = compiler.up = function() {
		var target = arguments[0];
		for (var i = 1, len = arguments.length; i < len; i++)
			target = compiler.aup(arguments[i], target);
		return target;
	};

	utils.bottom = compiler.bottom = function() {
		var target = arguments[arguments.length - 1],
			src = arguments[0];
		for (var i = arguments.length - 2; i > 0; i--)
			target = compiler.abottom(arguments[i], target);
		return compiler.abottom(src, target);
	};


	utils.bottomArray = compiler.bottomArray = function(src, target, mergeOn, excludeGrounds) {
		if (src.length === 0)
			return target;
		var map = {};
		var len = src.length,
			val = null,
			i = 0;
		for (; i < len; ++i) {
			var a = src[i];
			if (a && mergeOn)
				val = utils.fromPath(a, mergeOn);
			else if (a && a.id)
				val = a.id;
			else
				val = String(a);
			map[val] = {
				ref: a,
				index: i
			};
		}
		Array.prototype.unshift.apply(target, src); // prepend src to target
		var elem = target[i]; // check target from target[src.length]
		while (i < target.length) // seek after collision in target, apply it, and remove given element from target
		{
			// catch current value
			if (elem && mergeOn)
				val = utils.fromPath(elem, mergeOn);
			else if (elem && elem.id)
				val = elem.id;
			else
				val = String(elem);
			if (map[val]) {
				target[map[val.index]] = compiler.aup(elem, map[val].ref, { excludeGrounds:excludeGrounds });
				target.splice(i, 1); // remove collided element from t
			}
			elem = target[++i];
		}
		return target;
	};

	utils.upArray = compiler.upArray = function(src, target, mergeOn, excludeGrounds) {
		if (src.length === 0)
			return target;
		var map = {};
		var len = target.length,
			val = null,
			i = 0;
		for (; i < len; ++i) {
			var a = target[i];
			if (a && mergeOn)
				val = utils.fromPath(a, mergeOn);
			else if (a && a.id)
				val = a.id;
			else
				val = String(a);
			map[val] = {
				ref: a,
				index: i
			};
		}
		i = 0;
		var elem = src[i],
			length = src.length; // check target from target[src.length]
		while (i < length) // seek after collision in target, apply it, and remove given element from target
		{
			// catch current value
			if (elem && mergeOn)
				val = utils.fromPath(elem, mergeOn);
			else if (elem && elem.id)
				val = elem.id;
			else
				val = String(elem);
			if (map[val])
				target[map[val.index]] = compiler.aup(elem, map[val].ref, { excludeGrounds:excludeGrounds });
			else
				target.push(elem);
			elem = src[++i];
		}
		return target;
	};
	return compiler;
});