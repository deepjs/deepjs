deep-query : tools to query json/object structures. 
==========================

[Back to tutorials](./tutorials.md)

A other proposal for (json/object)-query which (as differences from official proposal):
use simple slash delimitted syntax, 
could handle regular expression for step selection, 
could handle rql (for filtering) on each step selection,
could be relative to where the query are placed in a object/json
so could handle steps toward any ancestor
could handle json-schema in rql filtering
could handle ancestor in rql filtering


## Queries examples:  the result is always the result of the last step.

/foo/bar/

From root : Select from root the property foo then give me the property bar in it



../foo/bar?zoo.name//price?=in=(12,55)

From ME (somewhere in a json/object) : Give me in my parent the property named foo
On this, give me 'bar' which has a property 'zoo' which has a property 'name'
On this give me any price (at any sublevel) equal to 12 or 55



//(p.+)gi/../../foo//bar?=3

From root : Give me recursively any property which its name correspond to (p.+)gi.
on this, take the parent of its parent (if any).
on this : take 'foo'.
on this : recursively take any property named bar and equal to 3



/?foo=2&bar/(myArray.*)?length=gt=10/[1:4:2,@.length-2]//(^p.*)g?=in=(hello,bye)&_parent.taxerate=lt=0.12&_type=string

From root : Give me any property. 
On this : give me those which have a property named foo and equal to 2 AND has a property named bar (different of undefined, null, false, or 0).
On this : select any property named myArray.* (RegExp) where length > 10.
On this : give me property (if any) named 1 or 3 or an index equal to parent.length-2 (parent is myAtrray.*).
On this : Recursively give me any property where its name correspond to (^p.*)g AND where its value is either 'hello' or 'bye'
	AND its parent has a property taxerate less than 0,12
	AND its type is 'string'



## Syntaxe

A query consist of succession of steps.

A step is : 
move selector ? rql


### Start (first move)

/	start from root
./	start from me (from somewhere in a json/object)
../ start from my parent (from somewhere in a json/object)
// 	start from root and give me any properties at any sub level

### Moves

/ 		current level
//		recursively seek any property from current level
../		take my parent level (you could select any of its properties from there)
../!	take my parent reference (you need to add '/' (e.g. ../!/) to select any of its properties as above))
/!		will give you current reference


### Selector

any step selector is either a direct string, or an int (array index) or a regular expression, or a union of them (expressed as a coma separated list of them surrounded with square brackets).
You could express range of array indexes as 0:10:2 which says : take items from 0 to 10 (included) by step of two. (see examples below for optionals placement)
Regular expression are always surrounded by parenthesis, and could be ended with 'g', 'i' or 'gi'.

examples of valid selectors : 
1
foo
(foo.*)
[0:20:2]
[:]
[1:,hello,(^prop.*)gi]

query example :
/foo/1/(^bar)/[::2]
Say : give me foo from root,
on this, give the first items (or any property called '1'),
on this, give me any property named bar... ,
on this, get all items by step of two (if any). (it's the result of the query) 


All those below are equivalent and say : give me all properties or items of the last move
/(.*)
/*
/[]
/


#### Length cases : 
In array brackets access : you could use @.length to get the length (if any) of the parent IF IT'S AN ARRAY.
example : 
//[@.length-1]  
will give you any last array childs at any level from root.

//length
will give you any array length at any level from root (or any 'length' property founded in the json/object)

In deep-rql : length could also give you the length of the strings.



### Filter

any RQL filter (deep-rql : see its doc for full description) could be added to any selector.

examples :

/foo?=gt=12
give me foo property from root only if it's greater than 12

//address?zip=1190
give me any adress which contains a zip equal to 1190

//category?distinct()&sort(-)
give me any distinct category and sort them descendant



## Concreet usage example

Here's an example on how to query some JSON/object with deep-query:

	var Querier = require("deep/deep-query");
	var json = {
		// ....
	};
	var schema = {
		// content schema
	};
	var res = Querier.query(object, "/my/path/[0]",{schema:schema});     // options with schema are optional
	res.forEach(function(e){
		console.log("result : ",e)
	})


## Lexic

**JSON** (an acronym for **JavaScript Object Notation**) is a lightweight data-interchange format. It is easy for humans to read and write. It is easy for machines to parse and generate. It is based on a subset of JavaScript/ECMA-262 3rd Edition. JSON is a text format that is completely language independent but uses conventions that are familiar to programmers of the C-family of languages. (C, C++, C#, Java, JavaScript, Perl, Python, ...) These properties make JSON an ideal data-interchange language. \[[json.org](http://json.org)\]

**JSON Schema** is a JSON media type for defining the structure of JSON data.  JSON Schema provides a contract for what JSON data is required for a given application and how to interact with it.  JSON Schema is intended to define validation, documentation, hyperlink navigation, and interaction control of JSON data. \[[draft-zyp-json-schema-02](http://tools.ietf.org/html/draft-zyp-json-schema-02)\]


## License
	authors : 
		Gilles Coomans <gilles.coomans@gmail.com>
	LGPL 3.0
