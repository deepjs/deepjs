/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "./utils"], function(require, utils){
	
	/**
	 * interpret a string with a context : means replace in string any variable-string-format (e.g. { my.property.in.my.context })
	 * founded in string
	 * @example
	 *		var interpreted = deep.utils.interpret("hello { name }", { name:"john" });
	 *
	 * @example
	 *		// equivalent of first example
	 *		var interpreted = deep("hello { name }").interpret({ name:"john" }).val();
	 *
	 * @method interpret
	 * @category stringUtils
	 * @static
	 * @param  {String} string the string to interpret
	 * @param  {Object} context the context to inject
	 * @return {String} the interpreted string
	 */
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