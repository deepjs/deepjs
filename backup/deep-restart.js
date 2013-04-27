if(typeof define !== 'function')
	var define = require('amdefine')(module);
define(["require"], function (require)
{
	


	var deep = function (obj, schema, options) 
	{
		options = options || {};
		var toLoad = [];
		if(typeof obj === 'string') 
			toLoad.push(deep.request(obj));
		else if(obj instanceof Array) 
			toLoad(deep.all(obj));
		else toLoad.push(obj);

		if(schema) 
			toLoad.push(schema);

		var handler  = new DeepHandler(options);
		handler._running = true;

		var self = this;
		deep.all(toLoad)
		.done(function (results) 
		{
			var obj = results.shift();
			if(schema)
				schema = results.shift();
			handler._entries = [];
			if(obj instanceof DeepHandler)
			{
				deep.utils.chain.assertNoState(obj);
				handler._entries = obj._entries.concat([]);
				deep.utils.nextHandle(self, deep.utils.chain.values(), null, true);
			}	
			else if(obj instanceof Array)
			{	
				obj.forEach(function (o) 
				{
					handler._entries.push(Querier.createRootNode(o, schema || {})); // should check if dqNode or _deep_entry
				});
				deep.utils.nextHandle(self, deep.utils.chain.values(), null, true);
			}
			else 
			{
				handler._entries.push(Querier.createRootNode(o, schema || {})); // should check if dqNode or _deep_entry
				deep.utils.nextHandle(self, deep.utils.chain.val(), null, true);
			}	
		})
		.fail(function (error) 
		{
			console.error("deep start chain error : ", error);
			deep.utils.chain.nextHandle(self, null, error, true);
		})
		return handler.deep();
	}

	deep.utils.chain = {
		addHandle : function ( handler, func )
		{	
			if(this._rejected && !this._acceptHandleAfterRejection)
			{
				console.log("deep chain error : chain are already rejected ")
				throw new Error("deep chain error : chain are already rejected ")
			}
			handler._queue.push(func);
			if ( !handler._runOnState || (handler._runOnState && handler.state()) )
				deep.utils.chain.nextHandle(this);
		},
		nextHandle : function ( handler, success, error, force )
		{
			if(!force && handler._running)
				return;

		},
		assertNoState : function ( handler ) {
			if(handler.state())
				throw new deep.errors.Chain("you try to initialise a deep chain with another deep chain that was ended. state : "+handler.state());
		}
	}

	deep.all = function (arr, options) {
		// body...
	}

	var DeepHandler = function(options){
		options = options || {};
		this._canceler = options.canceler;
		this._report = {
			error:null,
			success:null,
			cancel:null
		};
		this._entries = [];
	}

	var PromiseHandler = {
		_resolved:false,
		_runOnState:true,
		_acceptHandleAfterRejection:true,
		state:deep.compose.firstReturnAfter(function  () {
			return  (this._resolved?"resolved":undefined);
		}),
		resolve:function (obj) {
			deep.utils.chain.assertNoState(obj);
			this.report.success = obj;
			this.report.error = null;
			this._resolved = true;
			deep.utils.chain.nextHandle(this, obj, null, true);
		}
	}


	/*

		idée : 

			définir chaine par interface de fonction simple : 
			suivant la regle du return

			: production modèle handler (ou instanciation)
			 ==> copier et wrapper tous l'api du handler dans fonction qui place en queue de handler 

			définition simple des API de chaines : et accès au compositions sur ces API

			exemple : 

				View avec form + store 

				storeController + view

				Store :

				store.post = function  (obj) {
					return deep.request.post(this.store.uri, obj);
				}


				View with store (aka form ctrl)

				view.post = deep.compose.before(function (arg) {
					if(arg)
						return arg;
					else
						return this.binder.output;
				});
				


				your view : 

				myview.post = deep.compose.after(function (posted) {
					this.delegatePosted(posted)
				})
				
	*/




	DeepHandler.prototype = {

		// params
		_runOnState:false,
		_acceptHandleAfterRejection:false,
		_catchError:false,

		// states
		_running:false,   
		_rejected:false,
		_canceled:false,

		// local structs
		_entries:null,
		_report:null,
		_queue:null,
		_listenerQueue:null,


		state:function () 
		{
			return (this._rejected?"rejected":undefined) || (this._canceled?"canceled":undefined);
		},

		reject : function (reason) 
		{
			deep.utils.chain.assertNoState(this);
			this.report.success = null;
			this.report.error = reason;
			this._rejected = true;
			deep.utils.chain.nextHandle(this, null, reason, true);
		},
		cancel : function (reason) 
		{
			deep.utils.chain.assertNoState(this);
			this.report.canceled = obj;
			this.report.success = null;
			this.report.error = null;
			this._canceled = true;
			this._queue = null;
			this._acceptHandle = false;
			if(this._canceler)
				this._canceler(this);
		},
		//________________________________
		deep:function (obj, schema, options) 
		{
			if(obj)
				return deep(obj, schema, options);
			else
				// set deep handler
		},
		done:function  (fn) 
		{
			// body...
		},
		fail:function  (fn) 
		{
			// body...
		},
		then:function (fn, fn) 
		{
			// body...
		},
		catchError:function (ctch) {
			this._catchError = ctch;
		}
	}

/*
	Dif entre chain deep et promesses

	promesse :
		run on state
		accept base Handle after resolution or rejection
		handle : done/fail/then
		not accept handle after cancelation

	deep
		! run on state 
		accept base handle after rejection
		

	pour que deep puisse etre utilsé comme une promesse

		==> 


		var d = deep.Deferred() // retourne chaine deep avec runOnState = true;
		asynchCall = function (argument) {
			if(success)
				d.resolve(success)
			else
				d.reject(error)
		}()
		return d;


		===>

		var d = deep().pause();


		...

		d.inject(sucess, error); // run

		...

		return d;

		....


		==>

		deep( d ).fail().done().query(...)

		deep( d ) 
			- doit ajouter un hanlde fail ET done dans une deuxième queue du handler
			: c'et la queue d'"écoute externe" qui attend l'état rejected ou resolved

			ordre d'ajout : d'abord done puis fail (i.e. then)
				==> si done retourne ne erreur : elle est aussi catché par fail
	
			faut ajouter dans la chaine deep resolve et _resolved


			si la chaine d est rejetée (elle ne sait plus handler son erreur interne) ==> reject
			OU si la chaine arrive au bout sans erreur ==> resolve avec résultat courrant (.val si seul, .values si array)


			reject ou resolve : lancement queue écoute externe 


			cancel : 

			deep( d ).canceled(fn)
				catch cancelation of d, pass in _canceled state

			d.....canceled().....

			d.cancel()
				==> look in chain after canceled handles without go through non promise API
				==> if no such handle : run the external listener queue

			Si la chaine est cancelée :
				==> no more internal handles : warninng + throw
				==> possible to add more external handler


			Si la chaine est rejettée :
				==> consume internal queue until non promise handle.

				==> no more internal handler 
					==> when added : print a warning : and ignore any 
				==> elle accepte tjrs les handles externes


		==>
		plutot : lorsque ecoute externe : place in both queue : 
		in listener queue : place func
		in internal queue : place reminder

		==> if rejection before this point  : consume internal until non promise API.
		Then : consume listeners.fails. 
			if fail return something not error :
				==> pass it through done ?


		==> if no rejection : so done will fired at point
			==> the internl queue continue



			

		//________________________________________________________________

		deep(...).context(...)

			==> get/set context for done/fail/canceled
			==> will be saved in .position(...)

*/



	var smartui = {
		/**
		* select login controller : give controller chain
		*/
		login:function  (obj) {
			/*
				if obj is provided : do a login on server with it (email/pass)
				and set _APP associated state

				if !obj
				show login ui

			*/
		},
		register:function () {
			// show register ui and wait for registration submition
		},
		dashboard:function (argument) {
			// body...
		}

	}

	var controllerChain = {
		show:function  (argument) {
			// body...
		},
		hide:function (argument) {
			// body...
		},
		refresh:function (argument) {
			// body...
		}
	}



	/**
	* Permit to manipulate server store through restful IO...
	*/
	var clientStoreChain = {
		store:{

		},
		/**
		* Do post on login services.
		If arg is provided : post arg as login object.
		If no args : use from ui if possible
		*/
		post:function (argument) {
			// body...
		},
		put:function (argument) {
			// body...
		},
		/**
		* get object from store
		*/
		get:function (id) {
			

		}
	}


	deep
	.push()
	.login({ email:"...", password:"..."})
	.fail(function (error) {
		
	})
	.campaign()
	.get("12133223")
	.comments("...")
	.show("#!/campaign/")
	.done(function (ctrl) {
		return deep.request.post("/register/", registrationObject);
	})
	.submit(function (object) {
		return ...
	})
	.fail(function (error) {
		deep.push().register().error(error);
	})
	.dashboard()


})