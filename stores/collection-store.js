  if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require", "../deep", "../deep-stores"], function (require, deep) {
    
    return function(deep){
  //_____________________________________________________________________ COLLECTION STORE
        /**
         * A store based on simple array
         * @class deep.store.Collection
         * @constructor
         * @param {Array} arr a first array of objects to hold
         * @param {Object} options could contain 'schema'
         */
        deep.store.Collection = deep.compose.Classes(deep.Store,
        function (protocole, collection, schema, options) {
            if (collection)
                this.collection = collection;
            if(schema)
                this.schema = schema;
            if(options)
                deep.utils.up(options, this);
        },
        {
            /**
             * @method init
             */
            init: deep.compose.after(function () {
                var self = this;
                //console.log("deep.store.Collection.init : this.collection : ", this.collection, " - this.schema : ", this.schema);
                this.collection = this.collection || [];
                if (typeof this.collection === 'string' || typeof this.schema === 'string')
                    return deep(this)
                        .query("./[collection,schema]")
                        .load()
                        .done(function(success){
                             return self;
                        });
            }),
            /**
             * @method get
             * @param  {String} id the id of the object to retrieve. Could also be a (deep)query.
             * @param {Object} options an options object (here there is no options)
             * @return {Object} the retrieved object
             */
            get: function (id, options) {
                options = options || {};
                //console.log("deep.store.Collection.get : ",id," - stock : ", this.collection)
                var q = "";
                var queried = false;
                if(!id)
                {
                    q = "./*";
                    queried = true;
                }
                else if (id[0] == "*")
                {
                    q = "./"+id;
                    queried = true;
                }
                else if(id[0] == "?")
                {
                    q = "./*"+id;
                    queried = true;
                }
                else
                    q = "./*?id=" + id;
                //console.log("deep.store.Collection.get : q :",q);
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                var r = deep.query(col, q);
                //console.log("deep.store.Collection.get : res :",r);
                if (!queried && r instanceof Array)
                    r = r.shift();
                if(typeof r === 'undefined')
                    return deep.when(deep.errors.NotFound());

                return deep.when(deep.utils.copy(r));
            },
            /**
             * @method put
             * @param  {Object} object the object to update
             * @param  {Object} options an options object : could contain 'id'
             * @return {Object} the updated object
             */
            put: function (object, options) {
                options = options || {};
                var id = options.id || object.id;
                if (!id)
                    return deep.when(deep.errors.Store("Collection store need id on put"));

                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                var schema = this.schema;
                var self = this;
                return deep.when(this.get(id, options)) // check ownership at get
                .done(function(r){
                    if (!r || r.length === 0)
                        return deep.errors.NotFound("no items found in collection with : " + id);
                    var old = r;
                    if(options.query)
                    {
                        r = deep.utils.copy(r);
                        deep.utils.replace(r, options.query, object);
                    }
                    else
                    {
                        if(!object.id)
                            object.id = options.id;
                        r = object;
                    }

                    if(schema)
                    {
                        if(schema._deep_ocm_)
                            schema = schema("put");
                        var check = self.checkReadOnly(old, r, options);
                        //console.log("after check : ", check);
                        if(check instanceof Error)
                            return deep.when(check);

                        var report = deep.validate(r, schema);
                        if(!report.valid)
                            return deep.errors.PreconditionFail("", report);
                    }
                    deep.utils.replace(col, "./*?id=" + id, r);
                    return r;
                });
            },
            patch:function (content, opt) {
              //console.log("ObjectSheet patch : ", content, opt);
              opt = opt || {};
              var self = this;
              deep.utils.decorateUpFrom(this, opt, ["baseURI"]);
              var id = opt.id = opt.id || content.id;
              if(!opt.id)
                  return deep.when(deep.errors.Patch("json stores need id on PATCH"));
              return deep.when(this.get(id, opt)) // check ownership at get
              .done(function(datas){
                  if (!datas || datas.length === 0)
                    return deep.errors.NotFound("no items found in collection with : " + id);
                  var data = deep.utils.copy(datas);
                  
                  if(opt.query)
                  {
                      deep.query(data, opt.query, { resultType:"full", allowStraightQueries:false })
                      .forEach(function(entry){
                          entry.value = deep.utils.up(content, entry.value);
                          if(entry.ancestor)
                              entry.ancestor.value[entry.key] = entry.value;
                      });
                      delete opt.query;
                  }
                  else
                      deep.utils.up(content, data);
                  var schema = self.schema;
                  if(schema)
                  {
                      if(schema._deep_ocm_)
                          schema = schema("patch");
                      var check = self.checkReadOnly(datas, data, opt);
                      if(check instanceof Error)
                          return deep.when(check);
                      var report = deep.validate(data, schema);
                      if(!report.valid)
                          return deep.errors.PreconditionFail(report);
                  }
                  var col = self.collection;
                  if(self.collection._deep_ocm_)
                      col = self.collection();
                  deep.utils.replace(col, "./*?id=" + id, data);
                  return data;
              });
            },
            /**
             * @method post
             * @param  {Object} object
             * @param  {Object} options (optional)
             * @return {Object} the inserted object (decorated with it's id)
             */
            post: function (object, options) {
                //console.log("deep.store.Collection.post : ", object, options);
                options = options || {};
                options.id = options.id || object.id;
                if (!options.id)
                    object.id = options.id = "id"+new Date().valueOf(); // mongo styled id
                if(!object.id)
                    object.id = options.id;
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                var res = deep.query(col, "./*?id=" + object.id);
                if (res && res.length > 0)
                    return deep.when(deep.errors.Conflict("deep.store.Collection.post : An object has the same id before post : please put in place : object : ", object));
                col.push(object);
                return deep.when(object);
            },
            /**
             * @method del
             * @param  {String} id
             * @param  {Object} options no options for the moment
             * @return {Object} the removed object
             */
            del: function (id, options) {
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                if(!id)
                    return deep.when(deep.errors.Delete("delete need an id or a query"));
                if(this.schema && this.schema.ownerRestriction)
                {
                    if(!deep.context.session || !deep.context.session.remoteUser)
                        return deep.when(deep.errors.Owner());
                    if(id[0] == '?')
                        id += "&userID="+deep.context.session.remoteUser.id;
                    else
                        id = "?id="+id+"&userID="+deep.context.session.remoteUser.id;
                }
                var q = null;
                if(id[0] == '?')
                    q = "./*"+id;
                else
                    q = "./*?id=" + id;
                //console.log("collection delete : ", q)
                var removed = deep.utils.remove(col, q);
                if (!removed || removed.length == 0)
                    return deep.when(false);
                return deep.when(true);
            },
            /**
             * @method patch
             * @param  {Object} object  the update to apply to object
             * @param  {Object} options  could contain 'id'
             * @return {deep.Chain} a chain that hold the patched object and has injected values as success object.
             */
    
            /**
             * select a range in collection
             * @method range
             * @param  {Number} start
             * @param  {Number} end
             * @return {deep.Chain} a chain that hold the selected range and has injected values as success object.
             */
            range: function (start, end, query) {
                //console.log("deep.store.Collection.range : ", start, end);
                var col = this.collection;
                if(this.collection._deep_ocm_)
                    col = this.collection();
                  var res = null;
                  var total = 0;
                  query = query || "";

                  if(query)
                  {
                    res = deep.query(col, "./*"+query);
                    total = res.length;
                    res = res.slice(start, end+1);
                    end = start+res.length-1;
                  }
                  else
                  {
                    res = col.slice(start, end+1);
                    total = col.length;
                  }
                  query += "&limit("+(res.length)+","+start+")";

                  return deep.utils.createRangeObject(start, end, total, res.length, deep.utils.copy(res), query);
            },
            flush:function(){
                this.collection = [];
            }
        });

        deep.store.Collection.create = function(protocole, collection, schema, options)
        {
            return new deep.store.Collection(protocole, collection, schema, options);
        };
        deep.utils.sheet(deep.store.ObjectSheet, deep.store.Collection.prototype);

        return deep.store.Collection;
    };
});
