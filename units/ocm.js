if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    
    //_______________________________________________________________ GENERIC STORE TEST CASES


    var unit = {
        title:"deep/units/ocm",
        stopOnError:false,
        tests : {
			base:function(){
				var myManager = deep.ocm({
					mode1:{
						test:1
					},
					mode2:{
						test:2,
						title:"hello world"
					},
					mode3:{
						backgrounds:["this::../mode2"],
						description:"mode 3 description"
					}
				});
				myManager.flatten(); // seek and apply backgrounds
				return deep.when([myManager("mode1"),myManager("mode2"), myManager("mode3")]).equal(
					[
						{ test:1 },
						{ test:2, title:"hello world"},
						{ test:2, title:"hello world", description:"mode 3 description"}
					]
				);
           },
           currentMode:function(){
				var myManager = deep.ocm({
					mode1:{
						title:"should not see this"
					},
					mode2:{
						title:"hello world"
					}
				});
				myManager.mode("mode2");
				return deep.when(myManager())
				.equal({ title:"hello world" });
			},
			modeCollection:function(){
				var myManager = deep.ocm({
					mode1:{
						test:1
					},
					mode2:{
						title:"hello world"
					}
				});
				return deep.when([myManager("mode1", "mode2"), myManager("mode2", "mode1")])
				.equal([ { test:1, title:"hello world"}, { title:"hello world", test:1 }]);
			},
			setGroup:function()
			{
				var myManager = deep.ocm({
					mode1:{
						test:1
					},
					mode2:{
						title:"hello world"
					}
				});

				myManager.group("myGroup");


				deep.setModes({ "myGroup":["mode2", "mode1"]}); // set modes in current deep.context


				return deep.modes({ "myGroup":"mode1" }) // start a chain with provided modes
				.delay(5)
				.done(function(success){
					return myManager();
				})
				.equal({test:1})
				.modes({ "myGroup":"mode2"} )
				.delay(5)
				.done(function(success){
					return myManager();
				})
				.equal({ title:"hello world"});
			},
			groupCollection:function(){
				return deep.modes({
					group1:"mode1"
				})
				.done(function(success){
					return deep.modes({ group2:"mode2" })
					.delay(5)
					.done(function(success){
						return deep.context.modes;
					})
					.equal({ group1:"mode1", group2:"mode2" });
				})
				.delay(5)
				.done(function(success){
					return deep.context.modes;
				})
				.equal({ group1:"mode1" });
			},
			shared:function(){
				var obj = deep.ocm({
					mode1:{
						myShared:deep.Shared([1,2,3]),
						myShared2:deep.Shared({ a:1 })
					},
					mode2:{
						backgrounds:["this::../mode1"],
						myShared:[4,5],
						myShared2:{ b:2 }
					}
				});

				return obj.flatten().done(function(obj){
					obj("mode1").myShared.push(6);
					obj("mode1").myShared2.c = 3;;
					return [obj("mode1"), obj("mode2")];
				})
				.equal([
					{ myShared:[1,2,3,4,5,6], myShared2:{ a:1, _deep_shared_:true, b:2,  c:3}},
					{ myShared:[1,2,3,4,5,6], myShared2:{ a:1,  _deep_shared_:true, b:2, c:3}}
				]);
			}
        }
    };

    return unit;
});
