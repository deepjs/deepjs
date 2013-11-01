
  if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require", "../deep", "../deep-stores"], function (require, deep) {
    
    return function(deep){


        //__________________________________________________________________________________ OBJECT store
        /**
         * A store based on simple object
         * @class deep.store.Object
         * @constructor
         * @param {Object} obj the root object to hold
         * @param {Object} options could contain 'schema'
         */
        deep.store.Object = deep.compose.Classes(deep.Store,
        function (protocole, root, schema, options) {
            if (root)
                this.root = root;
            if(schema)
                this.schema = schema;
            if(options)
                deep.utils.up(options, this);
            this.root = this.root || {};
        },
        {
            /**
             *
             * @method get
             * @param  {String} id
             * @return {deep.Chain} depending on first argument : return an object or an array of objects
             */
            get: function (id, options) {
                //if(id === "" || !id || id === "*")
                var root = this.root || this;
                if(root._deep_ocm_)
                    root = root();
                if (id[0] == "." || id[0] == "/")
                    return deep.when(deep.query(root, id));
                return deep.when(deep.query(root, "./" + id));
            },
            /**
             * @method put
             * @param  {[type]} object
             * @param  {[type]} query
             * @return {[type]}
             */
            put: function (object, options) {
                options = options || {};
                var root = this.root || this;
                if(root._deep_ocm_)
                    root = root();
                var id = options.id || object.id;
                if (!id)
                    return deep.when(deep.errors.Store("QuerierStore need id on put"));
                
                var r = deep.query(root, id, { resultType: "full", allowStraightQueries:false });
                if (!r || r.length === 0)
                    return deep.when(deep.errors.NotFound("QuerierStore.put : no items found in collection with : " + id));
                r = r.shift();
                
                if(options.query)
                {
                    r.value = deep.utils.copy(r.value);
                    deep.utils.replace(r.value, options.query, object);
                }
                else
                {
                    if(!object.id)
                        object.id = id;
                    r.value = object;
                }
                var schema = this.schema;
                if(schema)
                {
                    if(schema._deep_ocm_)
                        schema = schema("put");
                    var report = deep.validate(r.value, schema);
                    if(!report.valid)
                        return deep.when(deep.errors.PreconditionFail(report));
                }
                if (r.ancestor)
                    r.ancestor.value[r.key] = r.value;
                
                return deep.when(r.value);
            },
            /**
             * @method post
             * @param  {[type]} object
             * @param  {[type]} path
             * @return {[type]}
             */
            post: function (object, options) {
                options = options || {};
                var root = this.root || this;
                if(root._deep_ocm_)
                    root = root();
                var id = object.id || options.id;
                var res = deep.query(root, id);
                if (res && res.length > 0)
                    return deep.when(deep.errors.Store("deep.store.Object.post : An object has the same id before post : please put in place : object : ", object));
                deep(root).setByPath(id, object);
                return deep.when(object);
            },
            /**
             * @method del
             * @param  {[type]} id
             * @return {[type]}
             */
            del: function (id) {
                var res = [];
                var root = this.root || this;
                if(root._deep_ocm_)
                    root = root();
                if (id[0] == "." || id[0] == "/")
                    deep(root).remove(id)
                        .done(function (removed) {
                        res = removed;
                    });
                else
                    deep(root)
                        .remove("./" + id)
                        .done(function (removed) {
                        res = removed;
                    });
                if (res)
                    res = res.shift();
                return deep.when(res);
            },
            /**
             * @method fluch
             */
            flush:function(){
                this.root = {};
            }
        });

        deep.store.Object.create = function(protocole, root, schema)
        {
            return new deep.store.Object(protocole, root, schema);
        };

        deep.utils.sheet(deep.store.ObjectSheet, deep.store.Object.prototype);

        return deep.store.Object;
    };
});



       