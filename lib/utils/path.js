/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "../utils"], function(require, utils){
	utils.toPath = function(object, path, value, pathDelimiter, keepOld) {
		if (path[0] == "/" || path.substring(0, 1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter || ".");
		if (pathDelimiter == "/" && (parts[0] === "" || parts[0] == "."))
			parts.shift();
		var tmp = object;
		while (parts.length > 1) {
			var part = parts.shift();
			if (!tmp[part])
				tmp[part] = {};
			tmp = tmp[part];
		}
		var last = parts.shift();
		if (keepOld && tmp[last]) {
			if (!tmp[last].forEach)
				tmp[last] = [tmp[last]];
			tmp[last].push(value);
		} else
			tmp[last] = value;
		return value;
	};
	utils.fromPath = function(object, path, pathDelimiter) {
		if (!path)
			return object;
		if (path[0] == "/" || path.substring(0, 1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter || ".");
		if (pathDelimiter == "/" && (parts[0] === "" || parts[0] == "."))
			parts.shift();
		var tmp = object;
		while (parts.length > 1) {
			var part = parts.shift();
			if (!tmp[part])
				return undefined;
			tmp = tmp[part];
		}
		if (tmp)
			return tmp[parts.shift()];
		else return undefined;
	};
	utils.deletePropertyByPath = function(object, path, pathDelimiter) {
		if (path[0] == "/" || path.substring(0, 1) == "./")
			pathDelimiter = "/";
		var parts = path.split(pathDelimiter || ".");
		if (pathDelimiter == "/" && (parts[0] === "" || parts[0] == "."))
			parts.shift();
		var tmp = object;
		while (parts.length > 1) {
			var part = parts.shift();
			if (!tmp[part])
				return;
			tmp = tmp[part];
		}
		delete tmp[parts.shift()];
	};
	return utils;
});