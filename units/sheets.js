if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deepjs/units/sheets",
        stopOnError:false,
        setup:function(){},
        tests : {
			base:function(){
				var sheet = {
					"dq.up::./!":{
						hello:"world",
						array:["from up"]
					},
					"dq.bottom::./!":{
						array:["from bottom"]
					},
					"dq.up::./a":{
						test:123,
						other:true
					}
				};

				var obj = {
					array:["base entry"],
					a:{
						test:1
					}
				};

				deep.sheet(sheet, obj);
				return deep(obj).equal({"array":["from bottom","base entry","from up"],"a":{"test":123,"other":true},"hello":"world"});
			},
			transform:function(){
				var sheet = {
					"dq.transform::./*":function(input){
						return "e"+input;
					}
				};
				return deep([1,2,3,4,5])
				.sheet(sheet)
				.equal({
					"dq.transform::./*": [
						"e1",
						"e2",
						"e3",
						"e4",
						"e5"
					]
				})
				.valuesEqual(["e1", "e2", "e3", "e4", "e5"]);
			},
			through:function(){
				var sheet = {
					"dq.through::./*":function(input){
						return "e"+input;
					}
				};
				return deep([1,2,3,4,5]).sheet(sheet)
				.equal({
					"dq.through::./*": [
						"e1",
						"e2",
						"e3",
						"e4",
						"e5"
					]
				})
				.valuesEqual([1,2,3,4,5]);
			},
			sheeter1:function(){
				var sheet = {
					"dq.sheeter::./*":  deep.sheeter
										.up({ fromUp:"tools" })
										.bottom({ fromBottom:"hello" })
				};
				return deep({
					a:{
						base:"deepjs"
					}
				})
				.sheet(sheet)
				.equal({
					"dq.sheeter::./*": [
						{
						"fromBottom": "hello",
						"base": "deepjs",
						"fromUp": "tools"
						}
					]
				})
				.valuesEqual( {
					"a": {
						"fromBottom": "hello",
						"base": "deepjs",
						"fromUp": "tools"
					}
				});
			},
			"sheeter.flatten":function(){
				var sheet = {
					"dq.sheeter::./a/b":deep.sheeter.flatten()
				};
				return deep({
					a:{
						b:{
							backgrounds:["this::../c"],
							hello:"world"
						},
						c:{
							test:"inherited"
						}
					}
				})
				.sheet(sheet)
				.equal({"dq.sheeter::./a/b":[{"test":"inherited","hello":"world"}]})
				.valuesEqual({"a":{"b":{"test":"inherited","hello":"world"},"c":{"test":"inherited"}}});
			},
			"sheeter.transform":function(){
				var sheet = {
					"dq.sheeter::./a/b":deep.sheeter.transform(function(input){
						return "e : " + input;
					})
				};
				return deep({
					a:{
						b:"hello world"
					}
				})
				.sheet(sheet)
				.equal( {"dq.sheeter::./a/b":["e : hello world"]} )
				.valuesEqual( {"a":{"b":"e : hello world"}} );
			},
			backgrounds:function(){
				var sheet = {
					"dq.backgrounds::/!":{ hello:"world" }
				};

				var obj = {
					a:true
				};

				deep.sheet(sheet, obj);
				return deep(obj).equal({ hello:"world", a:true });
			},
			backgrounds2:function(){
				var sheet = {
					"dq.backgrounds::/!":[{ hello:"world" }]
				};

				var obj = {
					a:true
				};

				deep.sheet(sheet, obj);
				return deep(obj).equal({ hello:"world", a:true });
			},
			backgrounds3:function(){
				var sheet = {
					"dq.backgrounds::/!":[{ hello:"world" }]
				};

				var obj = {
					backgrounds:[{ lolipop:true }],
					a:true
				};

				deep.sheet(sheet, obj);
				return deep(obj).equal({ hello:"world", lolipop:true, a:true });
			},
			"sheeter.backgrounds":function(){
				var sheet = {
					"dq.sheeter::/!":deep.sheeter.backgrounds({ hello:"world" })
				};

				var obj = {
					backgrounds:[{ lolipop:true }],
					a:true
				};

				deep.sheet(sheet, obj);
				return deep(obj).equal({ hello:"world", lolipop:true, a:true });
			},
			sheets_as_backgrounds:function(){
				return deep({
					test:false,
					backgrounds:[{
						_deep_sheet_:true,
						"dq.bottom::./!":{
							hello:"world"
						}
					}]
				})
				.flatten()
				.equal({
					test:false
				});
			},
			sheets_as_backgrounds2:function(){
				return deep({
					_deep_sheet_:true,
					"dq.up::./!":"testez",
					"dq.bottom::./!":{ test:true },
					backgrounds:[{
						_deep_sheet_:true,
						"dq.bottom::./!":{
							hello:"world"
						}
					}]
				})
				.flatten()
				.equal({
					_deep_sheet_:true,
					"dq.bottom::./!":{ hello:"world" , test:true },
					"dq.up::./!":"testez",
				});
			},
			sheets_as_backgrounds3:function(){
				return deep({
					test:false,
					backgrounds:[{ 
						base:"yes" 
					}, {
						_deep_sheet_:true,
						"dq.bottom::./!":{
							hello:"world"
						}
					}]
				})
				.flatten()
				.equal({
					hello:"world",
					base:"yes",
					test:false
				});
			},
			sheets_as_backgrounds4:function(){
				return deep({
					_deep_sheet_:true,
					"dq.up::./!":{ fromUp:true },
					"dq.bottom::./!":{ fromBottom:true },
					backgrounds:[{
						hello:"world"
					}]
				})
				.flatten()
				.equal({
					fromBottom:true,
					hello:"world",
					fromUp:true
				});
			}
        }
    };

    return unit;
});


