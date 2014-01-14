/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require"], function (require) {

	return function(deep)
	{

		deep.utils.compile = function (){
			var base = deep.utils.copy(arguments[arguments.length-1]);
			var len = arguments.length-2;
			for(;len>-1;--len)
				deep.utils.bottom( arguments[len], base );
			return base;
		};

		deep.compile = function (){
			var args = Array.prototype.slice.apply(arguments);
			return deep.getAll(args)
			.done(function(res){
				var base = deep.utils.copy(res[res.length-1]);
				var len = res.length-2;
				for(;len>-1;--len)
					deep.utils.bottom( res[len], base );
				return base;
			});
		};

		deep.up = function (){
			var args = Array.prototype.slice.apply(arguments);
			return deep.getAll(args)
			.done(function(res){
				var base = res[0];
				var len = res.length;
				for(var count = 1;count < len;++count)
					deep.utils.up( res[count], base );
				return base;
			});
		};

		deep.bottom = function (){
			var args = Array.prototype.slice.apply(arguments);
			return deep.getAll(args)
			.done(function(res){
				var base = res[res.length-1];
				var len = res.length-2;
				for(;len>-1;--len)
					deep.utils.bottom( res[len], base );
				return base;
			});
		};

		deep.utils.upFromArgs = function (base, args){
			var len = args.length;
			for(var count = 0;count < len;++count)
				deep.utils.up( args[count], base );
			return base;
		};

		deep.utils.bottomFromArgs = function (base, args){
			var len = args.length-1;
			for(;len>-1;--len)
				deep.utils.bottom( args[len], base );
			return base;
		};

		/**
		 * up : merge object from up
		 * @param  {[type]} src     [description]
		 * @param  {[type]} target  [description]
		 * @param  {[type]} schema  [description]
		 * @param  {[type]} parent  [description]
		 * @param  {[type]} key     [description]
		 * @return {[type]}         [description]
		 */
		deep.utils.up = function utilsUp(src, target, parent, key)
		{
			if( typeof src === 'undefined' )
				return target;
			if(src === null)
			{
				if(parent)
					parent[key] = null;
				return null;
			}
			if(typeof target === 'undefined' || target === null)
			{
				target = deep.utils.copy(src);
				if(parent)
					parent[key] = target;
				return target;
			}
			if(target && target._deep_compiler_)
			{
				target.up(src);
				return target;
			}
			if(src._deep_compiler_)
			{
				src = src.clone().bottom(target);
				if(parent)
					parent[key] = src;
				return src;
			}
			if(src._deep_shared_)
			{
				//console.log("up from shared");
				src._deep_shared_ = false;
				target = deep.utils.bottom(target, src);
				src._deep_shared_ = true;
				if(parent)
					parent[key] = target;
				return target;
			}
			if(target._deep_shared_)
			{
				//console.log("up to shared : ", parent, key)
				target._deep_shared_ = false;
				target = deep.utils.bottom(target, src);
				target._deep_shared_ = true;
				if(parent)
					parent[key] = target;
				return target;
			}
			var srcType = deep.utils.getJSPrimitiveType(src);
			var targetType = deep.utils.getJSPrimitiveType(target);
			if(srcType !== targetType)
			{
				target = deep.utils.copy(src);
				if(parent)
					parent[key] = target;
				return target;
			}
			switch(srcType)
			{
				case 'array' :
					var result = deep.utils.upArray(src, target);
					if(parent)
						parent[key] = result;
					return result;
				case 'object' :
					if(src instanceof RegExp)
					{
						if(parent)
							parent[key] = src;
						return src;
					}
					if(src instanceof Date)
					{
						target = new Date(src.valueOf());
						if(parent)
							parent[key] = target;
						return target;
					}
					for(var i in src)
					{
						if(src[i] === null)
						{
							target[i] = null;
							continue;
						}
						if(src[i] && src[i]._deep_colliderRemove)
						{
							delete target[i];
							continue;
						}
						if(typeof src[i] === 'object' || typeof src[i] === 'function')
							target[i] = deep.utils.up(src[i], target[i], target, i);
						else
							target[i] = src[i];
					}
					return target;
				default :
					if(parent)
						parent[key] = src;
					return src;
			}
		};

		deep.utils.bottom = function bottom2(src, target, parent, key)
		{
			if(src === null || typeof src === "undefined")
				return target;
			if(target === null)
				return target;
			if(typeof target === 'undefined')
			{
				target = deep.utils.copy(src);
				if(parent && key)
					parent[key] = target;
				return target;
			}
			if(target._deep_compiler_)
			{
				target.bottom(src);
				return target;
			}
			if(src._deep_compiler_)
			{
				src = src.clone();
				src.up(target);
				if(parent)
					parent[key] = src;
				return src;
			}
			if(src._deep_shared_)
			{
				//console.log("bottom from shared");
				src._deep_shared_ = false;
				src = deep.utils.up(target, src);
				src._deep_shared_ = true;
				if(parent)
					parent[key] = src;
				return src;
			}
			if(target._deep_shared_)
			{
				//console.log("bottom to shared : ", parent, key)
				target._deep_shared_ = false;
				src = deep.utils.up(target, src, parent, key);
				target._deep_shared_ = true;
				if(parent)
					parent[key] = src;
				return src;
			}
			var srcType = deep.utils.getJSPrimitiveType(src);
			var targetType = deep.utils.getJSPrimitiveType(target);
			if(srcType !== targetType)
				return target;
			switch(srcType)
			{
				case 'array' :
					var result = deep.utils.bottomArray(src, target);
					if(parent && key)
						parent[key] = result;
					return result;
				case 'object' :

					for(var i in src)
						if(src[i] !== null)
						{
							if(typeof target[i] === 'undefined')
								target[i] = deep.utils.copy(src[i]);
							else if(typeof src[i] === 'object' || typeof src[i] === 'function')
								target[i] = deep.utils.bottom(src[i], target[i], target, i);
						}
					var copied = deep.utils.simpleCopy(target);
					var i = null;
					for(i in target)
						delete target[i];
					for(i in src)
					{
						target[i] = copied[i];
						delete copied[i];
					}
					for(i in copied)
						target[i] = copied[i];
					return target;
				default :
					return target;
			}
		};

		deep.Shared = function(datas)
		{
			//console.log("CREATE DEEPSHARED")
			datas._deep_shared_ = true;
			return datas;
		};

		deep.utils.bottomArray = function (src, target, schema)
		{
			if(src.length === 0)
				return target;
			var map = {};
			var itemsSchema = {};
			var mergeOn = null;
			if(schema)
			{
				if(schema.items)
					itemsSchema = schema.items;
				if(schema.collision && schema.collision.unique)
					mergeOn = (schema.collision.unique === true)?null:schema.collision.unique;
			}
			var len = src.length, val = null, i = 0;
			for(; i < len; ++i)
			{
				var a = src[i];
				val = null;
				if(mergeOn)
					val = deep.utils.retrieveValueByPath(a,mergeOn);
				else if(a.uri)
					val = a.uri;
				else if(a.id)
					val = a.id;
				if(val === null || val === undefined)
					val = String(a);
				map[val] = {ref:a, index:i};
			}
			Array.prototype.unshift.apply(target, src);	// prepend src to target
			var elem = target[i];		// check target from target[src.length]
			while(elem)		// seek after collision in target, apply it, and remove given element from target
			{
				// catch current value
				val = null;
				if(mergeOn)
					val = deep.utils.retrieveValueByPath(elem,mergeOn);
				else if(elem.uri)
					val = elem.uri;
				else if(elem.id)
					val = elem.id;
				if(val === null || val === undefined)
					val = String(elem);
				if(map[val])
				{
					target[map[val.index]] = deep.utils.up(elem, map[val].ref);
					target.splice(i,1); // remove collided element from t
				}
				elem = target[++i];
			}
			return target;
		};


		deep.utils.upArray = function (src, target, schema)
		{
			if(src.length === 0)
				return target;
			var map = {};
			var itemsSchema = {};
			var mergeOn = null;
			if(schema)
			{
				if(schema.items)
					itemsSchema = schema.items;
				if(schema.collision && schema.collision.unique)
					mergeOn = (schema.collision.unique === true)?null:schema.collision.unique;
			}
			var len = target.length, val = null, i = 0;
			for(; i < len; ++i)
			{
				var a = target[i];
				val = null;
				if(mergeOn)
					val = deep.utils.retrieveValueByPath(a,mergeOn);
				else if(a.uri)
					val = a.uri;
				else if(a.id)
					val = a.id;
				if(val === null || val === undefined)
					val = String(a);
				map[val] = {ref:a, index:i};
			}
			i = 0;
			var elem = src[i];		// check target from target[src.length]
			while(elem)		// seek after collision in target, apply it, and remove given element from target
			{
				// catch current value
				val = null;
				if(mergeOn)
					val = deep.utils.retrieveValueByPath(elem,mergeOn);
				else if(elem.uri)
					val = elem.uri;
				else if(elem.id)
					val = elem.id;
				if(val === null || val === undefined)
					val = String(elem);
				if(map[val])
					target[map[val.index]] = deep.utils.up(elem, map[val].ref);
				else
					target.push(elem);
				elem = src[++i];
			}
			return target;
		};
		return deep;
	};
});
