/*
	Copyright (c) 2004-2016, The JS Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/promise/Promise",["../_base/lang"],function(b){function a(){throw new TypeError("abstract");}return b.extend(function(){},{then:function(c,b,d){a()},cancel:function(c,b){a()},isResolved:function(){a()},isRejected:function(){a()},isFulfilled:function(){a()},isCanceled:function(){a()},always:function(a){return this.then(a,a)},otherwise:function(a){return this.then(null,a)},trace:function(){return this},traceRejected:function(){return this},toString:function(){return"[object Promise]"}})});
//# sourceMappingURL=Promise.js.map