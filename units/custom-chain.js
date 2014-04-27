if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require","../deep"], function (require, deep) {

	deep.Promise.API.chainTest = function() {
	    var handler = new ChainTest(this._state);
	    this._enqueue(handler);
	    return handler;
	};
	deep.chainTest = function(){
		return new ChainTest(null)._start();
	};
	var ChainTest = deep.compose.Classes(deep.Promise, function (state) {
		this._identity = ChainTest;
		this._name = "ChainTest";
	}, {
		testez:function(res){
			var self = this;
			var func = function(s,e){
				return deep.delay(5).done(function(){
					var val = 'seen:'+self._name;
					res.push(val);
					return val;
				});
			};
			func._isDone_ = true;
			return self._enqueue(func);
		}
	});
	//_________________________________________________________
	deep.Promise.API.chainTest2 = function() {
	    var handler = new ChainTest2(this._state);
	    this._enqueue(handler);
	    return handler;
	};
	deep.chainTest2 = function(){
		return new ChainTest2(null)._start();
	};
	var ChainTest2 = deep.compose.Classes(deep.Promise, function (state) {
		this._identity = ChainTest2;
		this._name = "ChainTest2";
	}, {
		testez:function(res){
			var self = this;
			var func = function(s,e){
				return deep.delay(5).done(function(){
					var val = 'seen2:'+self._name;
					res.push(val);
					return val;
				});
			};
			func._isDone_ = true;
			return self._enqueue(func);
		}
	});

    var unit = {
        title:"deepjs/units/custom-chain",
        stopOnError:false,
        setup:function(){},
        clean:function(){

        },
        tests : {
           first:function(){
           		var res = [];
           		return deep
           		.chainTest()
           		.testez(res)
           		.chainTest2()
           		.testez(res)
           		.close()
           		.testez(res)
           		.done(function(){
           			return res;
           		})
           		.equal(['seen:ChainTest', 'seen2:ChainTest2', 'seen:ChainTest'])
           }
        }
    };
    return unit;
});
