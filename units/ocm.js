/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "../deep"], function(require, deep, Unit) {

	//_______________________________________________________________ GENERIC STORE TEST CASES

	var unit = {
		title: "deepjs/units/ocm",
		tests: {
			base: function() {
				var myManager = deep.ocm({
					mode1: {
						test: 1
					},
					mode2: {
						test: 2,
						title: "hello world"
					},
					mode3: {
						_backgrounds: ["this::../mode2"],
						description: "mode 3 description"
					}
				});
				myManager.flatten(); // seek and apply backgrounds
				return deep.when([myManager("mode1"), myManager("mode2"), myManager("mode3")]).equal(
					[{
						test: 1
					}, {
						test: 2,
						title: "hello world"
					}, {
						test: 2,
						title: "hello world",
						description: "mode 3 description"
					}]
				);
			},
			currentMode: function() {
				var myManager = deep.ocm({
					mode1: {
						title: "should not see this"
					},
					mode2: {
						title: "hello world"
					}
				});
				myManager.mode("mode2");
				return deep.when(myManager())
					.equal({
						title: "hello world"
					});
			},
			modeCollection: function() {
				var myManager = deep.ocm({
					mode1: {
						test: 1
					},
					mode2: {
						title: "hello world"
					}
				});
				return deep.when([myManager("mode1", "mode2"), myManager("mode2", "mode1")])
					.equal([{
						test: 1,
						title: "hello world"
					}, {
						title: "hello world",
						test: 1
					}]);
			},
			setGroup: function() {
				var myManager = deep.ocm({
					mode1: {
						test: 1
					},
					mode2: {
						title: "hello world"
					}
				});
				myManager.sensibleTo("myGroup");
				return deep.modes({
					"myGroup": "mode1"
				}) // start a chain with provided modes
				.delay(1)
					.done(function(success) {
						return myManager();
					})
					.equal({
						test: 1
					})
					.modes({
						"myGroup": "mode2"
					})
					.delay(1)
					.done(function(success) {
						return myManager();
					})
					.equal({
						title: "hello world"
					});
			},
			groupCollection: function() {
				return deep.modes({
					group1: "mode1"
				})
					.done(function(success) {
						return deep.modes({
							group2: "mode2"
						})
						.delay(1)
						.done(function(success) {
							return deep.Promise.context.modes;
						})
						.equal({
							group1: "mode1",
							group2: "mode2"
						});
					})
					.delay(1)
					.done(function(success) {
						return deep.Promise.context.modes;
					})
					.equal({
						group1: "mode1"
					});
			},
			shared: function() {
				var obj = deep.ocm({
					mode1: {
						myShared: deep.Shared([1, 2, 3]),
						myShared2: deep.Shared({
							a: 1
						})
					},
					mode2: {
						_backgrounds: ["this::../mode1"],
						myShared: [4, 5],
						myShared2: {
							b: 2
						}
					}
				});

				return obj.flatten().done(function(obj) {
					obj("mode1").myShared.push(6);
					obj("mode1").myShared2.c = 3;
					return [obj("mode1"), obj("mode2")];
				})
					.equal([{
						myShared: [1, 2, 3, 4, 5, 6],
						myShared2: {
							a: 1,
							_deep_shared_: true,
							b: 2,
							c: 3
						}
					}, {
						myShared: [1, 2, 3, 4, 5, 6],
						myShared2: {
							a: 1,
							_deep_shared_: true,
							b: 2,
							c: 3
						}
					}]);
			},
			cross_inheritance: function() {
				var a = {
					b: deep.ocm({
						_backgrounds: ["this::../brol"],
						role: true
					}),
					brol: {
						role2: false
					}
				};
				deep.flatten(a);
				return deep.nodes([a.b("role2"), a.b("role")]).equal([false, true]);
			},
			
			multiGroup: function() {
				var o = deep.ocm({
					dev: {
						get: function(arg) {
							return "dev:" + arg;
						}
					},
					prod: {
						get: function(arg) {
							return "prod:" + arg;
						}
					},
					"public": {
						get: deep.compose.after(function(s) {
							return s + ":public";
						})
					},
					admin: {
						get: deep.compose.after(function(s) {
							return s + ":admin";
						})
					}
				}, {
					sensibleTo: ["env", "roles"]
				});

				return deep.modes({
					env: "dev",
					roles: "public"
				})
					.done(function() {
						return o().get("hello");
					})
					.equal("dev:hello:public");
			},
			multiGroup2: function() {
				var o = deep.ocm({
					dev: {
						get: function(arg) {
							return "dev:" + arg;
						}
					},
					prod: {
						get: function(arg) {
							return "prod:" + arg;
						}
					},
					"public": {
						get: deep.compose.after(function(s) {
							return s + ":public";
						})
					},
					admin: {
						get: deep.compose.after(function(s) {
							return s + ":admin";
						})
					}
				}, {
					sensibleTo: ["env", "roles"]
				});

				return deep.modes({
					env: "prod",
					roles:"admin"
				})
				.done(function() {
					return o().get("hello");
				})
				.equal("prod:hello:admin");
			},
			ocm_transformations: function() {
				var o = deep.ocm({
					"public": {
						get: function(s) {
							return "public:" + s;
						}
					},
					prod: deep.Sheet({
						"dq.up::./get": deep.compose.after(function(s) {
							return s + ":prod";
						})
					}),
					dev: deep.Sheet({
						"dq.up::./get": deep.compose.before(function(s) {
							return "dev:" + s;
						})
					})
				}, {
					sensibleTo: ["roles", "env"]
				});
				return deep.modes({
					env: "dev",
					roles: "public"
				})
				.done(function() {
					return o().get("hello");
				})
				.equal("public:dev:hello")
				.modes({
					env: "prod",
					roles: "public"
				})
				.done(function() {
					return o().get("hello");
				})
				.equal("public:hello:prod");
			},
			ocm_afterCompilation: function() {
				var manager = deep.ocm({
					mode1: {
						name: "John",
						familly: "Doe"
					},
					mode2: {
						name: "Herbert",
						familly: "Laevus"
					}
				}, {
					afterCompilation: function(result) {
						return result.name + result.familly;
					}
				});

				var res = [
					manager("mode1"), // "JohnDoe"
					manager("mode1"), // object
					manager("mode1"), // object

					manager("mode1", "mode2"), // "HerbertLaevus"
					manager("mode1", "mode2"), // object
					manager("mode1", "mode2"), // object

					manager("mode2", "mode1"), // "JohnDoe"
					manager("mode2", "mode1"), // object
					manager("mode2", "mode1"), // object

					manager("mode1") // object
				];
				return deep.nodes(res)
					.equal(["JohnDoe", {
							name: "John",
							familly: "Doe"
						}, {
							name: "John",
							familly: "Doe"
						},
						"HerbertLaevus", {
							name: "Herbert",
							familly: "Laevus"
						}, {
							name: "Herbert",
							familly: "Laevus"
						}, "JohnDoe", {
							name: "John",
							familly: "Doe"
						}, {
							name: "John",
							familly: "Doe"
						}, {
							name: "John",
							familly: "Doe"
						}]);
			},
			ocm_strict:function(){
				var myManager = deep.ocm({
					dev:{ dev:true },
					prod:{ prod:true },
					"public":{ "public":true },
					admin:{ admin:true }
				}, { strict:true });
				return deep.nodes(myManager("prod", "bloup"))
				.equal(undefined)
			},
			multiModesFalse:function(){
				var myManager = deep.ocm({
					"public":{ "public":true },
					"user":{ "user":true }
				}, { multiModes:false });
				return deep.nodes(myManager("public", "user"))
				.equal(null);
			},
			auto_flatten:function(){
				var store = deep.ocm({
				    "user":{
				        test:true
				    },
				    "public":{_backgrounds:["this::../user"]}
				});
				store.modes("public")
				return deep.when(deep.protocol(store)).equal({ test:true });
			},
			flattener_wont_stop_flatten:function(){
				var test = {
				  pro:{
				    o:deep.ocm({
					 	_backgrounds : [ { test:{ yop:true } }],
					 	bloupi:{
					 		lolipop:"hello"
					 	}
					}, { modes:["bloupi"] })
				  },
				  second:{
				  	_backgrounds:[ { shouldBeThere:true } ]
				  }
				};
				return deep.flatten(test)
				.done(function (s) {
					return test.second.shouldBeThere;
				})
				.equal(true);
			}
		}
	};

	return unit;
});