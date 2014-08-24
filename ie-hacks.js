'use strict';

// Add ECMA262-5 method binding if not supported natively

(function(){
var _slice = Array.prototype.slice;

try {
    // Can't be used with DOM elements in IE < 9
    _slice.call(document.documentElement);
} catch (e) { // Fails in IE < 9
    Array.prototype.slice = function(begin, end) {
        var i, arrl = this.length,
            a = [];
        // Although IE < 9 does not fail when applying Array.prototype.slice
        // to strings, here we do have to duck-type to avoid failing
        // with IE < 9's lack of support for string indexes
        if (this.charAt) {
            for (i = 0; i < arrl; i++) {
                a.push(this.charAt(i));
            }
        }
        // This will work for genuine arrays, array-like objects, 
        // NamedNodeMap (attributes, entities, notations),
        // NodeList (e.g., getElementsByTagName), HTMLCollection (e.g., childNodes),
        // and will not fail on other DOM objects (as do DOM elements in IE < 9)
        else {
            // IE < 9 (at least IE < 9 mode in IE 10) does not work with
            // node.attributes (NamedNodeMap) without a dynamically checked length here
            for (i = 0; i < this.length; i++) {
                a.push(this[i]);
            }
        }
        // IE < 9 gives errors here if end is allowed as undefined
        // (as opposed to just missing) so we default ourselves
        return _slice.call(a, begin, end || a.length);
    };
}

if (!('bind' in Function.prototype)) {
    Function.prototype.bind = function(owner) {
        var that = this;
        if (arguments.length <= 1) {
            return function() {
                return that.apply(owner, arguments);
            };
        } else {
            var args = Array.prototype.slice.call(arguments, 1);
            return function() {
                return that.apply(owner, arguments.length === 0 ? args : args.concat(Array.prototype.slice.call(arguments)));
            };
        }
    };
}
if (!Date.now)
    Date.now = Date.now || function() {
        return +new Date;
    };

if (!Object.create) {
    Object.create = (function() {
        function F() {}

        return function(o) {
            if (arguments.length != 1) {
                throw new Error('Object.create implementation only accepts one parameter.');
            }
            F.prototype = o
            return new F()
        }
    })();
}
if (!Object.keys) {
    Object.keys = (function() {
        'use strict';
        var hasOwnProperty = Object.prototype.hasOwnProperty,
            hasDontEnumBug = !({
                toString: null
            }).propertyIsEnumerable('toString'),
            dontEnums = [
                'toString',
                'toLocaleString',
                'valueOf',
                'hasOwnProperty',
                'isPrototypeOf',
                'propertyIsEnumerable',
                'constructor'
            ],
            dontEnumsLength = dontEnums.length;

        return function(obj) {
            if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
                throw new TypeError('Object.keys called on non-object');
            }

            var result = [],
                prop, i;

            for (prop in obj) {
                if (hasOwnProperty.call(obj, prop)) {
                    result.push(prop);
                }
            }

            if (hasDontEnumBug) {
                for (i = 0; i < dontEnumsLength; i++) {
                    if (hasOwnProperty.call(obj, dontEnums[i])) {
                        result.push(dontEnums[i]);
                    }
                }
            }
            return result;
        };
    }());
}
if (!Array.isArray) {
    Array.isArray = function(vArg) {
        return vArg instanceof Array;
    };
}
var split;

// Avoid running twice; that would break the `nativeSplit` reference
split = split || function(undef) {

    var nativeSplit = String.prototype.split,
        compliantExecNpcg = /()??/.exec("")[1] === undef, // NPCG: nonparticipating capturing group
        self;

    self = function(str, separator, limit) {
        // If `separator` is not a regex, use `nativeSplit`
        if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
            return nativeSplit.call(str, separator, limit);
        }
        var output = [],
            flags = (separator.ignoreCase ? "i" : "") +
                (separator.multiline ? "m" : "") +
                (separator.extended ? "x" : "") + // Proposed for ES6
            (separator.sticky ? "y" : ""), // Firefox 3+
            lastLastIndex = 0,
            // Make `global` and avoid `lastIndex` issues by working with a copy
            separator = new RegExp(separator.source, flags + "g"),
            separator2, match, lastIndex, lastLength;
        str += ""; // Type-convert
        if (!compliantExecNpcg) {
            // Doesn't need flags gy, but they don't hurt
            separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
        }
        /* Values for `limit`, per the spec:
         * If undefined: 4294967295 // Math.pow(2, 32) - 1
         * If 0, Infinity, or NaN: 0
         * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
         * If negative number: 4294967296 - Math.floor(Math.abs(limit))
         * If other: Type-convert, then use the above rules
         */
        limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
        limit >>> 0; // ToUint32(limit)
        while (match = separator.exec(str)) {
            // `separator.lastIndex` is not reliable cross-browser
            lastIndex = match.index + match[0].length;
            if (lastIndex > lastLastIndex) {
                output.push(str.slice(lastLastIndex, match.index));
                // Fix browsers whose `exec` methods don't consistently return `undefined` for
                // nonparticipating capturing groups
                if (!compliantExecNpcg && match.length > 1) {
                    match[0].replace(separator2, function() {
                        for (var i = 1; i < arguments.length - 2; i++) {
                            if (arguments[i] === undef) {
                                match[i] = undef;
                            }
                        }
                    });
                }
                if (match.length > 1 && match.index < str.length) {
                    Array.prototype.push.apply(output, match.slice(1));
                }
                lastLength = match[0].length;
                lastLastIndex = lastIndex;
                if (output.length >= limit) {
                    break;
                }
            }
            if (separator.lastIndex === match.index) {
                separator.lastIndex++; // Avoid an infinite loop
            }
        }
        if (lastLastIndex === str.length) {
            if (lastLength || !separator.test("")) {
                output.push("");
            }
        } else {
            output.push(str.slice(lastLastIndex));
        }
        return output.length > limit ? output.slice(0, limit) : output;
    };
    // For convenience
    String.prototype.split = function(separator, limit) {
        return self(this, separator, limit);
    };

    return self;
}();
if (!Object.getOwnPropertyNames) {
    Object.getOwnPropertyNames = function(obj) {
        var keys = [];
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                keys.push(i);
            }
        }
        return keys;
    };
}
// Add ECMA262-5 string trim if not supported natively
//
if (!('trim' in String.prototype)) {
    String.prototype.trim = function() {
        return this.replace(/^\s+/, '').replace(/\s+$/, '');
    };
}

// Add ECMA262-5 Array methods if not supported natively
//
if (!('indexOf' in Array.prototype)) {
    Array.prototype.indexOf = function(find, i /*opt*/ ) {
        if (i === undefined) i = 0;
        if (i < 0) i += this.length;
        if (i < 0) i = 0;
        for (var n = this.length; i < n; i++)
            if (this[i] === find)
                return i;
        return -1;
    };
}
if (!('lastIndexOf' in Array.prototype)) {
    Array.prototype.lastIndexOf = function(find, i /*opt*/ ) {
        if (i === undefined) i = this.length - 1;
        if (i < 0) i += this.length;
        if (i > this.length - 1) i = this.length - 1;
        for (i++; i-- > 0;) /* i++ because from-argument is sadly inclusive */
            if (this[i] === find)
                return i;
        return -1;
    };
}
if (!('forEach' in Array.prototype)) {
    Array.prototype.forEach = function(action, that /*opt*/ ) {
        for (var i = 0, n = this.length; i < n; i++)
        //if (i in this)
            action.call(that, this[i], i, this);
    };
}
if (!('map' in Array.prototype)) {
    Array.prototype.map = function(mapper, that /*opt*/ ) {
        var other = new Array(this.length);
        for (var i = 0, n = this.length; i < n; i++)
        //if (i in this)
            other[i] = mapper.call(that, this[i], i, this);
        return other;
    };
}
if (!('filter' in Array.prototype)) {
    Array.prototype.filter = function(filter, that /*opt*/ ) {
        var other = [],
            v;
        for (var i = 0, n = this.length; i < n; i++)
            if (filter.call(that, v = this[i], i, this))
                other.push(v);
        return other;
    };
}
if (!('every' in Array.prototype)) {
    Array.prototype.every = function(tester, that /*opt*/ ) {
        for (var i = 0, n = this.length; i < n; i++)
            if (!tester.call(that, this[i], i, this))
                return false;
        return true;
    };
}
if (!('some' in Array.prototype)) {
    Array.prototype.some = function(tester, that /*opt*/ ) {
        for (var i = 0, n = this.length; i < n; i++)
            if (tester.call(that, this[i], i, this))
                return true;
        return false;
    };
}
if (!Array.prototype.reduce) {
    Array.prototype.reduce = function(fun /*, initial*/ ) {
        var len = this.length;
        if (typeof fun !== 'function')
            throw new TypeError();

        // no value to return if no initial value and an empty array
        if (len === 0 && arguments.length == 1)
            throw new TypeError();

        var i = 0,
            rv;
        if (arguments.length >= 2) {
            rv = arguments[1];
        } else {
            //do
            //{
            //if (i in this)
            //{
            rv = this[i];
            // break;
            //}

            // if array contains no values, no initial value to return
            //if (++i >= len)
            //throw new TypeError();
            //}
            //while (true);
        }

        for (; i < len; i++) {
            //if (i in this)
            rv = fun.call(null, rv, this[i], i, this);
        }

        return rv;
    };
}

})();
