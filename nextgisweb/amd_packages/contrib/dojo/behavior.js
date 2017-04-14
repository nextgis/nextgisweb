/*
	Copyright (c) 2004-2016, The JS Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/behavior","./_base/kernel ./_base/lang ./_base/array ./_base/connect ./query ./domReady".split(" "),function(e,f,l,g,m,k){e.deprecated("dojo.behavior","Use dojo/on with event delegation (on.selector())");e.behavior=new function(){function e(a,b){a[b]||(a[b]=[]);return a[b]}function h(a,b,c){var n={},d;for(d in a)"undefined"==typeof n[d]&&(c?c.call(b,a[d],d):b(a[d],d))}var k=0;this._behaviors={};this.add=function(a){h(a,this,function(b,a){var c=e(this._behaviors,a);"number"!=typeof c.id&&
(c.id=k++);var d=[];c.push(d);if(f.isString(b)||f.isFunction(b))b={found:b};h(b,function(a,b){e(d,b).push(a)})})};var p=function(a,b,c){f.isString(b)?"found"==c?g.publish(b,[a]):g.connect(a,c,function(){g.publish(b,arguments)}):f.isFunction(b)&&("found"==c?b(a):g.connect(a,c,b))};this.apply=function(){h(this._behaviors,function(a,b){m(b).forEach(function(b){var c=0,d="_dj_behavior_"+a.id;if("number"==typeof b[d]&&(c=b[d],c==a.length))return;for(var e;e=a[c];c++)h(e,function(a,c){f.isArray(a)&&l.forEach(a,
function(a){p(b,a,c)})});b[d]=a.length})})}};k(function(){e.behavior.apply()});return e.behavior});
//# sourceMappingURL=behavior.js.map