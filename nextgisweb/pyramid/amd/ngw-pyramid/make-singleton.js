define([
    'dojo/_base/lang'
], function (lang) {
    return function (ctor) {   // not defining a class, just a utility method.
        var singletonCtor,    // our singleton constructor function.
            instance = null;  // singleton instance provided to any clients.

        // define the singleton constructor with accessor method.
        // (captures 'ctor' parameter and 'instance' variable in a function
        //  closure so that they are available whenever the getInstance() method
        //  on the singleton is called.)
        singletonCtor = new function () {       // note: 'new' is important here!!
            this.getInstance = function (args) {    // our accessor function
                if (!instance) {               // captures instance in a closure
                    instance = new ctor(args);       // create instance using original ctor.
                    instance.constructor = null; // remove instance's constructor method
                }                              //  so you cannot use new operator on it!!
                return instance;               // this is our singleton instance.
            };
        };

        // Since we are working with Dojo, when declaring a class object, if you
        // provide a 'className' as the first parameter to declare(...), Dojo will
        // save that value in the 'declaredClass' property on the object's prototype...
        // ... and adds a reference to that constructor function in the global namespace
        // as defined by the 'className' string.
        //
        // So if 'declaredClass' has a value, we need to close the hole by making
        // sure this also refers to the singleton and not the original constructor !!
        //
        if (ctor.prototype && ctor.prototype.declaredClass) {
            lang.setObject(ctor.prototype.declaredClass, singletonCtor);
        }

        // return the singleton "constructor" supports only a getInstance()
        // method and blocks the use of the 'new' operator.
        return singletonCtor;
    };
});
