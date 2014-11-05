/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * Global or contextusalised "app" management.
 *
 * An "app" could be anything. Here it's just tools to manage an object reference globally
 * or associated to promise context. 
 * It's mainly used by deep-login and deep-routes but could be used for any other purposes.
 *
 * Contextualised "app" has "priority" on global "app" when defined.
 * 
 * deep.App(app) : place app as global app. return app.
 * deep.App() : return global app
 *
 * deep.app(app) : start a promise chain with provided app in its context.
 * deep.app() : return current app. either from context (if defined), or global one.
 */
 
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(["require", "../deep"], function(require, deep){
    var appClosure = {
        app: null
    };

    // holds provided app as main app accessible for deepjs chains.
    deep.App = function(app) {
        if(!app)
        {
            if(appClosure.app)
                return appClosure.app;
            throw deep.errors.Internal("no global app setted");
        }
        appClosure.app = app;
    };

    // Start a deepjs chain with provided app in its own context. does not modifiy global app.
    deep.app = function(app) {
        if(!app)
        {
            app = deep.context("app") || appClosure.app;
            if(app)
                return app;
            throw deep.errors.Internal("No app setted (global nor from context).");
        }
        return deep.when(app).app(app)
    };

    // define current app from within a chain (use current chain's context)
    deep.Promise.API.app = function(app) {
        var self = this;
        var func = function(s, e) {
            app = app || deep.Promise.context.app || appClosure.app;
            if (!app)
                return deep.errors.Error(500, "No app provided on deep.Chain.app(...)");
            if(!self._contextualised)
                promise.Promise.contextualise(self);
            self._context.protocols = app.protocols;
            self._context.app = app;
            return s;
        };
        func._isDone_ = true;
        return this._enqueue(func);
    };
});
