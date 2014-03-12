/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define(["require", "../../deep", "./store", "./store-sheet"], function(require, deep) {

    //__________________________________________________________________________________ OBJECT store
    /**
     * A store based on simple object
     * @class deep.store.Object
     * @constructor
     * @param {Object} obj the root object to hold
     * @param {Object} options could contain 'schema'
     */
    deep.store.Object = deep.compose.Classes(deep.Store,
        function(protocol, root, schema, options) {
            //console.log("deep.store.Object : ", protocol, root, schema, options);
            if (root)
                this.root = root;
            if (schema)
                this.schema = schema;
            if (options)
                deep.utils.up(options, this);
            this.root = this.root || {};
        }, {
            /**
             *
             * @method get
             * @param  {String} id
             * @return {deep.Chain} depending on first argument : return an object or an array of objects
             */
            get: function(id, options) {
                //console.log("deep.storeObject.get : ", id, options);
                //if(id === "" || !id || id === "*")
                var root = this.root || this;
                if (root._deep_ocm_)
                    root = root();
                var r = null;
                if (id[0] == "." || id[0] == "/")
                    r = deep.query(root, id);
                else
                    r = deep.query(root, "./" + id);
                if (typeof r === 'undefined')
                    return deep.errors.NotFound();
                return r;
            },
            /**
             * @method put
             * @param  {[type]} object
             * @param  {[type]} query
             * @return {[type]}
             */
            put: function(object, options) {
                var id = options.id || object.id;
                if (!id)
                    return deep.errors.Store("QuerierStore need id on put");
                var root = this.root || this;
                if (root._deep_ocm_)
                    root = root();
                if (id[0] !== '/')
                    id = "/" + id;
                deep.utils.replace(root, id, object);
                return object;
            },
            /**
             * @method put
             * @param  {[type]} object
             * @param  {[type]} query
             * @return {[type]}
             */
            patch: function(object, options) {
                var id = options.id || object.id;
                if (!id)
                    return deep.errors.Store("QuerierStore need id on put");
                var root = this.root || this;
                if (root._deep_ocm_)
                    root = root();
                if (id[0] !== '/')
                    id = "/" + id;
                console.log("object store.patch : ", object, options, id);
                deep.utils.replace(root, id, object);
                return object;
            },
            /**
             * @method post
             * @param  {[type]} object
             * @param  {[type]} path
             * @return {[type]}
             */
            post: function(object, options) {
                var root = this.root || this;
                if (root._deep_ocm_)
                    root = root();
                var id = object.id || options.id;
                if (id == '/!')
                    this.root = object;
                else {
                    //console.log("deep.store.Object.post : ", object, id);
                    var res = deep.query(root, id);
                    if (res && res.length > 0)
                        return deep.when(deep.errors.Store("deep.store.Object.post : An object has the same id before post : please put in place : object : ", object));
                    deep(root).setByPath(id, object);
                }
                return object;
            },
            /**
             * @method del
             * @param  {[type]} id
             * @return {[type]}
             */
            del: function(id) {
                console.log("Object store Del : ", id);
                var root = this.root || this;
                if (root._deep_ocm_)
                    root = root();
                var q = id;
                if (id[0] != "." && id[0] != "/")
                    q = "./" + id;
                var removed = deep.utils.remove(root, q);
                if (removed)
                    return true;
                return false;
            },
            /**
             * select a range in collection
             * @method range
             * @param  {Number} start
             * @param  {Number} end
             * @return {deep.Chain} a chain that hold the selected range and has injected values as success object.
             */
            range: function(start, end, query) {
                //console.log("deep.store.Collection.range : ", start, end, query);
                var res = null;
                var total = 0;
                query = query || "";
                return deep.when(this.get(query))
                    .done(function(res) {
                        total = res.length;
                        start = Math.min(start, total);
                        res = res.slice(start, end + 1);
                        end = start + res.length - 1;
                        query += "&limit(" + (res.length) + "," + start + ")";
                        return deep.utils.createRangeObject(start, end, total, res.length, deep.utils.copy(res), query);
                    });
            },
            /**
             * @method fluch
             */
            flush: function() {
                this.root = {};
            }
        });

    deep.store.Object.create = function(protocol, root, schema, options) {
        return new deep.store.Object(protocol, root, schema, options);
    };

    deep.sheet(deep.store.fullSheet, deep.store.Object.prototype);

    return deep.store.Object;
});