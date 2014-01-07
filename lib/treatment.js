/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require"], function (require) {
	
	return function(deep)
	{
		//__________________________________________________________________ TREATMENTS
		/**
		 * apply treatment
		 * @param  {[type]} treatment [description]
		 * @param  {[type]} context   [description]
		 * @return {[type]}           [description]
		 */
		deep.treat = function (treatment, context) {
			return deep.utils.applyTreatment.apply(treatment, [context || {}]);
		};

		deep.execTreatment = function(context)
		{
			if (!this.how || this.condition === false)
				return false;
			if (typeof this.condition === "function" && !this.condition.apply(this))
				return false;
			//console.log("deep.applyTtreatment : ", this, context);
			context = context || this;
			var self = this;
			var objs = [];

			if (typeof this.what === 'string')
			{
				var what = deep.interpret(this.what, context);
				objs.push(deep.get(what, {
					root: context
				}));
			}
			else if (typeof this.what === 'function')
				objs.push(this.what.apply(controller));
			else if (this.what)
				objs.push(this.what);

			if (typeof this.how === "string")
			{
				var how = deep.interpret(this.how, context);
				objs.push(deep.get(how, {
					root: context
				}));
			}
			if (typeof this.where === "string") {
				var where = deep.interpret(this.where, context);
				objs.push(deep.get(where, {
					root:  context,
					acceptQueryThis: true
				}));
			}
			return deep
			.all(objs)
			.done(function(results) {
				var what = (self.what) ? results.shift() : context;
				if (what._deep_query_node_) what = what.value;
				var how = (typeof self.how === "string") ? results.shift() : self.how;
				var where = (typeof self.where === "string") ? results.shift() : self.where;
				var r = "";
				var nodes = self.nodes || null;
				try {
					r = how.apply({}, [what]);
					if (where) nodes = where(r, nodes);
				}
				catch (e)
				{
					console.log("Error while treating : ", e);
					if (typeof self.fail === 'function')
						return self.fail.apply(context, [e]) || e;
					return e;
				}
				if (typeof self.done === "function")
					return self.done.apply(context, [nodes, r, what]) || [nodes, r, what];

				return nodes || r;
			})
			.fail(function(error)
			{
				console.log("Error while treating : ", error);
				if (typeof self.fail === 'function')
					return self.fail.apply(context, [error]) || error;
				return error;
			});
		};


		deep.loadTreatments = function (treatments, context, destructive)
		{
			if(typeof destructive === 'undefined')
				destructive = false;
			var res = [];
			var objs = [];
			for(var i = 0; i < treatments.length;++i)
			{
				//console.log("load treatment loop : ", i, treatments[i]);
				var treatment = null;

				if(!destructive)
				{
					treatment = utils.copy(treatments[i]);
					//treatment.source = treatments[i];
				}
				else
					treatment = treatments[i];
				//console.log("load treatment loop 1 : ", treatment);
				if(!treatment.how || treatment.condition === false)
						continue;
				if(treatment.condition)
					if(typeof treatment.condition === "function" && !treatment.condition.apply(context))
						continue;

				res.push(treatment);
				if(treatment.what)
				{
					//console.log("view controller . render : what : ", treatment.what)
					if(typeof treatment.what === 'string')
					{
						treatment.what = deep.interpret(treatment.what, context);
						treatment.what = deep.get(treatment.what, { root:context });
					}
					else if(typeof treatment.what === 'function')
						treatment.what = treatment.what.apply(context);
				}
				if(typeof treatment.how === "string")
				{
					treatment.how = deep.interpret(treatment.how, context);
					treatment.how = deep.get(treatment.how, { root:context });
				}
				if(typeof treatment.where === "string")
				{
					treatment.where = deep.interpret(treatment.where, context);
					treatment.where = deep.get(treatment.where, { root: context });
				}
				//console.log("load treatments end loop : ", treatment);
				objs.push(treatment.what, treatment.how, treatment.where);
			}
			//console.log("load treatment : ", objs)
			return deep.all(objs)
			.done(function(success){
				var len = res.length;
				var count = 0;
				for(var i = 0; i < len; i++)
				{
					var r = res[i];
					r.what = success[count++];
					r.how = success[count++];
					r.where = success[count++];
				}
				//console.log("treaments loaded : ", res);
				return res;
			})
			.fail(function(error){
				// console.log("Renderables load failed : ", error);
				if(typeof treatment.fail === 'function')
					return treatment.fail.apply(context, [error]) || error;
				return [{}, function(){ return ""; }, function(){} ];
			});
		};

		deep.applyTreatments = function (treatments, context, keepSended) // apply render and place in dom orderedly
		{
			//console.log("apply renderables: ", treatments)
			var res = [];
			var len = treatments.length;
			treatments.forEach(function(treatment){
				//var treatment = treatments[i];
				if(!treatment.how || treatment.condition === false)
						return;
				if(treatment.condition)
					if(typeof treatment.condition === "function" && !treatment.condition.apply(context))
						return;
				var what = treatment.what||context,
					how = treatment.how,
					where = treatment.where,
					r = "",
					sended = null;
				if(what._deep_query_node_)
					what = what.value;

				if(keepSended && treatment.sended)
					sended = treatment.sended() || null;
				//console.log('renderables : ', treatment, ' - how : ', how, " - sended : ", sended)
				try{
					r = how.call(context,what);
					if(where)
						sended = where.call(context, r, sended);
					else
						sended = null;
					//console.log("render success : ", sended,"r : ", r, "what : ", what)
				}
				catch(e)
				{
					//console.log("Error while rendering : ", e);
					if(typeof treatment.fail === 'function')
						return res.push(treatment.fail.apply(context, [e]) || e);
					return res.push(e);
				}
				if(keepSended)
					if(treatment.source)
						treatment.source.sended = function(){ return sended; };
					else
						treatment.sended = function(){ return sended; };

				if(typeof treatment.done === "function")
					return res.push(treatment.done.apply(context, [sended, r, what]) || [sended, r, what]);
				return res.push([sended, r, what]);
			});
			return res;
		};
		return deep;
	};
});


