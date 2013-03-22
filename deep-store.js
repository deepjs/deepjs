if(typeof define !== 'function')
	var define = require('amdefine')(module);

/*
 * layer-compose : inspired by Compose, it offer a large set of tools that permit to manipulate values 
 * from within the object used as layer when applied together. 
 * As Compose merge two prototype by wrapping collided functions by appropriate Compose method (after, before, around),
 * layer-compose do the same by applying a function when values are collided with that function.
 *
 * If you know photoshop : it's an equivalent of the fusion modes between two layers (or part of two layers). 
 * TODO : implement almost every operations, few are done. Will be made on-need.

Remarque : 
Almost totaly unusable for now... ;)
But you could do it for us...;)

 */

define(function(require)
{
	var deep = require("deep/deep");

})