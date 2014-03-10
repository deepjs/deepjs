/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */
"use strict";
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require"], function (require) {

    return function(deep){

    // _____________________________________________________ DIRECT API
    deep.utils.firstWith = function(root, selector){
        if(typeof selector === 'function')
            return deep.utils.preorder(root, selector, {first:true});
        var q = deep.utils.parseSelector(selector)[0];
        var func = null;
        if(q !== "this.*" && q !== "")
            func = new Function("return " + q + ";");
        return deep.utils.preorder(root, func, {first:true});
    };

    deep.utils.allWith = function(root, selector){
        if(typeof selector === 'function')
            return deep.utils.preorder(root, selector);
        var queries = deep.utils.parseSelector(selector);
        var q = queries.shift(), current = [root];
        while(q)
        {
            var func = null;
            if(q !== "this.*" && q !== "")
                func = new Function("return " + q + ";");
            var r = [];
            for(var i = 1; i < current.length; ++i)
                r = r.concat(deep.utils.preorder(root, func));
            current = r;
            if(current.length !== 0)
                q = queries.shift();
            else
                q = null;
        }
        if(queries.length > 0)
            return [];
        return current;
    };

    deep.utils.arrayWith = function (root, selector, arrayName)
    {
        // console.log("deep.selector : ", root, selector, arrayName);
        var queries = deep.utils.parseSelector(selector);
        var q = queries.shift(), selected = [], current = [], cur = root;
        if(cur.push)
        {
            current = cur;
            cur = current.shift();
        }
        var test = function(){ return typeof this[arrayName] !== 'undefined'; };
        while(q)
        {
            var func = null;
            if(q == "this.*" || q === "")
                func = function(){ return true; };
            else
                func = new Function("return " + q + ";");
            while(cur)
            {
                var nodes = deep.utils.preorder(cur, test);
                var n = nodes.shift();
                while(n)
                {
                    var o = {}, sel = n.value[arrayName], len = sel.length;
                    for(var i = 0; i < len; ++i)
                        o[sel[i]] = true;
                    o.___func___ = func;
                    if (o.___func___())
                        selected.push(n);
                    n = nodes.shift();
                }
                cur = current.shift();
            }
            if(selected.length === 0)
                break;
            q = queries.shift();
            if(q)
            {
                current = selected;
                cur = current.shift();
                selected = [];
            }
        }
        return selected;
    };

    deep.utils.parseSelector = function (selector)
    {
        var chars = selector[0];
        var res = [];
        var finalString = "";
        var index = 0;
        while (chars) {
            switch (chars) {
            case '|':
            case '&':
            case '(':
            case ')':
            case ' ':
            case '!':
                finalString += chars;
                chars = selector[++index];
                break;
            case '>' :
                res.push(finalString);
                chars = selector[++index];
                finalString = "";
                break;
            default:
                finalString += "this.";
                var count = index;
                while (chars) {
                    var shouldBreak = false;
                    switch (chars) {
                        case '|':
                        case '&':
                        case '(':
                        case ')':
                        case ' ':
                        case '>':
                        case '!':
                            shouldBreak = true;
                            break;
                    }
                    if (shouldBreak) {
                        finalString += selector.substring(index, count);
                        index = count;
                        break;
                    }
                    chars = selector[++count];
                    if (!chars)
                        finalString += selector.substring(index, count);
                }
            }
        }
        if(finalString.length > 0)
            res.push(finalString);
        return res;
    };
   
	//________________________________________________________________________________________ CHAIN HANDLERS
    deep.Chain.add("arrayWith", function (selector, name) {
        var self = this;
        var func = function chainSelectorHandle(s, e) {
            return deep.utils.arrayWith(deep.chain.val(self), selector, name);
        };
        func._isDone_ = true;
        deep.chain.addInChain.call(self, func);
        return this;
    });

    deep.Chain.add("allWith", function (selector) {
        var self = this;
        var func = function (s, e) {
            return deep.utils.allWith(deep.chain.val(self), selector);
        };
        func._isDone_ = true;
        deep.chain.addInChain.call(self, func);
        return this;
    });

    deep.Chain.add("firstWith", function (selector) {
        var self = this;
        var func = function (s, e) {
            return deep.utils.firstWith(deep.chain.val(self), selector);
        };
        func._isDone_ = true;
        deep.chain.addInChain.call(self, func);
        return this;
    });

    //______________________________________________________________________________________ ArrayWith STORES 

    deep.store.ArrayWith = deep.compose.Classes(deep.Store, function (protocol, root, arrayName, options)
    {
        if (root)
            this.root = root;
        if(arrayName)
            this.arrayName = arrayName;
    },
    {
        /**
         *
         * @method get
         * @param  {String} id
         * @return {deep.Chain} depending on first argument : return an object or an array of objects
         */
        get: function ArrayWithStoreGet(id, options) {
            options = options || {};
            var root = options.entry || this.root;
            if(!root)
                return deep.when(deep.errors.Store("no object to apply selector on for ArrayWith : "+id));
            if(root._isDQ_NODE_)
                root = root.value;
            if(root._deep_ocm_)
                root = root();
            var res = deep.utils.arrayWith(root, id, this.arrayName);
            //console.log("deep.selector protocol : get : ",res);
            return deep.when(res);
        }
    });

    deep.store.ArrayWith.create = function parseSelector(protocol, root, arrayName)
    {
        var store = new deep.store.ArrayWith(protocol, root, arrayName);
        if(protocol)
            deep.utils.up(deep.protocol.SheetProtocoles, store);
    };

    //______________________________________________________________________________________ firstWith STORES 
    deep.store.FirstWith = deep.compose.Classes(deep.Store, function (protocol, root, options)
    {
        if (root)
            this.root = root;
        //console.log(" selector constructor : protocol : ", protocol);
    },
    {
        /**
         *
         * @method get
         * @param  {String} id
         * @return {deep.Chain} depending on first argument : return an object or an array of objects
         */
        get: function FirstWithStoreGet(id, options) {
            options = options || {};
            var root = options.entry || this.root;
            if(!root)
                return deep.when(deep.errors.Store("no object to apply selector on for FirstWith : "+id));
            if(root._isDQ_NODE_)
                root = root.value;
            if(root._deep_ocm_)
                root = root();
            var res = deep.utils.firstWith(root, id);
            //console.log("deep.selector protocol : get : ",res);
            return deep.when(res);
        }
    });

    deep.store.FirstWith.create = function (protocol, root)
    {
        var store = new deep.store.FirstWith(protocol, root);
        if(protocol)
            deep.utils.up(deep.protocol.SheetProtocoles, store);
    };
    //______________________________________________________________________________________ allWith STORES 
    deep.store.AllWith = deep.compose.Classes(deep.Store, function (protocol, root, options)
    {
        if (root)
            this.root = root;
    },
    {
        /**
         *
         * @method get
         * @param  {String} id
         * @return {deep.Chain} depending on first argument : return an object or an array of objects
         */
        get: function AllWithStoreGet(id, options) {
            options = options || {};
            var root = options.entry || this.root;
            if(!root)
                return deep.when(deep.errors.Store("no object to apply selector on for AllWith : "+id));
            if(root._isDQ_NODE_)
                root = root.value;
            if(root._deep_ocm_)
                root = root();
            var res = deep.utils.allWith(root, id);
            //console.log("deep.selector protocol : get : ",res);
            return deep.when(res);
        }
    });

    deep.store.AllWith.create = function (protocol, root)
    {
        var store = new deep.store.AllWith(protocol, root);
        if(protocol)
            deep.utils.up(deep.protocol.SheetProtocoles, store);
    };

    //______________________________________________________________________________________ PROTOCOLS
    

    deep.store.AllWith.create("aw");
    deep.store.FirstWith.create("fw");

    //______________________________________________________________________________________ TEST CASES 
    deep.coreUnits = deep.coreUnits || [];
    deep.coreUnits.push("js::deep-selector/units/selectors");

    return deep.store.Selector;
    }
});
