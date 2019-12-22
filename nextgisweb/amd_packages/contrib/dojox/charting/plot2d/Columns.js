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
var z=0;
var _16=this.extractValues(this._hScaler);
_16=this.rearrangeValues(_16,vt,_14);
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
var _17=t.next("column",[this.opt,run]),_18=new Array(run.data.length);
if(run.hidden){
run.dyn.fill=_17.series.fill;
continue;
}
s=run.group;
var _19=_2.some(run.data,function(_1a){
return typeof _1a=="number"||(_1a&&!_1a.hasOwnProperty("x"));
});
var min=_19?Math.max(0,Math.floor(this._hScaler.bounds.from-1)):0;
var max=_19?Math.min(run.data.length,Math.ceil(this._hScaler.bounds.to)):run.data.length;
for(var j=min;j<max;++j){
var _1b=run.data[j];
if(!this.isNullValue(_1b)){
var val=this.getValue(_1b,j,i,_19),vv=vt(val.y),h=_16[i][j],_1c,_1d;
if(this.opt.styleFunc||typeof _1b!="number"){
var _1e=typeof _1b!="number"?[_1b]:[];
if(this.opt.styleFunc){
_1e.push(this.opt.styleFunc(_1b));
}
_1c=t.addMixin(_17,"column",_1e,true);
}else{
_1c=t.post(_17,"column");
}
if(bar.width>=1){
var _1f={x:_11.l+ht(val.x+0.5)+bar.gap+bar.thickness*z,y:dim.height-_11.b-_14-Math.max(h,0),width:bar.width,height:Math.abs(h)};
if(_1c.series.shadow){
var _20=_1.clone(_1f);
_20.x+=_1c.series.shadow.dx;
_20.y+=_1c.series.shadow.dy;
_1d=this.createRect(run,s,_20).setFill(_1c.series.shadow.color).setStroke(_1c.series.shadow);
if(this.animate){
this._animateColumn(_1d,dim.height-_11.b+_14,h);
}
}
var _21=this._plotFill(_1c.series.fill,dim,_11);
_21=this._shapeFill(_21,_1f);
var _22=this.createRect(run,s,_1f).setFill(_21).setStroke(_1c.series.stroke);
this.overrideShape(_22,{index:j,value:val});
if(_22.setFilter&&_1c.series.filter){
_22.setFilter(_1c.series.filter);
}
run.dyn.fill=_22.getFill();
run.dyn.stroke=_22.getStroke();
if(_15){
var o={element:"column",index:j,run:run,shape:_22,shadow:_1d,cx:val.x+0.5,cy:val.y,x:_19?j:run.data[j].x,y:_19?run.data[j]:run.data[j].y};
this._connectEvents(o);
_18[j]=o;
}
if(!isNaN(val.py)&&val.py>_13){
_1f.height=h-vt(val.py);
}
this.createLabel(s,_1b,_1f,_1c);
if(this.animate){
this._animateColumn(_22,dim.height-_11.b-_14,h);
}
}
}
}
this._eventSeries[run.name]=_18;
run.dirty=false;
z++;
}
this.dirty=false;
if(_4("dojo-bidi")){
this._checkOrientation(this.group,dim,_11);
}
return this;
},getValue:function(_23,j,_24,_25){
var y,x;
if(_25){
if(typeof _23=="number"){
y=_23;
}else{
y=_23.y;
}
x=j;
}else{
y=_23.y;
x=_23.x-1;
}
return {x:x,y:y};
},extractValues:function(_26){
var _27=[];
for(var i=this.series.length-1;i>=0;--i){
var run=this.series[i];
if(!this.dirty&&!run.dirty){
continue;
}
var _28=_2.some(run.data,function(_29){
return typeof _29=="number"||(_29&&!_29.hasOwnProperty("x"));
}),min=_28?Math.max(0,Math.floor(_26.bounds.from-1)):0,max=_28?Math.min(run.data.length,Math.ceil(_26.bounds.to)):run.data.length,_2a=_27[i]=[];
_2a.min=min;
_2a.max=max;
for(var j=min;j<max;++j){
var _2b=run.data[j];
_2a[j]=this.isNullValue(_2b)?0:(typeof _2b=="number"?_2b:_2b.y);
}
}
return _27;
},rearrangeValues:function(_2c,_2d,_2e){
for(var i=0,n=_2c.length;i<n;++i){
var _2f=_2c[i];
if(_2f){
for(var j=_2f.min,k=_2f.max;j<k;++j){
var _30=_2f[j];
_2f[j]=this.isNullValue(_30)?0:_2d(_30)-_2e;
}
}
}
return _2c;
},isNullValue:function(_31){
if(_31===null||typeof _31=="undefined"){
return true;
}
var h=this._hAxis?this._hAxis.isNullValue:_9,v=this._vAxis?this._vAxis.isNullValue:_9;
if(typeof _31=="number"){
return v(0.5)||h(_31);
}
return v(isNaN(_31.x)?0.5:_31.x+0.5)||_31.y===null||h(_31.y);
},getBarProperties:function(){
var f=dc.calculateBarSize(this._hScaler.bounds.scale,this.opt);
return {gap:f.gap,width:f.size,thickness:0};
},_animateColumn:function(_32,_33,_34){
if(_34===0){
_34=1;
}
fx.animateTransform(_1.delegate({shape:_32,duration:1200,transform:[{name:"translate",start:[0,_33-(_33/_34)],end:[0,0]},{name:"scale",start:[1,1/_34],end:[1,1]},{name:"original"}]},this.animate)).play();
}});
});
