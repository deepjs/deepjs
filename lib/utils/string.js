/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "../utils"], function(require, utils){
	
	/**
	 * Fake hash algorithm for dummies manipulation
	 * @param {[type]} string [description]
	 */
	utils.Hash = function(string) {
		var hash = 0;
		if (string.length == 0)
			return hash;
		for (i = 0; i < string.length; i++) { 
			char = string.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	};

	utils.stripFirstSlash = function(text) {
		if (text.substring(0, 1) == "/")
			return text.substring(1);
		return text;
	};

	utils.catchParenthesis = function(path) {
		if (path[0] != '(')
			return null;
		var count = 1;
		var catched = 1;
		var res = "";
		while ((path[count] != ')' || catched > 1) && count < path.length) {
			if (path[count] == '(')
				catched++;
			if (path[count] == ')')
				catched--;
			if (path[count] == ')') {
				if (catched > 1)
					res += path[count++];
			} else
				res += path[count++];
		}
		count++;
		return {
			value: res,
			rest: path.substring(count)
		};
	};

	function trim_words(theString, numWords, maxChar) {
		expString = theString.split(/\s+/, numWords);
		if (expString.length == 1) {
			maxChar = maxChar || 10;
			if (expString[0].length > maxChar)
				return theString.substring(0, maxChar);
			return expString[0];
		}
		theNewString = expString.join(" ");
		if (theNewString.length < theString.length && theNewString[theNewString.length - 1] != ".")
			theNewString += "...";
		return theNewString;
	}

	utils.trimWords = function(string, numWords, maxChar) {
		return trim_words(string.replace(/<[^>]*>/gi, ""), numWords, maxChar);
	};

	//_________________________________  change string cases

	var camelCase = /\s(.)/g;
	var titleCase = /([^\s])([^\s]*)/g;

	utils.camelCase = function(input) { 
	    return input.toLowerCase().replace(camelCase, function(match, group1) {
	        return group1.toUpperCase();
	    });
	};
	utils.titleCase = function(input) { 
		return input.toLowerCase().replace(titleCase, function(match, group1, group2) {
			return group1.toUpperCase() + group2;
		});
	};

	return utils;
});