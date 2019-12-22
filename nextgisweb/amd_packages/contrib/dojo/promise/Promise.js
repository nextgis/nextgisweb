/*
	Copyright (c) 2004-2016, The JS Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/promise/Promise",["../_base/lang"],function(_1){
"use strict";
function _2(){
throw new TypeError("abstract");
};
return _1.extend(function Promise(){
},{then:function(_3,_4,_5){
_2();
},cancel:function(_6,_7){
_2();
},isResolved:function(){
_2();
},isRejected:function(){
_2();
},isFulfilled:function(){
_2();
},isCanceled:function(){
_2();
},"finally":function(_8){
return this.then(function(_9){
var _a=_8();
if(_a&&typeof _a.then==="function"){
return _a.then(function(){
return _9;
});
}
return _9;
},function(_b){
var _c=_8();
if(_c&&typeof _c.then==="function"){
return _c.then(function(){
throw _b;
});
}
throw _b;
});
},always:function(_d){
return this.then(_d,_d);
},"catch":function(_e){
return this.then(null,_e);
},otherwise:function(_f){
return this.then(null,_f);
},trace:function(){
return this;
},traceRejected:function(){
return this;
},toString:function(){
return "[object Promise]";
}});
});
