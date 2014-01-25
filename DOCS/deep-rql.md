deep-rql :
==========================

[Back to tutorials](./tutorials.md)

A deep oriented implementation of RQL for JavaScript arrays based on rql/js-array from Kris Zyp (https://github.com/persvr/rql).
Base example:
require("deep/deep-rql").query([{a:1},{a:3}], "a=3", {}) -> [{a:3}]

What's different from js-array ? It could handle schema properties and ancestor access when filtering.
Its primary aim is to gives deep-query capabilities when filtering object's properties.
That's not intend to be used in ressource filtering (as RQL does), because the schema in that case may or may not be accessible, the type of the ressources is known, and there is no ancestor (ancestor as object/json ancestor) for Restful ressources (not queriable as this)

## Queries examples : 
see https://github.com/persvr/rql for base knowledge.

deep addition : 
_type is generated at runtime, even if schema is given
_schema[any property of the schema provided] could be used
_parent[any parent property could be use]

## API doc : 


## Lexic

**JSON** (an acronym for **JavaScript Object Notation**) is a lightweight data-interchange format. It is easy for humans to read and write. It is easy for machines to parse and generate. It is based on a subset of JavaScript/ECMA-262 3rd Edition. JSON is a text format that is completely language independent but uses conventions that are familiar to programmers of the C-family of languages. (C, C++, C#, Java, JavaScript, Perl, Python, ...) These properties make JSON an ideal data-interchange language. \[[json.org](http://json.org)\]

**JSON Schema** is a JSON media type for defining the structure of JSON data.  JSON Schema provides a contract for what JSON data is required for a given application and how to interact with it.  JSON Schema is intended to define validation, documentation, hyperlink navigation, and interaction control of JSON data. \[[draft-zyp-json-schema-02](http://tools.ietf.org/html/draft-zyp-json-schema-02)\]

**RQL** Ressource Query Language : see https://github.com/persvr/rql
A simple but powerful, url compliant, query language oriented to retrieve Restful ressources.


## License
	authors : 
		Gilles Coomans <gilles.coomans@gmail.com>
	LGPL 3.0