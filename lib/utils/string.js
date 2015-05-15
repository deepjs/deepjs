/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../utils", "./catch-parenthesis"], function(require, utils, parenthesis) {

	utils.catchParenthesis = parenthesis;
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

	/**
	 * Generates a GUID string.
	 * @returns {String} The generated GUID.
	 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
	 * @author Slavik Meltser (slavik@meltser.info).
	 * @link http://slavik.meltser.info/?p=142
	 */
	utils.guid = function() {
		function _p8(s) {
			var p = (Math.random().toString(16) + "000000000").substr(2, 8);
			return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
		}
		return _p8() + _p8(true) + _p8(true) + _p8();
	};

	utils.stripFirstSlash = function(text) {
		if (text.substring(0, 1) == "/")
			return text.substring(1);
		return text;
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

	var stringify = function(key, value) {
		if (value && value._deep_query_node_)
			return nodes.print(value);
		if (typeof value === 'function')
			return 'Function';
		if (value instanceof Date)
			return value.toString();
		if (value instanceof RegExp)
			return value.toString();
		if (typeof jQuery !== 'undefined' && value instanceof jQuery)
			return "jquery:" + value.selector;
		return value;
	};
	utils.stringify = function(value, nospace) {
		return JSON.stringify(value, stringify, nospace ? null : ' ');
	};

	return utils;
});