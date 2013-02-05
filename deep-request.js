/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * DeepRequest : a set of useful function to retreieve ressources
 */
/**
 * TODO : DeepRequest.late.post(...) : return function which will do post later

crossDomainXML : add options with proxy or YQL

maintain cache for each reload seqquence : if in the same load bunch there is sam paths : use cache in place of retreieve multiple time the same file

protocole to add : 

data-model::
fs::
 */

var fs = null;
var HTTPRequest = null;
if(typeof define !== 'function')
{
	var define = require('amdefine')(module);
	fs = require("promised-io/fs");
	HTTPRequest = require("promised-io/http-client").request;
	var swig = require("swig");
	
}
var isNode = false;
if(typeof process !== 'undefined' && process.versions && process.versions.node)
	isNode = true;

/*
	- ecrire la layer
	  	- backgrounds, etc
	- copier la layer dans l'objet final
	- appliquer le load sur l'objet final
	- appliquer le render et donc les protocles associés
	- appliquer le placeInDOM et donc les protocoles associés
*/

define(function(require){
	var utils = require("deep/utils");
	var promise = require("deep/promise");
	var Querier = require("deep/deep-query");
	var DeepRequest  = {
		lexic: {
			protocoles:{
				"json":{
					headers:{
						Accept:"application/json; charset=utf-8;"
					},
					options:{
						queriable:true,
						callable:false
					},
					extensions:["json"],
					parsers:{
						nodeHttpRequest:function(resolved)
						{
							if(typeof resolved === "string")
								{
									if(parser)
									{
										resolved = parser(resolved);
									}
									//console.log("result is string : try parse")
									else
									{
										var p = null;
										try{
											p = JSON.parse(resolved);
										}catch(e){
											p = null;
										}
										if(p)
											resolved = p; 
									}
								//	console.log("createHTTPRequestParser : "+method+" -  after parsing/resolving : body ? ", resolved)
								}
							return resolved;
						},
						"default":function(data){
							if(typeof data === 'string')
								data = JSON.parse(data);
							return data;
						},
						nodeFS:function(value, charset){
							charset = charset || "utf-8";
							return JSON.parse(value.toString(charset));
						}
					}
				},
				"json.range":{
					"backgrounds":["#../json"],
					get:function(requestInfo, callerInfo){
						return DeepRequest.getRange();
					}
				},
				"swig":{
					extensions:["html", "swig", "htm", "xhtml"],
					get:function(requestInfo, callerInfo){
						return DeepRequest.html(requestInfo);
					}
				},
				"swig.macros":{
					parser:function(info, data){
						
					}
				},
				"jquery.htmlOf":{
					get:function(info, data){
						return function(value){
							$(data).empty();
							return $(value).appendTo(data);	
						}
					}
				},
				"jquery.appendTo":{
					get:function(info, data){
						return function(value){
							return $(value).appendTo(data);	
						}
					}
				},
				"jquery.prependTo":{
					get:function(info, data){
						return function(value){
							return $(value).prependTo(data);	
						}
					}
				}
			}
		}
	}

/*
	json : 
		si uri : le choper, le parser + query: donne datas
		si pas uri :prendre query sur caller : donne datas (les parser si string)

	json.range 
		si uri : choper résultats par range : les parser si besoin + appliquer query sur chacun
		si pas uri : prendre query sur caller : donne datas (les parser si string), nchoper le range

	xml : 
		si uri : le choper, le parser + query (si un jour on a une query sur xml) : donne datas
		si pas uri : prendre query sur caller : donne datas, les parser en xml

	swig : 
		si uri : le choper, le parser (si un jour on a une query sur xml) : donne datas      PAS DE QUERY ICI
		si pas uri : prendre query sur caller : donne datas, les parser en swig si string, donne DATAS = function

	swig.macros
		si uri : choper son URL (immédiat),en faire un "include marcos string", faire fonction qui print macro sur input
		si pas uri : choper son UR
		
*/



	function manageEndOfRetrieve(info, datas)
	{
		// execute query if any
		// execute info.toCall and pass body

		// 
		return datas;
	}

	DeepRequest.get2 = function(info, callerInfo, headers)
	{
		var deferred = promise.Deferred();
		headers = headers || {};
		if(typeof info === 'string')
			info = DeepRequest.parse(info);
		if(!info.protocole)
			info.protocole = "json";
		var protocole = DeepRequest.lexic.protocoles[info.protocole] || {};
		var parsers = protocole.parsers || {};
		if(!info.uri && info.query)
		{
			data = Querier.query(callerInfo.callerRoot, info.query, callerInfo.callerPath );
			if(parsers["default"])
				data = parsers["default"](data);
			else
				data = DeepRequest.lexic.protocoles.json.parsers["default"](data);
			return manageEndOfRetrieve(info, data);
		}
		
		if(info.body && typeof info.body !== 'string')
			info.body = JSON.stringify(info.body);
		//console.log("deep-request.json : will get path : ", path)
		deepCopy(protocole[info.protocole].headers || {}, headers, false);
		copyDefaultHeaders(headers);
		headers.Accept = headers.Accept || "application/json;charset=utf-8";

		if(isNode)
		{	
			if(/http(s)?:\/\//.test(path))
			{
				HTTPRequest({
					method:"GET",
					url:info.uri,
					//queryString: query,
					headers:options.headers
				}).then(function  (response) {
					createHTTPRequestParser("GET", response, parsers.nodeHttpRequest).then(function  (data) {
						//console.log("DeepRequest.json : HTTP Request result : ", data)
						deferred.resolve(data);
					})
				}, function(){
					deferred.reject(arguments);
				} );
			}
			else
			promise.when(fs.readFile(info.uri, options.charset)).then( 
				function(data){ 
					if(parsers.nodeFS)
						data = parsers.nodeFS(data);
					else
						data = JSON.parse(data.toString(options.charset));
					if(query)
						data = Querier.query(data, query,  { keepCache:false });
					deferred.resolve(data);
				}, 
				function(){
					console.log("DeepRequest.json failed : "+JSON.stringify(arguments));
					deferred.reject({msg:"DeepRequest.json failed : "+path, details:arguments, uri:path, options:options}); 
				}
			);
		}
		else 
			promise.when($.ajax({
				beforeSend :function(req) {
					writeJQueryHeaders(req, headers);
				},
				//contentType: "application/json; charset=utf-8",
				url:info.uri, 
				method:"GET", 
				data:info.body||null,
				datatype:"json" 
			})).then(function(data, msg, jqXHR){
				if(parsers["default"])
					data = parsers["default"](data);
				else if(typeof data === 'string')
					data = JSON.parse(data);
				if(query)
					data = Querier.query(data, query,  { keepCache:false });
				//console.log("json success : ", path, query, data);
				deferred.resolve(data);
			}, function(){ 
				deferred.reject({msg:"DeepRequest.get failed : "+path, details:arguments, uri:path, options:options}); 
			})
		return promise.promise(deferred) ;
	}
	/*
	$.ajax({
			beforeSend :function(req) {
			req.setRequestHeader("Accept", "application/json");
			},
			contentType: "application/json; charset=utf-8",
			url:this.context[i], 
			method:"get", 
			data:{},
			datatype:"json" 
		})
	*/
	DeepRequest.setDefaultHeaders = function(headers)
	{
		//Json object that store the default headers
		this.defaultHeaders = headers;
	}
	var writeJQueryDefaultHeaders = function(req)
	{
		//Json object that store the default headers
		if(DeepRequest.defaultHeaders)
		{
			for(var header in DeepRequest.defaultHeaders){
				//console.log("DeepRequest Writing default headers : name = ", header, " value =", this.defaultHeaders[header]);
	            req.setRequestHeader(header, DeepRequest.defaultHeaders[header]);		
	        }
		}
	}

	var writeJQueryHeaders = function(req, headers)
	{
		//Json object that store the default headers
		if(headers)
		{
			for(var header in headers){
				//console.log("DeepRequest Writing default headers : name = ", header, " value =", this.defaultHeaders[header]);
	            req.setRequestHeader(header, headers[header]);		
	        }
		}
	}
	var copyDefaultHeaders = function(headers)
	{
		//Json object that store the default headers
		if(DeepRequest.defaultHeaders)
		{
			deepCopy(DeepRequest.defaultHeaders, headers, false);
		}
	}

	DeepRequest.exec = function(request, callerInfo, headers)
	{
		var info = request;
		if(typeof info === 'string')
			info = DeepRequest.parse(info);

		
		if(!info.uri &&  info.query)
			var data = Querier.query(callerInfo.callerRoot, info.query, callerInfo.callerPath );
			
		
		var protocole = DeepRequest.lexic.protocole[request.protocole];
		if(!protocole)
			return request;
		var def = promise.Deferred();
		if(protocole.get)
			promise.when(protocole.get(info, headers)).then(function(result){

			}, function(error){
				def.reject(error);
			})
		else
			promise.when(DeepRequest.get2(info, headers)).then(function(result){

			}, function(error){
				def.reject(error);
			});
		return promise.promise(def);
	}

	DeepRequest.parse = function(request)
	{
		//console.log("DeepRequest.parse : ", request)
		var info = {
			type:null, // deprecated, use protocole instead
			request:request,
			uri:null,
			protocole:null,
			protocoleArguments:null,
			query:null,
			body:null,
			toCall:null,
			extension:null
		};
		if(typeof request === 'undefined') 
		{
			info.protocole = info.type = "function";
			info.uri = request;
			return info;
		}
		if(typeof request !== 'string')
		{
			info.uri = request;
			return info;
		}	
		var rest = request;
		var index = rest.indexOf("::");
		if(index > -1)
		{
			var protoc = rest.substring(0, index);
			rest = request.substring(index+2);
			var matched = protoc.match(/([-a-z0-9_\.]+)|(\([^\)]+\))/gi);
			//console.log("matching handlers on protocole : ", matched)
			info.protocole = info.type = matched.shift();
			if(matched.length>0)
			{
				info.protocoleArguments = [];
				var args = matched.shift();
				args = args.substring(1,args.length-1);
				args = args.split(",");
				//console.log("got protocole handler args : ", args)
				args.forEach(function(arg){
					if(arg[0] == "'" || arg[0] == '"')
						arg = arg.substring(1,arg.length-1);
					else
						arg = parseFloat(arg);
					info.protocoleArguments.push(arg);
				});
			}
		}
		info.uri = null;
		var matched = rest.match(/([^#@§]+)|(§.+)|(@[^§]+)|(#[^@§]+)/gi);
		//console.log("protocole parsed : matched rest : ", matched);
		matched.forEach(function(m){
			switch(m[0])
			{
				case "#" : info.query = m.substring(1); break;
				case "@" : info.toCall = m.substring(1); break;
				case "§" : info.body = m.substring(1); break;
				default:
					info.uri = m;
					var ext = m.substring(m.length-Math.min(6, m.length));
					var indexOfPoint = ext.indexOf(".");
					if(indexOfPoint > -1)
						info.extension = ext.substring(indexOfPoint+1);
					if(info.extension && !info.protocole)
						info.protocole = info.type = info.extension;
			}
		})
		switch(info.protocole)
		{
			case "first" : 
				info.subquery = "first";
				break;
			case "last" : 
				info.subquery = "last";
				break;
			case "index" : 
				info.subquery = "index";
			break;
		}
	//	console.log("got info : ", info);
		if(info.query && !info.uri)
			info.type = info.protocole = "queryThis";
		return info;
	}

	DeepRequest.retrieveAll = function(uris, options)
	{
		if(typeof uris.push != "function")
			return null;
		var loads = [];
		uris.forEach(function(e){
			loads.push(DeepRequest.retrieve(e, options));
		})
		return promise.all(loads);
	}

	DeepRequest.retrieve = function(uri, options)
	{
		options = options || {};

		var queryBasePath = options.basePath || null;
		var othis = options.root || function(){};

		var info = DeepRequest.parse(uri);
		if(console.flags["deep-request"]) 
			console.log("deep-request", "retrieve : ",info, " -   from : "+uri);
		if(info.protocole == "queryThis" && !options.acceptQueryThis)
			throw new Error("you couldn't use queryThis protocole in that case");
		switch(info.type)
		{
			case "json" : 
				if(!info.range)
					return DeepRequest.json(info.uri, info.query, othis);
				else
					return DeepRequest.retrieveRange(info);
				break;
			case "xml" : 
				return DeepRequest.xml(info.uri);
				break;

			case "text" : 
				return DeepRequest.text(info);
				break;
			case "html" : 
				return DeepRequest.html(info);
				break;
			case "swig" : 
				var defs = promise.Deferred();
				DeepRequest.html(info.uri).then(function (data) {
					//console.log("retrieve swig : html result: ", data);
					var resi = swig.compile(data, { filename:utils.stripFirstSlash(info.uri) }); 
					//console.log("compiled swig : ", resi)
					defs.resolve(resi);
				}, function(){
					defs.reject({ emiter:"deep-request", msg:"retrieve swig failed for path : "+info.uri, details:arguments, basePath:uri, caller:othis });
				});
				return promise.promise(defs) ;
				break;
			case "js" : 
				if(info.query)
				{
					var def = promise.Deferred();
					promise.when(require(info.uri)).then(function(res){
						def.resolve(Querier.query(res, info.query, { keepCache:true }))
					}, function(res){
						def.reject(res);
					});
					return promise.promise(def);
				}
				else
					return promise.when(require(info.uri));
				break;   // use require to load lib
			case "aspect" : 
				var def = promise.Deferred();
				promise.when(require(info.uri)).then(function(res){
					def.resolve(res.aspect)
				}, function(res){
					def.reject(res);
				});
				return promise.promise(def);
				break;   // use require to load lib
			case "instance" : 
				var cl = require(info.uri);
				//console.log("DeepRequest.instance : ", cl);
				return new cl();
				break;   // use require to load lib
			case "eval" : 
				return eval(info.uri);
				break;   // use require to load lib
			case "func" : 
				return new Function(info.uri); 
				break;   // use require to load lib
			case "function":
				//console.log("DeepRequest.retrieve:function : ", options.dontCallFunctions, info.uri);
				if(options.callFunctions)
					return info.uri();
				return info.uri;
				break;
			case "dummies" : 
				return DeepRequest.json(info.uri, info.query, othis);
				break;

			case "queryThis" : 
				//console.log("DeepRequest.queryThis : ", othis, info.query)
				//queryBasePath += othis.path || '';
				var res = null;
				if(othis._isDQ_NODE_)
				{
					res = Querier.query(othis, info.query, { keepCache:false });
				}
				else
				{
					queryBasePath = queryBasePath || '';
					var q = info.query;
					res = Querier.query(othis, info.query, { keepCache:false });
				}
				
				if(res)
					switch(info.subquery)
					{
						case "first" : 
							res = res[0] || null;
							break;
						case "last" : 
							res = res[res.length-1] || null;
							break;
						case "index" :
							if(info.protocoleArguments)
								res = res[+info.protocoleArguments[0]] || null;
							break;
						default : ;
					}
				//if(queryBasePath != '' && q.substring(0,3) == "../")
				//	q = ((queryBasePath[queryBasePath.length-1] != "/")?(queryBasePath+"/"):queryBasePath)+info.query;
			//	console.log("QUERY THIS : "+q + " - base path : "+queryBasePath, " - results : ", JSON.stringify(res, null, ' '))
				return res;
			default:
				if(!info.protocole && !info.uri && info.query)
				{
					//console.log("DeepRequest.queryThis but no protocole : ", othis, info.query)
					if(!options.acceptQueryThis)
						throw new Error("you couldn't use queryThis protocole in that case");
					//console.log("DeepRequest.queryThis : ", othis, info.query)
					var res = null;
					if(othis._isDQ_NODE_)
					{
						res = Querier.query(othis, info.query, { keepCache:false });
					}
					else
					{
						queryBasePath = queryBasePath || '';
						var q = info.query;
						res = Querier.query(othis, info.query, { keepCache:false });
					}
				//	console.log("QUERY THIS : "+q + " - base path : "+queryBasePath, " - results : ", JSON.stringify(res, null, ' '))
					return res;
				}
				//console.log("unretrievable object : return it : ", uri)
				return uri;
			//	console.log("unrecognised extension in ContextLoader.load()");
		}
		return null;
	}

	DeepRequest.jsons = function(paths, query, othis)
	{
		var deferred = promise.Deferred();
		var arr = new Array();
		paths.forEach(function(path){
			arr.push(DeepRequest.json(path));
		})
		promise.all(arr).then(function(result){
			var res = [];
			if(query)
				result.forEach(function(e){
					var data = Querier.query(data, query, { keepCache:false });
					if(data && data.length > 0)
						res.push(data);
				});
			else
				res = result;
			deferred.resolve(res);
		}, function(error){ deferred.reject(("DeepRequest.jsons faileds : ", error)); })
		return promise.promise(deferred) ;
	}

	
	function createHTTPRequestParser(method, response, parser)
	{
		//console.log("createHTTPRequestParser: "+method+" - direct response from remote  : ", response.status, " body : ", response.body)
		var r = {
			status:response.status,
			body:"",
			__isRemoteResponse__:true
		}
		var def = promise.Deferred();
		promise.when(response.body.join('')).then(function(resolved){
			//console.log("createHTTPRequestParser : body.join resolved: ", resolved)
			if(typeof resolved === "string")
			{
				if(parser)
				{
					resolved = parser(resolved);
				}
				//console.log("result is string : try parse")
				else
				{
					var p = null;
					try{
						p = JSON.parse(resolved);
					}catch(e){
						p = null;
					}
					if(p)
						resolved = p; 
				}
				
			//	console.log("createHTTPRequestParser : "+method+" -  after parsing/resolving : body ? ", resolved)
			}
			r.body = resolved;
			def.resolve(r.body);
		}, function(r){
			console.log("createHTTPRequestParser : body.join error : ", resolved)
			def.reject(r);
		});
		return promise.promise(def);
	}

	DeepRequest.json = function(path, othis, options)
	{
		var body = null;
		var query = null;
		if(typeof path === 'object')
		{
			var info = path;
			path = info.uri;
			query = info.query;
			body = info.body;
		}
		if(typeof body !== 'string')
		{
			body = JSON.stringify(body);
		}
		//console.log("deep-request.json : will get path : ", path)
		var deferred = promise.Deferred();
		if(isNode)
		{	
			if(/http(s)?:\/\//.test(path))
			{
				HTTPRequest({
					method:"GET",
					url:path,
					//queryString: query,
					headers: {
						Accept:"application/json;charset=utf-8;"

					}
				}).then(function  (response) {
					// body...
					createHTTPRequestParser("GET", response).then(function  (data) {
						// body...
						console.log("DeepRequest.json : HTTP Request result : ", data)
						deferred.resolve(data);

					})

				}, function(){
					deferred.reject(arguments);

				} );
			}
			else
			{
				function getFacet(path){
					//console.log("getFacet : ", path)
					if(DeepRequest.autobahn)
					{
						//console.log("deep-request have autobahn link")
						var role = DeepRequest.autobahn.compileRoles(["public"]);
						promise.when(role).then(function (role) {
						//	console.log("getFacet in deep-request.json : ", role)
							var splitted = path.split('/');
							var serviceName = splitted[1];
							var id = splitted[2]
							if(role.facets[serviceName])
							{
								//console.log("got service with this name : ", serviceName, " - id ? ", id)
								var method = "get";
								if(!id || id == "")
									method = "query";
								promise.when(role.facets[serviceName][method](id)).then(function (data) {
									//console.log("results from service : ", data)
									if(query)
										data = Querier.query(data.toString(), query,  { keepCache:false });
									deferred.resolve(data);
								}, function  (error) {
									deferred.reject({msg:"DeepRequest.json failed : "+path, details:arguments, uri:path}); 
								});
							}
							else
							{
								//console.log("don't found service ", serviceName, " - try from fs : ", path)
								DeepRequest.autobahn.getFile(path, "json").then(function (data) {
									if(typeof data === 'string')
										data = JSON.parse(data.toString("utf-8"));
									//console.log("deep request node json loadsuccess from autobahn : ", data)
									if(query)
										data = Querier.query(data.toString(), query,  { keepCache:false });
									//else 
									//	data = data.toString(); 
									deferred.resolve(data);
								}, 
								function(){
									console.log("DeepRequest.json failed : "+JSON.stringify(arguments));
									deferred.reject({msg:"DeepRequest.json failed : "+path, details:arguments, uri:path}); 
								});
							}
						});
					}
					else
						DeepRequest.autobahn.getFile(path, "json").then(function (data) {
							if(typeof data === 'string')
								data = JSON.parse(data.toString("utf-8"));
							//console.log("deep request node json loadsuccess from autobahn : ", data)
							if(query)
								data = Querier.query(data.toString(), query,  { keepCache:false });
							//else 
							//	data = data.toString(); 
							deferred.resolve(data);
						}, 
						function(){
							console.log("DeepRequest.json failed : "+JSON.stringify(arguments));
							deferred.reject({msg:"DeepRequest.json failed : "+path, details:arguments, uri:path}); 
						});
				}
				getFacet(path);
			}
		}
		else 
			promise.when($.ajax({
				beforeSend :function(req) {
					writeJQueryDefaultHeaders(req);
					req.setRequestHeader("Accept", "application/json; charset=utf-8");
					//console.log("INFO. JSON = "+ JSON.stringify(path));

				},
				//contentType: "application/json; charset=utf-8",
				url:path, 
				method:"GET", 
				data:body||null,
				datatype:"json" 
			})).then(function(data, msg, jqXHR){
				if(typeof data === 'string')
					data = JSON.parse(data);
				if(query)
					data = Querier.query(data, query,  { keepCache:false });
				//console.log("json success : ", path, query, data);
				deferred.resolve(data);
			}, function(){ 
				deferred.reject({msg:"DeepRequest.json failed : "+path, details:arguments, uri:path, options:options}); 
			})
		return promise.promise(deferred) ;
	}


	DeepRequest.html = function(path)
	{
		var body = null;
		var query = null;
		if(typeof path === 'object')
		{
			var info = path;
			path = info.uri;
			query = info.query;
			body = info.body;
		}
		var deferred = promise.Deferred();

		if(isNode)
		{
			if(/http(s)?:\/\//.test(path))
			{
				HTTPRequest({
					method:"GET",
					url:path,
					//queryString: query,
					headers: {
						Accept:"application/json;charset=utf-8;"

					}
				}).then(function  (response) {
					// body...
					createHTTPRequestParser("GET", response).then(function  (data) {
						// body...
						//console.log("DeepRequest.json : HTTP Request result : ", data)
						deferred.resolve(data);

					})

				}, function(){
					deferred.reject(arguments);

				} );
			}
			else
			{
				DeepRequest.autobahn.getFile(path, "html").then(function (data) {
					//data = JSON.parse(data.toString("utf-8"));
					//else 
					//	data = data.toString(); 
					deferred.resolve(data);
				}, 
				function(){
					console.log("DeepRequest.html failed : "+JSON.stringify(arguments));
					deferred.reject({msg:"DeepRequest.json failed : "+path, details:arguments, uri:path}); 
				});
			/*	promise.when(fs.readFile(path, "utf-8")).then( 
					function(data){ 
						deferred.resolve(data.toString()); 
					}, 
					function(msg){
						deferred.reject(("DeepRequest.html failed : "+JSON.stringify(msg)));
					}
				);*/
			}
		}
			
		else
			$.when($.ajax({
				beforeSend :function(req) {
					req.setRequestHeader("Accept", "text/plain; charset=utf-8");
				},
				contentType: "text/plain; charset=utf-8",
				url:path, 
				method:"get", 
				data:body||null,
				datatype:"html" 
			})).then(
				function(data, msg, jqXHR){
					deferred.resolve(data);
				}, 
				function(msg){ 
					deferred.reject(("DeepRequest.html failed : "+JSON.stringify(msg)));
				}
			)
		return promise.promise(deferred) ;
	}
	DeepRequest.xml = function(path)
	{
		var body = null;
		var query = null;
		if(typeof path === 'object')
		{
			var info = path;
			path = info.uri;
			query = info.query;
			body = info.body;
		}
		var deferred = promise.Deferred();
		if(isNode)
			promise.when(fs.readFile(path, "utf-8")).then( 
				function(data){ 
					deferred.resolve( data.toString() ); 
				}, 
				function(msg){
					console.log("DeepRequest.xml failed : "+JSON.stringify(arguments));
					deferred.reject({msg:"deep-request : xml load failed ", arguments:arguments});
					
				}
			);
		else
		 promise.when($.ajax({
			beforeSend :function(req) {
			req.setRequestHeader("Accept", "application/xml");
			},
			contentType: "aplication/xml; charset=utf-8",
			url:path, 
			method:"get", 
			data:body||null,
			datatype:"xml" 
		})).then(function(data){
			deferred.resolve(jQuery.parseXML(data));
		}, function(jqXHR){
			console.log("DeepRequest.xml failed : "+JSON.stringify(arguments));
			deferred.reject({msg:"deep-request : xml load failed ", arguments:arguments});
		});
		return promise.promise(deferred);
	}




	DeepRequest.text = function(path)
	{
		return DeepRequest.get(path, {accept:"text/plain;charset=utf-8;"});
	}

	DeepRequest.get = function(path, options)
	{
		options = options || {};
		options.charset = options.charset || "utf-8";
		options.accept = options.accept || "application/json;charset=utf-8;";
		options.headers = options.headers || {};
		var body = null;
		var query = null;
		if(typeof path === 'object')
		{
			var info = path;
			path = info.uri;
			query = info.query;
			body = info.body;
		}
		if(body && typeof body !== 'string')
		{
			body = JSON.stringify(body);
		}
		//console.log("deep-request.json : will get path : ", path)
		var deferred = promise.Deferred();
	
		copyDefaultHeaders(options.headers);
		options.headers.Accept =  options.headers.Accept || options.accept;
		if(isNode)
		{	
			if(/http(s)?:\/\//.test(path))
			{
				HTTPRequest({
					method:"GET",
					url:path,
					//queryString: query,
					headers:options.headers
				}).then(function  (response) {
					// body...
					createHTTPRequestParser("GET", response).then(function  (data) {
						// body...
						console.log("DeepRequest.json : HTTP Request result : ", data)
						deferred.resolve(data);

					})

				}, function(){
					deferred.reject(arguments);

				} );
			}
			else
			promise.when(fs.readFile(path, options.charset)).then( 
				function(data){ 
					data = JSON.parse(data.toString(options.charset));
					//console.log("deep request node json loadsuccess : ", data)
					if(query)
						data = Querier.query(data.toString(), query,  { keepCache:false });
					//else 
					//	data = data.toString(); 
					deferred.resolve(data);

				}, 
				function(){
					console.log("DeepRequest.get failed : "+JSON.stringify(arguments));
					deferred.reject({msg:"DeepRequest.json failed : "+path, details:arguments, uri:path, options:options}); 
				}
			);
		}
		else 
			promise.when($.ajax({
				beforeSend :function(req) {
					writeJQueryHeaders(req, options.headers);
				},
				//contentType: "application/json; charset=utf-8",
				url:path, 
				method:"GET", 
				data:body||null,
				datatype:"json" 
			})).then(function(data, msg, jqXHR){
				if(typeof data === 'string')
					data = JSON.parse(data);
				if(query)
					data = Querier.query(data, query,  { keepCache:false });
				//console.log("json success : ", path, query, data);
				deferred.resolve(data);
			}, function(){ 
				deferred.reject({msg:"DeepRequest.get failed : "+path, details:arguments, uri:path, options:options}); 
			})
		return promise.promise(deferred) ;
	}

	DeepRequest.put = function(uri, object)
	{
		var info = DeepRequest.parse(uri);
		var deferred = promise.Deferred();
		return $.ajax({
			type:"PUT",
			beforeSend :function(req) {
				writeJQueryDefaultHeaders(req);
				req.setRequestHeader("Accept", "application/json; charset=utf-8");
			},
			url:info.uri,
			dataType:"application/json",
			contentType:"application/json; charset=utf-8",
			data:JSON.stringify(object)
		}).then(function  (res) {
			// body...
			console.log("DeepRequest.put : success : ", res)
			deferred.resolve(res);
		}, function  (jqXHR, textStatus, errorThrown) {
			var test = $.parseJSON(jqXHR.responseText);
			if(jqXHR.status < 300)
			{
				//console.log("DeepRequest.put : error but status 2xx : ", test, " - status provided : "+jqXHR.status);
				if(typeof test === 'string')
					test = $.parseJSON(test);
				deferred.resolve(test);
			}
			else
			{
				console.log("DeepRequest.put : failed (status > 2xx) : ", test, " - status provided : ", jqXHR.status )
				deferred.reject({msg:"DeepRequest.put failed : "+info.request, status:jqXHR.status, details:arguments, uri:info.uri})
			}
			// body...
		})
	}

	DeepRequest.post = function(uri, object)
	{
		var info = DeepRequest.parse(uri);
		var deferred  = promise.Deferred();
		  $.ajax({
			beforeSend :function(req) {
				writeJQueryDefaultHeaders(req);
				req.setRequestHeader("Accept", "application/json; charset=utf-8;");
			},
			type:"POST",
			url:info.uri,
			dataType:"application/json; charset=utf-8;",
			//contentType:"application/json; charset=utf-8;",
			data:JSON.stringify(object)
		}).then(function  (res) {
			// body...
			console.log("DeepRequest.post : success : ", res)
			deferred.resolve(res);
		}, function  (jqXHR, textStatus, errorThrown) {
			var test = $.parseJSON(jqXHR.responseText);
			if(jqXHR.status < 300)
			{
				//console.log("DeepRequest.post : error but status 2xx : ", test, " - status provided : "+jqXHR.status);
				if(typeof test === 'string')
					test = $.parseJSON(test);
				deferred.resolve(test);
			}
			else
			{
				//console.log("DeepRequest.post : failed (status > 2xx) : ", test, " - status provided : ", jqXHR.status )
				deferred.reject({msg:"DeepRequest.post failed : "+info.request, status:jqXHR.status, details:arguments, uri:info.uri})
			}
			// body...
		})


		return promise.promise(deferred);
	}

	DeepRequest.deleteItems = function(uri, ids)
	{
		var info = DeepRequest.parse(uri);

		if(typeof rql === 'undefined')
			rql = "";
		return $.ajax({
			type:"POST",
			url:info.uri,
			dataType:"message/json",
			contentType:"application/json; charset=utf-8"
			//data:JSON.stringify(object)
		})
	}

	DeepRequest.retrieveRange = function(info){
		//console.log("__________________retrieve range : ", uri, " - ", range)
		var type = info;//DeepRequest.isRetrievable(uri);
		var deferred = promise.Deferred();
		function success(jqXHR, data){
			//console.log("argyuments : ", arguments)
			var rangePart = [];
			var rangeResult = {};

			var resultsArray = [];

			if(type.type == "dummies")
			{
				var range = info.range;
				//console.log("getRange success dummies");
				if(!data.push){
					data = [data];
				}
				rangeResult.totalCount = data.length;
				//verif si le range ne dépasse pas le max
				if(range.end <= data.length)
				{
					rangeResult.range = range.start + "-" + range.end ;
					for (var i = 0; i < data.length; i++) {
						if(i >= range.start &&  i <= range.end)
							resultsArray.push( data[i] );
					};
				} else {
					//le range dépasse , on renvoi toutes les datas par defaut + un log
					resultsArray = data;
					console.log("ERROR deep-request.retrieveRange range is higher then dummies array - giving all Array by default !! ");
				}
				
			} else {
				
				var headers = jqXHR.getResponseHeader("content-range");
				headers = headers.substring(6);
				//console.log("browse ajax rrsult : headers " + JSON.stringify(headers))
				
				if(headers)
					rangePart = headers.split('/');

				if(headers && rangePart && rangePart.length > 0) 
				{
					rangeResult.range = rangePart[0];
					if(rangeResult.range == "0--1")
					{
						rangeResult.totalCount = 0;
						rangeResult.start = 0;
						rangeResult.end = 0;
					}
					else
					{
						rangeResult.totalCount = parseInt(rangePart[1]);
						var spl = rangePart[0].split("-");
						rangeResult.start = parseInt(spl[0]);
						rangeResult.end = parseInt(spl[1]);
					}
				} else {
					console.log("ERROR deep-request.retrieveRange range header missing !! ");
				}
				resultsArray = data;
				//console.log("getRange success not dummies : ", rangeResult, resultsArray.length);
			}
			deferred.resolve({
					results : resultsArray,
					range : rangeResult
			});
		}
		$.ajax({
			beforeSend :function(req) {
				req.setRequestHeader("Accept", "application/json; charset=utf-8");
				req.setRequestHeader("range", "items=" + info.range.start+"-"+info.range.end);	
			},
			type:"GET",
			url:info.uri,
			dataType:"application/json",
			contentType:"application/json; charset=utf-8"

		}).then(function(data, text, jqXHR) {
			success(jqXHR, data);
		}, function  (jqXHR, statusText, errorThrown) {
			//console.log("get range failed : ", jqXHR)
			if(jqXHR.status == 200 || jqXHR.status == 206)
				success(jqXHR, JSON.parse(jqXHR.responseText));
			else
				deferred.reject(arguments);
		});
		return promise.promise(deferred);
	}

	DeepRequest.crossDomainXML= function(url, type)
	{
		var def = promise.Deferred();
	 	//console.log("requestCrossDomain : ", url);
	    // Take the provided url, and add it to a YQL query. Make sure you encode it!
	    var yql = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from xml where url="' + url + '"') + '&format=xml&callback=?';
	    // Request that YSQL string, and run a callback function.
	    // Pass a defined function to prevent cache-busting.
	    $.getJSON(yql).then(function(data){
	    	if (data.results[0])
	    	{
	    		var res = null;
	    		switch(type)
	    		{
	    			case "xml" : 
	    			res = $.parseXML(data.results);
	    			break;
	    			case "rss" : 
	    			res = new JFeed($.parseXML(data.results));
	    			break;
	    			default :
	        			def.reject({msg:"deep-request : cross domain xml load failed : bad type provided : "+type, arguments:arguments});
	    		} 
	                def.resolve(res);
	        }else
	        	def.reject({msg:"deep-request : cross domain xml load failed ", arguments:arguments});
	    }, function(){
	    	def.reject({msg:"deep-request : cross domain xml load failed ", arguments:arguments});
	    });
		return promise.promise(def);
	}

	return DeepRequest;
})
