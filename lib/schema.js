/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
/**
 *JSON-Schema validator : based on json-schema draft 02, 03, and 04 + extensions
 * http://tools.ietf.org/html/draft-zyp-json-schema-03
 */
if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(["require", "../deep", "./utils"], function(require, deep, utils) {

	function findPatternProperties(name, patterns) {
		var res = [];
		for (var i in patterns) {
			if (!patterns.hasOwnProperty(i))
				continue;
			if (new RegExp(i).test(name))
				res.push(patterns[i]);
		}
		return res;
	}

	/**
	 * @class Validator
	 * @namespace deep
	 * @constructor
	 */
	var Validator = function() {};

	var getType = Validator.prototype.getType = function(value) {
		for (var i in this.lexic.type)
			if (this.lexic.type.hasOwnProperty(i) && i != "any" && i != "object" && i != "schema" && this.lexic.type[i].test.apply(this, [value]))
				return i;
		if (this.lexic.type.object.test.apply(this, [value]))
			return 'object';
		return null;
	};

	Validator.prototype.createDefault = function(schema) {
		//console.log("schema createDefault : ", schema);
		if (schema["default"])
			return utils.copy(schema["default"]);
		if (schema.type == 'object' && !schema.properties)
			return {};
		var res = null;
		if (schema.properties) {
			res = {};
			for (var j in schema.properties) {
				var sch = schema.properties[j];
				res[j] = this.createDefault(sch);
			}
			return res;
		}
		if (schema.type == 'array' && !schema.items)
			return [];
		if (schema.items) {
			res = [];
			res.push(this.createDefault(schema.items));
			return res;
		}
		var type = schema.type;
		if (type.forEach)
			type = type[0];
		switch (type) {
			case "string":
				return "";
			case "number":
				return 0;
			case "integer":
				return 0;
			case "float":
				return 0.0;
			case "boolean":
				return true;
			case "date":
				return new Date();
			case "null":
				return null;
			default:
				return "unrecognised type";
		}
	};

	Validator.prototype.convertStringTo = function(value, type) {
		switch (type) {
			case "number":
				if (!isNaN(value))
					value = parseFloat(value);
				break;
			case "float":
				if (!isNaN(value))
					value = parseFloat(value);
				break;
			case "integer":
				if (!isNaN(value))
					value = parseInt(value, 10);
				break;
			case "boolean":
				value = (value == "true" || value == "1") ? true : false;
				break;
		}
		return value;
	};

	Validator.prototype.castAndCheck = function(value, schema, valuePath) {
		//console.log("cast and check on : ", value, schema, valuePath);
		if (!schema.type)
			return value;

		var types = schema.type;
		if (!types.forEach)
			types = [types];

		var error = null;

		var fin = null;
		var ok = false;
		for (var i = 0; i < types.length; ++i) {
			var type = types[i];
			switch (type) {
				case "number":
					if (isNaN(value)) {
						ok = false;
						break;
					}
					fin = parseFloat(value);
					if (!isNaN(fin) && fin !== Infinity)
						ok = true;
					break;
				case "float":
					if (isNaN(value)) {
						ok = false;
						break;
					}
					fin = parseFloat(value);
					if (!isNaN(fin) && fin !== Infinity)
						ok = true;
					break;
				case "integer":
					if (isNaN(value)) {
						ok = false;
						break;
					}
					fin = parseInt(value, 10);
					if (!isNaN(fin) && fin !== Infinity)
						ok = true;
					break;
				case "boolean":
					if (value == "true" || value == "1") {
						fin = true;
						ok = true;
					} else if (value == "false" || value === "0") {
						fin = false;
						ok = true;
					}
					break;
				case "string":
					if (typeof value === 'string') {
						fin = value;
						ok = true;
					}
					break;
			}
			if (ok)
				break;
		}
		if (!ok) {
			var rep = {
				value: value,
				schema: schema,
				errorsMap: {}
			};
			rep.errorsMap[valuePath] = {
				errors: [{
					detail: "casting failed. need : " + types.join(", ") + "."
				}]
			};
			return deep.errors.PreconditionFail("casting failed", rep);
		}
		var report = this.validate(fin, schema, {
			basePath: valuePath
		});
		if (!report.valid)
			return deep.errors.PreconditionFail("cast and check failed : ", report);
		return fin;
	};

	Validator.prototype.errors = null;
	Validator.prototype.errorsMap = null;
	Validator.prototype.doTest = function doTest(entry, value, type, schema, valuePath, schemaPath, schemaProperty) {
		//console.log("do test "+entry.test.apply(this, [value, type, schema, valuePath, schemaPath, schemaProperty]))
		if (entry.test && !entry.test.apply(this, [value, type, schema, valuePath, schemaPath, schemaProperty]))
			this.createError(entry.error, value, type, schema, valuePath, schemaPath, schemaProperty);
	};


	/*
{
    errors : [
        {
            message : "Instance is not a required type",
            uri : "urn:uuid:74b843b5-3aa4-44e9-b7bc-f555936fa823#/a",
            schemaUri : "urn:uuid:837fdefe-3bd4-4993-9a20-38a6a0624d5a#/properties/a",
            attribute : "type",
            details : ["string"]
        }
    ],
    validated : {
        "urn:uuid:74b843b5-3aa4-44e9-b7bc-f555936fa823#" : ["urn:uuid:837fdefe-3bd4-4993-9a20-38a6a0624d5a#"],
        "urn:uuid:74b843b5-3aa4-44e9-b7bc-f555936fa823#/a" : ["urn:uuid:837fdefe-3bd4-4993-9a20-38a6a0624d5a#/properties/a"],
        //...
    },
    instance : [JSONInstance object],
    schema : [JSONSchema object],
    schemaSchema : [JSONSchema object]
}
*/

	Validator.prototype.createError = function createError(message, value, type, schema, valuePath, schemaPath, schemaProperty) {
		if (valuePath[0] == ".")
			valuePath = valuePath.substring(1);
		if (!schemaProperty)
			schemaProperty = "";

		var error = {
			value: value,
			detectedType: type,
			schema: schema,
			path: valuePath,
			schemaPath: schemaPath,
			attribute: schemaProperty,
			details: [value]
		};
		error.message = utils.interpret(message, error);
		if (!this.errorsMap)
			this.errorsMap = {};
		//console.log("deep-schema produce error : ", valuePath)
		if (!this.errorsMap[valuePath])
			this.errorsMap[valuePath] = {};
		if (!this.errorsMap[valuePath].errors)
			this.errorsMap[valuePath].errors = [];
		this.errorsMap[valuePath].errors.push(error);
		this.errors.push(error);
		return error;
	};
	Validator.prototype.checkRef = function checkRef(value, schema, valuePath, schemaPath, nextValidation) {
		if (valuePath[0] == ".")
			valuePath = valuePath.substring(1);
		if (nextValidation === undefined)
			nextValidation = this.validateProperty;
		var othis = this;
		return nextValidation.apply(othis, [value, schema, valuePath, schemaPath]);
	};
	Validator.prototype.validateSchema = function validateSchema(schema, options) {
		this.errorsMap = {};
		this.errors = [];
		var othis = this;
		this.options = options | {};
		if (!this.options.basePath)
			this.options.basePath = "";
		if (!this.options.baseSchemaPath)
			this.options.baseSchemaPath = "";
		this.validateSchemaProperties(null, schema, null, this.options.basePath);
		var report = {
			errors: this.errors,
			errorsMap: othis.errorsMap,
			schema: schema,
			value: schema,
			date: Date.now(),
			valid: (othis.errors.length === 0)
		};
		return report;
	};

	Validator.prototype.validate = function validate(value, schema, options) {
		// console.log("validate ___________________")
		if (options && options.partial) {
			options.fieldsToCheck = deep.query(value, ".//*").paths();
			return this.partialValidation(value, schema, options);
		}
		this.rootValue = value;
		this.errors = [];
		this.errorsMap = {};
		var othis = this;
		this.options = options || {};
		if (!this.options.basePath)
			this.options.basePath = "";
		if (!this.options.baseSchemaPath)
			this.options.baseSchemaPath = "";
		// console.log("launch validation")
		this.validateProperty(value, schema, this.options.basePath, this.options.baseSchemaPath);
		var report = {
			errors: this.errors,
			errorsMap: othis.errorsMap,
			schema: schema,
			value: value,
			date: Date.now(),
			valid: (othis.errors.length === 0)
		};
		return report;
	};

	Validator.prototype.partialValidation = function partialValidation(object, schema, options) {
		this.errors = [];
		this.errorsMap = {};
		this.options = options || {};

		var fieldsToCheck = options.fieldsToCheck || [];
		var parts = [];
		var promises = [];
		var schemaPaths = [];
		var deferred = deep.Deferred();
		var othis = this;
		//console.log("Validator", "partialValidation : fieldsToCheck = " + fieldsToCheck);

		fieldsToCheck.forEach(function(required) {
			//console.log("Validator", "partialValidation : forEach : field = " + required);

			var schem = utils.retrieveFullSchemaByPath(schema, required);
			if (!schem)
				return;
			//console.log("partial schema : ", schem)
			var obj = utils.fromPath(object, required);
			if (obj !== "" && !obj && schem.required) {
				//console.log("partial : missing prop : (required)");
				othis.createError(othis.lexic[othis.lexic.__requiredEquivalent].error, obj, "undefined", schem, required);
				return;
			}
			promises.push(othis.validate(obj, schem, {
				basePath: required,
				baseSchemaPath: null
			}));
		});


		deep.all(promises)
			.then(function partialValidationDone(results) {
				var valid = true;

				results.forEach(function partialValidationDoneLoopResult(report) {
					//console.log("validator", "________________ partialValidation : report : "+JSON.stringify(report));
					if (!report.valid) {
						valid = false;
						for (var i in report.errorsMap) {
							if (!othis.errorsMap[i])
								othis.errorsMap[i] = {
									errors: []
								};
							othis.errorsMap[i].errors = report.errorsMap[i].errors;
						}
					}
				});
				//console.log("validator", "________________ partialValidation : final errorsMap : "+JSON.stringify(errorsMap));
				deferred.resolve({
					errors: othis.errors,
					schema: schema,
					value: object,
					errorsMap: othis.errorsMap,
					valid: valid,
					date: Date.now(),
					partial: true
				});
			});
		return deferred.promise();
	};

	Validator.prototype.validateSchemaProperties = function validateSchemaProperties(value, schema, valuePath, schemaPath) {
		var validations = [];
		for (var i in schema) {
			if (!schema.hasOwnProperty(i))
				continue;
			var type = getType.apply(this, [schema[i]]);
			switch (i) {
				case "type":
					if (typeof schema.type !== 'string' || !this.lexic.type[schema.type])
						this.createError(this.lexic.__additionalErrors.unknownSchemaType, schema.type, this.getType(schema.type), null, null, schemaPath, "type");
					break;
				case "format":
					if (typeof schema.format !== 'string' || !this.lexic.__defaultPattern[schema.format])
						this.createError(this.lexic.__additionalErrors.unknownFormatType, schema.format, this.getType(schema.format), null, null, schemaPath, "format");
					break;
				case "pattern":
					if (typeof schema.pattern !== 'string' || !this.lexic.__defaultPattern[schema.pattern])
						this.createError(this.lexic.__additionalErrors.unknownFormatType, schema.pattern, this.getType(schema.pattern), null, null, schemaPath, "pattern");
					break;

				default:
					validations.push(this.checkRef(schema[i], this.lexic[i].schema, schemaPath, i + ".schema"));
			}
		}
		return validations;
	};

	Validator.prototype.validateProperty = function(value, schema, valuePath, schemaPath) {
		var validations = [];
		// console.log("_______________________________ validateProperty ", valuePath)

		var type = this.getType(value);
		var othis = this;
		var ok = true;
		// console.log("_______________________________ forceConversio sart")
		if (this.options.forceConversion && schema.type !== type)
			switch (schema.type) {
				case "number":
					if (isNaN(value)) {
						value = NaN;
						ok = false;
						break;
					}
					value = parseFloat(value);
					break;
				case "float":
					if (isNaN(value)) {
						value = NaN;
						ok = false;
						break;
					}
					value = parseFloat(value);
					break;
				case "integer":
					if (isNaN(value)) {
						value = NaN;
						ok = false;
						break;
					}
					value = parseInt(value, 10);
					break;
				case "boolean":
					//console.log("VERIFY A BOOLEAN VALUE - value = ", val )
					value = (value == 'true' || value == "1" || value === true) ? true : false;
					break;
			}
			// console.log("_______________________________ forceConversio done : ", value, type, schema.type)

		if (ok) {
			ok = false;
			if (type === null)
				type = typeof value;
			if (!schema.type)
				schema.type = "object";

			var types = schema.type;
			if (!types.push)
				types = [types];

			if (type == 'undefined' && !schema.required)
				ok = true;
			else
				for (var i = 0; i < types.length; ++i) {
					if (types[i] == "schema") {
						if (type != "object")
							this.createError(this.lexic.__additionalErrors.schemaIsNotObject, value, type, schema, valuePath, schemaPath, schemaPath + ".type");
						else
							validations.push(this.validateSchemaProperties(null, value, null, valuePath));
						return;
					}
					if (!this.lexic.type[types[i]]) {
						this.createError(this.lexic.__additionalErrors.unknownSchemaType, value, type, schema, valuePath, schemaPath, schemaPath + ".type");
						continue;
					}
					if (type == types[i] || types[i] == "any") {
						ok = true;
						break;
					}
				}
		}
		if (!ok)
			this.createError(this.lexic.__additionalErrors.badType, value, type, schema, valuePath, schemaPath, schemaPath + ".type");

		var dependenciesMatch = false;
		if (schema.dependencies && schema.dependencies.length > 0) {

			schema.dependencies.forEach(function(dep) {
				var res = deep.Querier.query(value, dep.query);
				// console.log("test dependancy query: ", res, " - constraints : ", dep.constraints);
				if (res.length > 0) {
					dependenciesMatch = true;
					var finSchema = deep.aup(schema, {});
					deep.aup(dep.constraints, finSchema);
					delete finSchema.dependencies;
					var rep = othis.validateProperty(value, finSchema, valuePath, schemaPath);
					///console.log("dependency validation ? ", rep.valid)
					ok = ok && rep.valid;
				}
			});
		}

		if (!dependenciesMatch && schema.items && type == "array") {
			if (schema.items.push) {
				var i = 0;
				for (; i < schema.items.length; ++i)
					validations.push(this.checkRef(value[i], schema.items[i], valuePath + "." + i, schemaPath + ".items[" + i + "]"));
				if (i < value.length && (schema.additionalItems === undefined || schema.additionalItems !== false))
					for (; i < value.length; ++i)
						validations.push(this.checkRef(value[i], schema.additionalItems || {}, valuePath + "[" + i + "]", schemaPath + ".additionalItems"));
				else if (schema.additionalItems === false)
					this.createError(this.lexic.additionalItems.error, value, type, schema, valuePath + "[" + i + "]", schemaPath + ".items");
			} else
				for (var i = 0; i < value.length; ++i)
					validations.push(this.checkRef(value[i], schema.items, valuePath + "." + i, schemaPath + ".items"));
		}

		if (!dependenciesMatch && type == "object") {
			// check all properties of object
			for (var i in value) {
				if (!value.hasOwnProperty(i))
					continue;
				var schemas = [];
				// get schema pattern properties that match property name
				if (schema.patternProperties)
					schemas = findPatternProperties(i, schema.patternProperties);
				// get regular property
				if (schema.properties && schema.properties[i])
					schemas.push(schema.properties[i]);
				if (schemas.length === 0) // no pattern nor regular schema find for this property
				{
					if (schema.additionalProperties === undefined || schema.additionalProperties !== false) // try additionalProperties schema
						validations.push(this.checkRef(value[i], schema.additionalProperties || {
							type: "any"
						}, valuePath + "." + i, schemaPath + ".additionalProperties"));
					else if (schema.additionalProperties === false)
						this.createError(this.lexic.additionalProperties.error, value[i], getType.apply(this, [value[i]]), schema, valuePath + "." + i, schemaPath + ".properties." + i);
				} else { // merge array of schema found for this property (patterns and/or regular schema properties)
					var res = {};
					schemas.forEach(function(e) { // merge : patterns in backgrounds, regular on top
						deep.aup(e, res);
					});
					validations.push(this.checkRef(value[i], res, valuePath + "." + i, schemaPath + ".properties." + i));
				}
			}
			//console.log("required ? "+this.lexic[this.lexic.__requiredEquivalent].schema.type)
			// check required that's missing
			if (this.lexic[this.lexic.__requiredEquivalent].schema.type == "boolean") // handling v2 and v3 behaviour. Ommited for v4.
			{
				//	console.log("handle required as boolean")
				for (var i in schema.properties)
					if (schema.properties[i][this.lexic.__requiredEquivalent] && typeof value[i] === 'undefined')
						this.createError(this.lexic[this.lexic.__requiredEquivalent].error, value[i], "undefined", schema, valuePath + "." + i, schemaPath + ".properties." + i);
			}
		}
		if (!dependenciesMatch)
			for (var i in schema) {
				if (!schema.hasOwnProperty(i))
					continue;
				//console.log("simple schema prop test : "+i + " - schema : "+JSON.stringify(schema))
				switch (i) {
					case "type":
						break;
					case "properties":
						break;
					case "dependencies":
						break;
					case "patternProperties":
						break;
					case "items":
						break;
					case "additionalItems":
						break;
					case "additionalProperties":
						break;
					default:
						//console.log("Validator.lexic[i] ",i)
						if (this.lexic[i])
							this.doTest(this.lexic[i], value, type, schema, valuePath, schemaPath);
						else
						if (console.flags && console.flags.validator) console.log("validator", "unrecognised schema property : " + i);
				}
			}
		return validations;
	};

	Validator.prototype.applyLexic = function applyLexic(lexic) {
		deep.aup(lexic, this.lexic);
	};
	Validator.prototype.lexic = {
		__additionalErrors: {
			schemaIsNotObject: "{ path }, trying to validate a schema (type:'schema') but the value isn't an object : Value provided : { value }",
			badType: "{ path }, type not allowed. Allowed type :  { schema.type }",
			unknownSchemaType: "type from schema is unknown : { schema.type }"
		},
		__requiredEquivalent: "required",
		__defaultPattern: {
			uri: {
				test: function(value) {
					return (/.*/g).test(value);
				},
				error: "need to be with uri format"
			},
			date: {
				test: function(value) {
					return (/.*/g).test(value);
				},
				error: "need to be with date format"
			},
			phone: {
				test: function(value) {
					return (/.*/g).test(value);
				},
				error: "need to be with phone format"
			},
			email: {
				//test:function(value){ return (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/).test(value) },
				test: function(value) {
					return (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/gi).test(value);
				},
				error: "need to be with email format"
			},
			zip: {
				test: function(value) {
					return (/.*/g).test(value);
				},
				error: "need to be with zip format"
			},
			ipv4: {
				test: function(value) {
					return (/.*/g).test(value);
				},
				error: "need to be with ipv4 format"
			},
			ipv6: {
				test: function(value) {
					return (/.*/g).test(value);
				},
				error: "need to be with ipv6 format"
			},
			"date-time": {
				test: function(value) {
					return (/.*/g).test(value);
				},
				error: "need to be with date-time format"
			},
			"utc-millisec": {
				test: function(value) {

					return (/.*/g).test(value);
				},
				error: "need to be with date-time format"
			}
		},
		type: {
			any: {
				test: function(value) {
					return true;
				}
			},
			object: {
				test: function(value) {
					return typeof value === 'object';
				},
				error: "{ path } need to be float."
			},
			"boolean": {
				test: function(value) {
					return value === true || value === false;
				},
				error: "{ path } need to be float."
			},
			number: {
				test: function(value) {
					//	console.log("DEEP-SCHEMA : test number type of : ", value, typeof value);
					return typeof value === 'number' && !isNaN(value);
				},
				error: "{ path } need to be float."
			},
			"null": {
				test: function(value) {
					return value === null;
				},
				error: "{ path } need to be null."
			},
			string: {
				test: function(value) {
					return typeof value === 'string';
				},
				error: "{ path } need to be string."
			},
			array: {
				test: function(value) {
					return value instanceof Array;
				},
				error: "{ path } need to be array."
			},
			schema: {
				test: function(value) {
					return typeof value === 'object';
				},
				error: "{ path } need to be true."
			}
		},
		dependencies: {
			schema: {
				type: "array",
				items: {
					properties: {
						query: {
							type: "string",
							required: true
						},
						constraints: {
							type: "schema"
						}
					}
				}
			},
			test: function(value, type, schema, valuePath, schemaPath) {
				var othis = this;
				var ok = true;
				//console.log("DEEP-SCHEMA : test dependencies : ", schema.dependencies);
				if (schema.dependencies && schema.dependencies.length > 0)
					schema.dependencies.forEach(function(dep) {

						var res = deep.Querier.query(value, dep.query);
						//console.log("test dependancy query: ", res)
						if (res.length > 0) {
							var schemaCopied = {};
							for (var i in schema) {
								if (!schema.hasOwnProperty(i) || i == "dependencies")
									continue;
								schemaCopied[i] = deep.aup(schema[i], {});
							}
							schemaCopied = deep.aup(dep.constraints, schemaCopied);
							var rep = othis.validateProperty(value, schemaCopied, valuePath, schemaPath);
							///console.log("dependency validation ? ", rep.valid)
							ok = ok && rep.valid;
						}
					});
				return true;
			},
			error: "{ path } unmatched dependency { schema.dependencies }. Value provided : { value|json }"
		},
		format: {
			schema: {
				type: "string"
			},
			test: function(value, type, schema, valuePath, schemaPath) {
				if ((!value) && !schema.required)
					return true;
				if (type == "array" || type == "object") return true;
				//console.log("try interpret reg exp for format : "+this.lexic.__defaultPattern[schema.format].test)

				if (this.lexic.__defaultPattern[schema.format])
					return this.lexic.__defaultPattern[schema.format].test.apply(this, [value, type, schema, valuePath, schemaPath, schemaPath + ".format"]);
				//console.log("try interpret direct reg exp for format : "+schema.format)
				return new RegExp(schema.format).test(String(value));
			},
			error: "{ path } unmatched format { schema.format }."
		},
		pattern: {
			schema: {
				type: "string"
			},
			test: function(value, type, schema, valuePath, schemaPath) {
				if ((!value) && !schema.required)
					return true;
				if (type == "array" || type == "object") return true;
				if (this.lexic.__defaultPattern[schema.pattern])
					return this.doTest(this.lexic.__defaultPattern[schema.pattern], value, type, schema, valuePath, schemaPath, schemaPath + ".pattern");
				return new RegExp(schema.pattern).searchInterpretable(String(value));
			},
			error: "{ path } unmatched pattern { schema.pattern }."
		},
		minLength: {
			schema: {
				type: "integer"
			},
			test: function(value, type, schema) {
				//console.log("min length "+value.length+ " - type : "+type + " - have to be : "+schema.minLength)
				if (type != "array" && type != "string" && type != "integer") return true;
				if ((!value || value === "") && !schema.required)
					return true;
				return value.length >= schema.minLength;
			},
			error: "{ path } need to be at least { schema.minLength } length."
		},
		maxLength: {
			schema: {
				type: "integer"
			},
			test: function(value, type, schema) {
				if ((!value || value === "") && !schema.required)
					return true;
				if (type != "array" && type != "string" && type != "integer") return true;
				return value.length <= schema.maxLength;
			},
			error: "{ path } need to be at max { schema.minLength } length."
		},
		minimum: {
			schema: {
				type: "number"
			},
			test: function(value, type, schema) {
				if (type != "number" && type != "integer") return true;
				if ((!value || value === "") && !schema.required)
					return true;
				if (schema.exclusiveMinimum) return value > schema.minimum;
				return value >= schema.minimum;
			},
			error: "{ path } need to be at least { schema.exclusiveMinimum }."
		},
		maximum: {
			schema: {
				type: "number"
			},
			test: function(value, type, schema) {
				if (type != "number" && type != "integer") return true;
				if ((!value) && !schema.required)
					return true;
				if (schema.exclusiveMaximum) return value < schema.maximum;
				return value <= schema.maximum;
			},
			error: "{ path } need to be max { schema.exclusiveMaximum }."
		},
		minItems: {
			schema: {
				type: "integer"
			},
			test: function(value, type, schema) {
				if ((!value) && !schema.required)
					return true;
				if (type != "array") return true;
				return value.length >= schema.minItems;
			},
			error: "{ path } need to be at least { schema.minItems } long. Value provided : { value|json }"
		},
		maxItems: {
			schema: {
				type: "integer"
			},
			test: function(value, type, schema) {
				if ((!value || value === "") && !schema.required)
					return true;
				if (type != "array") return true;
				return value.length <= schema.maxItems;
			},
			error: "{ path } need to be at max { schema.maxItems } long. Value provided : { value|json }"
		},
		required: { /// draft v3
			schema: {
				type: "boolean"
			},
			test: function(value, type, schema) {
				//console.log("Validator : check required : ", typeof value !== 'undefined' )
				return typeof value !== 'undefined';
			},
			error: "{ path } is required and is missing."
		},
		"enum": {
			schema: {
				type: "array",
				items: {
					type: "string"
				}
			},
			test: function(value, type, schema) {
				if ((typeof value === 'undefined' || value === "") && !schema.required)
					return true;
				if (type != "string" && type != "number" && type != "integer") return true;
				var ok = false;
				for (var i = 0; i < schema["enum"].length; ++i)
					if (value == schema['enum'][i]) {
						ok = true;
						break;
					}
				return ok;
			},
			error: "{ path } need to be equal to one of those values { schema.enum|join_coma }."
		},
		disallow: {
			schema: {
				type: ["array", "string"],
				'enum': ["string", "array", "number", "integer", "date", "function", "null", "object"],
				items: {
					type: "string",
					'enum': ["string", "array", "number", "integer", "date", "function", "null", "object"]
				}
			},
			test: function(value, type, schema) {
				if ((!value) && !schema.required)
					return true;
				if (typeof disallow.push !== 'function')
					return schema.disallow !== type;
				for (var i in schema.disallow)
					if (schema.disallow[i] == type)
						return false;
				return true;
			},
			error: "{ path } need to be of different type than { schema.disallow|join_coma }. type provided : { type }"
		},
		divisibleBy: {
			schema: {
				type: "integer",
				minimum: 1,
				absoluteMinimum: true
			},
			test: function(value, type, schema) {
				if ((!value) && !schema.required)
					return true;
				if (type != "number" && type != "integer") return true;
				return value % schema.divisibleBy === 0;
			},
			error: "{ path } ( value : { value }) need to be divisible by { schema.divisibleBy }."
		},
		uniqueItems: {
			schema: {
				type: "boolean"
			},
			test: function(value, type, schema) {
				if (type != "array") return true;
				if ((!value) && !schema.required)
					return true;
				if (!schema.uniqueItems)
					return true;
				var uniques = utils.arrayFusion(value, value);
				return uniques.length == value.length;
			},
			error: "each item need to be unique"
		},
		exclusiveMinimum: {
			schema: {
				type: "boolean"
			}
		},
		exclusiveMaximum: {
			schema: {
				type: "boolean"
			}
		},
		/*	dependencies:{},*/
		"default": {
			schema: {
				type: "any"
			}
		},
		title: {
			schema: {
				type: "string"
			}
		},
		description: {
			schema: {
				type: "string"
			}
		},
		id: {
			schema: {
				type: "string"
			}
		},
		readOnly: {
			schema: {
				type: "boolean"
			}
		},
		//EXTERNAL REFERENCES 
		"backgrounds": {
			schema: {
				type: ["string", "array"],
				items: {
					type: "string"
				},
				loadable: "direct"
			}
		},
		"$schema": {
			schema: {
				type: "string",
				items: {
					type: "string"
				}
			},
			test: function(value, type, schema) {
				console.log("$schema isn't implemented in this validator and will not be implemented (due to his self definition method)");
				return true;
			}
		},
		"$ref": {
			schema: {
				type: "string"
			}
		},
		links: {
			schema: {
				type: "array",
				items: {
					type: "object",
					properties: {
						rel: {
							type: "string",
							required: true
						},
						href: {
							type: "string",
							required: true
						},
						template: {
							type: "string"
						}, // replace template
						targetSchema: {
							type: "string"
						},
						method: {
							type: "string",
							"enum": ["GET", "PUT", "POST", "DELETE"]
						},
						enctype: {
							type: "string",
							"default": "application/json"
						},
						schema: {
							type: "schema"
						}
					}
				}
			}
		},
		additionalProperties: {
			schema: {
				type: ["false", "schema"]
			},
			error: "no additional properties are allowed"
		},
		patternProperties: {
			schema: {
				type: "object",
				patternProperties: {
					"/.*/g": {
						type: "schema"
					}
				}
			}
		},
		properties: {
			schema: {
				type: "object",
				patternProperties: {
					"/.*/g": {
						type: "schema"
					}
				}
			}
		},
		contentEncoding: {
			schema: {
				type: "string"
			}
		},
		mediaType: {
			schema: {
				type: "string"
			}
		},
		additionalItems: {
			schema: {
				type: ["false", "schema"]
			},
			error: "no additional items are allowed"
		},
		items: {
			schema: {
				type: ["array", "schema"],
				items: {
					type: "schema"
				}
			}
		}
	};

	var draftv4 = {
		divisibleBy: {
			"$ommit": true
		},
		mod: {
			schema: {
				type: "integer",
				minimum: 1,
				absoluteMinimum: true
			},
			test: function(value, type, schema) {
				if ((!value) && !schema.required)
					return true;
				if (type != "number" && type != "integer") return true;
				return value % schema.mod === 0;
			},
			error: "need to be divisible by { schema.divisibleBy }"
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
		maxProperties: {
			schema: {
				type: "integer",
				minimum: 0
			},
			test: function(value, type, schema) {
				var count = 0;
				for (var i in value) {
					if (!value.hasOwnProperties(i))
						continue;
					count++;
				}
				return count <= schema.maxProperties;
			},
			error: "need to have maximum { schema.maxProperties } properties"
		},
		minProperties: {
			schema: {
				type: "integer",
				minimum: 0
			},
			test: function(value, type, schema) {
				var count = 0;
				for (var i in value) {
					if (!value.hasOwnProperties(i))
						continue;
					count++;
				}
				return count >= schema.minProperties;
			},
			error: "need to have minimum { schema.maxProperties } properties"
		}
	};

	var deepSpecific = {
		__defaultPattern: {
			retrievable: {
				test: function(value) {
					if ((!value) && !schema.required)
						return true;
					return (utils.parseRequest(value).store !== null);
				},
				error: "need to be in 'retrievable' format. (see deep/deep-request/isRetrievable())"
			}
		}
	};

	var newSpec = {
		type: {

		},
		notNull: {
			schema: {
				type: "boolean"
			},
			test: function(value, type, schema) {
				if ((!value) && !schema.required)
					return true;
				if (schema.notNull) return value !== null;
				return true;
			},
			error: "need to be not null"
		},
		absoluteMaximum: {
			schema: {
				type: "boolean"
			}
		},
		absoluteMinimum: {
			schema: {
				type: "boolean"
			}
		},
		minimum: {
			test: function(value, type, schema) {
				if ((!value) && !schema.required)
					return true;
				if (type != "number" && type != "integer") return true;
				if (schema.absoluteMinimum) value = Math.abs(value);
				if (schema.exclusiveMinimum) return value > schema.minimum;
				return value >= schema.minimum;
			}
		},
		maximum: {
			test: function(value, type, schema) {
				if ((!value) && !schema.required)
					return true;
				if (type != "number" && type != "integer") return true;
				if (schema.absoluteMaximum) value = Math.abs(value);
				if (schema.exclusiveMaximum) return value < schema.maximum;
				return value <= schema.maximum;
			}
		},
		needMatchingOn: {
			schema: {
				type: "string"
			},
			test: function(value, type, schema) {
				if ((!value) && !schema.required)
					return true;
				var q = schema.needMatchingOn;
				if (q[0] == "#")
					q = q.substring(1);
				var res = deep.Querier.query(this.rootValue, q);
				return res.length > 0 && res[0] == value;
			},
			error: "this field need to match { schema.needMatchingOn }"
		}
	};

	var jsonExt = {
		type: {
			"function": {
				test: function(value) {
					return typeof value === 'function';
				},
				error: "need to be a function"
			},
			"false": {
				test: function(value) {
					return value === false;
				},
				error: "need to be false"
			},
			"true": {
				test: function(value) {
					return value === true;
				},
				error: "need to be true"
			},
			"date": {
				test: function(value) {
					if (!value) return false;
					return typeof value.toUTCString === 'function';
				},
				error: "need to be a date object"
			}
		}
	};

	var se_spec = {
		__defaultPattern: {
			"coordination-number": {
				test: function(value, type, schema) {
					if (type != "string")
						return true;
					if (!schema.required && !value)
						return true;
					if (!value)
						return false;
					var tmp = value + "";
					if (tmp.length != 10)
						return false;
					tmp = value.substring(4, 5);
					tmp = parseInt(tmp, 10);
					if (tmp < 60 || tmp > 91)
						return false;
					return true;
				},
				error: "need to be in coordination-number format"
			},
			"personal-number": {
				test: function(value, type, schema) {
					if (type != "string")
						return true;
					if (!schema.required && !value)
						return true;
					if (!value)
						return false;
					var tmp = value + "";
					if (tmp.length != 10)
						return false;
					tmp = value.substring(4, 5);
					tmp = parseInt(tmp, 10);
					if (tmp < 60 || tmp > 91)
						return false;
					return true;
				},
				error: "need to be in personal-number format"
			}
		}
	};

	deep.aup(draftv4, Validator.prototype.lexic);
	deep.aup(jsonExt, Validator.prototype.lexic);
	deep.aup(newSpec, Validator.prototype.lexic);
	//deep.aup(se_spec, Validator.prototype.lexic);
	//	utils.deepCopy(leafSpecific, Validator.prototype.lexic);

	var valider = new Validator();

	Validator.createDefault = function(schema) {
		return valider.createDefault(schema);
	};
	Validator.convertStringTo = function(obj, type) {
		return valider.convertStringTo(obj, type);
	};
	Validator.castAndCheck = function(value, schema, valuePath) {
		return valider.castAndCheck(value, schema, valuePath);
	};
	Validator.validate = function(obj, schema, options) {
		//console.log("Validate : ", obj, schema)
		return new Validator().validate(obj, schema, options);
	};
	Validator.getType = function(value) {
		return valider.getType(value);
	};
	Validator.partialValidation = function(obj, schema, options) {
		return new Validator().partialValidation(obj, schema, options);
	};

	deep.Validator.set(Validator);
	
	return Validator;
});