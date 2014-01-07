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
			if(target && target._deep_merger_)
			{
				target.up(src);
				return target;
			}
			if(src._deep_merger_)
			{
				src = src.clone().bottom(target);
				if(parent)
					parent[key] = src;
				return src;
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
					var result = deep.utils.deepArrayFusion(target, src);
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
			if(target._deep_merger_)
			{
				target.bottom(src);
				return target;
			}
			if(src._deep_merger_)
			{
				src = src.clone();
				src.up(target);
				if(parent)
					parent[key] = src;
				return src;
			}
			if(src._deep_shared_)
			{
				src = deep.utils.up(target, src);
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
					var result = deep.utils.deepArrayFusion(src, target, null, true);
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


		deep.utils.deepArrayFusion = function deepArrayFusion(arr1, arr2, schema, fromBottom)
		{
			var map = {};
			var count = 0;
			var arr = [];
			var itemsSchema = {};
			var mergeOn = null;
			if(schema)
			{
				if(schema.items)
					itemsSchema = schema.items;
				if(schema.collision && schema.collision.unique)
					mergeOn = (schema.collision.unique === true)?null:schema.collision.unique;
			}

			//if(!mergeOn)
			//	return arr1.concat(arr2);
			//console.log("array fusion  :", arr1, arr2);
			if(arr1 && arr1.length > 0)
				//arr = arr.concat(arr1);
				arr = arr1;
			arr.forEach(function(a){
				var val = null;
				if(mergeOn)
					val = deep.utils.retrieveValueByPath(a,mergeOn);
				else if(a.uri)
					val = a.uri;
				//else if(a.name)
				//	val = a.name;
				else if(a.id)
					val = a.id;
				if(val === null || val === undefined)
					val = String(a);
				map[val] = {ref:a, index:count++};
			});
			arr2.forEach(function(a){
				var val = null;
				if(mergeOn)
					val = deep.utils.retrieveValueByPath(a,mergeOn);
				else if(a.uri)
					val = a.uri;
				//else if(a.name)
				//	val = a.name;
				else if(a.id)
					val = a.id;
				if(val === null || val === undefined)
					val = String(a);
				if(!map[val])
					arr.push(a);
				else if(fromBottom)
					arr[map[val].index] = deep.utils.bottom(map[val].ref, a, itemsSchema);
				else
					arr[map[val].index] = deep.utils.up(a, map[val].ref, itemsSchema);
			});
			return arr;
		};
		return deep;
	};

});
