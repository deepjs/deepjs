if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../deep-unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"Unit title",
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
			}
        }
    };

    return new Unit(unit);
});


