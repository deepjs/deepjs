/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 * interpret a string with a context. (ultra-fast)
 * 
 * @example
 *		var interpreted = deep.utils.interpret("hello { name }", { name:"john" }); // hello john
 *
 * @example
 *		// equivalent of first example, but through deep-chain API
 *		var interpreted = deep.nodes("hello { name }").interpret({ name:"john" }).val(); // hello john
 *
 *
 * @example
 *		var interpreted = deep.utils.interpret("hello { name | 'dear '+id } - { address.zip }", { id:"john", address:{ zip:1000 } }); 
 *		// hello dear john - 1000
 * 	
 * 
 * @method interpret
 * @category stringUtils
 * @static
 * @param  {String} string the string to interpret
 * @param  {Object} context the context to inject
 * @return {String} the interpreted string
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "../utils"], function(require, utils){
	return utils.interpret = function(string, context) {
		var count = string.indexOf('{');
		if (count == -1)
			return string;
		var parsed = string.substring(0, count);
		count++;
		var ln = string.length;
		while (count < ln) {
			var terms = [];
			var cur = string[count];
			var toAnalyse = "";
			while (count < ln && cur != '}' && cur != '|') {
				if (cur == "+") {
					terms.push(toAnalyse);
					toAnalyse = "";
				} else if (cur == "'") {
					var end = string.indexOf("'", count + 1);
					toAnalyse = string.substring(count, end);
					count = end;
				} else if (cur != ' ')
					toAnalyse += cur;
				cur = string[++count];
			}
			terms.push(toAnalyse);
			var isOr = (string[count] == '|');
			if (string[count] == '}' || isOr) {
				var val = null;
				for (var i = 0; i < terms.length; ++i) {
					toAnalyse = terms[i];
					if (toAnalyse[0] == "'") {
						if (i === 0)
							val = toAnalyse.substring(1);
						else
							val += toAnalyse.substring(1);
					} else {
						if (i === 0)
							val = utils.fromPath(context, toAnalyse, ".");
						else
							val += utils.fromPath(context, toAnalyse, ".");
						if (val && val.forEach)
							val = val.join(",");
					}
					if (!val)
						break;
				}
				if (val) {
					parsed += val;
					if (isOr)
						count = string.indexOf('}', count);
				}
				count++;
				if (!val && isOr)
					continue;
			}
			while (count < ln && string[count] != '{')
				parsed += string[count++];
			if (string[count] == '{')
				count++;
		}
		return parsed;
	};
});