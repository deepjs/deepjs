/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../deep", "deep-nodes/lib/chained-api"], function(require, deep, api) {
	deep.compose.nodes = deep.compose.Composer(api);
	return deep.compose.nodes;
});