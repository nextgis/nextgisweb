/*
	Copyright (c) 2004-2016, The JS Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dom-geometry",["./sniff","./_base/window","./dom","./dom-style"],function(_1,_2,_3,_4){
var _5={};
_5.boxModel="content-box";
if(_1("ie")){
_5.boxModel=document.compatMode=="BackCompat"?"border-box":"content-box";
}
_5.getPadExtents=function getPadExtents(_6,_7){
_6=_3.byId(_6);
var s=_7||_4.getComputedStyle(_6),px=_4.toPixelValue,l=px(_6,s.paddingLeft),t=px(_6,s.paddingTop),r=px(_6,s.paddingRight),b=px(_6,s.paddingBottom);
return {l:l,t:t,r:r,b:b,w:l+r,h:t+b};
};
var _8="none";
_5.getBorderExtents=function getBorderExtents(_9,_a){
_9=_3.byId(_9);
var px=_4.toPixelValue,s=_a||_4.getComputedStyle(_9),l=s.borderLeftStyle!=_8?px(_9,s.borderLeftWidth):0,t=s.borderTopStyle!=_8?px(_9,s.borderTopWidth):0,r=s.borderRightStyle!=_8?px(_9,s.borderRightWidth):0,b=s.borderBottomStyle!=_8?px(_9,s.borderBottomWidth):0;
return {l:l,t:t,r:r,b:b,w:l+r,h:t+b};
};
_5.getPadBorderExtents=function getPadBorderExtents(_b,_c){
_b=_3.byId(_b);
var s=_c||_4.getComputedStyle(_b),p=_5.getPadExtents(_b,s),b=_5.getBorderExtents(_b,s);
return {l:p.l+b.l,t:p.t+b.t,r:p.r+b.r,b:p.b+b.b,w:p.w+b.w,h:p.h+b.h};
};
_5.getMarginExtents=function getMarginExtents(_d,_e){
_d=_3.byId(_d);
var s=_e||_4.getComputedStyle(_d),px=_4.toPixelValue,l=px(_d,s.marginLeft),t=px(_d,s.marginTop),r=px(_d,s.marginRight),b=px(_d,s.marginBottom);
return {l:l,t:t,r:r,b:b,w:l+r,h:t+b};
};
_5.getMarginBox=function getMarginBox(_f,_10){
_f=_3.byId(_f);
var s=_10||_4.getComputedStyle(_f),me=_5.getMarginExtents(_f,s),l=_f.offsetLeft-me.l,t=_f.offsetTop-me.t,p=_f.parentNode,px=_4.toPixelValue,pcs;
if((_1("ie")==8&&!_1("quirks"))){
if(p){
pcs=_4.getComputedStyle(p);
l-=pcs.borderLeftStyle!=_8?px(_f,pcs.borderLeftWidth):0;
t-=pcs.borderTopStyle!=_8?px(_f,pcs.borderTopWidth):0;
}
}
return {l:l,t:t,w:_f.offsetWidth+me.w,h:_f.offsetHeight+me.h};
};
_5.getContentBox=function getContentBox(_11,_12){
_11=_3.byId(_11);
var s=_12||_4.getComputedStyle(_11),w=_11.clientWidth,h,pe=_5.getPadExtents(_11,s),be=_5.getBorderExtents(_11,s),l=_11.offsetLeft+pe.l+be.l,t=_11.offsetTop+pe.t+be.t;
if(!w){
w=_11.offsetWidth-be.w;
h=_11.offsetHeight-be.h;
}else{
h=_11.clientHeight;
}
if((_1("ie")==8&&!_1("quirks"))){
var p=_11.parentNode,px=_4.toPixelValue,pcs;
if(p){
pcs=_4.getComputedStyle(p);
l-=pcs.borderLeftStyle!=_8?px(_11,pcs.borderLeftWidth):0;
t-=pcs.borderTopStyle!=_8?px(_11,pcs.borderTopWidth):0;
}
}
return {l:l,t:t,w:w-pe.w,h:h-pe.h};
};
function _13(_14,l,t,w,h,u){
u=u||"px";
var s=_14.style;
if(!isNaN(l)){
s.left=l+u;
}
if(!isNaN(t)){
s.top=t+u;
}
if(w>=0){
s.width=w+u;
}
if(h>=0){
s.height=h+u;
}
};
function _15(_16){
return _16.tagName.toLowerCase()=="button"||_16.tagName.toLowerCase()=="input"&&(_16.getAttribute("type")||"").toLowerCase()=="button";
};
function _17(_18){
return _5.boxModel=="border-box"||_18.tagName.toLowerCase()=="table"||_15(_18);
};
function _19(_1a){
var _1b={x:0,y:0,width:0,height:0,top:0,right:0,bottom:0,left:0},ret;
try{
ret=_1a.getBoundingClientRect();
}
catch(e){
return _1b;
}
if(typeof ret.left==="undefined"){
return _1b;
}
return ret;
};
_5.setContentSize=function setContentSize(_1c,box,_1d){
_1c=_3.byId(_1c);
var w=box.w,h=box.h;
if(_17(_1c)){
var pb=_5.getPadBorderExtents(_1c,_1d);
if(w>=0){
w+=pb.w;
}
if(h>=0){
h+=pb.h;
}
}
_13(_1c,NaN,NaN,w,h);
};
var _1e={l:0,t:0,w:0,h:0};
_5.setMarginBox=function setMarginBox(_1f,box,_20){
_1f=_3.byId(_1f);
var s=_20||_4.getComputedStyle(_1f),w=box.w,h=box.h,pb=_17(_1f)?_1e:_5.getPadBorderExtents(_1f,s),mb=_5.getMarginExtents(_1f,s);
if(_1("webkit")){
if(_15(_1f)){
var ns=_1f.style;
if(w>=0&&!ns.width){
ns.width="4px";
}
if(h>=0&&!ns.height){
ns.height="4px";
}
}
}
if(w>=0){
w=Math.max(w-pb.w-mb.w,0);
}
if(h>=0){
h=Math.max(h-pb.h-mb.h,0);
}
_13(_1f,box.l,box.t,w,h);
};
_5.isBodyLtr=function isBodyLtr(doc){
doc=doc||_2.doc;
return (_2.body(doc).dir||doc.documentElement.dir||"ltr").toLowerCase()=="ltr";
};
_5.docScroll=function docScroll(doc){
doc=doc||_2.doc;
var _21=doc.parentWindow||doc.defaultView;
return "pageXOffset" in _21?{x:_21.pageXOffset,y:_21.pageYOffset}:(_21=_1("quirks")?_2.body(doc):doc.documentElement)&&{x:_5.fixIeBiDiScrollLeft(_21.scrollLeft||0,doc),y:_21.scrollTop||0};
};
_5.getIeDocumentElementOffset=function(doc){
return {x:0,y:0};
};
_5.fixIeBiDiScrollLeft=function fixIeBiDiScrollLeft(_22,doc){
doc=doc||_2.doc;
var ie=_1("ie");
if(ie&&!_5.isBodyLtr(doc)){
var qk=_1("quirks"),de=qk?_2.body(doc):doc.documentElement,_23=_2.global;
if(ie==6&&!qk&&_23.frameElement&&de.scrollHeight>de.clientHeight){
_22+=de.clientLeft;
}
return (ie<8||qk)?(_22+de.clientWidth-de.scrollWidth):-_22;
}
return _22;
};
_5.position=function(_24,_25){
_24=_3.byId(_24);
var db=_2.body(_24.ownerDocument),ret=_19(_24);
ret={x:ret.left,y:ret.top,w:ret.right-ret.left,h:ret.bottom-ret.top};
if(_1("ie")<9){
ret.x-=(_1("quirks")?db.clientLeft+db.offsetLeft:0);
ret.y-=(_1("quirks")?db.clientTop+db.offsetTop:0);
}
if(_25){
var _26=_5.docScroll(_24.ownerDocument);
ret.x+=_26.x;
ret.y+=_26.y;
}
return ret;
};
_5.getMarginSize=function getMarginSize(_27,_28){
_27=_3.byId(_27);
var me=_5.getMarginExtents(_27,_28||_4.getComputedStyle(_27));
var _29=_19(_27);
return {w:(_29.right-_29.left)+me.w,h:(_29.bottom-_29.top)+me.h};
};
_5.normalizeEvent=function(_2a){
if(!("layerX" in _2a)){
_2a.layerX=_2a.offsetX;
_2a.layerY=_2a.offsetY;
}
if(!("pageX" in _2a)){
var se=_2a.target;
var doc=(se&&se.ownerDocument)||document;
var _2b=_1("quirks")?doc.body:doc.documentElement;
_2a.pageX=_2a.clientX+_5.fixIeBiDiScrollLeft(_2b.scrollLeft||0,doc);
_2a.pageY=_2a.clientY+(_2b.scrollTop||0);
}
};
return _5;
});
