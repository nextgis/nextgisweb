//>>built
define("dojox/charting/plot2d/Columns",["dojo/_base/lang","dojo/_base/array","dojo/_base/declare","dojo/has","./CartesianBase","./_PlotEvents","./common","dojox/lang/functional","dojox/lang/functional/reversed","dojox/lang/utils","dojox/gfx/fx"],function(_1,_2,_3,_4,_5,_6,dc,df,_7,du,fx){
var _8=_7.lambda("item.purgeGroup()");
var _9=function(){
return false;
};
return _3("dojox.charting.plot2d.Columns",[_5,_6],{defaultParams:{gap:0,animate:null,enableCache:false},optionalParams:{minBarSize:1,maxBarSize:1,stroke:{},outline:{},shadow:{},fill:{},filter:{},styleFunc:null,font:"",fontColor:""},constructor:function(_a,_b){
this.opt=_1.clone(_1.mixin(this.opt,this.defaultParams));
du.updateWithObject(this.opt,_b);
du.updateWithPattern(this.opt,_b,this.optionalParams);
this.animate=this.opt.animate;
this.renderingOptions={"shape-rendering":"crispEdges"};
},getSeriesStats:function(){
var _c=dc.collectSimpleStats(this.series,_1.hitch(this,"isNullValue"));
_c.hmin-=0.5;
_c.hmax+=0.5;
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
},render:function(dim,_11){
if(this.zoom&&!this.isDataDirty()){
return this.performZoom(dim,_11);
}
this.resetEvents();
this.dirty=this.isDirty();
var s;
if(this.dirty){
_2.forEach(this.series,_8);
this._eventSeries={};
this.cleanGroup();
s=this.getGroup();
df.forEachRev(this.series,function(_12){
_12.cleanGroup(s);
});
}
var t=this.chart.theme,ht=this._hScaler.scaler.getTransformerFromModel(this._hScaler),vt=this._vScaler.scaler.getTransformerFromModel(this._vScaler),_13=Math.max(this._vScaler.bounds.lower,this._vAxis?this._vAxis.naturalBaseline:0),_14=vt(_13),_15=this.events(),bar=this.getBarProperties();
var z=this.series.length;
_2.forEach(this.series,function(_16){
if(_16.hidden){
z--;
}
});
var _17=this.extractValues(this._hScaler);
_17=this.rearrangeValues(_17,vt,_14);
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
var _18=t.next("column",[this.opt,run]),_19=new Array(run.data.length);
if(run.hidden){
run.dyn.fill=_18.series.fill;
continue;
}
z--;
s=run.group;
var _1a=_2.some(run.data,function(_1b){
return typeof _1b=="number"||(_1b&&!_1b.hasOwnProperty("x"));
});
var min=_1a?Math.max(0,Math.floor(this._hScaler.bounds.from-1)):0;
var max=_1a?Math.min(run.data.length,Math.ceil(this._hScaler.bounds.to)):run.data.length;
for(var j=min;j<max;++j){
var _1c=run.data[j];
if(!this.isNullValue(_1c)){
var val=this.getValue(_1c,j,i,_1a),vv=vt(val.y),h=_17[i][j],_1d,_1e;
if(this.opt.styleFunc||typeof _1c!="number"){
var _1f=typeof _1c!="number"?[_1c]:[];
if(this.opt.styleFunc){
_1f.push(this.opt.styleFunc(_1c));
}
_1d=t.addMixin(_18,"column",_1f,true);
}else{
_1d=t.post(_18,"column");
}
if(bar.width>=1){
var _20={x:_11.l+ht(val.x+0.5)+bar.gap+bar.thickness*z,y:dim.height-_11.b-_14-Math.max(h,0),width:bar.width,height:Math.abs(h)};
if(_1d.series.shadow){
var _21=_1.clone(_20);
_21.x+=_1d.series.shadow.dx;
_21.y+=_1d.series.shadow.dy;
_1e=this.createRect(run,s,_21).setFill(_1d.series.shadow.color).setStroke(_1d.series.shadow);
if(this.animate){
this._animateColumn(_1e,dim.height-_11.b+_14,h);
}
}
var _22=this._plotFill(_1d.series.fill,dim,_11);
_22=this._shapeFill(_22,_20);
var _23=this.createRect(run,s,_20).setFill(_22).setStroke(_1d.series.stroke);
this.overrideShape(_23,{index:j,value:val});
if(_23.setFilter&&_1d.series.filter){
_23.setFilter(_1d.series.filter);
}
run.dyn.fill=_23.getFill();
run.dyn.stroke=_23.getStroke();
if(_15){
var o={element:"column",index:j,run:run,shape:_23,shadow:_1e,cx:val.x+0.5,cy:val.y,x:_1a?j:run.data[j].x,y:_1a?run.data[j]:run.data[j].y};
this._connectEvents(o);
_19[j]=o;
}
if(!isNaN(val.py)&&val.py>_13){
_20.height=h-vt(val.py);
}
this.createLabel(s,_1c,_20,_1d);
if(this.animate){
this._animateColumn(_23,dim.height-_11.b-_14,h);
}
}
}
}
this._eventSeries[run.name]=_19;
run.dirty=false;
}
this.dirty=false;
if(_4("dojo-bidi")){
this._checkOrientation(this.group,dim,_11);
}
return this;
},getValue:function(_24,j,_25,_26){
var y,x;
if(_26){
if(typeof _24=="number"){
y=_24;
}else{
y=_24.y;
}
x=j;
}else{
y=_24.y;
x=_24.x-1;
}
return {x:x,y:y};
},extractValues:function(_27){
var _28=[];
for(var i=this.series.length-1;i>=0;--i){
var run=this.series[i];
if(!this.dirty&&!run.dirty){
continue;
}
var _29=_2.some(run.data,function(_2a){
return typeof _2a=="number"||(_2a&&!_2a.hasOwnProperty("x"));
}),min=_29?Math.max(0,Math.floor(_27.bounds.from-1)):0,max=_29?Math.min(run.data.length,Math.ceil(_27.bounds.to)):run.data.length,_2b=_28[i]=[];
_2b.min=min;
_2b.max=max;
for(var j=min;j<max;++j){
var _2c=run.data[j];
_2b[j]=this.isNullValue(_2c)?0:(typeof _2c=="number"?_2c:_2c.y);
}
}
return _28;
},rearrangeValues:function(_2d,_2e,_2f){
for(var i=0,n=_2d.length;i<n;++i){
var _30=_2d[i];
if(_30){
for(var j=_30.min,k=_30.max;j<k;++j){
var _31=_30[j];
_30[j]=this.isNullValue(_31)?0:_2e(_31)-_2f;
}
}
}
return _2d;
},isNullValue:function(_32){
if(_32===null||typeof _32=="undefined"){
return true;
}
var h=this._hAxis?this._hAxis.isNullValue:_9,v=this._vAxis?this._vAxis.isNullValue:_9;
if(typeof _32=="number"){
return v(0.5)||h(_32);
}
return v(isNaN(_32.x)?0.5:_32.x+0.5)||_32.y===null||h(_32.y);
},getBarProperties:function(){
var f=dc.calculateBarSize(this._hScaler.bounds.scale,this.opt);
return {gap:f.gap,width:f.size,thickness:0};
},_animateColumn:function(_33,_34,_35){
if(_35===0){
_35=1;
}
fx.animateTransform(_1.delegate({shape:_33,duration:1200,transform:[{name:"translate",start:[0,_34-(_34/_35)],end:[0,0]},{name:"scale",start:[1,1/_35],end:[1,1]},{name:"original"}]},this.animate)).play();
}});
});
