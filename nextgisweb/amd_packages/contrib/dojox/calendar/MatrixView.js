//>>built
require({cache:{"url:dojox/calendar/templates/MatrixView.html":"<div data-dojo-attach-events=\"keydown:_onKeyDown\">\n\t<div  class=\"dojoxCalendarYearColumnHeader\" data-dojo-attach-point=\"yearColumnHeader\">\n\t\t<table><tr><td><span data-dojo-attach-point=\"yearColumnHeaderContent\"></span></td></tr></table>\t\t\n\t</div>\t\n\t<div data-dojo-attach-point=\"columnHeader\" class=\"dojoxCalendarColumnHeader\">\n\t\t<table data-dojo-attach-point=\"columnHeaderTable\" class=\"dojoxCalendarColumnHeaderTable\" cellpadding=\"0\" cellspacing=\"0\"></table>\n\t</div>\t\t\n\t<div dojoAttachPoint=\"rowHeader\" class=\"dojoxCalendarRowHeader\">\n\t\t<table data-dojo-attach-point=\"rowHeaderTable\" class=\"dojoxCalendarRowHeaderTable\" cellpadding=\"0\" cellspacing=\"0\"></table>\n\t</div>\t\n\t<div dojoAttachPoint=\"grid\" class=\"dojoxCalendarGrid\">\n\t\t<table data-dojo-attach-point=\"gridTable\" class=\"dojoxCalendarGridTable\" cellpadding=\"0\" cellspacing=\"0\"></table>\n\t</div>\t\n\t<div data-dojo-attach-point=\"itemContainer\" class=\"dojoxCalendarContainer\" data-dojo-attach-event=\"mousedown:_onGridMouseDown,mouseup:_onGridMouseUp,ondblclick:_onGridDoubleClick,touchstart:_onGridTouchStart,touchmove:_onGridTouchMove,touchend:_onGridTouchEnd\">\n\t\t<table data-dojo-attach-point=\"itemContainerTable\" class=\"dojoxCalendarContainerTable\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%\"></table>\n\t</div>\t\n</div>\n"}});
define("dojox/calendar/MatrixView",["dojo/_base/declare","dojo/_base/array","dojo/_base/event","dojo/_base/lang","dojo/_base/sniff","dojo/_base/fx","dojo/_base/html","dojo/on","dojo/dom","dojo/dom-class","dojo/dom-style","dojo/dom-geometry","dojo/dom-construct","dojo/query","dojox/html/metrics","dojo/i18n","./ViewBase","dojo/text!./templates/MatrixView.html","dijit/_TemplatedMixin"],function(_1,_2,_3,_4,_5,fx,_6,on,_7,_8,_9,_a,_b,_c,_d,_e,_f,_10,_11){
return _1("dojox.calendar.MatrixView",[_f,_11],{templateString:_10,baseClass:"dojoxCalendarMatrixView",_setTabIndexAttr:"domNode",viewKind:"matrix",renderData:null,startDate:null,refStartTime:null,refEndTime:null,columnCount:7,rowCount:5,horizontalRenderer:null,labelRenderer:null,expandRenderer:null,horizontalDecorationRenderer:null,percentOverlap:0,verticalGap:2,horizontalRendererHeight:17,labelRendererHeight:14,expandRendererHeight:15,cellPaddingTop:16,expandDuration:300,expandEasing:null,layoutDuringResize:false,roundToDay:true,showCellLabel:true,scrollable:false,resizeCursor:"e-resize",constructor:function(){
this.invalidatingProperties=["columnCount","rowCount","startDate","horizontalRenderer","horizontalDecaorationRenderer","labelRenderer","expandRenderer","rowHeaderDatePattern","columnHeaderLabelLength","cellHeaderShortPattern","cellHeaderLongPattern","percentOverlap","verticalGap","horizontalRendererHeight","labelRendererHeight","expandRendererHeight","cellPaddingTop","roundToDay","itemToRendererKindFunc","layoutPriorityFunction","formatItemTimeFunc","textDir","items"];
this._ddRendererList=[];
this._ddRendererPool=[];
this._rowHeaderHandles=[];
},destroy:function(_12){
this._cleanupRowHeader();
this.inherited(arguments);
},postCreate:function(){
this.inherited(arguments);
this._initialized=true;
if(!this.invalidRendering){
this.refreshRendering();
}
},_createRenderData:function(){
var rd={};
rd.dateLocaleModule=this.dateLocaleModule;
rd.dateClassObj=this.dateClassObj;
rd.dateModule=this.dateModule;
rd.dates=[];
rd.columnCount=this.get("columnCount");
rd.rowCount=this.get("rowCount");
rd.sheetHeight=this.itemContainer.offsetHeight;
this._computeRowsHeight(rd);
var d=this.get("startDate");
if(d==null){
d=new rd.dateClassObj();
}
d=this.floorToDay(d,false,rd);
this.startDate=d;
for(var row=0;row<rd.rowCount;row++){
rd.dates.push([]);
for(var col=0;col<rd.columnCount;col++){
rd.dates[row].push(d);
d=this.addAndFloor(d,"day",1);
}
}
rd.startTime=this.newDate(rd.dates[0][0],rd);
rd.endTime=this.newDate(rd.dates[rd.rowCount-1][rd.columnCount-1],rd);
rd.endTime=rd.dateModule.add(rd.endTime,"day",1);
rd.endTime=this.floorToDay(rd.endTime,true);
if(this.displayedItemsInvalidated&&!this._isEditing){
this.displayedItemsInvalidated=false;
this._computeVisibleItems(rd);
}else{
if(this.renderData){
rd.items=this.renderData.items;
}
}
if(this.displayedDecorationItemsInvalidated){
rd.decorationItems=this.decorationStoreManager._computeVisibleItems(rd);
}else{
if(this.renderData){
rd.decorationItems=this.renderData.decorationItems;
}
}
rd.rtl=!this.isLeftToRight();
return rd;
},_validateProperties:function(){
this.inherited(arguments);
if(this.columnCount<1||isNaN(this.columnCount)){
this.columnCount=1;
}
if(this.rowCount<1||isNaN(this.rowCount)){
this.rowCount=1;
}
if(isNaN(this.percentOverlap)||this.percentOverlap<0||this.percentOverlap>100){
this.percentOverlap=0;
}
if(isNaN(this.verticalGap)||this.verticalGap<0){
this.verticalGap=2;
}
if(isNaN(this.horizontalRendererHeight)||this.horizontalRendererHeight<1){
this.horizontalRendererHeight=17;
}
if(isNaN(this.labelRendererHeight)||this.labelRendererHeight<1){
this.labelRendererHeight=14;
}
if(isNaN(this.expandRendererHeight)||this.expandRendererHeight<1){
this.expandRendererHeight=15;
}
},_setStartDateAttr:function(_13){
this.displayedItemsInvalidated=true;
this._set("startDate",_13);
},_setColumnCountAttr:function(_14){
this.displayedItemsInvalidated=true;
this._set("columnCount",_14);
},_setRowCountAttr:function(_15){
this.displayedItemsInvalidated=true;
this._set("rowCount",_15);
},__fixEvt:function(e){
e.sheet="primary";
e.source=this;
return e;
},_formatRowHeaderLabel:function(d){
if(this.rowHeaderDatePattern){
return this.renderData.dateLocaleModule.format(d,{selector:"date",datePattern:this.rowHeaderDatePattern});
}else{
return this.getWeekNumberLabel(d);
}
},_formatColumnHeaderLabel:function(d){
return this.renderData.dateLocaleModule.getNames("days",this.columnHeaderLabelLength?this.columnHeaderLabelLength:"wide","standAlone")[d.getDay()];
},cellHeaderShortPattern:null,cellHeaderLongPattern:null,_formatGridCellLabel:function(d,row,col){
var _16=row==0&&col==0||d.getDate()==1;
var _17,rb;
if(_16){
if(this.cellHeaderLongPattern){
_17=this.cellHeaderLongPattern;
}else{
rb=_e.getLocalization("dojo.cldr",this._calendar);
_17=rb["dateFormatItem-MMMd"];
}
}else{
if(this.cellHeaderShortPattern){
_17=this.cellHeaderShortPattern;
}else{
rb=_e.getLocalization("dojo.cldr",this._calendar);
_17=rb["dateFormatItem-d"];
}
}
return this.renderData.dateLocaleModule.format(d,{selector:"date",datePattern:_17});
},refreshRendering:function(){
this.inherited(arguments);
if(!this.domNode){
return;
}
this._validateProperties();
var _18=this.renderData;
var rd=this.renderData=this._createRenderData();
this._createRendering(rd,_18);
this._layoutDecorationRenderers(rd);
this._layoutRenderers(rd);
},_createRendering:function(_19,_1a){
if(_19.rowHeight<=0){
_19.columnCount=1;
_19.rowCount=1;
_19.invalidRowHeight=true;
return;
}
if(_1a){
if(this.itemContainerTable){
var _1b=_c(".dojoxCalendarItemContainerRow",this.itemContainerTable);
_1a.rowCount=_1b.length;
}
}
this._buildColumnHeader(_19,_1a);
this._buildRowHeader(_19,_1a);
this._buildGrid(_19,_1a);
this._buildItemContainer(_19,_1a);
if(this.buttonContainer&&this.owner!=null&&this.owner.currentView==this){
_9.set(this.buttonContainer,{"right":0,"left":0});
}
},_buildColumnHeader:function(_1c,_1d){
var _1e=this.columnHeaderTable;
if(!_1e){
return;
}
var _1f=_1c.columnCount-(_1d?_1d.columnCount:0);
if(_5("ie")==8){
if(this._colTableSave==null){
this._colTableSave=_4.clone(_1e);
}else{
if(_1f<0){
this.columnHeader.removeChild(_1e);
_b.destroy(_1e);
_1e=_4.clone(this._colTableSave);
this.columnHeaderTable=_1e;
this.columnHeader.appendChild(_1e);
_1f=_1c.columnCount;
}
}
}
var _20=_c("tbody",_1e);
var trs=_c("tr",_1e);
var _21,tr,td;
if(_20.length==1){
_21=_20[0];
}else{
_21=_6.create("tbody",null,_1e);
}
if(trs.length==1){
tr=trs[0];
}else{
tr=_b.create("tr",null,_21);
}
if(_1f>0){
for(var i=0;i<_1f;i++){
td=_b.create("td",null,tr);
}
}else{
_1f=-_1f;
for(var i=0;i<_1f;i++){
tr.removeChild(tr.lastChild);
}
}
_c("td",_1e).forEach(function(td,i){
td.className="";
var d=_1c.dates[0][i];
this._setText(td,this._formatColumnHeaderLabel(d));
if(i==0){
_8.add(td,"first-child");
}else{
if(i==this.renderData.columnCount-1){
_8.add(td,"last-child");
}
}
this.styleColumnHeaderCell(td,d,_1c);
},this);
if(this.yearColumnHeaderContent){
var d=_1c.dates[0][0];
this._setText(this.yearColumnHeaderContent,_1c.dateLocaleModule.format(d,{selector:"date",datePattern:"yyyy"}));
}
},styleColumnHeaderCell:function(_22,_23,_24){
_8.add(_22,this._cssDays[_23.getDay()]);
if(this.isWeekEnd(_23)){
_8.add(_22,"dojoxCalendarWeekend");
}
},_rowHeaderHandles:null,_cleanupRowHeader:function(){
while(this._rowHeaderHandles.length>0){
var _25=this._rowHeaderHandles.pop();
while(_25.length>0){
_25.pop().remove();
}
}
},_rowHeaderClick:function(e){
var _26=_c("td",this.rowHeaderTable).indexOf(e.currentTarget);
this._onRowHeaderClick({index:_26,date:this.renderData.dates[_26][0],triggerEvent:e});
},_buildRowHeader:function(_27,_28){
var _29=this.rowHeaderTable;
if(!_29){
return;
}
var _2a=_c("tbody",_29);
var _2b,tr,td;
if(_2a.length==1){
_2b=_2a[0];
}else{
_2b=_b.create("tbody",null,_29);
}
var _2c=_27.rowCount-(_28?_28.rowCount:0);
if(_2c>0){
for(var i=0;i<_2c;i++){
tr=_b.create("tr",null,_2b);
td=_b.create("td",null,tr);
var h=[];
h.push(on(td,"click",_4.hitch(this,this._rowHeaderClick)));
if(!_5("touch")){
h.push(on(td,"mousedown",function(e){
_8.add(e.currentTarget,"Active");
}));
h.push(on(td,"mouseup",function(e){
_8.remove(e.currentTarget,"Active");
}));
h.push(on(td,"mouseover",function(e){
_8.add(e.currentTarget,"Hover");
}));
h.push(on(td,"mouseout",function(e){
_8.remove(e.currentTarget,"Hover");
}));
}
this._rowHeaderHandles.push(h);
}
}else{
_2c=-_2c;
for(var i=0;i<_2c;i++){
_2b.removeChild(_2b.lastChild);
var _2d=this._rowHeaderHandles.pop();
while(_2d.length>0){
_2d.pop().remove();
}
}
}
_c("tr",_29).forEach(function(tr,i){
_9.set(tr,"height",this._getRowHeight(i)+"px");
var d=_27.dates[i][0];
var td=_c("td",tr)[0];
td.className="";
if(i==0){
_8.add(td,"first-child");
}
if(i==this.renderData.rowCount-1){
_8.add(td,"last-child");
}
this.styleRowHeaderCell(td,d,_27);
this._setText(td,this._formatRowHeaderLabel(d));
},this);
},styleRowHeaderCell:function(_2e,_2f,_30){
},_buildGrid:function(_31,_32){
var _33=this.gridTable;
if(!_33){
return;
}
var _34=_c("tr",_33);
var _35=_31.rowCount-_34.length;
var _36=_35>0;
var _37=_31.columnCount-(_34?_c("td",_34[0]).length:0);
if(_5("ie")==8){
if(this._gridTableSave==null){
this._gridTableSave=_4.clone(_33);
}else{
if(_37<0){
this.grid.removeChild(_33);
_b.destroy(_33);
_33=_4.clone(this._gridTableSave);
this.gridTable=_33;
this.grid.appendChild(_33);
_37=_31.columnCount;
_35=_31.rowCount;
_36=true;
}
}
}
var _38=_c("tbody",_33);
var _39;
if(_38.length==1){
_39=_38[0];
}else{
_39=_b.create("tbody",null,_33);
}
if(_36){
for(var i=0;i<_35;i++){
_b.create("tr",null,_39);
}
}else{
_35=-_35;
for(var i=0;i<_35;i++){
_39.removeChild(_39.lastChild);
}
}
var _3a=_31.rowCount-_35;
var _3b=_36||_37>0;
_37=_3b?_37:-_37;
_c("tr",_33).forEach(function(tr,i){
if(_3b){
var len=i>=_3a?_31.columnCount:_37;
for(var i=0;i<len;i++){
var td=_b.create("td",null,tr);
_b.create("span",null,td);
}
}else{
for(var i=0;i<_37;i++){
tr.removeChild(tr.lastChild);
}
}
});
_c("tr",_33).forEach(function(tr,row){
_9.set(tr,"height",this._getRowHeight(row)+"px");
tr.className="";
if(row==0){
_8.add(tr,"first-child");
}
if(row==_31.rowCount-1){
_8.add(tr,"last-child");
}
_c("td",tr).forEach(function(td,col){
td.className="";
if(col==0){
_8.add(td,"first-child");
}
if(col==_31.columnCount-1){
_8.add(td,"last-child");
}
var d=_31.dates[row][col];
var _3c=_c("span",td)[0];
this._setText(_3c,this.showCellLabel?this._formatGridCellLabel(d,row,col):null);
this.styleGridCell(td,d,_31);
},this);
},this);
},styleGridCellFunc:null,defaultStyleGridCell:function(_3d,_3e,_3f){
_8.add(_3d,this._cssDays[_3e.getDay()]);
var cal=this.dateModule;
if(this.isToday(_3e)){
_8.add(_3d,"dojoxCalendarToday");
}else{
if(this.refStartTime!=null&&this.refEndTime!=null&&(cal.compare(_3e,this.refEndTime)>=0||cal.compare(cal.add(_3e,"day",1),this.refStartTime)<=0)){
_8.add(_3d,"dojoxCalendarDayDisabled");
}else{
if(this.isWeekEnd(_3e)){
_8.add(_3d,"dojoxCalendarWeekend");
}
}
}
},styleGridCell:function(_40,_41,_42){
if(this.styleGridCellFunc){
this.styleGridCellFunc(_40,_41,_42);
}else{
this.defaultStyleGridCell(_40,_41,_42);
}
},_buildItemContainer:function(_43,_44){
var _45=this.itemContainerTable;
if(!_45){
return;
}
var _46=[];
var _47=_43.rowCount-(_44?_44.rowCount:0);
if(_5("ie")==8){
if(this._itemTableSave==null){
this._itemTableSave=_4.clone(_45);
}else{
if(_47<0){
this.itemContainer.removeChild(_45);
this._recycleItemRenderers(true);
this._recycleExpandRenderers(true);
_b.destroy(_45);
_45=_4.clone(this._itemTableSave);
this.itemContainerTable=_45;
this.itemContainer.appendChild(_45);
_47=_43.columnCount;
}
}
}
var _48=_c("tbody",_45);
var _49,tr,td,div;
if(_48.length==1){
_49=_48[0];
}else{
_49=_b.create("tbody",null,_45);
}
if(_47>0){
for(var i=0;i<_47;i++){
tr=_b.create("tr",null,_49);
_8.add(tr,"dojoxCalendarItemContainerRow");
td=_b.create("td",null,tr);
div=_b.create("div",null,td);
_8.add(div,"dojoxCalendarContainerRow");
}
}else{
_47=-_47;
for(var i=0;i<_47;i++){
_49.removeChild(_49.lastChild);
}
}
_c(".dojoxCalendarItemContainerRow",_45).forEach(function(tr,i){
_9.set(tr,"height",this._getRowHeight(i)+"px");
_46.push(tr.childNodes[0].childNodes[0]);
},this);
_43.cells=_46;
},resize:function(_4a){
this.inherited(arguments);
this._resizeHandler(null,false);
},_resizeHandler:function(e,_4b){
var rd=this.renderData;
if(rd==null){
this.refreshRendering();
return;
}
if(rd.sheetHeight!=this.itemContainer.offsetHeight){
rd.sheetHeight=this.itemContainer.offsetHeight;
var _4c=this.getExpandedRowIndex();
if(_4c==-1){
this._computeRowsHeight();
this._resizeRows();
}else{
this.expandRow(rd.expandedRow,rd.expandedRowCol,0,null,true);
}
if(rd.invalidRowHeight){
delete rd.invalidRowHeight;
this.renderData=null;
this.displayedItemsInvalidated=true;
this.refreshRendering();
return;
}
}
if(this.layoutDuringResize||_4b){
setTimeout(_4.hitch(this,function(){
this._layoutRenderers(this.renderData);
this._layoutDecorationRenderers(this.renderData);
}),20);
}else{
_9.set(this.itemContainer,"opacity",0);
this._recycleItemRenderers();
this._recycleExpandRenderers();
if(this._resizeTimer!=undefined){
clearTimeout(this._resizeTimer);
}
this._resizeTimer=setTimeout(_4.hitch(this,function(){
delete this._resizeTimer;
this._resizeRowsImpl(this.itemContainer,"tr");
this._layoutRenderers(this.renderData);
this._layoutDecorationRenderers(this.renderData);
if(this.resizeAnimationDuration==0){
_9.set(this.itemContainer,"opacity",1);
}else{
fx.fadeIn({node:this.itemContainer,curve:[0,1]}).play(this.resizeAnimationDuration);
}
}),200);
}
},resizeAnimationDuration:0,getExpandedRowIndex:function(){
return this.renderData.expandedRow==null?-1:this.renderData.expandedRow;
},collapseRow:function(_4d,_4e,_4f){
var rd=this.renderData;
if(_4f==undefined){
_4f=true;
}
if(_4d==undefined){
_4d=this.expandDuration;
}
if(rd&&rd.expandedRow!=null&&rd.expandedRow!=-1){
if(_4f&&_4d){
var _50=rd.expandedRow;
var _51=rd.expandedRowHeight;
delete rd.expandedRow;
this._computeRowsHeight(rd);
var _52=this._getRowHeight(_50);
rd.expandedRow=_50;
this._recycleExpandRenderers();
this._recycleItemRenderers();
_9.set(this.itemContainer,"display","none");
this._expandAnimation=new fx.Animation({curve:[_51,_52],duration:_4d,easing:_4e,onAnimate:_4.hitch(this,function(_53){
this._expandRowImpl(Math.floor(_53));
}),onEnd:_4.hitch(this,function(_54){
this._expandAnimation=null;
this._collapseRowImpl(false);
this._resizeRows();
_9.set(this.itemContainer,"display","block");
setTimeout(_4.hitch(this,function(){
this._layoutRenderers(rd);
}),100);
this.onExpandAnimationEnd(false);
})});
this._expandAnimation.play();
}else{
this._collapseRowImpl(_4f);
}
}
},_collapseRowImpl:function(_55){
var rd=this.renderData;
delete rd.expandedRow;
delete rd.expandedRowHeight;
this._computeRowsHeight(rd);
if(_55==undefined||_55){
this._resizeRows();
this._layoutRenderers(rd);
}
},expandRow:function(_56,_57,_58,_59,_5a){
var rd=this.renderData;
if(!rd||_56<0||_56>=rd.rowCount){
return -1;
}
if(_57==undefined||_57<0||_57>=rd.columnCount){
_57=-1;
}
if(_5a==undefined){
_5a=true;
}
if(_58==undefined){
_58=this.expandDuration;
}
if(_59==undefined){
_59=this.expandEasing;
}
var _5b=this._getRowHeight(_56);
var _5c=rd.sheetHeight-Math.ceil(this.cellPaddingTop*(rd.rowCount-1));
rd.expandedRow=_56;
rd.expandedRowCol=_57;
rd.expandedRowHeight=_5c;
if(_5a){
if(_58){
this._recycleExpandRenderers();
this._recycleItemRenderers();
_9.set(this.itemContainer,"display","none");
this._expandAnimation=new fx.Animation({curve:[_5b,_5c],duration:_58,delay:50,easing:_59,onAnimate:_4.hitch(this,function(_5d){
this._expandRowImpl(Math.floor(_5d));
}),onEnd:_4.hitch(this,function(){
this._expandAnimation=null;
_9.set(this.itemContainer,"display","block");
setTimeout(_4.hitch(this,function(){
this._expandRowImpl(_5c,true);
}),100);
this.onExpandAnimationEnd(true);
})});
this._expandAnimation.play();
}else{
this._expandRowImpl(_5c,true);
}
}
},_expandRowImpl:function(_5e,_5f){
var rd=this.renderData;
rd.expandedRowHeight=_5e;
this._computeRowsHeight(rd,rd.sheetHeight-_5e);
this._resizeRows();
if(_5f){
this._layoutRenderers(rd);
}
},onExpandAnimationEnd:function(_60){
},_resizeRows:function(){
if(this._getRowHeight(0)<=0){
return;
}
if(this.rowHeaderTable){
this._resizeRowsImpl(this.rowHeaderTable,"tr");
}
if(this.gridTable){
this._resizeRowsImpl(this.gridTable,"tr");
}
if(this.itemContainerTable){
this._resizeRowsImpl(this.itemContainerTable,"tr");
}
},_computeRowsHeight:function(_61,max){
var rd=_61==null?this.renderData:_61;
max=max||rd.sheetHeight;
max--;
if(_5("ie")==7){
max-=rd.rowCount;
}
if(rd.rowCount==1){
rd.rowHeight=max;
rd.rowHeightFirst=max;
rd.rowHeightLast=max;
return;
}
var _62=rd.expandedRow==null?rd.rowCount:rd.rowCount-1;
var rhx=max/_62;
var rhf,rhl,rh;
var _63=max-(Math.floor(rhx)*_62);
var _64=Math.abs(max-(Math.ceil(rhx)*_62));
var _65;
var _66=1;
if(_63<_64){
rh=Math.floor(rhx);
_65=_63;
}else{
_66=-1;
rh=Math.ceil(rhx);
_65=_64;
}
rhf=rh+_66*Math.floor(_65/2);
rhl=rhf+_66*(_65%2);
rd.rowHeight=rh;
rd.rowHeightFirst=rhf;
rd.rowHeightLast=rhl;
},_getRowHeight:function(_67){
var rd=this.renderData;
if(_67==rd.expandedRow){
return rd.expandedRowHeight;
}else{
if(rd.expandedRow==0&&_67==1||_67==0){
return rd.rowHeightFirst;
}else{
if(rd.expandedRow==this.renderData.rowCount-1&&_67==this.renderData.rowCount-2||_67==this.renderData.rowCount-1){
return rd.rowHeightLast;
}else{
return rd.rowHeight;
}
}
}
},_resizeRowsImpl:function(_68,_69){
dojo.query(_69,_68).forEach(function(tr,i){
_9.set(tr,"height",this._getRowHeight(i)+"px");
},this);
},_setHorizontalRendererAttr:function(_6a){
this._destroyRenderersByKind("horizontal");
this._set("horizontalRenderer",_6a);
},_setLabelRendererAttr:function(_6b){
this._destroyRenderersByKind("label");
this._set("labelRenderer",_6b);
},_destroyExpandRenderer:function(_6c){
if(_6c["destroyRecursive"]){
_6c.destroyRecursive();
}
_6.destroy(_6c.domNode);
},_setExpandRendererAttr:function(_6d){
while(this._ddRendererList.length>0){
this._destroyExpandRenderer(this._ddRendererList.pop());
}
var _6e=this._ddRendererPool;
if(_6e){
while(_6e.length>0){
this._destroyExpandRenderer(_6e.pop());
}
}
this._set("expandRenderer",_6d);
},_ddRendererList:null,_ddRendererPool:null,_getExpandRenderer:function(_6f,_70,_71,_72,_73){
if(this.expandRenderer==null){
return null;
}
var ir=this._ddRendererPool.pop();
if(ir==null){
ir=new this.expandRenderer();
}
this._ddRendererList.push(ir);
ir.set("owner",this);
ir.set("date",_6f);
ir.set("items",_70);
ir.set("rowIndex",_71);
ir.set("columnIndex",_72);
ir.set("expanded",_73);
return ir;
},_recycleExpandRenderers:function(_74){
for(var i=0;i<this._ddRendererList.length;i++){
var ir=this._ddRendererList[i];
ir.set("Up",false);
ir.set("Down",false);
if(_74){
ir.domNode.parentNode.removeChild(ir.domNode);
}
_9.set(ir.domNode,"display","none");
}
this._ddRendererPool=this._ddRendererPool.concat(this._ddRendererList);
this._ddRendererList=[];
},_defaultItemToRendererKindFunc:function(_75){
var dur=Math.abs(this.renderData.dateModule.difference(_75.startTime,_75.endTime,"minute"));
return dur>=1440?"horizontal":"label";
},naturalRowsHeight:null,_roundItemToDay:function(_76){
var s=_76.startTime,e=_76.endTime;
if(!this.isStartOfDay(s)){
s=this.floorToDay(s,false,this.renderData);
}
if(!this.isStartOfDay(e)){
e=this.renderData.dateModule.add(e,"day",1);
e=this.floorToDay(e,true);
}
return {startTime:s,endTime:e};
},_sortItemsFunction:function(a,b){
if(this.roundToDay){
a=this._roundItemToDay(a);
b=this._roundItemToDay(b);
}
var res=this.dateModule.compare(a.startTime,b.startTime);
if(res==0){
res=-1*this.dateModule.compare(a.endTime,b.endTime);
}
return res;
},_overlapLayoutPass3:function(_77){
var pos=0,_78=0;
var res=[];
var _79=_a.position(this.gridTable).x;
for(var col=0;col<this.renderData.columnCount;col++){
var _7a=false;
var _7b=_a.position(this._getCellAt(0,col));
pos=_7b.x-_79;
_78=pos+_7b.w;
for(var _7c=_77.length-1;_7c>=0&&!_7a;_7c--){
for(var i=0;i<_77[_7c].length;i++){
var _7d=_77[_7c][i];
_7a=_7d.start<_78&&pos<_7d.end;
if(_7a){
res[col]=_7c+1;
break;
}
}
}
if(!_7a){
res[col]=0;
}
}
return res;
},applyRendererZIndex:function(_7e,_7f,_80,_81,_82,_83){
_9.set(_7f.container,{"zIndex":_82||_81?_7f.renderer.mobile?100:0:_7e.lane==undefined?1:_7e.lane+1});
},_layoutDecorationRenderers:function(_84){
if(_84==null||_84.decorationItems==null||_84.rowHeight<=0){
return;
}
if(!this.gridTable||this._expandAnimation!=null||this.horizontalDecorationRenderer==null){
this.decorationRendererManager.recycleItemRenderers();
return;
}
this._layoutStep=_84.columnCount;
this.renderData.gridTablePosX=_a.position(this.gridTable).x;
this.inherited(arguments);
},_layoutRenderers:function(_85){
if(_85==null||_85.items==null||_85.rowHeight<=0){
return;
}
if(!this.gridTable||this._expandAnimation!=null||(this.horizontalRenderer==null&&this.labelRenderer==null)){
this._recycleItemRenderers();
return;
}
this.renderData.gridTablePosX=_a.position(this.gridTable).x;
this._layoutStep=_85.columnCount;
this._recycleExpandRenderers();
this._hiddenItems=[];
this._offsets=[];
this.naturalRowsHeight=[];
this.inherited(arguments);
},_offsets:null,_layoutInterval:function(_86,_87,_88,end,_89,_8a){
if(this.renderData.cells==null){
return;
}
if(_8a==="dataItems"){
var _8b=[];
var _8c=[];
for(var i=0;i<_89.length;i++){
var _8d=_89[i];
var _8e=this._itemToRendererKind(_8d);
if(_8e=="horizontal"){
_8b.push(_8d);
}else{
if(_8e=="label"){
_8c.push(_8d);
}
}
}
var _8f=this.getExpandedRowIndex();
if(_8f!=-1&&_8f!=_87){
return;
}
var _90;
var _91=[];
var _92=null;
var _93=[];
if(_8b.length>0&&this.horizontalRenderer){
var _92=this._createHorizontalLayoutItems(_87,_88,end,_8b,_8a);
var _94=this._computeHorizontalOverlapLayout(_92,_93);
}
var _95;
var _96=[];
if(_8c.length>0&&this.labelRenderer){
_95=this._createLabelLayoutItems(_87,_88,end,_8c);
this._computeLabelOffsets(_95,_96);
}
var _97=this._computeColHasHiddenItems(_87,_93,_96);
if(_92!=null){
this._layoutHorizontalItemsImpl(_87,_92,_94,_97,_91,_8a);
}
if(_95!=null){
this._layoutLabelItemsImpl(_87,_95,_97,_91,_93,_8a);
}
this._layoutExpandRenderers(_87,_97,_91);
this._hiddenItems[_87]=_91;
}else{
if(this.horizontalDecorationRenderer){
var _92=this._createHorizontalLayoutItems(_87,_88,end,_89,_8a);
if(_92!=null){
this._layoutHorizontalItemsImpl(_87,_92,null,false,null,_8a);
}
}
}
},_createHorizontalLayoutItems:function(_98,_99,_9a,_9b,_9c){
var rd=this.renderData;
var cal=rd.dateModule;
var _9d=rd.rtl?-1:1;
var _9e=[];
var _9f=_9c==="decorationItems";
for(var i=0;i<_9b.length;i++){
var _a0=_9b[i];
var _a1=this.computeRangeOverlap(rd,_a0.startTime,_a0.endTime,_99,_9a);
var _a2=cal.difference(_99,this.floorToDay(_a1[0],false,rd),"day");
var _a3=rd.dates[_98][_a2];
var _a4=_a.position(this._getCellAt(_98,_a2,false));
var _a5=_a4.x-rd.gridTablePosX;
if(rd.rtl){
_a5+=_a4.w;
}
if(_9f&&!_a0.isAllDay||!_9f&&!this.roundToDay&&!_a0.allDay){
_a5+=_9d*this.computeProjectionOnDate(rd,_a3,_a1[0],_a4.w);
}
_a5=Math.ceil(_a5);
var _a6=cal.difference(_99,this.floorToDay(_a1[1],false,rd),"day");
var end;
if(_a6>rd.columnCount-1){
_a4=_a.position(this._getCellAt(_98,rd.columnCount-1,false));
if(rd.rtl){
end=_a4.x-rd.gridTablePosX;
}else{
end=_a4.x-rd.gridTablePosX+_a4.w;
}
}else{
_a3=rd.dates[_98][_a6];
_a4=_a.position(this._getCellAt(_98,_a6,false));
end=_a4.x-rd.gridTablePosX;
if(rd.rtl){
end+=_a4.w;
}
if(!_9f&&this.roundToDay){
if(!this.isStartOfDay(_a1[1])){
end+=_9d*_a4.w;
}
}else{
end+=_9d*this.computeProjectionOnDate(rd,_a3,_a1[1],_a4.w);
}
}
end=Math.floor(end);
if(rd.rtl){
var t=end;
end=_a5;
_a5=t;
}
if(end>_a5){
var _a7=_4.mixin({start:_a5,end:end,range:_a1,item:_a0,startOffset:_a2,endOffset:_a6},_a0);
_9e.push(_a7);
}
}
return _9e;
},_computeHorizontalOverlapLayout:function(_a8,_a9){
var rd=this.renderData;
var _aa=this.horizontalRendererHeight;
var _ab=this.computeOverlapping(_a8,this._overlapLayoutPass3);
var _ac=this.percentOverlap/100;
for(var i=0;i<rd.columnCount;i++){
var _ad=_ab.addedPassRes[i];
var _ae=rd.rtl?rd.columnCount-i-1:i;
if(_ac==0){
_a9[_ae]=_ad==0?0:_ad==1?_aa:_aa+(_ad-1)*(_aa+this.verticalGap);
}else{
_a9[_ae]=_ad==0?0:_ad*_aa-(_ad-1)*(_ac*_aa)+this.verticalGap;
}
_a9[_ae]+=this.cellPaddingTop;
}
return _ab;
},_createLabelLayoutItems:function(_af,_b0,_b1,_b2){
if(this.labelRenderer==null){
return;
}
var d;
var rd=this.renderData;
var cal=rd.dateModule;
var _b3=[];
for(var i=0;i<_b2.length;i++){
var _b4=_b2[i];
d=this.floorToDay(_b4.startTime,false,rd);
var _b5=this.dateModule.compare;
while(_b5(d,_b4.endTime)==-1&&_b5(d,_b1)==-1){
var _b6=cal.add(d,"day",1);
_b6=this.floorToDay(_b6,true);
var _b7=this.computeRangeOverlap(rd,_b4.startTime,_b4.endTime,d,_b6);
var _b8=cal.difference(_b0,this.floorToDay(_b7[0],false,rd),"day");
if(_b8>=this.columnCount){
break;
}
if(_b8>=0){
var _b9=_b3[_b8];
if(_b9==null){
_b9=[];
_b3[_b8]=_b9;
}
_b9.push(_4.mixin({startOffset:_b8,range:_b7,item:_b4},_b4));
}
d=cal.add(d,"day",1);
this.floorToDay(d,true);
}
}
return _b3;
},_computeLabelOffsets:function(_ba,_bb){
for(var i=0;i<this.renderData.columnCount;i++){
_bb[i]=_ba[i]==null?0:_ba[i].length*(this.labelRendererHeight+this.verticalGap);
}
},_computeColHasHiddenItems:function(_bc,_bd,_be){
var res=[];
var _bf=this._getRowHeight(_bc);
var h;
var _c0=0;
for(var i=0;i<this.renderData.columnCount;i++){
h=_bd==null||_bd[i]==null?this.cellPaddingTop:_bd[i];
h+=_be==null||_be[i]==null?0:_be[i];
if(h>_c0){
_c0=h;
}
res[i]=h>_bf;
}
this.naturalRowsHeight[_bc]=_c0;
return res;
},_layoutHorizontalItemsImpl:function(_c1,_c2,_c3,_c4,_c5,_c6){
var rd=this.renderData;
var _c7=rd.cells[_c1];
var _c8=this._getRowHeight(_c1);
var _c9=this.horizontalRendererHeight;
var _ca=this.percentOverlap/100;
for(var i=0;i<_c2.length;i++){
var _cb=_c2[i];
var _cc=_cb.lane;
if(_c6==="dataItems"){
var _cd=this.cellPaddingTop;
if(_ca==0){
_cd+=_cc*(_c9+this.verticalGap);
}else{
_cd+=_cc*(_c9-_ca*_c9);
}
var exp=false;
var _ce=_c8;
if(this.expandRenderer){
for(var off=_cb.startOffset;off<=_cb.endOffset;off++){
if(_c4[off]){
exp=true;
break;
}
}
_ce=exp?_c8-this.expandRendererHeight:_c8;
}
if(_cd+_c9<=_ce){
var ir=this._createRenderer(_cb,"horizontal",this.horizontalRenderer,"dojoxCalendarHorizontal");
var _cf=this.isItemBeingEdited(_cb)&&!this.liveLayout&&this._isEditing;
var h=_cf?_c8-this.cellPaddingTop:_c9;
var w=_cb.end-_cb.start;
if(_5("ie")>=9&&_cb.start+w<this.itemContainer.offsetWidth){
w++;
}
_9.set(ir.container,{"top":(_cf?this.cellPaddingTop:_cd)+"px","left":_cb.start+"px","width":w+"px","height":h+"px"});
this._applyRendererLayout(_cb,ir,_c7,w,h,"horizontal");
}else{
for(var d=_cb.startOffset;d<_cb.endOffset;d++){
if(_c5[d]==null){
_c5[d]=[_cb.item];
}else{
_c5[d].push(_cb.item);
}
}
}
}else{
var ir=this.decorationRendererManager.createRenderer(_cb,"horizontal",this.horizontalDecorationRenderer,"dojoxCalendarDecoration");
var h=_c8;
var w=_cb.end-_cb.start;
if(_5("ie")>=9&&_cb.start+w<this.itemContainer.offsetWidth){
w++;
}
_9.set(ir.container,{"top":"0","left":_cb.start+"px","width":w+"px","height":h+"px"});
_b.place(ir.container,_c7);
_9.set(ir.container,"display","block");
}
}
},_layoutLabelItemsImpl:function(_d0,_d1,_d2,_d3,_d4){
var _d5,_d6;
var rd=this.renderData;
var _d7=rd.cells[_d0];
var _d8=this._getRowHeight(_d0);
var _d9=this.labelRendererHeight;
var _da=_a.getMarginBox(this.itemContainer).w;
for(var i=0;i<_d1.length;i++){
_d5=_d1[i];
if(_d5!=null){
_d5.sort(_4.hitch(this,function(a,b){
return this.dateModule.compare(a.range[0],b.range[0]);
}));
var _db=this.expandRenderer?(_d2[i]?_d8-this.expandRendererHeight:_d8):_d8;
_d6=_d4==null||_d4[i]==null?this.cellPaddingTop:_d4[i]+this.verticalGap;
var _dc=_a.position(this._getCellAt(_d0,i));
var _dd=_dc.x-rd.gridTablePosX;
for(var j=0;j<_d5.length;j++){
if(_d6+_d9+this.verticalGap<=_db){
var _de=_d5[j];
_4.mixin(_de,{start:_dd,end:_dd+_dc.w});
var ir=this._createRenderer(_de,"label",this.labelRenderer,"dojoxCalendarLabel");
var _df=this.isItemBeingEdited(_de)&&!this.liveLayout&&this._isEditing;
var h=_df?this._getRowHeight(_d0)-this.cellPaddingTop:_d9;
if(rd.rtl){
_de.start=_da-_de.end;
_de.end=_de.start+_dc.w;
}
_9.set(ir.container,{"top":(_df?this.cellPaddingTop:_d6)+"px","left":_de.start+"px","width":_dc.w+"px","height":h+"px"});
this._applyRendererLayout(_de,ir,_d7,_dc.w,h,"label");
}else{
break;
}
_d6+=_d9+this.verticalGap;
}
for(var j;j<_d5.length;j++){
if(_d3[i]==null){
_d3[i]=[_d5[j]];
}else{
_d3[i].push(_d5[j]);
}
}
}
}
},_applyRendererLayout:function(_e0,ir,_e1,w,h,_e2){
var _e3=this.isItemBeingEdited(_e0);
var _e4=this.isItemSelected(_e0);
var _e5=this.isItemHovered(_e0);
var _e6=this.isItemFocused(_e0);
var _e7=ir.renderer;
_e7.set("hovered",_e5);
_e7.set("selected",_e4);
_e7.set("edited",_e3);
_e7.set("focused",this.showFocus?_e6:false);
_e7.set("moveEnabled",this.isItemMoveEnabled(_e0._item,_e2));
_e7.set("storeState",this.getItemStoreState(_e0));
if(_e2!="label"){
_e7.set("resizeEnabled",this.isItemResizeEnabled(_e0,_e2));
}
this.applyRendererZIndex(_e0,ir,_e5,_e4,_e3,_e6);
if(_e7.updateRendering){
_e7.updateRendering(w,h);
}
_b.place(ir.container,_e1);
_9.set(ir.container,"display","block");
},_getCellAt:function(_e8,_e9,rtl){
if((rtl==undefined||rtl==true)&&!this.isLeftToRight()){
_e9=this.renderData.columnCount-1-_e9;
}
return this.gridTable.childNodes[0].childNodes[_e8].childNodes[_e9];
},_layoutExpandRenderers:function(_ea,_eb,_ec){
if(!this.expandRenderer){
return;
}
var rd=this.renderData;
if(rd.expandedRow==_ea){
if(rd.expandedRowCol!=null&&rd.expandedRowCol!=-1){
this._layoutExpandRendererImpl(rd.expandedRow,rd.expandedRowCol,null,true);
}
}else{
if(rd.expandedRow==null){
for(var i=0;i<rd.columnCount;i++){
if(_eb[i]){
this._layoutExpandRendererImpl(_ea,rd.rtl?rd.columnCount-1-i:i,_ec[i],false);
}
}
}
}
},_layoutExpandRendererImpl:function(_ed,_ee,_ef,_f0){
var rd=this.renderData;
var d=_4.clone(rd.dates[_ed][_ee]);
var ir=null;
var _f1=rd.cells[_ed];
ir=this._getExpandRenderer(d,_ef,_ed,_ee,_f0);
var dim=_a.position(this._getCellAt(_ed,_ee));
dim.x-=rd.gridTablePosX;
this.layoutExpandRenderer(ir,d,_ef,dim,this.expandRendererHeight);
_b.place(ir.domNode,_f1);
_9.set(ir.domNode,"display","block");
},layoutExpandRenderer:function(_f2,_f3,_f4,_f5,_f6){
_9.set(_f2.domNode,{"left":_f5.x+"px","width":_f5.w+"px","height":_f6+"px","top":(_f5.h-_f6-1)+"px"});
},_onItemEditBeginGesture:function(e){
var p=this._edProps;
var _f7=p.editedItem;
var _f8=e.dates;
var _f9=this.newDate(p.editKind=="resizeEnd"?_f7.endTime:_f7.startTime);
if(p.rendererKind=="label"){
}else{
if(e.editKind=="move"&&(_f7.allDay||this.roundToDay)){
var cal=this.renderData.dateModule;
p.dayOffset=cal.difference(this.floorToDay(_f8[0],false,this.renderData),_f9,"day");
}
}
this.inherited(arguments);
},_computeItemEditingTimes:function(_fa,_fb,_fc,_fd,_fe){
var cal=this.renderData.dateModule;
var p=this._edProps;
if(_fc=="label"){
}else{
if(_fa.allDay||this.roundToDay){
var _ff=this.isStartOfDay(_fd[0]);
switch(_fb){
case "resizeEnd":
if(!_ff&&_fa.allDay){
_fd[0]=cal.add(_fd[0],"day",1);
}
case "resizeStart":
if(!_ff){
_fd[0]=this.floorToDay(_fd[0],true);
}
break;
case "move":
_fd[0]=cal.add(_fd[0],"day",p.dayOffset);
break;
case "resizeBoth":
if(!_ff){
_fd[0]=this.floorToDay(_fd[0],true);
}
if(!this.isStartOfDay(_fd[1])){
_fd[1]=this.floorToDay(cal.add(_fd[1],"day",1),true);
}
break;
}
}else{
_fd=this.inherited(arguments);
}
}
return _fd;
},getTime:function(e,x,y,_100){
var rd=this.renderData;
if(e!=null){
var _101=_a.position(this.itemContainer,true);
if(e.touches){
_100=_100==undefined?0:_100;
x=e.touches[_100].pageX-_101.x;
y=e.touches[_100].pageY-_101.y;
}else{
x=e.pageX-_101.x;
y=e.pageY-_101.y;
}
}
var r=_a.getContentBox(this.itemContainer);
if(x<0){
x=0;
}else{
if(x>r.w){
x=r.w-1;
}
}
if(y<0){
y=0;
}else{
if(y>r.h){
y=r.h-1;
}
}
var w=_a.getMarginBox(this.itemContainer).w;
var colW=w/rd.columnCount;
var row;
if(rd.expandedRow==null){
row=Math.floor(y/(_a.getMarginBox(this.itemContainer).h/rd.rowCount));
}else{
row=rd.expandedRow;
}
var r=_a.getContentBox(this.itemContainer);
if(rd.rtl){
x=r.w-x;
}
var col=Math.floor(x/colW);
var tm=Math.floor((x-(col*colW))*1440/colW);
var date=null;
if(row<rd.dates.length&&col<this.renderData.dates[row].length){
date=this.newDate(this.renderData.dates[row][col]);
date=this.renderData.dateModule.add(date,"minute",tm);
}
return date;
},_onGridMouseUp:function(e){
this.inherited(arguments);
if(this._gridMouseDown){
this._gridMouseDown=false;
this._onGridClick({date:this.getTime(e),triggerEvent:e});
}
},_onGridTouchEnd:function(e){
this.inherited(arguments);
var g=this._gridProps;
if(g){
if(!this._isEditing){
if(!g.fromItem&&!g.editingOnStart){
this.selectFromEvent(e,null,null,true);
}
if(!g.fromItem){
if(this._pendingDoubleTap&&this._pendingDoubleTap.grid){
this._onGridDoubleClick({date:this.getTime(this._gridProps.event),triggerEvent:this._gridProps.event});
clearTimeout(this._pendingDoubleTap.timer);
delete this._pendingDoubleTap;
}else{
this._onGridClick({date:this.getTime(this._gridProps.event),triggerEvent:this._gridProps.event});
this._pendingDoubleTap={grid:true,timer:setTimeout(_4.hitch(this,function(){
delete this._pendingDoubleTap;
}),this.doubleTapDelay)};
}
}
}
this._gridProps=null;
}
},_onRowHeaderClick:function(e){
this._dispatchCalendarEvt(e,"onRowHeaderClick");
},onRowHeaderClick:function(e){
},expandRendererClickHandler:function(e,_102){
_3.stop(e);
var ri=_102.get("rowIndex");
var ci=_102.get("columnIndex");
this._onExpandRendererClick(_4.mixin(this._createItemEditEvent(),{rowIndex:ri,columnIndex:ci,renderer:_102,triggerEvent:e,date:this.renderData.dates[ri][ci]}));
},onExpandRendererClick:function(e){
},_onExpandRendererClick:function(e){
this._dispatchCalendarEvt(e,"onExpandRendererClick");
if(!e.isDefaultPrevented()){
if(this.getExpandedRowIndex()!=-1){
this.collapseRow();
}else{
this.expandRow(e.rowIndex,e.columnIndex);
}
}
},snapUnit:"minute",snapSteps:15,minDurationUnit:"minute",minDurationSteps:15,triggerExtent:3,liveLayout:false,stayInView:true,allowStartEndSwap:true,allowResizeLessThan24H:false});
});
