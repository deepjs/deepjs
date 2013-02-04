deep-query : tools to query json/object structures. 
==========================

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


/?foo=2&bar/(myArray.*)?length=gt=10/[1:4:2,@.length-2]//(^p.*)g?=in=(hello,bye)&_parent.taxerate=lt=0.12&_schema.type=string
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



## Real queries/results examples from deep-testcases (runned on MacBook pro 2011, I7 2.3, FireFox 11.0, Firebug launched and heavily used, keepCache:true in options of Querier) (take a look at deep/testcases/index.html for last version):

Datas : 
{
 "store": {
  "book": [
   {
    "category": "reference",
    "author": "Nigel Rees",
    "isbn": "0-553-21311-3",
    "title": "Sayings of the Century",
    "price": 8.95,
    "warehouse": {
     "stock": 12
    }
   },
   {
    "category": "reference",
    "author": "Jean Meslier",
    "isbn": "0-553-21311-3",
    "title": "Profession curée",
    "price": 18.95,
    "warehouse": {
     "stock": 0
    }
   },
   {
    "category": "fiction",
    "author": "Evelyn Waugh",
    "isbn": "0-553-21311-4",
    "title": "Sword of Honour",
    "price": 12.99
   },
   {
    "category": "fiction",
    "author": "Herman Melville",
    "title": "Moby Dick",
    "isbn": "0-553-21311-3",
    "price": 8.99,
    "warehouse": {
     "stock": 12
    }
   },
   {
    "category": "fiction",
    "author": "J. R. R. Tolkien",
    "title": "The Lord of the Rings",
    "isbn": "0-395-19395-8",
    "price": 22.99
   }
  ],
  "bicycle": {
   "category": "ride",
   "col": "red",
   "price": 19.95
  },
  "helmet": {
   "category": "ride",
   "col": "red",
   "price": 9.95
  },
  "gloves": {
   "category": "ride",
   "col": "red",
   "price": 15.95
  }
 },
 "account": {
  "total": 1234,
  "sell": [
   {
    "isbn": "0-395-19395-8",
    "quantity": 12
   }
  ]
 }
}

Queries  :

query: 1ms
query : /store/book/3/warehouse/stock
result : 12

query: 0ms
query : /store/[]
result : [{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}]
result : {"category":"ride","col":"red","price":19.95}
result : {"category":"ride","col":"red","price":9.95}
result : {"category":"ride","col":"red","price":15.95}

query: 1ms
query : /store/[(glo.*),helmet]
result : {"category":"ride","col":"red","price":15.95}
result : {"category":"ride","col":"red","price":9.95}

query: 2ms
query : /(store)/book/[0:2]?category=fiction
result : {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}

query: 4ms
query : /*/book/[2:3,0]?price=lt=10&isbn/price
result : 8.99
result : 8.95

query: 2ms
query : /(.*)/book/?price=lt=10&category=fiction
result : {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}

query: 4ms
query : /store//[:3]?warehouse.stock
result : {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
result : {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}

query: 3ms
query : //?price=lt=18
result : {"category":"ride","col":"red","price":9.95}
result : {"category":"ride","col":"red","price":15.95}
result : {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
result : {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}
result : {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}

query: 5ms
query : //category?=in=(reference,ride)&sort(+)
result : "reference"
result : "reference"
result : "ride"
result : "ride"
result : "ride"

query: 2ms
query : //category?distinct()&sort(-)
result : "ride"
result : "reference"
result : "fiction"

query: 4ms
query : //price?=gt=10&sort(-)
result : 22.99
result : 19.95
result : 18.95
result : 15.95
result : 12.99

query: 3ms
query : //(^bo)/?price=lt=15
result : {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
result : {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}
result : {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}

query: 3ms
query : //?length=gt=4
result : "0-395-19395-8"
result : [{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}]
result : "fiction"
result : "J. R. R. Tolkien"
result : "The Lord of the Rings"
result : "0-395-19395-8"
result : "fiction"
result : "Herman Melville"
result : "Moby Dick"
result : "0-553-21311-3"
result : "fiction"
result : "Evelyn Waugh"
result : "0-553-21311-4"
result : "Sword of Honour"
result : "reference"
result : "Jean Meslier"
result : "0-553-21311-3"
result : "Profession curée"
result : "reference"
result : "Nigel Rees"
result : "0-553-21311-3"
result : "Sayings of the Century"

query: 1ms
query : //[@.length-1]
result : {"isbn":"0-395-19395-8","quantity":12}
result : {"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}

query: 0ms
query : //length
result : 1
result : 5

query: 2ms
query : //[::2]
result : {"isbn":"0-395-19395-8","quantity":12}
result : {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
result : {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}
result : {"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}

query: 4ms
query : //?_schema.type=string
result : "0-395-19395-8"
result : "ride"
result : "red"
result : "ride"
result : "red"
result : "ride"
result : "red"
result : "fiction"
result : "J. R. R. Tolkien"
result : "The Lord of the Rings"
result : "0-395-19395-8"
result : "fiction"
result : "Herman Melville"
result : "Moby Dick"
result : "0-553-21311-3"
result : "fiction"
result : "Evelyn Waugh"
result : "0-553-21311-4"
result : "Sword of Honour"
result : "reference"
result : "Jean Meslier"
result : "0-553-21311-3"
result : "Profession curée"
result : "reference"
result : "Nigel Rees"
result : "0-553-21311-3"
result : "Sayings of the Century"

query: 2ms
query : //?_schema.type=number
result : 1234
result : 12
result : 15.95
result : 9.95
result : 19.95
result : 22.99
result : 8.99
result : 12
result : 12.99
result : 18.95
result : 0
result : 8.95
result : 12

query: 2ms
query : //?_schema.type=object
result : {"book":[{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}],"bicycle":{"category":"ride","col":"red","price":19.95},"helmet":{"category":"ride","col":"red","price":9.95},"gloves":{"category":"ride","col":"red","price":15.95}}
result : {"total":1234,"sell":[{"isbn":"0-395-19395-8","quantity":12}]}
result : {"isbn":"0-395-19395-8","quantity":12}
result : {"category":"ride","col":"red","price":19.95}
result : {"category":"ride","col":"red","price":9.95}
result : {"category":"ride","col":"red","price":15.95}
result : {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
result : {"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}}
result : {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}
result : {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
result : {"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}
result : {"stock":12}
result : {"stock":0}
result : {"stock":12}

query: 3ms
query : //?_schema.type=object&_parent.isbn
result : {"stock":12}
result : {"stock":0}
result : {"stock":12}

query: 2ms
query : //?_schema.type=object&_parent.isbn/../!
result : {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
result : {"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}}
result : {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}

query: 4ms
query : //?_schema.type=object/../!?isbn
result : {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
result : {"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}}
result : {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}

query: 2ms
query : //?_schema.type=array
result : [{"isbn":"0-395-19395-8","quantity":12}]
result : [{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}]

query: 1ms
query : //?_schema.type=array/
result : {"isbn":"0-395-19395-8","quantity":12}
result : {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
result : {"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}}
result : {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}
result : {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
result : {"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}

query: 1ms
query : //[:]
result : {"isbn":"0-395-19395-8","quantity":12}
result : {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
result : {"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}}
result : {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}
result : {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
result : {"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}

query: 1ms
query : //?_schema.type=array/../
result : 1234
result : [{"isbn":"0-395-19395-8","quantity":12}]
result : [{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}]
result : {"category":"ride","col":"red","price":19.95}
result : {"category":"ride","col":"red","price":9.95}
result : {"category":"ride","col":"red","price":15.95}

query: 0ms
query : //?_schema.type=array/../!
result : {"total":1234,"sell":[{"isbn":"0-395-19395-8","quantity":12}]}
result : {"book":[{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}],"bicycle":{"category":"ride","col":"red","price":19.95},"helmet":{"category":"ride","col":"red","price":9.95},"gloves":{"category":"ride","col":"red","price":15.95}}

query: 0ms
query : //
result : {"book":[{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}],"bicycle":{"category":"ride","col":"red","price":19.95},"helmet":{"category":"ride","col":"red","price":9.95},"gloves":{"category":"ride","col":"red","price":15.95}}
result : {"total":1234,"sell":[{"isbn":"0-395-19395-8","quantity":12}]}
result : 1234
result : [{"isbn":"0-395-19395-8","quantity":12}]
result : {"isbn":"0-395-19395-8","quantity":12}
result : "0-395-19395-8"
result : 12
result : [{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}]
result : {"category":"ride","col":"red","price":19.95}
result : {"category":"ride","col":"red","price":9.95}
result : {"category":"ride","col":"red","price":15.95}
result : "ride"
result : "red"
result : 15.95
result : "ride"
result : "red"
result : 9.95
result : "ride"
result : "red"
result : 19.95
result : {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
result : {"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}}
result : {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}
result : {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
result : {"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}
result : "fiction"
result : "J. R. R. Tolkien"
result : "The Lord of the Rings"
result : "0-395-19395-8"
result : 22.99
result : "fiction"
result : "Herman Melville"
result : "Moby Dick"
result : "0-553-21311-3"
result : 8.99
result : {"stock":12}
result : 12
result : "fiction"
result : "Evelyn Waugh"
result : "0-553-21311-4"
result : "Sword of Honour"
result : 12.99
result : "reference"
result : "Jean Meslier"
result : "0-553-21311-3"
result : "Profession curée"
result : 18.95
result : {"stock":0}
result : 0
result : "reference"
result : "Nigel Rees"
result : "0-553-21311-3"
result : "Sayings of the Century"
result : 8.95
result : {"stock":12}
result : 12

## Lexic

**JSON** (an acronym for **JavaScript Object Notation**) is a lightweight data-interchange format. It is easy for humans to read and write. It is easy for machines to parse and generate. It is based on a subset of JavaScript/ECMA-262 3rd Edition. JSON is a text format that is completely language independent but uses conventions that are familiar to programmers of the C-family of languages. (C, C++, C#, Java, JavaScript, Perl, Python, ...) These properties make JSON an ideal data-interchange language. \[[json.org](http://json.org)\]

**JSON Schema** is a JSON media type for defining the structure of JSON data.  JSON Schema provides a contract for what JSON data is required for a given application and how to interact with it.  JSON Schema is intended to define validation, documentation, hyperlink navigation, and interaction control of JSON data. \[[draft-zyp-json-schema-02](http://tools.ietf.org/html/draft-zyp-json-schema-02)\]


## License
	authors : 
		Gilles Coomans <gilles.coomans@gmail.com>
	LGPL