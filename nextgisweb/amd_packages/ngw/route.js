/* globals define, ngwConfig */
define([
    "dojo/_base/lang",
    "./load-json!api/component/pyramid/route"
], function (
    lang,
    rdata
) {
    var module = {};

    var generator = function (args) {
        var sub,
            template = this[0],
            keys = this.slice(1),
            isArray = Object.prototype.toString.call(args) === '[object Array]',
            isObject = Object.prototype.toString.call(args) === '[object Object]';
        
        if (isArray) {
            // List of substitutions can be an array.
            sub = args;
        } else if (!isObject) {
            // If list of substitutions is not an array and not an object, then
            // use list of arguments for substituions, this is especially
            // helpful if there is just one argument.
            sub = arguments;
        } else {
            // If list of substitutions is an object, then use 
            // its keys for substitutions, but first
            // turn it into array.
            sub = [];
            for (var k in args) { sub[keys.indexOf(k)] = args[k]; }
        }

        return ngwConfig.applicationUrl + template.replace(/\{(\w+)\}/g, function (m, a) {
            var idx = parseInt(a), value = sub[idx];

            // TODO: It would be good to add route name to a message.
            if (value === undefined) { console.error("Undefined parameter " + idx + ":" + keys[idx] + " in URL " + template + "."); }
            
            return value;
        });
    };

    // Sort keys before building an object, so that 
    // key foo will be processed before foo.bar, otherwith foo.bar
    // could become inaccessible in a resulting object.
    var rkeys = [];
    for (var k in rdata) { rkeys.push(k); }
    rkeys.sort();
    
    for (var i in rkeys) {
        var rname = rkeys[i];
        lang.setObject(rname, lang.hitch(rdata[rname], generator), module);
    }

    console.log('Route initialization completed, registered ' + rkeys.length + ' routes.');

    return module;
});
