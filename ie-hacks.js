 /*if(typeof console === 'undefined')
        console = {
          log:function(msg){
            
          },
          profile:function(){},
          profileEnd:function(){}
        }
*/

'use strict';

// Add ECMA262-5 method binding if not supported natively
//
if (!('bind' in Function.prototype)) {
    Function.prototype.bind= function(owner) {
        var that= this;
        if (arguments.length<=1) {
            return function() {
                return that.apply(owner, arguments);
            };
        } else {
            var args= Array.prototype.slice.call(arguments, 1);
            return function() {
                return that.apply(owner, arguments.length===0? args : args.concat(Array.prototype.slice.call(arguments)));
            };
        }
    };
}

// Add ECMA262-5 string trim if not supported natively
//
if (!('trim' in String.prototype)) {
    String.prototype.trim= function() {
        return this.replace(/^\s+/, '').replace(/\s+$/, '');
    };
}

// Add ECMA262-5 Array methods if not supported natively
//
if (!('indexOf' in Array.prototype)) {
    Array.prototype.indexOf= function(find, i /*opt*/) {
        if (i===undefined) i= 0;
        if (i<0) i+= this.length;
        if (i<0) i= 0;
        for (var n= this.length; i<n; i++)
            if (i in this && this[i]===find)
                return i;
        return -1;
    };
}
if (!('lastIndexOf' in Array.prototype)) {
    Array.prototype.lastIndexOf= function(find, i /*opt*/) {
        if (i===undefined) i= this.length-1;
        if (i<0) i+= this.length;
        if (i>this.length-1) i= this.length-1;
        for (i++; i-->0;) /* i++ because from-argument is sadly inclusive */
            if (i in this && this[i]===find)
                return i;
        return -1;
    };
}
if (!('forEach' in Array.prototype)) {
    Array.prototype.forEach= function(action, that /*opt*/) {
        for (var i= 0, n= this.length; i<n; i++)
            if (i in this)
                action.call(that, this[i], i, this);
    };
}
if (!('map' in Array.prototype)) {
    Array.prototype.map= function(mapper, that /*opt*/) {
        var other= new Array(this.length);
        for (var i= 0, n= this.length; i<n; i++)
            if (i in this)
                other[i]= mapper.call(that, this[i], i, this);
        return other;
    };
}
if (!('filter' in Array.prototype)) {
    Array.prototype.filter= function(filter, that /*opt*/) {
        var other= [], v;
        for (var i=0, n= this.length; i<n; i++)
            if (i in this && filter.call(that, v= this[i], i, this))
                other.push(v);
        return other;
    };
}
if (!('every' in Array.prototype)) {
    Array.prototype.every= function(tester, that /*opt*/) {
        for (var i= 0, n= this.length; i<n; i++)
            if (i in this && !tester.call(that, this[i], i, this))
                return false;
        return true;
    };
}
if (!('some' in Array.prototype)) {
    Array.prototype.some= function(tester, that /*opt*/) {
        for (var i= 0, n= this.length; i<n; i++)
            if (i in this && tester.call(that, this[i], i, this))
                return true;
        return false;
    };
}
if (!Array.prototype.reduce)
{
  Array.prototype.reduce = function(fun /*, initial*/)
  {
    var len = this.length;
    if (typeof fun != "function")
      throw new TypeError();

    // no value to return if no initial value and an empty array
    if (len == 0 && arguments.length == 1)
      throw new TypeError();

    var i = 0;
    if (arguments.length >= 2)
    {
      var rv = arguments[1];
    }
    else
    {
      do
      {
        if (i in this)
        {
          rv = this[i++];
          break;
        }

        // if array contains no values, no initial value to return
        if (++i >= len)
          throw new TypeError();
      }
      while (true);
    }

    for (; i < len; i++)
    {
      if (i in this)
        rv = fun.call(null, rv, this[i], i, this);
    }

    return rv;
  };
}
/*
        if ( !Array.prototype.forEach ) {  
  
  Array.prototype.forEach = function( callback, thisArg ) {  
  
    var T, k;  
  
    if ( this == null ) {  
      throw new TypeError( " this is null or not defined" );  
    }  
  
    // 1. Let O be the result of calling ToObject passing the |this| value as the argument.  
    var O = Object(this);  
  
    // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".  
    // 3. Let len be ToUint32(lenValue).  
    var len = O.length >>> 0; // Hack to convert O.length to a UInt32  
  
    // 4. If IsCallable(callback) is false, throw a TypeError exception.  
    // See: http://es5.github.com/#x9.11  
    if ( {}.toString.call(callback) != "[object Function]" ) {  
      throw new TypeError( callback + " is not a function" );  
    }  
  
    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.  
    if ( thisArg ) {  
      T = thisArg;  
    }  
  
    // 6. Let k be 0  
    k = 0;  
  
    // 7. Repeat, while k < len  
    while( k < len ) {  
  
      var kValue;  
  
      // a. Let Pk be ToString(k).  
      //   This is implicit for LHS operands of the in operator  
      // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.  
      //   This step can be combined with c  
      // c. If kPresent is true, then  
      if ( k in O ) {  
  
        // i. Let kValue be the result of calling the Get internal method of O with argument Pk.  
        kValue = O[ k ];  
  
        // ii. Call the Call internal method of callback with T as the this value and  
        // argument list containing kValue, k, and O.  
        callback.call( T, kValue, k, O );  
      }  
      // d. Increase k by 1.  
      k++;  
    }  
    // 8. return undefined  
  };  
}*/