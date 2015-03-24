/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}

define(["require", "../deep", "../lib/unit"], function(require, deep, Unit) {

	//_______________________________________________________________ GENERIC STORE TEST CASES


	var unit = {
		title: "deepjs/units/flatten",
		stopOnError: false,
		setup: function() {
			var a = {
				obj: {
					first: true
				},
				myFunc: function() {
					//console.log("base myFunc");
					this.obj.a = true;
				}
			};
			return {
				b: {
					_backgrounds: [a],
					obj: {
						second: true
					},
					myFunc: deep.compose.after(function() {
						//console.log("myFunc of b : ", this);
						this.obj.b = true;
					})
				}
			};
		},
		tests: {

			a: function() {
				var a = {
					obj: {
						first: true
					},
					myFunc: function() {
						//console.log("base myFunc");
						this.obj.a = true;
					}
				};
				return deep.nodes({
					_backgrounds: [a],
					obj: {
						second: true
					},
					myFunc: deep.compose.after(function() {
						//console.log("myFunc of b : ", this);
						this.obj.b = true;
					})
				})
					.flatten()
					.run("myFunc")
					.query("./obj")
					.equal({
						first: true,
						second: true,
						a: true,
						b: true
					});
			},
			b: function() {
				return deep.nodes({
					sub: {
						_backgrounds: [this.b],
						obj: {
							third: true
						}
					}
				})
					.flatten()
					.query("/sub")
					.run("myFunc")
					.query("./obj")
					.equal({
						first: true,
						second: true,
						third: true,
						a: true,
						b: true
					});
			},
			c: function() {
				var bc2 = {
					test: 2
				};

				var bc = {
					test: 1
				};

				var b = {
					_backgrounds: [bc]
				};

				return deep.nodes({
					_backgrounds: [bc2, b],
					c: {
						_backgrounds: [b],
						prop: 2
					},
					d: {
						_backgrounds: ["this::../c"],
					},
					e: {
						_backgrounds: ["this::/c"],
					}
				})
					.flatten()
					.done(function(s) {
						return deep.nodes(s.test).equal(1)
							.nodes(s.d.prop).equal(2)
							.nodes(s.e.prop).equal(2);
					});
			},
			d: function() {
				var a = {
					test: true
				};
				var b = {
					_backgrounds: [a]
				};
				return deep.flatten(b).equal({
					test: true
				});
			},
			flatten_ocm: function() {
				var autre = {
					test: {
						b: {
							yee: true
						}
					}
				};
				var obj = {
					_backgrounds: [autre],
					test: deep.ocm({
						a: {
							title: "hello a"
						},
						b: {
							_backgrounds: ["this::../a"],
							titleb: "bye"
						}
					})
				};

				/**
                * IE8 : result  {
                "titleb": "bye",
                "yee": true,
                "title": "hello a"
                },
                * @type {[type]}
                */
				var tt = obj.test;
				return deep.nodes(obj)
					.flatten()
					.done(function(success) {
						return tt("b");
					})
					.equal({
						title: "hello a",
						yee: true,
						titleb: "bye"
					});
			},
			top_transformations:function(){
				var a = {
					_transformations : [ { "dq.up::./hello":"world" }],
					lolipop:true
				};
				var  b = {
					_backgrounds:[a],
					hello:"bloupi"
				};
				deep.flatten(b);
				return deep.when(b.hello).equal("world");
			},
			foregrounds_total: function() {

				var a = {
					_backgrounds: [{
						_backgrounds: [{
							bloup: true
						}],
						backback: true,
						troulilop: "hehehehehe"
					}, {
						_foregrounds: [{
							hello: true
						}],
						forback: true
					}],
					_foregrounds: [{
						_backgrounds: [{
							biloup: true,
							_foregrounds: [{
								reu: false
							}]
						}],
						backfor: true
					}, {
						_foregrounds: [{
							lolipop: true
						}],
						forfor: true
					}],
					bazar: true,
					obj1: {
						_backgrounds: [{
							_backgrounds: [{
								bloup2: true
							}],
							backback2: true
						}, {
							_foregrounds: [{
								hello: true
							}],
							forback2: true
						}],
						_foregrounds: [{
							_backgrounds: [{
								biloup: true,
								_foregrounds: [{
									reu: false
								}]
							}],
							backfor: true
						}, {
							_foregrounds: [{
								lolipop: true
							}],
							forfor: true
						}],
						bazar: true
					},
					obj2: {
						_backgrounds: [
							"this::../obj1",
                            {
								_backgrounds: [{
									bloup3: true
								}],
								backback3: true
							},
                            {
								_foregrounds: [{
									hello: "changed!!"
								}],
								forback3: true
							}
						],
						_foregrounds: [{
							_backgrounds: [{
								biloupiloup: true,
								_foregrounds: [{
									reu: "rosty"
								}]
							}],
							backfor: true
						}, {
							_foregrounds: [{
								lolipop: "telechat"
							}],
							forfor: true
						}],
						bazar: "bazari"
					}
				};
				var needed = {
					"bloup": true,
					"backback": true,
					"troulilop": "hehehehehe",
					"forback": true,
					"hello": true,
					"bazar": true,
					"obj1": {
						"bloup2": true,
						"backback2": true,
						"forback2": true,
						"hello": true,
						"bazar": true,
						"biloup": true,
						"reu": false,
						"backfor": true,
						"forfor": true,
						"lolipop": true
					},
					"obj2": {
						"bloup2": true,
						"backback2": true,
						"forback2": true,
						"hello": "changed!!",
						"bazar": "bazari",
						"biloup": true,
						"reu": "rosty",
						"backfor": true,
						"forfor": true,
						"lolipop": "telechat",
						"bloup3": true,
						"backback3": true,
						"forback3": true,
						"biloupiloup": true
					},
					"biloup": true,
					"reu": false,
					"backfor": true,
					"forfor": true,
					"lolipop": true
				};
                return deep.flatten(a).equal(needed);
			},
			_transformations1:function(){
				var a = {
				  _transformations:[{ 
				      "dq.up::./!":{ done:"hello done" }
				  }]
				}

				return deep.nodes(a)
				.flatten()
				.done(function(success){
					return success.done;
				})
				.equal("hello done");
			},
			_transformations2:function(){
				var a = {
					_backgrounds:[{ reu:"bloupi" }],
				 	_foregrounds:[{ sub:{ foo:"bar"} }],
					_transformations:[{ 
					    "dq.up::.//?_type=string":"lolipop"
					}],
					test:{
						_backgrounds:[{ reu2:"bloupi" }],
				 		_foregrounds:[{ sub2:{ foo2:"bar"} }],
				 		_transformations:[{ 
						    "dq.up::./!":{ roo:"weeee" }
						}],
					}
				}

				return deep.nodes(a)
				.flatten()
				.done(function(a){
					return [a.reu, a.sub.foo, a.test.reu2, a.test.sub2.foo2, a.test.roo];
				})
				.equal(["lolipop","lolipop","lolipop","lolipop","weeee"]);
			}
		}
	};

	return unit;
});