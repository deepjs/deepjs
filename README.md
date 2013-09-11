deepjs readme

TODO :

CRUD (deep)
	- rpc def in store model layer

	- deep-facet final pattern

	- store/action/schema related colliders

	- json -schema 
		- allPrivateBut, allReadOnlyBut collider
		- sanitisation
		- compilation
		- 

	
ROUTES
		- routes : ui et serveur, datas et views/html

			- serveur : deux truc : 
				- un premier proxy path
				- des handlers de paths

			- algo de selection arborescente

				VIEWS/HTML
					--> register/confirmation/8DUHCD98HCDHUDCDCUHUIOJ
					--> /campaign/?lastUpdate=lt=yesterday
					--> /campaign/12/info/
					--> /campaign/12/update/3/page/4
					
				var views = {
					header:{
						selector:["generic","header"],
						menu:{
							selector:["generic", "menu"]
						},
						language:{
							selector:["generic","language"]
						},
						success:{
							selector:["success"]

						}
					},
					home:{
						selector:["home"]

					},
					profile:{
						selector:["profile"]
						
					},
					footer:{
						selector:["generic","footer"]
					}
				}




				var map = {
					"/profile/12/account/_int_":{
						_outer:function(parsedPath){
							
						}
					},
					"/profile/_int_/update":function(parsedPath){
						smart.gui().profile(id).update()
					},
					"/profile/_query_/account":function(parsedPath){
						smart.gui().profile(id).account(12).
					},
					"/profile/?country=belgium":function(parsedPath){
						//...	
						smart.gui().profiles(query).showCountry("belgium");
					},
					"/home":{
						_inner:function(splittedPath){

						},
						_outer:function(splittedPath){
							smart.gui().home();
						}
					},
					"/profile/_query_":{
						_outer:function(){},
						"./account":{
							_inner:function(splittedPath)
							{

							},
							_outer:function(splittedPath){
								smart.gui().profiles(query);
							}
						}
					},
					"/profile/_int_":{
						_inner:function(splittedPath)
						{
							
						},
						_outer:function(splittedPath, handle){
							var id = splittedPath.shift().shift();
							//...
							return handle.profiles(id);
						},
						"./update":{
							return handle.update()
						},
						"./account":{
							_inner:function(splittedPath)
							{

							},
							_outer:function(splittedPath){

							}
						}
					}
				}

				
				var gui = {
					profile:function(id|query){
						smart.views().profile.show(id|query);

						var obj = this;
						deep.utils.bottom(this, {
							update:{

							}	
						});
						this.wait(smart.views().profile.show(id|query))
					}
				}


		- (CRUD related) Routes are just straight query for 
		DATAS : 
				/datas/campaign/?amount=lt=134/*/_link/owner
				/datas/campaign/?user=134/perks/[0-3]?quantity=0
				/datas/campaign/12/perks/[0-3]?quantity=0

		
AUTOBAHN

	- rewrite almost everything
		- nodejs driver
		- html builder
		- use OCM based deep-stores/facets
		- use deep-routes + content-type manager + deep-query + deep-ui-view-route and html-builder to dispatch and manage any request

Plus tard mais déjà très utile

	- deep-sheet


