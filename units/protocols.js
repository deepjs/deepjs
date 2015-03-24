if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require","../deep"], function (require, deep) {
    var unit = {
        title:"deepjs/units/protocols",
        stopOnError:false,
        setup:function(){
			deep.Promise.context.protocols = deep.Promise.context.protocols || {};
        },
        clean:function(){
        	delete deep.protocols.myProtoc;
        	delete deep.protocols.myProtoc2;
        	delete deep.Promise.context.protocols.myProtoc2;
        },
        tests : {
			def:function(){
				deep.protocol("myProtoc", { 
					get:function(request, options){ 
						return "myprotoc received : "+request; 
					}
				});
				return deep.get("myProtoc::hello")
				.equal("myprotoc received : hello");
			},
			subprotoc:function(){
				deep.protocol("myProtoc", { 
					bloup:function(request, options){ 
						return "myprotoc bloup : "+request; 
					}
				});
				return deep.get("myProtoc.bloup::hello")
				.equal("myprotoc bloup : hello");
			},
			range:function(){
				deep.protocol("myProtoc", { 
					range:function(start, end, query, options){ 
						return "myprotoc range : (start:"+start+",end:"+end+") : query:"+query; 
					}
				});
				return deep.get("myProtoc.range(3,67)::hello")
				.equal("myprotoc range : (start:3,end:67) : query:hello");
			},
			contextualised:function(){
				deep.protocols.myProtoc2 = { 
					get:function(request, options){ 
						return "myprotoc2 received : "+request; 
					}
				};
				deep.Promise.context.protocols.myProtoc2 = { 
					get:function(request, options){ 
						return "myprotoc2 (contextualised) received : "+request; 
					}
				};
				return deep.get("myProtoc2::hello")
				.equal("myprotoc2 (contextualised) received : hello");
			},
			getAll:function(){
				deep.protocol("myProtoc", { 
					get:function(request, options){ 
						return "myprotoc received : "+request; 
					}
				});
				return deep.getAll(["myProtoc::hello", "myProtoc2::world"])
				.equal(["myprotoc received : hello", "myprotoc2 (contextualised) received : world"]);
			},
			parseRequest:function(){
				var parsed = deep.utils.parseRequest("dummy::hello");
				return deep.nodes(parsed)
				.done(function(s){
					delete s.execute;
				})
				.equal({
				 "_deep_request_": true,
				 "request": "dummy::hello",
				 "protocol": "dummy",
				  "provider": null,
				  "method": "get",
				 "uri": "hello"
				});
			}
        }
    };
    return unit;
});
