/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
 
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"], function deepEmitterDefine(require, deep)
{
	var events = require("events");
	var Emitter = deep.Emitter = deep.compose.Classes(events.EventEmitter, function(){
		this._context = deep.context;
	},{
		emit:deep.compose.before(function(){
			deep.context = this._context;
		})
	});
	return Emitter;
});