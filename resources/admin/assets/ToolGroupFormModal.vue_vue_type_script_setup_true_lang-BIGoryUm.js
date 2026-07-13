import{d as I,H as l,a3 as Pe,a6 as Le,bn as Ae,a7 as Ve,bo as Be,bp as Ie,a8 as $e,bq as Ne,br as Ue,aL as Me,a9 as S,at as D,b1 as p,as as Y,b2 as De,x as W,aa as Ee,aM as q,ad as He,B as K,bs as qe,bt as je,bu as Je,W as We,aO as G,aP as Ke,ac as ae,j as B,P as m,ag as Ge,ai as H,af as oe,ae as Xe,b5 as Ye,av as U,b6 as Qe,bv as Ze,ak as j,L as Q,o as et,b as tt,w as A,e as O,u as V,a as rt,g as Z,t as lt,M as at,n as ot}from"./index-DiOlaFw7.js";import{N as it}from"./Checkbox-0QrpZrph.js";import{_ as nt,N as J}from"./FormItem-vKUhSOMB.js";const st=I({name:"Search",render(){return l("svg",{version:"1.1",xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 512 512",style:"enable-background: new 0 0 512 512"},l("path",{d:`M443.5,420.2L336.7,312.4c20.9-26.2,33.5-59.4,33.5-95.5c0-84.5-68.5-153-153.1-153S64,132.5,64,217s68.5,153,153.1,153
  c36.6,0,70.1-12.8,96.5-34.2l106.1,107.1c3.2,3.4,7.6,5.1,11.9,5.1c4.1,0,8.2-1.5,11.3-4.5C449.5,437.2,449.7,426.8,443.5,420.2z
   M217.1,337.1c-32.1,0-62.3-12.5-85-35.2c-22.7-22.7-35.2-52.9-35.2-84.9c0-32.1,12.5-62.3,35.2-84.9c22.7-22.7,52.9-35.2,85-35.2
  c32.1,0,62.3,12.5,85,35.2c22.7,22.7,35.2,52.9,35.2,84.9c0,32.1-12.5,62.3-35.2,84.9C279.4,324.6,249.2,337.1,217.1,337.1z`}))}});function dt(e){const{fontWeight:o,fontSizeLarge:r,fontSizeMedium:s,fontSizeSmall:c,heightLarge:a,heightMedium:h,borderRadius:v,cardColor:d,tableHeaderColor:n,textColor1:i,textColorDisabled:f,textColor2:R,textColor3:w,borderColor:g,hoverColor:y,closeColorHover:C,closeColorPressed:T,closeIconColor:_,closeIconColorHover:z,closeIconColorPressed:t}=e;return Object.assign(Object.assign({},Ne),{itemHeightSmall:h,itemHeightMedium:h,itemHeightLarge:a,fontSizeSmall:c,fontSizeMedium:s,fontSizeLarge:r,borderRadius:v,dividerColor:g,borderColor:g,listColor:d,headerColor:Ue(d,n),titleTextColor:i,titleTextColorDisabled:f,extraTextColor:w,extraTextColorDisabled:f,itemTextColor:R,itemTextColorDisabled:f,itemColorPending:y,titleFontWeight:o,closeColorHover:C,closeColorPressed:T,closeIconColor:_,closeIconColorHover:z,closeIconColorPressed:t})}const ct=Pe({name:"Transfer",common:$e,peers:{Checkbox:Ie,Scrollbar:Be,Input:Ve,Empty:Ae,Button:Le},self:dt}),E=Me("n-transfer"),ut=S("transfer",`
 width: 100%;
 font-size: var(--n-font-size);
 height: 300px;
 display: flex;
 flex-wrap: nowrap;
 word-break: break-word;
`,[D("disabled",[S("transfer-list",[S("transfer-list-header",[p("title",`
 color: var(--n-header-text-color-disabled);
 `),p("extra",`
 color: var(--n-header-extra-text-color-disabled);
 `)])])]),S("transfer-list",`
 flex: 1;
 min-width: 0;
 height: inherit;
 display: flex;
 flex-direction: column;
 background-clip: padding-box;
 position: relative;
 transition: background-color .3s var(--n-bezier);
 background-color: var(--n-list-color);
 `,[D("source",`
 border-top-left-radius: var(--n-border-radius);
 border-bottom-left-radius: var(--n-border-radius);
 `,[p("border","border-right: 1px solid var(--n-divider-color);")]),D("target",`
 border-top-right-radius: var(--n-border-radius);
 border-bottom-right-radius: var(--n-border-radius);
 `,[p("border","border-left: none;")]),p("border",`
 padding: 0 12px;
 border: 1px solid var(--n-border-color);
 transition: border-color .3s var(--n-bezier);
 pointer-events: none;
 border-radius: inherit;
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `),S("transfer-list-header",`
 min-height: var(--n-header-height);
 box-sizing: border-box;
 display: flex;
 padding: 12px 12px 10px 12px;
 align-items: center;
 background-clip: padding-box;
 border-radius: inherit;
 border-bottom-left-radius: 0;
 border-bottom-right-radius: 0;
 line-height: 1.5;
 transition:
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `,[Y("> *:not(:first-child)",`
 margin-left: 8px;
 `),p("title",`
 flex: 1;
 min-width: 0;
 line-height: 1.5;
 font-size: var(--n-header-font-size);
 font-weight: var(--n-header-font-weight);
 transition: color .3s var(--n-bezier);
 color: var(--n-header-text-color);
 `),p("button",`
 position: relative;
 `),p("extra",`
 transition: color .3s var(--n-bezier);
 font-size: var(--n-extra-font-size);
 margin-right: 0;
 white-space: nowrap;
 color: var(--n-header-extra-text-color);
 `)]),S("transfer-list-body",`
 flex-basis: 0;
 flex-grow: 1;
 box-sizing: border-box;
 position: relative;
 display: flex;
 flex-direction: column;
 border-radius: inherit;
 border-top-left-radius: 0;
 border-top-right-radius: 0;
 `,[S("transfer-filter",`
 padding: 4px 12px 8px 12px;
 box-sizing: border-box;
 transition:
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `),S("transfer-list-flex-container",`
 flex: 1;
 position: relative;
 `,[S("scrollbar",`
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 height: unset;
 `),S("empty",`
 position: absolute;
 left: 50%;
 top: 50%;
 transform: translateY(-50%) translateX(-50%);
 `),S("transfer-list-content",`
 padding: 0;
 margin: 0;
 position: relative;
 `,[S("transfer-list-item",`
 padding: 0 12px;
 min-height: var(--n-item-height);
 display: flex;
 align-items: center;
 color: var(--n-item-text-color);
 position: relative;
 transition: color .3s var(--n-bezier);
 `,[p("background",`
 position: absolute;
 left: 4px;
 right: 4px;
 top: 0;
 bottom: 0;
 border-radius: var(--n-border-radius);
 transition: background-color .3s var(--n-bezier);
 `),p("checkbox",`
 position: relative;
 margin-right: 8px;
 `),p("close",`
 opacity: 0;
 pointer-events: none;
 position: relative;
 transition:
 opacity .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `),p("label",`
 position: relative;
 min-width: 0;
 flex-grow: 1;
 `),D("source","cursor: pointer;"),D("disabled",`
 cursor: not-allowed;
 color: var(--n-item-text-color-disabled);
 `),De("disabled",[Y("&:hover",[p("background","background-color: var(--n-item-color-pending);"),p("close",`
 opacity: 1;
 pointer-events: all;
 `)])])])])])])])]),ee=I({name:"TransferFilter",props:{value:String,placeholder:String,disabled:Boolean,onUpdateValue:{type:Function,required:!0}},setup(){const{mergedThemeRef:e,mergedClsPrefixRef:o}=q(E);return{mergedClsPrefix:o,mergedTheme:e}},render(){const{mergedTheme:e,mergedClsPrefix:o}=this;return l("div",{class:`${o}-transfer-filter`},l(W,{value:this.value,onUpdateValue:this.onUpdateValue,disabled:this.disabled,placeholder:this.placeholder,theme:e.peers.Input,themeOverrides:e.peerOverrides.Input,clearable:!0,size:"small"},{"clear-icon-placeholder":()=>l(Ee,{clsPrefix:o},{default:()=>l(st,null)})}))}}),te=I({name:"TransferHeader",props:{size:{type:String,required:!0},selectAllText:String,clearText:String,source:Boolean,onCheckedAll:Function,onClearAll:Function,title:[String,Function]},setup(e){const{targetOptionsRef:o,canNotSelectAnythingRef:r,canBeClearedRef:s,allCheckedRef:c,mergedThemeRef:a,disabledRef:h,mergedClsPrefixRef:v,srcOptionsLengthRef:d}=q(E),{localeRef:n}=He("Transfer");return()=>{const{source:i,onClearAll:f,onCheckedAll:R,selectAllText:w,clearText:g}=e,{value:y}=a,{value:C}=v,{value:T}=n,_=e.size==="large"?"small":"tiny",{title:z}=e;return l("div",{class:`${C}-transfer-list-header`},z&&l("div",{class:`${C}-transfer-list-header__title`},typeof z=="function"?z():z),i&&l(K,{class:`${C}-transfer-list-header__button`,theme:y.peers.Button,themeOverrides:y.peerOverrides.Button,size:_,tertiary:!0,onClick:c.value?f:R,disabled:r.value||h.value},{default:()=>c.value?g||T.unselectAll:w||T.selectAll}),!i&&s.value&&l(K,{class:`${C}-transfer-list-header__button`,theme:y.peers.Button,themeOverrides:y.peerOverrides.Button,size:_,tertiary:!0,onClick:f,disabled:h.value},{default:()=>T.clearAll}),l("div",{class:`${C}-transfer-list-header__extra`},i?T.total(d.value):T.selected(o.value.length)))}}}),re=I({name:"NTransferListItem",props:{source:Boolean,label:{type:String,required:!0},value:{type:[String,Number],required:!0},disabled:Boolean,option:{type:Object,required:!0}},setup(e){const{targetValueSetRef:o,mergedClsPrefixRef:r,mergedThemeRef:s,handleItemCheck:c,renderSourceLabelRef:a,renderTargetLabelRef:h,showSelectedRef:v}=q(E),d=Je(()=>o.value.has(e.value));function n(){e.disabled||c(!d.value,e.value)}return{mergedClsPrefix:r,mergedTheme:s,checked:d,showSelected:v,renderSourceLabel:a,renderTargetLabel:h,handleClick:n}},render(){const{disabled:e,mergedTheme:o,mergedClsPrefix:r,label:s,checked:c,source:a,renderSourceLabel:h,renderTargetLabel:v}=this;return l("div",{class:[`${r}-transfer-list-item`,e&&`${r}-transfer-list-item--disabled`,a?`${r}-transfer-list-item--source`:`${r}-transfer-list-item--target`],onClick:a?this.handleClick:void 0},l("div",{class:`${r}-transfer-list-item__background`}),a&&this.showSelected&&l("div",{class:`${r}-transfer-list-item__checkbox`},l(it,{theme:o.peers.Checkbox,themeOverrides:o.peerOverrides.Checkbox,disabled:e,checked:c})),l("div",{class:`${r}-transfer-list-item__label`,title:qe(s)},a?h?h({option:this.option}):s:v?v({option:this.option}):s),!a&&!e&&l(je,{focusable:!1,class:`${r}-transfer-list-item__close`,clsPrefix:r,onClick:this.handleClick}))}}),le=I({name:"TransferList",props:{virtualScroll:{type:Boolean,required:!0},itemSize:{type:Number,required:!0},options:{type:Array,required:!0},disabled:{type:Boolean,required:!0},source:Boolean},setup(){const{mergedThemeRef:e,mergedClsPrefixRef:o}=q(E),{mergedComponentPropsRef:r}=ae(),s=B(null),c=B(null),a=m(()=>{var n,i;return(i=(n=r?.value)===null||n===void 0?void 0:n.Transfer)===null||i===void 0?void 0:i.renderEmpty});function h(){var n;(n=s.value)===null||n===void 0||n.sync()}function v(){const{value:n}=c;if(!n)return null;const{listElRef:i}=n;return i}function d(){const{value:n}=c;if(!n)return null;const{itemsElRef:i}=n;return i}return{mergedTheme:e,mergedClsPrefix:o,mergedRenderEmpty:a,scrollerInstRef:s,vlInstRef:c,syncVLScroller:h,scrollContainer:v,scrollContent:d}},render(){var e;const{mergedTheme:o,options:r}=this;if(r.length===0)return((e=this.mergedRenderEmpty)===null||e===void 0?void 0:e.call(this))||l(We,{theme:o.peers.Empty,themeOverrides:o.peerOverrides.Empty});const{mergedClsPrefix:s,virtualScroll:c,source:a,disabled:h,syncVLScroller:v}=this;return l(G,{ref:"scrollerInstRef",theme:o.peers.Scrollbar,themeOverrides:o.peerOverrides.Scrollbar,container:c?this.scrollContainer:void 0,content:c?this.scrollContent:void 0},{default:()=>c?l(Ke,{ref:"vlInstRef",style:{height:"100%"},class:`${s}-transfer-list-content`,items:this.options,itemSize:this.itemSize,showScrollbar:!1,onResize:v,onScroll:v,keyField:"value"},{default:({item:d})=>{const{source:n,disabled:i}=this;return l(re,{source:n,key:d.value,value:d.value,disabled:d.disabled||i,label:d.label,option:d})}}):l("div",{class:`${s}-transfer-list-content`},r.map(d=>l(re,{source:a,key:d.value,value:d.value,disabled:d.disabled||h,label:d.label,option:d})))})}});function ft(e){const o=B(e.defaultValue),r=Ge(H(e,"value"),o),s=m(()=>{const t=new Map;return(e.options||[]).forEach(u=>t.set(u.value,u)),t}),c=m(()=>new Set(r.value||[])),a=m(()=>{const t=s.value,u=[];return(r.value||[]).forEach(M=>{const F=t.get(M);F&&u.push(F)}),u}),h=B(""),v=B(""),d=m(()=>e.sourceFilterable||!!e.filterable),n=m(()=>{const{showSelected:t,options:u,filter:M}=e;return d.value?u.filter(F=>M(h.value,F,"source")&&(t||!c.value.has(F.value))):t?u:u.filter(F=>!c.value.has(F.value))}),i=m(()=>{if(!e.targetFilterable)return a.value;const{filter:t}=e;return a.value.filter(u=>t(v.value,u,"target"))}),f=m(()=>{const{value:t}=r;return t===null?new Set:new Set(t)}),R=m(()=>{const t=new Set(f.value);return n.value.forEach(u=>{!u.disabled&&!t.has(u.value)&&t.add(u.value)}),t}),w=m(()=>{const t=new Set(f.value);return n.value.forEach(u=>{!u.disabled&&t.has(u.value)&&t.delete(u.value)}),t}),g=m(()=>{const t=new Set(f.value);return i.value.forEach(u=>{u.disabled||t.delete(u.value)}),t}),y=m(()=>n.value.every(t=>t.disabled)),C=m(()=>{if(!n.value.length)return!1;const t=f.value;return n.value.every(u=>u.disabled||t.has(u.value))}),T=m(()=>i.value.some(t=>!t.disabled));function _(t){h.value=t??""}function z(t){v.value=t??""}return{uncontrolledValueRef:o,mergedValueRef:r,targetValueSetRef:c,valueSetForCheckAllRef:R,valueSetForUncheckAllRef:w,valueSetForClearRef:g,filteredTgtOptionsRef:i,filteredSrcOptionsRef:n,targetOptionsRef:a,canNotSelectAnythingRef:y,canBeClearedRef:T,allCheckedRef:C,srcPatternRef:h,tgtPatternRef:v,mergedSrcFilterableRef:d,handleSrcFilterUpdateValue:_,handleTgtFilterUpdateValue:z}}const ht=Object.assign(Object.assign({},oe.props),{value:Array,defaultValue:{type:Array,default:null},options:{type:Array,default:()=>[]},disabled:{type:Boolean,default:void 0},virtualScroll:Boolean,sourceTitle:[String,Function],selectAllText:String,clearText:String,targetTitle:[String,Function],filterable:{type:Boolean,default:void 0},sourceFilterable:Boolean,targetFilterable:Boolean,showSelected:{type:Boolean,default:!0},sourceFilterPlaceholder:String,targetFilterPlaceholder:String,filter:{type:Function,default:(e,o)=>e?~`${o.label}`.toLowerCase().indexOf(`${e}`.toLowerCase()):!0},size:String,renderSourceLabel:Function,renderTargetLabel:Function,renderSourceList:Function,renderTargetList:Function,"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array],onChange:[Function,Array]}),vt=I({name:"Transfer",props:ht,setup(e){const{mergedClsPrefixRef:o,mergedComponentPropsRef:r}=ae(e),s=oe("Transfer","-transfer",ut,ct,e,o),c=Xe(e,{mergedSize:b=>{var x,k;const{size:L}=e;if(L)return L;const{mergedSize:P}=b||{};if(P?.value)return P.value;const N=(k=(x=r?.value)===null||x===void 0?void 0:x.Transfer)===null||k===void 0?void 0:k.size;return N||"medium"}}),{mergedSizeRef:a,mergedDisabledRef:h}=c,v=m(()=>{const{value:b}=a,{self:{[U("itemHeight",b)]:x}}=s.value;return Ze(x)}),{uncontrolledValueRef:d,mergedValueRef:n,targetValueSetRef:i,valueSetForCheckAllRef:f,valueSetForUncheckAllRef:R,valueSetForClearRef:w,filteredTgtOptionsRef:g,filteredSrcOptionsRef:y,targetOptionsRef:C,canNotSelectAnythingRef:T,canBeClearedRef:_,allCheckedRef:z,srcPatternRef:t,tgtPatternRef:u,mergedSrcFilterableRef:M,handleSrcFilterUpdateValue:F,handleTgtFilterUpdateValue:ie}=ft(e);function $(b){const{onUpdateValue:x,"onUpdate:value":k,onChange:L}=e,{nTriggerFormInput:P,nTriggerFormChange:N}=c;x&&j(x,b),k&&j(k,b),L&&j(L,b),d.value=b,P(),N()}function ne(){$([...f.value])}function se(){$([...R.value])}function de(){$([...w.value])}function X(b,x){$(b?(n.value||[]).concat(x):(n.value||[]).filter(k=>k!==x))}function ce(b){$(b)}return Ye(E,{targetValueSetRef:i,mergedClsPrefixRef:o,disabledRef:h,mergedThemeRef:s,targetOptionsRef:C,canNotSelectAnythingRef:T,canBeClearedRef:_,allCheckedRef:z,srcOptionsLengthRef:m(()=>e.options.length),handleItemCheck:X,renderSourceLabelRef:H(e,"renderSourceLabel"),renderTargetLabelRef:H(e,"renderTargetLabel"),showSelectedRef:H(e,"showSelected")}),{mergedClsPrefix:o,mergedDisabled:h,itemSize:v,isMounted:Qe(),mergedTheme:s,filteredSrcOpts:y,filteredTgtOpts:g,srcPattern:t,tgtPattern:u,mergedSize:a,mergedSrcFilterable:M,handleSrcFilterUpdateValue:F,handleTgtFilterUpdateValue:ie,handleSourceCheckAll:ne,handleSourceUncheckAll:se,handleTargetClearAll:de,handleItemCheck:X,handleChecked:ce,cssVars:m(()=>{const{value:b}=a,{common:{cubicBezierEaseInOut:x},self:{borderRadius:k,borderColor:L,listColor:P,titleTextColor:N,titleTextColorDisabled:ue,extraTextColor:fe,itemTextColor:he,itemColorPending:ve,itemTextColorDisabled:me,titleFontWeight:be,closeColorHover:ge,closeColorPressed:pe,closeIconColor:xe,closeIconColorHover:Se,closeIconColorPressed:Ce,closeIconSize:Te,closeSize:Re,dividerColor:ye,extraTextColorDisabled:ze,[U("extraFontSize",b)]:ke,[U("fontSize",b)]:we,[U("titleFontSize",b)]:Fe,[U("itemHeight",b)]:Oe,[U("headerHeight",b)]:_e}}=s.value;return{"--n-bezier":x,"--n-border-color":L,"--n-border-radius":k,"--n-extra-font-size":ke,"--n-font-size":we,"--n-header-font-size":Fe,"--n-header-extra-text-color":fe,"--n-header-extra-text-color-disabled":ze,"--n-header-font-weight":be,"--n-header-text-color":N,"--n-header-text-color-disabled":ue,"--n-item-color-pending":ve,"--n-item-height":Oe,"--n-item-text-color":he,"--n-item-text-color-disabled":me,"--n-list-color":P,"--n-header-height":_e,"--n-close-size":Re,"--n-close-icon-size":Te,"--n-close-color-hover":ge,"--n-close-color-pressed":pe,"--n-close-icon-color":xe,"--n-close-icon-color-hover":Se,"--n-close-icon-color-pressed":Ce,"--n-divider-color":ye}})}},render(){const{mergedClsPrefix:e,renderSourceList:o,renderTargetList:r,mergedTheme:s,mergedSrcFilterable:c,targetFilterable:a}=this;return l("div",{class:[`${e}-transfer`,this.mergedDisabled&&`${e}-transfer--disabled`],style:this.cssVars},l("div",{class:`${e}-transfer-list ${e}-transfer-list--source`},l(te,{source:!0,selectAllText:this.selectAllText,clearText:this.clearText,title:this.sourceTitle,onCheckedAll:this.handleSourceCheckAll,onClearAll:this.handleSourceUncheckAll,size:this.mergedSize}),l("div",{class:`${e}-transfer-list-body`},c?l(ee,{onUpdateValue:this.handleSrcFilterUpdateValue,value:this.srcPattern,disabled:this.mergedDisabled,placeholder:this.sourceFilterPlaceholder}):null,l("div",{class:`${e}-transfer-list-flex-container`},o?l(G,{theme:s.peers.Scrollbar,themeOverrides:s.peerOverrides.Scrollbar},{default:()=>o({onCheck:this.handleChecked,checkedOptions:this.filteredTgtOpts,pattern:this.srcPattern})}):l(le,{source:!0,options:this.filteredSrcOpts,disabled:this.mergedDisabled,virtualScroll:this.virtualScroll,itemSize:this.itemSize}))),l("div",{class:`${e}-transfer-list__border`})),l("div",{class:`${e}-transfer-list ${e}-transfer-list--target`},l(te,{onClearAll:this.handleTargetClearAll,size:this.mergedSize,title:this.targetTitle}),l("div",{class:`${e}-transfer-list-body`},a?l(ee,{onUpdateValue:this.handleTgtFilterUpdateValue,value:this.tgtPattern,disabled:this.mergedDisabled,placeholder:this.sourceFilterPlaceholder}):null,l("div",{class:`${e}-transfer-list-flex-container`},r?l(G,{theme:s.peers.Scrollbar,themeOverrides:s.peerOverrides.Scrollbar},{default:()=>r({onCheck:this.handleChecked,checkedOptions:this.filteredTgtOpts,pattern:this.tgtPattern})}):l(le,{options:this.filteredTgtOpts,disabled:this.mergedDisabled,virtualScroll:this.virtualScroll,itemSize:this.itemSize}))),l("div",{class:`${e}-transfer-list__border`})))}}),mt={class:"flex justify-end mt-4 gap-2"},xt=I({__name:"ToolGroupFormModal",props:{show:{type:Boolean,default:!1},editMode:{type:Boolean,default:!1},initialData:{type:Object,required:!0},availableTools:{type:Array,default:()=>[]}},emits:["update:show","submit"],setup(e,{emit:o}){const r=e,s=o,c=B(null),a=B({}),h=m(()=>r.availableTools.map(i=>({label:i.name,value:i.id,disabled:!1,description:i.description})));Q(()=>r.initialData,i=>{a.value=JSON.parse(JSON.stringify(i))},{immediate:!0,deep:!0}),Q(()=>r.show,i=>{i||(a.value=JSON.parse(JSON.stringify(r.initialData)))});function v(){c.value?.validate(i=>{i||s("submit",a.value)})}const d=m({get:()=>r.show,set:i=>s("update:show",i)});function n(){s("update:show",!1)}return(i,f)=>{const R=K,w=at;return d.value?(et(),tt(w,{key:0,show:d.value,"onUpdate:show":f[3]||(f[3]=g=>d.value=g),title:e.editMode?"编辑工具组":"新建工具组",preset:"card",style:{width:"60vw"},"mask-closable":!1},{default:A(()=>[O(V(nt),{ref_key:"formRef",ref:c,model:a.value,"label-placement":"left","label-width":"80","require-mark-placement":"right-hanging"},{default:A(()=>[O(V(J),{label:"组名称",path:"name",rule:{required:!0,message:"请输入工具组名称"}},{default:A(()=>[O(V(W),{value:a.value.name,"onUpdate:value":f[0]||(f[0]=g=>a.value.name=g),placeholder:"请输入工具组名称"},null,8,["value"])]),_:1}),O(V(J),{label:"描述",path:"description"},{default:A(()=>[O(V(W),{value:a.value.description,"onUpdate:value":f[1]||(f[1]=g=>a.value.description=g),type:"textarea",placeholder:"请输入工具组描述",autosize:{minRows:3,maxRows:5}},null,8,["value"])]),_:1}),O(V(J),{label:"关联工具",path:"toolIds"},{default:A(()=>[O(V(vt),{value:a.value.toolIds,"onUpdate:value":f[2]||(f[2]=g=>a.value.toolIds=g),options:h.value,filterable:"","source-title":"可选工具","target-title":"已选工具",size:"large"},null,8,["value","options"])]),_:1}),rt("div",mt,[O(R,{onClick:n},{default:A(()=>[...f[4]||(f[4]=[Z(" 取消 ",-1)])]),_:1}),O(R,{type:"primary",onClick:v},{default:A(()=>[Z(lt(e.editMode?"保存修改":"创建工具组"),1)]),_:1})])]),_:1},8,["model"])]),_:1},8,["show","title"])):ot("",!0)}}});export{xt as _};
