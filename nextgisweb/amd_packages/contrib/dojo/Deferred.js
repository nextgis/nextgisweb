/*
	Copyright (c) 2004-2016, The JS Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/Deferred",["./has","./_base/lang","./errors/CancelError","./promise/Promise","./promise/instrumentation"],function(w,x,t,u,q){var v=Object.freeze||function(){},n=function(b,a,c,d,f){2===a&&g.instrumentRejected&&0===b.length&&g.instrumentRejected(c,!1,d,f);for(f=0;f<b.length;f++)r(b[f],a,c,d)},r=function(b,a,c,d){var f=b[a],e=b.deferred;if(f)try{var h=f(c);if(0===a)"undefined"!==typeof h&&l(e,a,h);else{if(h&&"function"===typeof h.then){b.cancel=h.cancel;h.then(p(e,1),p(e,2),p(e,0));return}l(e,
1,h)}}catch(k){l(e,2,k)}else l(e,a,c);2===a&&g.instrumentRejected&&g.instrumentRejected(c,!!f,d,e.promise)},p=function(b,a){return function(c){l(b,a,c)}},l=function(b,a,c){if(!b.isCanceled())switch(a){case 0:b.progress(c);break;case 1:b.resolve(c);break;case 2:b.reject(c)}},g=function(b){var a=this.promise=new u,c=this,d,f,e,h=!1,k=[];Error.captureStackTrace&&(Error.captureStackTrace(c,g),Error.captureStackTrace(a,g));this.isResolved=a.isResolved=function(){return 1===d};this.isRejected=a.isRejected=
function(){return 2===d};this.isFulfilled=a.isFulfilled=function(){return!!d};this.isCanceled=a.isCanceled=function(){return h};this.progress=function(b,f){if(d){if(!0===f)throw Error("This deferred has already been fulfilled.");return a}n(k,0,b,null,c);return a};this.resolve=function(b,e){if(d){if(!0===e)throw Error("This deferred has already been fulfilled.");return a}n(k,d=1,f=b,null,c);k=null;return a};var l=this.reject=function(b,g){if(d){if(!0===g)throw Error("This deferred has already been fulfilled.");
return a}Error.captureStackTrace&&Error.captureStackTrace(e={},l);n(k,d=2,f=b,e,c);k=null;return a};this.then=a.then=function(b,c,h){var m=[h,b,c];m.cancel=a.cancel;m.deferred=new g(function(a){return m.cancel&&m.cancel(a)});d&&!k?r(m,d,f,e):k.push(m);return m.deferred.promise};this.cancel=a.cancel=function(a,c){if(!d){if(b){var e=b(a);a="undefined"===typeof e?a:e}h=!0;if(!d)return"undefined"===typeof a&&(a=new t),l(a),a;if(2===d&&f===a)return a}else if(!0===c)throw Error("This deferred has already been fulfilled.");
};v(a)};g.prototype.toString=function(){return"[object Deferred]"};q&&q(g);return g});
//# sourceMappingURL=Deferred.js.map