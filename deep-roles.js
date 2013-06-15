/**
 *
 *
 *  
 * @module deep
 * @submodule deep-roles
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require"],function(require)
{
	return function(deep){

		/**
		 * Just a namespace : where default and custom roles are mainly stored. 
		 * @class deep.roles
		 * @static
		 * @type {Object}
		 */
		deep.roles = {

		}

		/**
		 * @class Role
		 * @namespace deep
		 * @constructor
		 */
		deep.Role = {
			/**
			 * @property _deep_role
			 * @private
			 * @type {Boolean}
			 */
			_deep_role_:true,
			name:null,
			initialised:false,
			/**
			 * just the place where stores are stored in this role
			 * @type {Object}
			 */
			stores:{

			},
			/**
			 * initialise the role. will forward init on stores.
			 * @return {deep.Chain}  the chain that perform the init (to wait for)
			 */
			init:function () {
				this.initialised = true;
				return deep(this)
				.query("./stores/*")
				.run("init");
			}
		}

		/**
		 * a way to start a chain setted with a certain role
		 * @param  {String} name the name of the roel to select
		 * @return {deep.Chain} the chain setted with the role
		 */
		deep.role = function (name) {
			return deep(null).role(name);
		}

		/**
		 * select a role for any subsequent call for this chain (also inner call : see tutorials)
		 * @for deep.Chain
		 * @method role
		 * @param  {String} name the role name
		 * @return {deep.Chain} the chain hanlder with role setted in context. 
		 */
		deep.Chain.prototype.role = function () 
		{
			var self = this;
			var roles = Array.prototype.slice.apply(arguments);
			var joined = roles.join(".");

			var finalise = function (role,s,e) {
				var context = deep.context = deep.utils.simpleCopy(self.context);
				self.context = context;
				self.context.role = role;
				if(self._store)
					self._store = deep.store(self._store.name);
				return [s,e];
			}

			deep._roles = deep._roles || {};

			var func = function (s,e) 
			{
				try{
					var ctrl = deep._roles[joined];
					if(!ctrl)
					{
						if(console.flags["autobahn-roles-cache"])
							console.log("roles (",roles,") wasn't in cache : create it");
						var ctrl = {};
						roles.forEach(function(e){
							//console.log("applying role : ", e)
							if(deep.roles[e])
								deep.utils.up(deep.roles[e], ctrl);
							else
								throw new Error("error while compiling roles : no role founded with : "+e);
						});
						deep._roles[joined] = ctrl;
						ctrl.name = joined;
					}
				}
				catch(e){
					if(e instanceof Error)
						throw e;
					throw new Error("error while compiling roles : "+String(e));
				}

				if(!ctrl.initialised)
				{
					//console.log("CONTROLLER NOT LOADED : load it : ", ctrl)
					return deep(deep)
					.catchError()
					.query("./_roles/"+joined)
					.bottom(deep.Role)
					.flatten()
					.run("init")
					.log("role "+joined+" : initalised...")
					.done(function (success) {
						return finalise(ctrl,s,e);
					});
				}
				else
					return finalise(ctrl,s,e);
			}
			//deep.handlers.decorations.role(role, self);
			deep.chain.addInChain.apply(this,[func]);
 			return self;
		}

/*
		deep.store("role", {
			_deep_store_:true,
			get:function (id, options) {
				return deep(null).role(id);
			}
		});
*/
		//_________ TESTS
		deep(deep.roles).up({
			"public":{
				name:"public",
				backgrounds:[deep.Role],
				stores:deep.stores
			}
		})
		.flatten();


		// ______________________________________ MODER

/*
		//_________________________ Examples : 
		//
		smart = deep.ocm();
		smart.addStores("store", "smart" {

		}).flatten(); 			// add associate store capabilities on returned chain

		smart.addObject("gui", {
			"public":{
				home:function () {
					return deep("app::/views/home").load().refresh()
				},
				profile:function () {
					// body...
				}
			}
		}


		deep("app::/views/home").refresh()

		}).flatten();					// will return the moded object
		smart.addObject("app", {
			map:{},
			views:{
				home:{

				},
				profile:{

				}
			}
		}).flatten();					// will return the moded object

		smart.layer("store").up("js::smart-services/login");


		// ==> after that

		deep.forceModes("dev"); 
		deep.mode("user"); // switch current general mode

		// ...


		smart("admin").gui.profile(); // start chain under 'admin' mode


		smart().gui.profile(); // use current mode (i.e. 'user')
		// equal : 
		smart().app.views.profile.refresh();
		// equal :
		deep("app::/views/profile").refresh();


		deep("push.campaign::1").log()
		deep("store::smart.login").post({ ... }).log()
		// equal
		smart().store("login").post({ ... }).log()

		//______________________ Examples END
*/
		

		return deep;
	}
});





