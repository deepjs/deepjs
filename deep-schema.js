/**
 *	JSON-Schema validator : based on json-schema draft 02, 03, and 04 + extensions
 * 	http://tools.ietf.org/html/draft-zyp-json-schema-03
 *
 * @example

		Ajout par rapport à la v3


		type:
			schema
			false
			true
			function
			date
			hash     !!!!!     différent de object ou array == TROISIEME TYPE non simple : hash table d'items

		notNull

		absoluteMinimum
		absoluteMaximum

		merge
		loadable
		"interpretation-deepness"   ==> have equivalent in draft 4 : template : bad word : template-engine is better or href-interpreter (because it's the only interpretable string)


		deprecated : 
		$ref : to be removed : incoherent with backgrounds


		semantic misuse :
		id has to became uri


		v3 / V4
		pattern remplace format ?
		divisibleBy -> mod
		max/minProperties

		required : fuzzy concept now : need 
		dependencies : always fuzzy : need example to be clear

		I propose : 

		{
			myConstraintProperty:{
				required:Boolean,   // means that's, in any case, this property is needed
				require:{
					// is the schema that the whole object (from root) need to satisfy
					path:{
						to:{
							requiredProperty:{
								// schema that requiredProperty need to satisfy
							}
						}
					}
				}
			}
		}

		Fuzzy : format/pattern/value :    value is more clear : 
		I propose : 
			when object.value is a leaf of the object instance (no array, nor object):
			if(schema.value is RegExp)
				object.value must match schema.value (equivalent of pattern)
			else
				object.value must be equal to schema.value
				
		that permit to be a mecanisme for true or false constraint value (no more "true" or "false" type)
		that also permit to be a constraint on the object.value for any dependencies :

		so : 
		taxerate:{
			required:true,
			dependencies:[
				{ 
					constraint:{
						// the schema that need to be matched on the dependant value
						pattern:"tva-pattern-uk"
					}, 
					instance:{
						// the schemas that pointed properties (from root) need to satisfy to evaluate 
						path:{
							to:{
								country:{
									pattern:"UK"
								}
							}
						}
					}
				},
				{ 
					constraint:{
						// the schema that need to be matched on the dependant value
						pattern:"tva-pattern-eu"
					}, 
					instance:{
						// the schema that pointed properties (from root) need to satisfy to evaluate 
						properties:{
							pathTo:{
								properties:{
									country:{
										enum:["SE","FR","ES"]
									}
								}
							}
						}
					}
				}
			]
		}


		With json-pointer :
		taxerate:{
			required:true,
			dependencies:[
				{ 
					constraint:{  // the schema that need to be matched on the dependant value. Optional : empty schema by default
						pattern:"tva-pattern-uk"
					}, 
					test:{
						// the schemas that pointed property (from root - in object instance) need to be satisfied to evaluate constraint above
						"#/address/country":{
							pattern:"UK"
						}
					}
				},
				{ 
					constraint:{
						// the schema that need to be matched on the dependant value
						pattern:"tva-pattern-eu"
					}, 
					test:{
						// the schema that whole object (from root) needs to be satisfied to evaluate constraint above
						"#/address/country":{ 
							enum:["FR", "ES"]
						}
					}
				}
			]
		}

		the order of evaluation is done up-bottom, and the first dependecy that match the test will test his constraint on the value.
		Only the first is interpreted.

		if there is 


		Donc : SI l'instance satisfait tels schema : ALORS la valeur dépendante doit satisfaire tels contraintes

		manque mécanisme de référence interne : 

		genre : 

		mySchema:{
			obj:{
				obj2:{
					"$ref": "/"
				}
			}
		}

		==> utiliser backgrounds + json-pointer

		{
			properties:{
				myNestedChilds:{
					patternProperties:{
						/.* /g:{
							backgrounds:["#/"],   // TOdo faire attention dans l'backgrounds d'un ancêtre : cycle possible : faut que l'extension ne cycle pas mais que la structure soit bien nesté à l'infini : solution faire l'backgrounds le plus tard possible : ne pas extender toute la structure dés le début
							properties:{ 
								parent:{ type:"any" } 
							} 
						}
					}
							
				}
			}
		}

		sinon : addionnal items n'a de sens que si items est une array.



		REFACTORING EXTENDS
		backgrounds dans deep-schema : faire un mix : 
		précompilation du schéma : dés qu'on voit qu'on doit choper un ancetre pour un backgrounds (dans le schema) : on laisse l'backgrounds  (on remplace dans l'array backgrounds tout ce qui peut etre compilé par sa compilation (par groupe en laissant l'ordre et les référence vers anc^etres tel quel - tout ce qui est en dessous de la première référence à un parent peut déjà être appliqué))
		lorsqu'on a une instance : lors du parsing/compilation (au deep-copy par exemple, lorsqu'on voit passer tous les champs) : 
			on chope le schema associé à la propriété courante
				si backgrounds encore présent dans schema : copier ancetre dans vide, (sans backgrounds), coller schema prop courante dessus (sans backgrounds) : retourner le tout

		si backgrounds vers ancetres dans instance : throw : error : cycle present ! structure infinie



		backgrounds et foregrounds : 
			ne pas les mettre dans l'instance : ca devient difficile à gérer : les mettre dans le schema : la c'est cohérent
 
 		au final : comme un schema chope de plus en plus de propriétés d'un deep-factory : il faudrait que le schema soit un deep-factory 
 		dont son propre schema soit le meta schema du schema
 *	@author gilles.coomans@gmail.com
 * @module deep
 * @submodule deep-schema
 */

/**
 * TODO : 
 * json-pointer dereferencement							OK
 * add relative reference to json-pointer					OK
 * dependencies : clarify, and/or implement if(constraint.match(root)) constraint(value)
 * links dereferencer  : template-engine + instance injection + DeepRequest.retrieve
 * référencement interne : backgrounds ou $ref with json-pointer					OK



Patterns :
	- name patterns + data : regExp, enum, direct       (could be external)
	- query pattern : if query then pattern match

	properties:{
		christophil:{
			dependenciesQueries:
			{
				matchEurope:{     // it's the relation/dependency name
					query:"",
					required:true,   // mean that the query MUST give something : so the dependency MUST be valid
					patternProperties:{
						"$ref":[ "json::/Pathologies/?type=perenial&zone=europe&$result=hash" ]  // exemple of external patterns definitions
					}
				},
				matchUK:{
					query:"";
					required:false,  // optional dependency
					properties:{
	
					}
				}
			}
		}
	}


property name + data pattern : could be an external link to a service that provides a list of acceptable values.
Imagine you would define a pathologie list for plants. Each plant could be sensible to a subset of those pathologies, and could have different kinds of sensibility...
The service could provids the list of known pathologies, and the subset have to match 


 */


 /**
 * console.flags : {
	validationError,
	validator
 }
 */

if(typeof define !== 'function')
{
	var define = require('amdefine')(module);
	var swig = require("swig");
	var isNode = true;
}	
define(["require", "./utils", "./promise"],
function(require){

	if(isNode)
	{	swig.init({
			filters:{
				join_coma:function (input) {
					if(input instanceof Array)
						return input.join(",");
					return input;
				}
			}
		});
	}


	var utils = require("./utils");
	var promise = require("./promise");
	function findPatternProperties(name, patterns)
	{
		var res = [];
		for(var i in patterns)
		{
			if(!patterns.hasOwnProperty(i))
				continue;
			if(new RegExp(i).test(name))
				res.push(patterns[i])
		}
		return res;
	}

	var Validator = function(){};

	var getType = Validator.prototype.getType = function (value){
		for(var i in this.lexic.type)
			if(this.lexic.type.hasOwnProperty(i) && i != "any" && i != "object" && i != "schema" && this.lexic.type[i].test.apply(this, [value]))
				return i;
		if(this.lexic.type.object.test.apply(this, [value]))
			return 'object';
		return null;
	}

	Validator.prototype.convertStringTo = function (value, type){

		switch(type)
		{
			case "number" : 
				value = parseFloat(value); break;
			case "float" : 
				value = parseFloat(value); break;
			case "integer" : 
				value = parseInt(value); break;
			case "boolean" : 
				value =  (value == "true" || value == "1")?true:false; break;
			default : // string
				value;
		}
		//console.log("convertStringTo : ", value,   " - ", type)
		return value;
	}

	Validator.prototype.errors = null;
	Validator.prototype.errorsMap = null;

	Validator.prototype.doTest = function doTest(entry, value, type, schema, valuePath, schemaPath, schemaProperty)
	{
		//console.log("do test "+entry.test.apply(this, [value, type, schema, valuePath, schemaPath, schemaProperty]))
		if(entry.test && !entry.test.apply(this, [value, type, schema, valuePath, schemaPath, schemaProperty]))
			this.createError(entry.error, value, type, schema, valuePath, schemaPath, schemaProperty);
	}

	Validator.prototype.createError = function createError(message, value, type, schema, valuePath, schemaPath, schemaProperty){
		if(!schemaProperty)
			schemaProperty = ""
		var detail = swig.compile(message)({ value:value, type:type, path:valuePath, schema:schema, schemaPath:schemaPath, __this:this });
		var error = {
			detail:detail,
			value:value,
			type:type,
			schema:schema,
			path:valuePath,
			schemaPath:schemaPath,
			schemaProperty:schemaProperty
		}
		if(!this.errorsMap)
			this.errorsMap = {};
		if(!this.errorsMap[valuePath])
			this.errorsMap[valuePath] = {};
		if(!this.errorsMap[valuePath].errors)
			this.errorsMap[valuePath].errors = [];
		this.errorsMap[valuePath].errors.push(error);
		if(console.flags.validationError) console.log("validator", "create error : ", JSON.stringify(error));
		this.errors.push(error);
		return error;
	}

	/*Validator.prototype.extendsObject = function extendsObject(schema, path)
	{
		return this.extendsObject(schema, path);
	}

	Validator.prototype.dereferenceObject = function dereferenceObject(schema, path)
	{
		//console.log("dereference : "+path, " - schema : ", schema);
		return this.dereferenceObject(schema, path);
	}

	Validator.prototype.compileObject = function(schema){
		return this.compileObject(schema);
	}*/
	
	Validator.prototype.checkRef = function checkRef(value, schema, valuePath, schemaPath, nextValidation)
	{
		if(nextValidation == undefined)
			nextValidation = this.validateProperty;
		var othis = this;
		return nextValidation.apply(othis,[value, schema, valuePath, schemaPath]);
	}

	Validator.prototype.validateSchema = function validateSchema(schema, options)
	{
		this.errorsMap = {};
		this.errors = [];
		var othis = this;
		var deferred = promise.Deferred();
		this.options = options | {};
		if(!this.options.basePath)
			this.options.basePath = "";
		if(!this.options.baseSchemaPath)
			this.options.baseSchemaPath = "";
		this.validateSchemaProperties(null, schema, null, this.options.basePath);
		var report = {
			errorsMap:othis.errorsMap,
			schema:schema,
			value:null,
			date:Date.now(),
			valid:(othis.errors.length == 0)
		}
		return report;
	}

	Validator.prototype.validate = function validate(value, schema, options){
		//console.log("validate ___________________")

		this.rootValue = value;
		this.errors = [];
		this.errorsMap = {};
		var othis = this;
		this.options = options || {};
		if(!this.options.basePath)
			this.options.basePath = "";
		if(!this.options.baseSchemaPath)
			this.options.baseSchemaPath = "";
		this.validateProperty(value, schema, this.options.basePath, this.options.baseSchemaPath);
		var report = {
			errorsMap:othis.errorsMap,
			schema:schema,
			value:value,
			date:Date.now(),
			valid:(othis.errors.length == 0)
		}
		return report;
	}

	Validator.prototype.partialValidation =  function partialValidation( object, schema, options){
		this.errors = [];
		this.errorsMap = {};
		this.options = options || {};

		var fieldsToCheck = options.fieldsToCheck || [];
		var parts = [];
		var promises = [];
		var schemaPaths = [];
		var deferred = promise.Deferred();
		var othis = this;
		console.log("Validator", "partialValidation : fieldsToCheck = " + fieldsToCheck);
	
		fieldsToCheck.forEach(function  (required) {
			//console.log("Validator", "partialValidation : forEach : field = " + required);

			var schem = utils.retrieveFullSchemaByPath(schema, required);
			if(!schem)
				return;
			//console.log("partial schema : ", schem)
			var obj = utils.retrieveValueByPath(object, required);
			if(obj != "" && !obj && schem.required)
			{
				//console.log("partial : missing prop : (required)");
				othis.createError(othis.lexic[othis.lexic.__requiredEquivalent].error ,obj, "undefined",  schem, required );
				return;
			}
			promises.push(othis.validate(obj, schem, { basePath:required, baseSchemaPath:null }));
		})
		
	
		promise.all(promises).then(function partialValidationDone(results){
			var valid = true;
			
			results.forEach(function partialValidationDoneLoopResult(report){
			//console.log("validator", "________________ partialValidation : report : "+JSON.stringify(report));
				if(!report.valid)
				{
					valid = false;
					for(var i in report.errorsMap)
					{
						if(!othis.errorsMap[i])
							othis.errorsMap[i] = { errors:[] };
						othis.errorsMap[i].errors = report.errorsMap[i].errors;
					}
				}	
			})
			//console.log("validator", "________________ partialValidation : final errorsMap : "+JSON.stringify(errorsMap));
			deferred.resolve({ schema:schema, value:object, errorsMap:othis.errorsMap, valid:valid,  date:Date.now(), partial:true })
		})
		return promise.promise(deferred);
	}

	Validator.prototype.validateSchemaProperties = function validateSchemaProperties(value, schema, valuePath, schemaPath)
	{
		var validations = [];
		for(var i in schema)
		{
			if(!schema.hasOwnProperty(i))
				continue;
			var type = getType.apply(this, [schema[i]]);
			switch(i){
				case "type": 
					if(typeof schema.type !== 'string' || !this.lexic.type[schema.type])
						this.createError(this.lexic.__additionalErrors.unknownSchemaType, schema.type, this.getType(schema.type), null, null, schemaPath, "type");
				 	break;
				case "format": 
					if(typeof schema.format !== 'string' || !this.lexic.__defaultPattern[schema.format])
						this.createError(this.lexic.__additionalErrors.unknownFormatType, schema.format, this.getType(schema.format), null, null, schemaPath, "format");
				 	break;
				 case "pattern": 
					if(typeof schema.pattern !== 'string' || !this.lexic.__defaultPattern[schema.pattern])
						this.createError(this.lexic.__additionalErrors.unknownFormatType, schema.pattern, this.getType(schema.pattern), null, null, schemaPath, "pattern");
				 	break;
				default : 
					validations.push(this.checkRef(schema[i], this.lexic[i].schema, schemaPath, i+".schema"));
			}	
		}
		return validations;
	}


	Validator.prototype.validateProperty = function (value, schema, valuePath, schemaPath)
	{
		//if(console.flags.validator) console.log("validator", "validateProperty : ",value, schema)
		var validations = [];
		var type = this.getType(value);

		if(this.options.forceConversion && schema.type != type)
		switch(schema.type)
			{
			/*	case "array" : 
				if(value )
					if(field.lastNodeRef[field.lastPathPart] == null)
						field.lastNodeRef[field.lastPathPart] = new Array();
					break;*/
				case "number" : value = parseFloat(value); break;	
				case "float" : value = parseFloat(value); break;	
				case "integer" : value = parseInt(value); break;
				case "boolean" :
					//console.log("VERIFY A BOOLEAN VALUE - value = ", val )
					value = (value == 'true' || value == "1" || value == true)?true:false;
					break;	
				default : ;
			}


		var othis = this;
		if(type == null)
			type = typeof value;
		if(!schema.type)
			schema.type = "object";

		var types = schema.type;
		if(!types.push)
			types = [types];

		//console.log("will test type in types : " , type, types)

		var ok = false;
		for(var i = 0; i < types.length; ++i)
		{



			if(types[i] == "schema")
			{
				if(type != "object")
					this.createError(this.lexic.__additionalErrors.schemaIsNotObject, value, type, schema, valuePath, schemaPath, schemaPath+".type");
				else
					validations.push(this.validateSchemaProperties(null, value, null, valuePath));
				return;
			}
			if(!this.lexic.type[types[i]])
			{
				this.createError(this.lexic.__additionalErrors.unknownSchemaType, value, type, schema, valuePath, schemaPath, schemaPath+".type");
				continue;
			}
			if(type == types[i] || types[i] == "any")
			{
				ok = true;
				break;
			}
		}
		if(!ok)
			this.createError(this.lexic.__additionalErrors.badType, value, type, schema, valuePath, schemaPath, schemaPath+".type");
			//console.log("test _______________")
		
		var dependenciesMatch = false;
		if(schema.dependencies && schema.dependencies.length > 0)
		{

			schema.dependencies.forEach(function  (dep) {
				var res = Querier.query(value, dep.query);
				//console.log("test dependancy query: ", res, " - constraints : ", dep.constraints)
				if(res.length > 0)
				{
					dependenciesMatch = true;
					var rep = othis.validateProperty(value, dep.constraints, valuePath, schemaPath);
					///console.log("dependency validation ? ", rep.valid)
					ok = ok && rep.valid;
				}
			})
		}


		if(!dependenciesMatch && schema.items && type == "array")
		{
	 		if(schema.items.push)
	 		{	
	 			var i = 0;
	 			for(; i < schema.items.length; ++i)
	 				validations.push(this.checkRef(value[i], schema.items[i], valuePath+"."+i, schemaPath+".items["+i+"]"));
	 			if(i < value.length && (schema.additionalItems == undefined || schema.additionalItems !== false) )
	 				for(; i < value.length; ++i)
	 					validations.push(this.checkRef(value[i], schema.additionalItems || {}, valuePath+"["+i+"]", schemaPath+".additionalItems"));
	 			else if(schema.additionalItems === false)
					this.createError(this.lexic.additionalItems.error, value, type, schema, valuePath+"["+i+"]",  schemaPath+".items" );
	 		}
	 		else
	 			for(var i = 0; i < value.length; ++i)
	 				validations.push(this.checkRef(value[i], schema.items, valuePath+"."+i, schemaPath+".items"));
		}

		if(!dependenciesMatch && type == "object")
		{
			// check all properties of object
			for(var i in value)
			{
				if(!value.hasOwnProperty(i))
					continue;
				var schemas = [];
				// get schema pattern properties that match property name
				if(schema.patternProperties)
					schemas = findPatternProperties(i, schema.patternProperties);
				// get regular property
				if(schema.properties && schema.properties[i])
					schemas.push(schema.properties[i]);
				if(schemas.length == 0) // no pattern nor regular schema find for this property
				{ 
					if(schema.additionalProperties == undefined || schema.additionalProperties !== false)  // try additionalProperties schema
		 				validations.push(this.checkRef(value[i], schema.additionalProperties || { type:"any" }, valuePath+"."+i, schemaPath+".additionalProperties"));
					else if(schema.additionalProperties === false)
						this.createError(this.lexic.additionalProperties.error, value[i], getType.apply(this, [value[i]]),  schema, valuePath+"."+i,  schemaPath+".properties."+i );
				}
				else{	// merge array of schema found for this property (patterns and/or regular schema properties)
					var res = {};
					schemas.forEach(function deepCopySchema(e){   // merge : patterns in backgrounds, regular on top
						utils.deepCopy(e, res);
					})
			 		validations.push(this.checkRef(value[i], res, valuePath+"."+i,  schemaPath+".(merged)properties."+i));
				}
			}
			//console.log("required ? "+this.lexic[this.lexic.__requiredEquivalent].schema.type)
			// check required that's missing
			if(this.lexic[this.lexic.__requiredEquivalent].schema.type == "boolean") // handling v2 and v3 behaviour. Ommited for v4.
			{	
			//	console.log("handle required as boolean")
				for(var i in schema.properties)
					if(schema.properties[i][this.lexic.__requiredEquivalent] && typeof value[i] === 'undefined')
						this.createError(this.lexic[this.lexic.__requiredEquivalent].error , value[i], "undefined",  schema, valuePath+"."+i,  schemaPath+".properties."+i );
			}
		}
		//	console.log("test _______________")
		if(!dependenciesMatch)
			for(var i in schema)
			{
				if(!schema.hasOwnProperty(i))
					continue;
				//console.log("simple schema prop test : "+i + " - schema : "+JSON.stringify(schema))
				switch(i)
				{
					case "type": break;
					case "properties": break;
					case "dependencies": break;
					case "patternProperties": break;
					case "items": break;
					case "additionalItems": break;
					case "additionalProperties": break;
					default:
					//console.log("Validator.lexic[i] ",i)
					if(this.lexic[i])
						this.doTest( this.lexic[i], value, type, schema, valuePath, schemaPath );
					else
						if(console.flags.validator) console.log("validator", "unrecognised schema property : "+i);
				}
			}
		return validations;
	}
	
	Validator.prototype.applyLexic = function applyLexic(lexic){
		utils.up(lexic, this.lexic);
	}
	Validator.prototype.lexic = {
		__additionalErrors:{
			schemaIsNotObject:"{{ path }}, trying to validate a schema (type:'schema') but the value isn't an object : Value provided : {{ value }}",
			badType:"{{ path }}, type not allowed. Allowed type :  {{ schema.type }}",
			unknownSchemaType:"type from schema is unknown : {{ schema.type }}"
		},
		__requiredEquivalent:"required",
		__defaultPattern:{
			uri:{
				test: function(value){ return (/.*/g).test(value) },
				error:"need to be with uri format"
			},
			date:{
				test:function(value){ return (/.*/g).test(value) },
				error:"need to be with date format"
			},
			phone:{
				test:function(value){ return (/.*/g).test(value) },
				error:"need to be with phone format"
			},
			email:{
				//test:function(value){ return (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/).test(value) },
				test:function(value){ return (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/gi).test(value) },
				error:"need to be with email format"
			},
			zip:{
				test:function(value){ return (/.*/g).test(value) },
				error:"need to be with zip format"
			},
			ipv4:{
				test:function(value){ return (/.*/g).test(value) },
				error:"need to be with ipv4 format"
			},
			ipv6:{
				test:function(value){ return (/.*/g).test(value) },
				error:"need to be with ipv6 format"
			},
			"date-time":{
				test:function(value){ return (/.*/g).test(value) },
				error:"need to be with date-time format"
			},
			"utc-millisec":{
				test:function(value){ 
					
					return (/.*/g).test(value) 
				},
				error:"need to be with date-time format"
			}
		},
		type:{
			any:{
				test:function(value){ return true; }
			},
			object:{
				test:function(value){ return typeof value === 'object'; },
				error:"{{ path }} need to be float. Value provided : {{ value }}"
			},
			"boolean":{
				test:function(value){ return value === true || value === false; },
				error:"{{ path }} need to be float. Value provided : {{ value }}"
			},
			number:{
				test:function(value){
			//	console.log("DEEP-SCHEMA : test number type of : ", value, typeof value);
				 return typeof value === 'number' && !isNaN(value); 
				},
				error:"{{ path }} need to be float. Value provided : {{ value }}"
			},
			integer:{
				test:function(value){	return typeof value === 'number' && parseInt(String(value)) != NaN; },
				error:"{{ path }} need to be integer. Value provided : {{ value }}"
			},
			"null":{
				test:function(value){	return value === null; },
				error:"{{ path }} need to be null. Value provided : {{ value }}"
			},
			string:{
				test:function(value){ return typeof value === 'string'; },
				error:"{{ path }} need to be string. Value provided : {{ value }}"
			},
			array:{
				test:function(value){ return value instanceof Array; },
				error:"{{ path }} need to be array. Value provided : {{ value }}"
			},
			schema:{
				test:function(value){ return typeof value === 'object'; },
				error:"{{ path }} need to be true. Value provided : {{ value }}"
			}
		},
		dependencies:{
			schema:{ 
				type:"array",
				items:{
					properties:{
						query:{ type:"string", required:true },
						constraints:{
							type:"schema"
						}
					}
				}
			},
			test:function(value, type, schema, valuePath, schemaPath){ 
				var othis = this;
				var ok = true;
				//console.log("DEEP-SCHEMA : test dependencies : ", schema.dependencies);
				if(schema.dependencies && schema.dependencies.length > 0)
					schema.dependencies.forEach(function  (dep) {

						var res = Querier.query(value, dep.query);
						//console.log("test dependancy query: ", res)
						if(res.length > 0)
						{
							var schemaCopied = {}
							for(var i in schema)
							{
								if(!schema.hasOwnProperty(i) || i == "dependencies")
									continue;
								schemaCopied[i] = utils.deepCopy(schema[i], {});
							}
							schemaCopied = utils.deepCopy(dep.constraints, schemaCopied);
							var rep = othis.validateProperty(value, schemaCopied, valuePath, schemaPath);
							///console.log("dependency validation ? ", rep.valid)
							ok = ok && rep.valid;
						}
					})
				return true;
			},
			error:"{{ path }} unmatched dependency {{ schema.dependencies }}. Value provided : {{ value|json }}"
		},
		format:{
			schema:{ type:"string" },
			test:function(value, type, schema, valuePath, schemaPath){ 
				if((!value) && !schema.required)
					return true;
				if(type == "array" || type == "object") return true; 
				//console.log("try interpret reg exp for format : "+this.lexic.__defaultPattern[schema.format].test)

				if(this.lexic.__defaultPattern[schema.format])
					return this.lexic.__defaultPattern[schema.format].test.apply(this, [value, type, schema, valuePath, schemaPath, schemaPath+".format"]);	
				//console.log("try interpret direct reg exp for format : "+schema.format)
				return new RegExp(schema.format).test(String(value)); 
			},
			error:"{{ path }} unmatched format {{ schema.format }}. Value provided : {{ value }}"
		},
		pattern:{
			schema:{ type:"string" },
			test:function(value, type, schema, valuePath, schemaPath){ 
				if((!value) && !schema.required)
					return true;
				if(type == "array" || type == "object") return true; 
				if(this.lexic.__defaultPattern[schema.pattern])
					return this.doTest(this.lexic.__defaultPattern[schema.pattern], value, type, schema, valuePath, schemaPath, schemaPath+".pattern");	
				return new RegExp(schema.pattern).searchInterpretable(String(value)); 
			},
			error:"{{ path }} unmatched pattern {{ schema.pattern }}. Value provided : {{ value }}"
		},
		minLength:{
			schema:{ type:"integer" },
			test:function(value, type, schema){ 
				//console.log("min length "+value.length+ " - type : "+type + " - have to be : "+schema.minLength)
				if(type != "array" && type != "string" && type != "integer") return true; 
				if((!value || value == "") && !schema.required)
					return true;
				return value.length >= schema.minLength; 
			},
			error:"{{ path }} need to be at least {{ schema.minLength }} length. Value provided : {{ value }}"
		},
		maxLength:{
			schema:{ type:"integer" },
			test:function(value, type, schema){ 
				if((!value || value == "") && !schema.required)
					return true;
				if(type != "array" && type != "string" && type != "integer") return true;
				return value.length <= schema.maxLength; 
			},
			error:"{{ path }} need to be at max {{ schema.minLength }} length. Value provided : {{ value }}"
		},
		minimum:{
			schema:{ type:"number" },
			test:function(value, type, schema){ 
				if(type != "number" && type != "integer") return true; 
				if((!value || value == "") && !schema.required)
					return true;
				if(schema.exclusiveMinimum) return value > schema.minimum; 
				return value >= schema.minimum;  
			},
			error:"{{ path }} need to be at least {{ schema.exclusiveMinimum }}. Value provided : {{ value }}"
		},
		maximum:{
			schema:{ type:"number" },
			test:function(value, type, schema){ 
				if(type != "number" && type != "integer") return true; 
				if((!value) && !schema.required)
					return true;
				if(schema.exclusiveMaximum) return value < schema.maximum; 
				return value <= schema.maximum;  
			},
			error:"{{ path }} need to be max {{ schema.exclusiveMaximum }}. Value provided : {{ value }}"
		},
		minItems:{
			schema:{ type:"integer" },
			test:function(value, type, schema){
				if((!value) && !schema.required)
					return true;
				if(type != "array" ) return true;
				return value.length >= schema.minItems;  
			},
			error:"{{ path }} need to be at least {{ schema.minItems }} long. Value provided : {{ value|json }}"
		},
		maxItems:{
			schema:{ type:"integer" },
			test:function(value, type, schema){ 
				if((!value || value == "") && !schema.required)
					return true;
				if(type != "array") return true;
				return value.length <= schema.maxItems; 
			 },
			error:"{{ path }} need to be at max {{ schema.maxItems }} long. Value provided : {{ value|json }}"
		},
		required:{      /// draft v3
			schema:{ type:"boolean" },
			test:function(value, type, schema){ 
				//console.log("Validator : check required : ", typeof value !== 'undefined' )
				return typeof value !== 'undefined';  
			},
			error:"{{ path }} is required and is missing."
		},
		"enum":{
			schema:{ type:"array", items:{ type:"string" } },
			test:function(value, type, schema){
				if((typeof value === 'undefined' || value == "") && !schema.required)
					return true;
				if(type != "string" && type != "number" && type != "integer") return true;
				var ok = false;
				for(var i = 0; i < schema["enum"].length; ++i)
					if(value == schema['enum'][i])
					{
						ok = true;
						break;
					}
				return ok;  
			},
			error:"{{ path }} need to be equal to one of those values {{ schema.enum|join_coma }}. Value provided : {{ value }}"
		},
		disallow:{
			schema:{
				type:["array", "string"],
				'enum':["string", "array", "number", "integer", "date", "function", "null", "object"],
				items:{ type:"string", 'enum':["string", "array", "number", "integer", "date", "function", "null", "object"]}
			},
			test:function(value, type, schema){
				if((!value) && !schema.required)
					return true;
				if(typeof disallow.push !== 'function')
					return schema.disallow !== type;
				for(var i in schema.disallow)
					if(schema.disallow[i] == type)
						return false;
				return true;
			},
			error:"{{ path }} need to be of different type than {{ schema.disallow|join_coma }}. type provided : {{ type }}"
		},
		divisibleBy:{
			schema:{ type:"integer", minimum:1, absoluteMinimum:true },
			test:function(value, type, schema){
				if((!value) && !schema.required)
					return true;
				if(type != "number" && type != "integer") return true;
				return value % schema.divisibleBy == 0;
			},
			error:"{{ path }} ( value : {{ value }}) need to be divisible by {{ schema.divisibleBy }}."
		},
		uniqueItems:{
			schema:{ type:"boolean" },
			test:function(value, type, schema){ 
				if(type != "array") return true;
				if((!value) && !schema.required)
					return true;
				if(!schema.uniqueItems)
					return true;
				var uniques =  utils.arrayFusion(value, value); 
				return uniques.length == value.length;
			},
			error:"each item need to be unique"
		},
		
		/* ______________________________________   */


		exclusiveMinimum:{
			schema:{ type:"boolean" }
		},
		exclusiveMaximum:{
			schema:{ type:"boolean" }
		},
	/*	dependencies:{
		},*/
		"default":{
			schema:{ type:"any" }
		},
		title:{
			schema:{ type:"string" }
		},
		description:{
			schema:{ type:"string" }
		},
		id:{
			schema:{ type:"string" }
		},
		readOnly:{
			schema:{ type:"boolean" }
		},
	/*
		EXTERNAL REFERENCES
	*/
		"backgrounds":{
			schema:{ type:["string", "array"], items:{ type:"string" }, loadable:"direct"}
		},
		"$schema":{
			schema:{ type:"string", items:{ type:"string" }},
			test:function(value, type, schema){
				console&&console.log("$schema isn't implemented in this validator and will not be implemented (due to his self definition method)");
				return true;
			}
		},
		"$ref":{
			schema:{ type:"string" }
		},
		links:{
			schema:{ 
				type:"array", 
				items:{
				 	type:"object",
				 	properties:{
						rel:{ type:"string", required:true },
						href:{ type:"string", required:true },
						template:{ type:"string" },  // replace template
						targetSchema:{ type:"string" },
						method:{ type:"string", "enum":["GET", "PUT", "POST", "DELETE"] },
						enctype:{
							type:"string",
							"default":"application/json" 
						},
						schema:{ type:"schema" }
				 	}
				}
			}
		},
		additionalProperties:{
			schema:{ type:["false", "schema"] },
			error:"no additional properties are allowed"
		},
		patternProperties:{
			schema:{ type:"object", patternProperties:{ "/.*/g":{ type:"schema" } } }
		},
		properties:{
			schema:{ type:"object", patternProperties:{ "/.*/g":{ type:"schema" } } }
		},
		contentEncoding:{
			schema:{ type:"string" }
		},
		mediaType:{
			schema:{ type:"string" }
		},
		additionalItems:{
			schema:{ type:["false", "schema"] },
			error:"no additional items are allowed"
		},
		items:{
			schema:{ type:["array", "schema"], items:{ type:"schema" } }
		}
	}


	var draftv4 = {
		divisibleBy:{
			"$ommit":true
		},
		/*format:{
			"$ommit":true
		},*/
		mod:{
			schema:{ type:"integer", minimum:1, absoluteMinimum:true },
			test:function(value, type, schema){
				if((!value) && !schema.required)
					return true;
				if(type != "number" && type != "integer") return true;
				return value % schema.mod == 0;
			},
			error:"need to be divisible by {{ schema.divisibleBy }}"
		},
		/*required:{      // draft v4
			schema:{ type:"array", items:{ type:"string" } },
			test:function(value, type, schema){ 
				if(type == "object")
					schema.required.forEach(function(e){
						if(!value[i])
							return false;
					})
				return true;
			},
			error:"is required and is missing."
		},*/
		maxProperties:{
			schema:{
				type:"integer",
				minimum:0
			},
			test:function(value, type, schema)
			{
				var count = 0;
				for(var i in value)
				{
					if(!value.hasOwnProperties(i))
						continue;
					count++;
				}
				return count <= schema.maxProperties;
			},
			error:"need to have maximum {{ schema.maxProperties }} properties"
		},
		minProperties:{
			schema:{
				type:"integer",
				minimum:0
			},
			test:function(value, type, schema)
			{
				var count = 0;
				for(var i in value)
				{
					if(!value.hasOwnProperties(i))
						continue;
					count++;
				}
				return count >= schema.minProperties;
			},
			error:"need to have minimum {{ schema.maxProperties }} properties"
		}
	}

	var leafSpecific = {
		
		__defaultPattern:{
			retrievable:{
				test: function(value){ 
					if((!value) && !schema.required)
					return true;
					return DeepRequest.isRetrievable(value).type != null; 
				},
				error:"need to be in 'retrievable' format. (see deep/deep-request/isRetrievable())"
			}
		},
		merge:{
			schema:{ type:["string", "boolean"] }
		},
		loadable:{
			schema:{ type:"string", "enum":["deep", "direct", "none"] }
		},
		preload:{
			schema:{ type:"boolean", required:false, "default":true }
		},
		reloadable:{
			schema:{ type:"boolean" }
		},
		"interpretation-deepness":{
			schema:{ type:"string", "enum":["deep", "direct", "none"] }
		}
	}

	var newSpec = {
		type:{
			/*
			"hash":{
				test:function(value, type, schema){ 
					if(typeof value !== 'object')
						return false;
					if(schema.items)
					{
						var ok = true;
						for(var i in value)
						{
							if(!value.hasOwnProperty(i))
							{
								ok = ok && validateProperty(value[i], items);
							}
						} 
						return ok;
					}
					return true;
				},
				error:"need to be a object (hash)"
			}*/
		},
		notNull:{
			schema:{ type:"boolean" },
			test:function(value, type, schema){ 
				if((!value) && !schema.required)
					return true;
				if(schema.notNull) return value !== null; 
				return true;
			},
			error:"need to be not null"
		},
		absoluteMaximum:{
			schema:{ type:"boolean" }
		},
		absoluteMinimum:{
			schema:{ type:"boolean" }
		},
		minimum:{
			test:function(value, type, schema){ 
				if((!value) && !schema.required)
					return true;
				if(type != "number" && type != "integer") return true; 
				if(schema.absoluteMinimum) value = Math.abs(value);
				if(schema.exclusiveMinimum) return value > schema.minimum; 
				return value >= schema.minimum;  
			}
		},
		maximum:{
			test:function(value, type, schema){ 
				if((!value) && !schema.required)
					return true;
				if(type != "number" && type != "integer") return true; 
				if(schema.absoluteMaximum) value = Math.abs(value);
				if(schema.exclusiveMaximum) return value < schema.maximum; 
				return value <= schema.maximum;  
			}
		},
		needMatchingOn:{
			schema:{ type:"string" },
			test:function(value, type, schema){ 
				if((!value) && !schema.required)
					return true;
				var q = schema.needMatchingOn;
				if(q[0]=="#")
					q = q.substring(1);
				var res = Querier.query(this.rootValue, q)
				return res.length > 0 && res[0] == value;
			},
			error:"this field need to match {{ schema.needMatchingOn }}"
		}
	}

	var jsonExt = {
		type:{
			"function":{
				test:function(value){ return typeof value === 'function'; },
				error:"need to be a function"
			},
			"false":{
				test:function(value){ return value === false; },
				error:"need to be false"
			},
			"true":{
				test:function(value){ return value === true; },
				error:"need to be true"
			},
			"date":{
				test:function(value){ if(!value) return false; return typeof value.toUTCString === 'function'; },
				error:"need to be a date object"
			}
		}
	}


	var se_spec = {
		__defaultPattern:{
			"coordination-number":{
				test: function(value, type, schema){ 
					if(type != "string")
						return true;
					if(!schema.required && !value)
						return true;
					if(!value)
						return false;
					var tmp = value + "";
					if(tmp.length != 10)
						return false;
					var tmp = value.substring(4,5);
					tmp = parseInt(tmp);
					if(tmp < 60 || tmp > 91)
						return false;
					return true; 
				},
				error:"need to be in coordination-number format"
			},
			"personal-number":{
				test: function(value, type, schema){ 
					if(type != "string")
						return true;
					if(!schema.required && !value)
						return true;
					if(!value)
						return false;
					var tmp = value + "";
					if(tmp.length != 10)
						return false;
					var tmp = value.substring(4,5);
					tmp = parseInt(tmp);
					if(tmp < 60 || tmp > 91)
						return false;
					return true; 
				},
				error:"need to be in personal-number format"
			}
		}
	}
	
	utils.deepCopy(draftv4, Validator.prototype.lexic);
	utils.deepCopy(jsonExt, Validator.prototype.lexic);
	utils.deepCopy(newSpec, Validator.prototype.lexic);
	utils.deepCopy(se_spec, Validator.prototype.lexic);
//	utils.deepCopy(leafSpecific, Validator.prototype.lexic);


	var valider = new Validator();
	
	Validator.convertStringTo = function(obj, type){
		return valider.convertStringTo(obj, type);
	}
	Validator.validate = function(obj, schema, options){
		return valider.validate(obj, schema, options);
	}
	Validator.getType = function(value){
		return valider.getType(value);
	}
	Validator.partialValidation = function(obj, schema, options){
		return valider.partialValidation(obj, schema, options);
	}
	return Validator;

});
