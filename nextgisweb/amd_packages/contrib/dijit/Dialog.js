//>>built
require({cache:{"url:dijit/templates/Dialog.html":"<div class=\"dijitDialog\" role=\"dialog\" aria-labelledby=\"${id}_title\">\n\t<div data-dojo-attach-point=\"titleBar\" class=\"dijitDialogTitleBar\">\n\t\t<span data-dojo-attach-point=\"titleNode\" class=\"dijitDialogTitle\" id=\"${id}_title\"\n\t\t\t\trole=\"heading\" level=\"1\"></span>\n\t\t<span data-dojo-attach-point=\"closeButtonNode\" class=\"dijitDialogCloseIcon\" data-dojo-attach-event=\"ondijitclick: onCancel\" title=\"${buttonCancel}\" role=\"button\" tabindex=\"-1\">\n\t\t\t<span data-dojo-attach-point=\"closeText\" class=\"closeText\" title=\"${buttonCancel}\">x</span>\n\t\t</span>\n\t</div>\n\t<div data-dojo-attach-point=\"containerNode\" class=\"dijitDialogPaneContent\"></div>\n\t${!actionBarTemplate}\n</div>\n\n"}});
define("dijit/Dialog",["require","dojo/_base/array","dojo/aspect","dojo/_base/declare","dojo/Deferred","dojo/dom","dojo/dom-class","dojo/dom-geometry","dojo/dom-style","dojo/_base/fx","dojo/i18n","dojo/keys","dojo/_base/lang","dojo/on","dojo/ready","dojo/sniff","dojo/window","dojo/dnd/Moveable","dojo/dnd/TimedMoveable","./focus","./_base/manager","./_Widget","./_TemplatedMixin","./_CssStateMixin","./form/_FormMixin","./_DialogMixin","./DialogUnderlay","./layout/ContentPane","./layout/utils","dojo/text!./templates/Dialog.html","./a11yclick","dojo/i18n!./nls/common"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,fx,_a,_b,_c,on,_d,_e,_f,_10,_11,_12,_13,_14,_15,_16,_17,_18,_19,_1a,_1b,_1c){
var _1d=new _5();
_1d.resolve(true);
function nop(){
};
var _1e=_4("dijit._DialogBase"+(_e("dojo-bidi")?"_NoBidi":""),[_15,_17,_18,_16],{templateString:_1c,baseClass:"dijitDialog",cssStateNodes:{closeButtonNode:"dijitDialogCloseIcon"},_setTitleAttr:{node:"titleNode",type:"innerHTML"},open:false,duration:_13.defaultDuration,refocus:true,autofocus:true,_firstFocusItem:null,_lastFocusItem:null,draggable:true,_setDraggableAttr:function(val){
this._set("draggable",val);
},maxRatio:0.9,closable:true,_setClosableAttr:function(val){
this.closeButtonNode.style.display=val?"":"none";
this._set("closable",val);
},postMixInProperties:function(){
var _1f=_a.getLocalization("dijit","common");
_c.mixin(this,_1f);
this.inherited(arguments);
},postCreate:function(){
_9.set(this.domNode,{display:"none",position:"absolute"});
this.ownerDocumentBody.appendChild(this.domNode);
this.inherited(arguments);
_3.after(this,"onExecute",_c.hitch(this,"hide"),true);
_3.after(this,"onCancel",_c.hitch(this,"hide"),true);
this._modalconnects=[];
},onLoad:function(){
this.resize();
this._position();
if(this.autofocus&&_20.isTop(this)){
this._getFocusItems();
_12.focus(this._firstFocusItem);
}
this.inherited(arguments);
},focus:function(){
this._getFocusItems();
_12.focus(this._firstFocusItem);
},_endDrag:function(){
var _21=_8.position(this.domNode),_22=_f.getBox(this.ownerDocument);
_21.y=Math.min(Math.max(_21.y,0),(_22.h-_21.h));
_21.x=Math.min(Math.max(_21.x,0),(_22.w-_21.w));
this._relativePosition=_21;
this._position();
},_setup:function(){
var _23=this.domNode;
if(this.titleBar&&this.draggable){
this._moveable=new ((_e("ie")==6)?_11:_10)(_23,{handle:this.titleBar});
_3.after(this._moveable,"onMoveStop",_c.hitch(this,"_endDrag"),true);
}else{
_7.add(_23,"dijitDialogFixed");
}
this.underlayAttrs={dialogId:this.id,"class":_2.map(this["class"].split(/\s/),function(s){
return s+"_underlay";
}).join(" "),_onKeyDown:_c.hitch(this,"_onKey"),ownerDocument:this.ownerDocument};
},_size:function(){
this.resize();
},_position:function(){
if(!_7.contains(this.ownerDocumentBody,"dojoMove")){
var _24=this.domNode,_25=_f.getBox(this.ownerDocument),p=this._relativePosition,bb=_8.position(_24),l=Math.floor(_25.l+(p?Math.min(p.x,_25.w-bb.w):(_25.w-bb.w)/2)),t=Math.floor(_25.t+(p?Math.min(p.y,_25.h-bb.h):(_25.h-bb.h)/2));
_9.set(_24,{left:l+"px",top:t+"px"});
}
},_onKey:function(evt){
if(evt.keyCode==_b.TAB){
this._getFocusItems();
var _26=evt.target;
if(this._firstFocusItem==this._lastFocusItem){
evt.stopPropagation();
evt.preventDefault();
}else{
if(_26==this._firstFocusItem&&evt.shiftKey){
_12.focus(this._lastFocusItem);
evt.stopPropagation();
evt.preventDefault();
}else{
if(_26==this._lastFocusItem&&!evt.shiftKey){
_12.focus(this._firstFocusItem);
evt.stopPropagation();
evt.preventDefault();
}
}
}
}else{
if(this.closable&&evt.keyCode==_b.ESCAPE){
this.onCancel();
evt.stopPropagation();
evt.preventDefault();
}
}
},show:function(){
if(this.open){
return _1d.promise;
}
if(!this._started){
this.startup();
}
if(!this._alreadyInitialized){
this._setup();
this._alreadyInitialized=true;
}
if(this._fadeOutDeferred){
this._fadeOutDeferred.cancel();
_20.hide(this);
}
var win=_f.get(this.ownerDocument);
this._modalconnects.push(on(win,"scroll",_c.hitch(this,"resize",null)));
this._modalconnects.push(on(this.domNode,"keydown",_c.hitch(this,"_onKey")));
_9.set(this.domNode,{opacity:0,display:""});
this._set("open",true);
this._onShow();
this.resize();
this._position();
var _27;
this._fadeInDeferred=new _5(_c.hitch(this,function(){
_27.stop();
delete this._fadeInDeferred;
}));
this._fadeInDeferred.then(undefined,nop);
var _28=this._fadeInDeferred.promise;
_27=fx.fadeIn({node:this.domNode,duration:this.duration,beforeBegin:_c.hitch(this,function(){
_20.show(this,this.underlayAttrs);
}),onEnd:_c.hitch(this,function(){
if(this.autofocus&&_20.isTop(this)){
this._getFocusItems();
_12.focus(this._firstFocusItem);
}
this._fadeInDeferred.resolve(true);
delete this._fadeInDeferred;
})}).play();
return _28;
},hide:function(){
if(!this._alreadyInitialized||!this.open){
return _1d.promise;
}
if(this._fadeInDeferred){
this._fadeInDeferred.cancel();
}
var _29;
this._fadeOutDeferred=new _5(_c.hitch(this,function(){
_29.stop();
delete this._fadeOutDeferred;
}));
this._fadeOutDeferred.then(undefined,nop);
this._fadeOutDeferred.then(_c.hitch(this,"onHide"));
var _2a=this._fadeOutDeferred.promise;
_29=fx.fadeOut({node:this.domNode,duration:this.duration,onEnd:_c.hitch(this,function(){
this.domNode.style.display="none";
_20.hide(this);
this._fadeOutDeferred.resolve(true);
delete this._fadeOutDeferred;
})}).play();
if(this._scrollConnected){
this._scrollConnected=false;
}
var h;
while(h=this._modalconnects.pop()){
h.remove();
}
if(this._relativePosition){
delete this._relativePosition;
}
this._set("open",false);
return _2a;
},resize:function(dim){
if(this.domNode.style.display!="none"){
this._checkIfSingleChild();
if(!dim){
if(this._shrunk){
if(this._singleChild){
if(typeof this._singleChildOriginalStyle!="undefined"){
this._singleChild.domNode.style.cssText=this._singleChildOriginalStyle;
delete this._singleChildOriginalStyle;
}
}
_2.forEach([this.domNode,this.containerNode,this.titleBar,this.actionBarNode],function(_2b){
if(_2b){
_9.set(_2b,{position:"static",width:"auto",height:"auto"});
}
});
this.domNode.style.position="absolute";
}
var _2c=_f.getBox(this.ownerDocument);
_2c.w*=this.maxRatio;
_2c.h*=this.maxRatio;
var bb=_8.position(this.domNode);
if(bb.w>=_2c.w||bb.h>=_2c.h){
dim={w:Math.min(bb.w,_2c.w),h:Math.min(bb.h,_2c.h)};
this._shrunk=true;
}else{
this._shrunk=false;
}
}
if(dim){
_8.setMarginBox(this.domNode,dim);
var _2d=[];
if(this.titleBar){
_2d.push({domNode:this.titleBar,region:"top"});
}
if(this.actionBarNode){
_2d.push({domNode:this.actionBarNode,region:"bottom"});
}
var _2e={domNode:this.containerNode,region:"center"};
_2d.push(_2e);
var _2f=_1b.marginBox2contentBox(this.domNode,dim);
_1b.layoutChildren(this.domNode,_2f,_2d);
if(this._singleChild){
var cb=_1b.marginBox2contentBox(this.containerNode,_2e);
this._singleChild.resize({w:cb.w,h:cb.h});
}else{
this.containerNode.style.overflow="auto";
this._layoutChildren();
}
}else{
this._layoutChildren();
}
if(!_e("touch")&&!dim){
this._position();
}
}
},_layoutChildren:function(){
_2.forEach(this.getChildren(),function(_30){
if(_30.resize){
_30.resize();
}
});
},destroy:function(){
if(this._fadeInDeferred){
this._fadeInDeferred.cancel();
}
if(this._fadeOutDeferred){
this._fadeOutDeferred.cancel();
}
if(this._moveable){
this._moveable.destroy();
}
var h;
while(h=this._modalconnects.pop()){
h.remove();
}
_20.hide(this);
this.inherited(arguments);
}});
if(_e("dojo-bidi")){
_1e=_4("dijit._DialogBase",_1e,{_setTitleAttr:function(_31){
this._set("title",_31);
this.titleNode.innerHTML=_31;
this.applyTextDir(this.titleNode);
},_setTextDirAttr:function(_32){
if(this._created&&this.textDir!=_32){
this._set("textDir",_32);
this.set("title",this.title);
}
}});
}
var _33=_4("dijit.Dialog",[_1a,_1e],{});
_33._DialogBase=_1e;
var _20=_33._DialogLevelManager={_beginZIndex:950,show:function(_34,_35){
ds[ds.length-1].focus=_12.curNode;
var _36=ds[ds.length-1].dialog?ds[ds.length-1].zIndex+2:_33._DialogLevelManager._beginZIndex;
_9.set(_34.domNode,"zIndex",_36);
_19.show(_35,_36-1);
ds.push({dialog:_34,underlayAttrs:_35,zIndex:_36});
},hide:function(_37){
if(ds[ds.length-1].dialog==_37){
ds.pop();
var pd=ds[ds.length-1];
if(ds.length==1){
_19.hide();
}else{
_19.show(pd.underlayAttrs,pd.zIndex-1);
}
if(_37.refocus){
var _38=pd.focus;
if(pd.dialog&&(!_38||!_6.isDescendant(_38,pd.dialog.domNode))){
pd.dialog._getFocusItems();
_38=pd.dialog._firstFocusItem;
}
if(_38){
try{
_38.focus();
}
catch(e){
}
}
}
}else{
var idx=_2.indexOf(_2.map(ds,function(_39){
return _39.dialog;
}),_37);
if(idx!=-1){
ds.splice(idx,1);
}
}
},isTop:function(_3a){
return ds[ds.length-1].dialog==_3a;
}};
var ds=_33._dialogStack=[{dialog:null,focus:null,underlayAttrs:null}];
_12.watch("curNode",function(_3b,_3c,_3d){
var _3e=ds[ds.length-1].dialog;
if(_3d&&_3e&&!_3e._fadeOutDeferred&&_3d.ownerDocument==_3e.ownerDocument){
do{
if(_3d==_3e.domNode||_7.contains(_3d,"dijitPopup")){
return;
}
}while(_3d=_3d.parentNode);
_3e.focus();
}
});
if(_e("dijit-legacy-requires")){
_d(0,function(){
var _3f=["dijit/TooltipDialog"];
_1(_3f);
});
}
return _33;
});
