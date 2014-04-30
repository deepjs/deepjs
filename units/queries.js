/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require","../deep", "../lib/unit"], function (require, deep, Unit) {
    



 var datas = { 
		"store": {
		    "book": [ 
		      { 
		      	"category": "reference",
		        "author": "Nigel Rees",
		        "isbn": "0-553-21311-3",
		        "title": "Sayings of the Century",
		        "price": 8.95,
		        "warehouse":{
		        	"stock":12
		        }
		      },
		      { 
		      	"category": "reference",
		        "author": "Jean Meslier",
		        "isbn": "0-553-21311-3",
		        "title": "Profession curée",
		        "price": 18.95,
		        "warehouse":{
		        	"stock":0
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
		       "warehouse":{ 
		        	stock:12
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
		    	"category":"ride",
		      	"col": "red",
		      	"price": 19.95
		    },
		    "helmet": {
		    	"category":"ride",
		      	"col": "red",
		      	"price": 9.95
		    },
		    "gloves": {
		    	"category":"ride",
		      	"col": "red",
		      	"price": 15.95
		    }
		},
		"account": {
		    	"total":1234,
		    	"sell":[
		    		{
		    			"isbn":"0-395-19395-8",
		    			"quantity":12
		    		}
		    	]
		    }
	}

  var unit = {
    title:"deepjs/units/queries",
    stopOnError:false,
    tests:{
      a:function(){
        var r = deep.query({}, '/brol')
        return deep(r).equal(undefined);
      },
      b:function(){
        var r = deep.query({}, '/?brol')
        return deep(r).equal([]);
      },
      "/store/[]":function(){
          return deep(datas)
          .query("/store/[]")
          .equal([
            [{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}],
            {"category":"ride","col":"red","price":19.95},
            {"category":"ride","col":"red","price":9.95},
            {"category":"ride","col":"red","price":15.95}
          ]);
      },
      "/store/book/3/warehouse/stock":function(){
        return deep(datas)
        .query("/store/book/3/warehouse/stock")
        .equal(12);
      },
      "/store/[(glo.*),helmet]":function(){
        return deep(datas)
        .query("/store/[(glo.*),helmet]")
        .equal([
          {"category":"ride","col":"red","price":15.95},
          {"category":"ride","col":"red","price":9.95}
        ]);
      },
      "/(store)/book/[0:2]?category=fiction":function(){
        return deep(datas)
        .query("/(store)/book/[0:2]?category=fiction")
        .equal([{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}]);
      },
      "/*/book/[2:3,0]?price=lt=10&isbn/price" : function(){
        return deep(datas)
        .query( "/*/book/[2:3,0]?price=lt=10&isbn/price" )
        .equal( [8.99,8.95] );
      },
      "/(.*)/book/*?price=lt=10&category=fiction" : function(){
        return deep(datas)
        .query( "/(.*)/book/*?price=lt=10&category=fiction" )
        .equal( [
          {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
        ]);
      },
      "/(.*)/book/*?price=lt=10&category=fiction":function(){
        return deep(datas)
        .query( "/(.*)/book/*?price=lt=10&category=fiction" )
        .equal( [
          {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
        ]);
      },
      "/store//[:3]?warehouse.stock":function(){
        return deep(datas)
        .query( "/store//[:3]?warehouse.stock" )
        .equal( [
          {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},
          {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
        ]);
      },
      "//?price=lt=18":function(){
        return deep(datas)
        .query( "//?price=lt=18" )
        .equal( [ 
          {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
        , {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}
        , {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
        , {"category":"ride","col":"red","price":9.95}
        , {"category":"ride","col":"red","price":15.95}
        ]);
      },
      "//category?=in=(reference,ride)&sort(+)":function(){
        return deep(datas)
        .query( "//category?=in=(reference,ride)&sort(+)" )
        .equal( ["reference","reference","ride","ride","ride"] );
      },
      "//category?distinct()&sort(-)":function () {
        return deep(datas)
        .query( "//category?distinct()&sort(-)" )
        .equal( ["ride", "reference", "fiction"] ); 
      },
      "//price?=gt=10&sort(-)":function () {
        return deep(datas)
        .query( "//price?=gt=10&sort(-)" )
        .equal( [22.99,19.95,18.95,15.95,12.99] );
      },
      "//(^bo)/*?price=lt=15":function (argument) {
        return deep(datas).query( "//(^bo)/*?price=lt=15" ).equal( [
        {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},
        {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},
        {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
        ]);
      },
      "//?length=gt=4":function () {
        return deep(datas)
        .query( "//?length=gt=4" )
        .equal( [
          [
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
          "reference",
          "Nigel Rees",
          "0-553-21311-3",
          "Sayings of the Century",
          "reference",
          "Jean Meslier",
          "0-553-21311-3",
          "Profession curée",
          "fiction",
          "Evelyn Waugh",
          "0-553-21311-4",
          "Sword of Honour",
          "fiction",
          "Herman Melville",
          "Moby Dick",
          "0-553-21311-3",
          "fiction",
          "J. R. R. Tolkien",
          "The Lord of the Rings",
          "0-395-19395-8",
          "0-395-19395-8"
         ]);
      },
      "//[@.length-1]":function () {
          return deep(datas).query( "//[@.length-1]" ).equal( [
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
           "isbn": "0-395-19395-8",
           "quantity": 12
          }
         ]);
      },
      /*"//length":function(){
        return deep(datas).query("//length").equal([5,1])
      },*/
      "//[::2]":function(){
        return deep(datas).query("//[::2]").equal([
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
         "category": "fiction",
         "author": "Evelyn Waugh",
         "isbn": "0-553-21311-4",
         "title": "Sword of Honour",
         "price": 12.99
        },
        {
         "category": "fiction",
         "author": "J. R. R. Tolkien",
         "title": "The Lord of the Rings",
         "isbn": "0-395-19395-8",
         "price": 22.99
        },
        {
         "isbn": "0-395-19395-8",
         "quantity": 12
        }
       ]);
      },
      "//?_type=string":function () {
        return deep(datas).query("//?_type=string").equal([
          "reference",
          "Nigel Rees",
          "0-553-21311-3",
          "Sayings of the Century",
          "reference",
          "Jean Meslier",
          "0-553-21311-3",
          "Profession curée",
          "fiction",
          "Evelyn Waugh",
          "0-553-21311-4",
          "Sword of Honour",
          "fiction",
          "Herman Melville",
          "Moby Dick",
          "0-553-21311-3",
          "fiction",
          "J. R. R. Tolkien",
          "The Lord of the Rings",
          "0-395-19395-8",
          "ride",
          "red",
          "ride",
          "red",
          "ride",
          "red",
          "0-395-19395-8"
         ]);
      },
      "//?_type=number":function(){
          return deep(datas).query("//?_type=number").equal([
          8.95,
          12,
          18.95,
          0,
          12.99,
          8.99,
          12,
          22.99,
          19.95,
          9.95,
          15.95,
          1234,
          12
          ]);
      },
      "//?_type=object":function(){
        return deep(datas).query("//?_type=object")
        //.query("./!?&isbn&quantity=eq=12")
        .equal( [
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
          },
          {
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
           "stock": 12
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
           "stock": 0
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
           "stock": 12
          },
          {
           "category": "fiction",
           "author": "J. R. R. Tolkien",
           "title": "The Lord of the Rings",
           "isbn": "0-395-19395-8",
           "price": 22.99
          },
          {
           "category": "ride",
           "col": "red",
           "price": 19.95
          },
          {
           "category": "ride",
           "col": "red",
           "price": 9.95
          },
          {
           "category": "ride",
           "col": "red",
           "price": 15.95
          },
          {
           "total": 1234,
           "sell": [
            {
             "isbn": "0-395-19395-8",
             "quantity": 12
            }
           ]
          },
          {
           "isbn": "0-395-19395-8",
           "quantity": 12
          }
         ]);
      },
      "//?isbn/*?_type=object":function(){
        return deep(datas).query("//?isbn/*?_type=object")
        .equal([
        {"stock":12}
        , {"stock":0}
        , {"stock":12}
        ]);
      },
     /* "//?_type=object&_parent.isbn":function(){
        return deep(datas)
        .query("//?_type=object&_parent.isbn")
        .equal([
        {"stock":12}
        , {"stock":0}
        , {"stock":12}
        ]);
      },
      "//?_type=object&_parent.isbn/../!":function(){
        return deep(datas)
        .query("//?_type=object&_parent.isbn/../!")
        .equal( 
        [
         {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
        , {"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}}
        ,{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
        ]);
      },*/
      "//?_type=object/../!?isbn":function(){
        return deep(datas)
        .query("//?_type=object/../!?isbn")
        .equal(  
        [
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
           "author": "Herman Melville",
           "title": "Moby Dick",
           "isbn": "0-553-21311-3",
           "price": 8.99,
           "warehouse": {
            "stock": 12
           }
          }
         ]);
      },
      "//?isbn/*?_type=object/../!":function(){
        return deep(datas)
        .query("//?isbn/*?_type=object/../!")
        .equal(  
        [
        {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
        ,{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}}
        ,{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
        ]);
      },
      "//?_type=array":function(){
        return deep(datas)
        .query("//?_type=array")
        .equal(  
        [
        
         [{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}],
         [{"isbn":"0-395-19395-8","quantity":12}]
        ]);
      },
      "//?_type=array/*":function(){
        return deep(datas)
        .query("//?_type=array/*")
        .equal( 
            [
             {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
            , {"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}}
            , {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}
            , {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
            , {"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}
            , {"isbn":"0-395-19395-8","quantity":12}
            ]);
      },
      "//[:]":function(){
        return deep(datas).query("//[:]").equal( 
            [
             {"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}}
            , {"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}}
            , {"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99}
            , {"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}}
            , {"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}
            , {"isbn":"0-395-19395-8","quantity":12}
            ]);
      },
      "//?_type=array/../*":function(){
        return deep(datas).query("//?_type=array/../*").equal(  
        [
         [{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}]
         , {"category":"ride","col":"red","price":19.95}
        , {"category":"ride","col":"red","price":9.95}
        , {"category":"ride","col":"red","price":15.95}
        , 1234
        , [{"isbn":"0-395-19395-8","quantity":12}]
        
        ]);
      },
      "//?_type=array/../!":function(){
        return deep(datas).query("//?_type=array/../!").equal(  
        [
        {"book":[{"category":"reference","author":"Nigel Rees","isbn":"0-553-21311-3","title":"Sayings of the Century","price":8.95,"warehouse":{"stock":12}},{"category":"reference","author":"Jean Meslier","isbn":"0-553-21311-3","title":"Profession curée","price":18.95,"warehouse":{"stock":0}},{"category":"fiction","author":"Evelyn Waugh","isbn":"0-553-21311-4","title":"Sword of Honour","price":12.99},{"category":"fiction","author":"Herman Melville","title":"Moby Dick","isbn":"0-553-21311-3","price":8.99,"warehouse":{"stock":12}},{"category":"fiction","author":"J. R. R. Tolkien","title":"The Lord of the Rings","isbn":"0-395-19395-8","price":22.99}],"bicycle":{"category":"ride","col":"red","price":19.95},"helmet":{"category":"ride","col":"red","price":9.95},"gloves":{"category":"ride","col":"red","price":15.95}}
        , {"total":1234,"sell":[{"isbn":"0-395-19395-8","quantity":12}]}
        ]);
      },
      "//":function(){
        return deep(datas).query("//").equal(  
        [
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
          },
          {
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
          [
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
          "reference",
          "Nigel Rees",
          "0-553-21311-3",
          "Sayings of the Century",
          8.95,
          {
           "stock": 12
          },
          12,
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
          "reference",
          "Jean Meslier",
          "0-553-21311-3",
          "Profession curée",
          18.95,
          {
           "stock": 0
          },
          0,
          {
           "category": "fiction",
           "author": "Evelyn Waugh",
           "isbn": "0-553-21311-4",
           "title": "Sword of Honour",
           "price": 12.99
          },
          "fiction",
          "Evelyn Waugh",
          "0-553-21311-4",
          "Sword of Honour",
          12.99,
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
          "fiction",
          "Herman Melville",
          "Moby Dick",
          "0-553-21311-3",
          8.99,
          {
           "stock": 12
          },
          12,
          {
           "category": "fiction",
           "author": "J. R. R. Tolkien",
           "title": "The Lord of the Rings",
           "isbn": "0-395-19395-8",
           "price": 22.99
          },
          "fiction",
          "J. R. R. Tolkien",
          "The Lord of the Rings",
          "0-395-19395-8",
          22.99,
          {
           "category": "ride",
           "col": "red",
           "price": 19.95
          },
          "ride",
          "red",
          19.95,
          {
           "category": "ride",
           "col": "red",
           "price": 9.95
          },
          "ride",
          "red",
          9.95,
          {
           "category": "ride",
           "col": "red",
           "price": 15.95
          },
          "ride",
          "red",
          15.95,
          {
           "total": 1234,
           "sell": [
            {
             "isbn": "0-395-19395-8",
             "quantity": 12
            }
           ]
          },
          1234,
          [
           {
            "isbn": "0-395-19395-8",
            "quantity": 12
           }
          ],
          {
           "isbn": "0-395-19395-8",
           "quantity": 12
          },
          "0-395-19395-8",
          12
         ]);
      }
    }
  };
  return unit;
});




