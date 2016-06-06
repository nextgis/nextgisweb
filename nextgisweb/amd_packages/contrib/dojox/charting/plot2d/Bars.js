//>>built
define("dojox/charting/plot2d/Bars",["dojo/_base/lang","dojo/_base/array","dojo/_base/declare","dojo/has","./CartesianBase","./_PlotEvents","./common","dojox/gfx/fx","dojox/lang/utils","dojox/lang/functional","dojox/lang/functional/reversed"],function(_1,_2,_3,_4,_5,_6,dc,fx,du,df,_7){
var _8=_7.lambda("item.purgeGroup()");
var _9=function(){
return false;
};
return _3("dojox.charting.plot2d.Bars",[_5,_6],{defaultParams:{gap:0,animate:null,enableCache:false},optionalParams:{minBarSize:1,maxBarSize:1,stroke:{},outline:{},shadow:{},fill:{},filter:{},styleFunc:null,font:"",fontColor:""},constructor:function(_a,_b){
this.opt=_1.clone(_1.mixin(this.opt,this.defaultParams));
du.updateWithObject(this.opt,_b);
du.updateWithPattern(this.opt,_b,this.optionalParams);
this.animate=this.opt.animate;
this.renderingOptions={"shape-rendering":"crispEdges"};
},getSeriesStats:function(){
var _c=dc.collectSimpleStats(this.series,_1.hitch(this,"isNullValue")),t;
_c.hmin-=0.5;
_c.hmax+=0.5;
t=_c.hmin,_c.hmin=_c.vmin,_c.vmin=t;
t=_c.hmax,_c.hmax=_c.vmax,_c.vmax=t;
return _c;
},createRect:function(_d,_e,_f){
var _10;
if(this.opt.enableCache&&_d._rectFreePool.length>0){
_10=_d._rectFreePool.pop();
_10.setShape(_f);
_e.add(_10);
}else{
_10=_e.createRect(_f);
}
if(this.opt.enableCache){
_d._rectUsePool.push(_10);
}
return _10;
},createLabel:function(_11,_12,_13,_14){
if(this.opt.labels&&this.opt.labelStyle=="outside"){
var y=_13.y+_13.height/2;
var x=_13.x+_13.width+this.opt.labelOffset;
this.renderLabel(_11,x,y,this._getLabel(isNaN(_12.y)?_12:_12.y),_14,"start");
}else{
this.inherited(arguments);
}
},render:function(dim,_15){
if(this.zoom&&!this.isDataDirty()){
return this.performZoom(dim,_15);
}
this.dirty=this.isDirty();
this.resetEvents();
var s;
if(this.dirty){
_2.forEach(this.series,_8);
this._eventSeries={};
this.cleanGroup();
s=this.getGroup();
df.forEachRev(this.series,function(_16){
_16.cleanGroup(s);
});
}
var t=this.chart.theme,ht=this._hScaler.scaler.getTransformerFromModel(this._hScaler),vt=this._vScaler.scaler.getTransformerFromModel(this._vScaler),_17=Math.max(this._hScaler.bounds.lower,this._hAxis?this._hAxis.naturalBaseline:0),_18=ht(_17),_19=this.events();
var bar=this.getBarProperties();
var _1a=this.series.length;
_2.forEach(this.series,function(_1b){
if(_1b.hidden){
_1a--;
}
});
var z=_1a;
var _1c=this.extractValues(this._vScaler);
_1c=this.rearrangeValues(_1c,ht,_18);
for(var i=0;i<this.series.length;i++){
var run=this.series[i];
if(!this.dirty&&!run.dirty){
t.skip();
this._reconnectEvents(run.name);
continue;
}
run.cleanGroup();
if(this.opt.enableCache){
run._rectFreePool=(run._rectFreePool?run._rectFreePool:[]).concat(run._rectUsePool?run._rectUsePool:[]);
run._rectUsePool=[];
}
var _1d=t.next("bar",[this.opt,run]);
if(run.hidden){
run.dyn.fill=_1d.series.fill;
run.dyn.stroke=_1d.series.stroke;
continue;
}
z--;
var _1e=new Array(run.data.length);
s=run.group;
var _1f=_2.some(run.data,function(_20){
return typeof _20=="number"||(_20&&!_20.hasOwnProperty("x"));
});
var min=_1f?Math.max(0,Math.floor(this._vScaler.bounds.from-1)):0;
var max=_1f?Math.min(run.data.length,Math.ceil(this._vScaler.bounds.to)):run.data.length;
for(var j=min;j<max;++j){
var _21=run.data[j];
if(!this.isNullValue(_21)){
var val=this.getValue(_21,j,i,_1f),w=_1c[i][j],_22,_23;
if(this.opt.styleFunc||typeof _21!="number"){
var _24=typeof _21!="number"?[_21]:[];
if(this.opt.styleFunc){
_24.push(this.opt.styleFunc(_21));
}
_22=t.addMixin(_1d,"bar",_24,true);
}else{
_22=t.post(_1d,"bar");
}
if(w&&bar.height>=1){
var _25={x:_15.l+_18+Math.min(w,0),y:dim.height-_15.b-vt(val.x+1.5)+bar.gap+bar.thickness*(_1a-z-1),width:Math.abs(w),height:bar.height};
if(_22.series.shadow){
var _26=_1.clone(_25);
_26.x+=_22.series.shadow.dx;
_26.y+=_22.series.shadow.dy;
_23=this.createRect(run,s,_26).setFill(_22.series.shadow.color).setStroke(_22.series.shadow);
if(this.animate){
this._animateBar(_23,_15.l+_18,-w);
}
}
var _27=this._plotFill(_22.series.fill,dim,_15);
_27=this._shapeFill(_27,_25);
var _28=this.createRect(run,s,_25).setFill(_27).setStroke(_22.series.stroke);
if(_28.setFilter&&_22.series.filter){
_28.setFilter(_22.series.filter);
}
run.dyn.fill=_28.getFill();
run.dyn.stroke=_28.getStroke();
if(_19){
var o={element:"bar",index:j,run:run,shape:_28,shadow:_23,cx:val.y,cy:val.x+1.5,x:_1f?j:run.data[j].x,y:_1f?run.data[j]:run.data[j].y};
this._connectEvents(o);
_1e[j]=o;
}
if(!isNaN(val.py)&&val.py>_17){
_25.x+=ht(val.py);
_25.width-=ht(val.py);
}
this.createLabel(s,_21,_25,_22);
if(this.animate){
this._animateBar(_28,_15.l+_18,-Math.abs(w));
}
}
}
}
this._eventSeries[run.name]=_1e;
run.dirty=false;
}
this.dirty=false;
if(_4("dojo-bidi")){
this._checkOrientation(this.group,dim,_15);
}
return this;
},getValue:function(_29,j,_2a,_2b){
var y,x;
if(_2b){
if(typeof _29=="number"){
y=_29;
}else{
y=_29.y;
}
x=j;
}else{
y=_29.y;
x=_29.x-1;
}
return {y:y,x:x};
},extractValues:function(_2c){
var _2d=[];
for(var i=this.series.length-1;i>=0;--i){
var run=this.series[i];
if(!this.dirty&&!run.dirty){
continue;
}
var _2e=_2.some(run.data,function(_2f){
return typeof _2f=="number"||(_2f&&!_2f.hasOwnProperty("x"));
}),min=_2e?Math.max(0,Math.floor(_2c.bounds.from-1)):0,max=_2e?Math.min(run.data.length,Math.ceil(_2c.bounds.to)):run.data.length,_30=_2d[i]=[];
_30.min=min;
_30.max=max;
for(var j=min;j<max;++j){
var _31=run.data[j];
_30[j]=this.isNullValue(_31)?0:(typeof _31=="number"?_31:_31.y);
}
}
return _2d;
},rearrangeValues:function(_32,_33,_34){
for(var i=0,n=_32.length;i<n;++i){
var _35=_32[i];
if(_35){
for(var j=_35.min,k=_35.max;j<k;++j){
var _36=_35[j];
_35[j]=this.isNullValue(_36)?0:_33(_36)-_34;
}
}
}
return _32;
},isNullValue:function(_37){
if(_37===null||typeof _37=="undefined"){
return true;
}
var h=this._hAxis?this._hAxis.isNullValue:_9,v=this._vAxis?this._vAxis.isNullValue:_9;
if(typeof _37=="number"){
return v(0.5)||h(_37);
}
return v(isNaN(_37.x)?0.5:_37.x+0.5)||_37.y===null||h(_37.y);
},getBarProperties:function(){
var f=dc.calculateBarSize(this._vScaler.bounds.scale,this.opt);
return {gap:f.gap,height:f.size,thickness:0};
},_animateBar:function(_38,_39,_3a){
if(_3a==0){
_3a=1;
}
fx.animateTransform(_1.delegate({shape:_38,duration:1200,transform:[{name:"translate",start:[_39-(_39/_3a),0],end:[0,0]},{name:"scale",start:[1/_3a,1],end:[1,1]},{name:"original"}]},this.animate)).play();
}});
});
