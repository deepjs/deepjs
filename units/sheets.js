if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
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

				deep.utils.sheet(sheet, obj);
				return deep(obj).equal({"array":["from bottom","base entry","from up"],"a":{"test":123,"other":true},"hello":"world"});
			},
			transform:function(){
				var sheet = {
					"dq.transform::./*":function(input){
						return "e"+input;
					}
				};
				var obj = [1,2,3,4,5];

				return deep(obj).sheet(sheet)
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
				var obj = [1,2,3,4,5];

				return deep(obj).sheet(sheet)
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

				var obj = {
					a:{
						base:"deepjs"
					}
				};

				return deep(obj)
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
			}
        }
    };

    return new Unit(unit);
});


