/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require"], function(require){
	//utils.catchParenthesis = 
	return function(path) {
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
});