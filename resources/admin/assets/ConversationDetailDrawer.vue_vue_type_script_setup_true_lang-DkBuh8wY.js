import A from"./MessageContentCard-2kPSQasb.js";import{bP as K,a9 as M,cu as L,aa as i,ar as p,aq as f,aX as l,d as w,ad as P,ag as _,a$ as U,H as m,aF as X,aK as S,aU as $,aG as q,aV as G,ai as Q,P as b,at as v,bn as J,o as h,b as x,w as z,e as C,u,cv as Y,c as T,W as Z,Q as ee,R as te,X as ie,n as ne,cw as oe}from"./index-BWDkVURg.js";import{N as re}from"./Spin-w0bRr_kr.js";let k=!1;function le(){if(K&&window.CSS&&!k&&(k=!0,"registerProperty"in window?.CSS))try{CSS.registerProperty({name:"--n-color-start",syntax:"<color>",inherits:!1,initialValue:"#0000"}),CSS.registerProperty({name:"--n-color-end",syntax:"<color>",inherits:!1,initialValue:"#0000"})}catch{}}function ae(e){const{textColor3:n,infoColor:o,errorColor:r,successColor:t,warningColor:a,textColor1:s,textColor2:d,railColor:c,fontWeightStrong:g,fontSize:y}=e;return Object.assign(Object.assign({},L),{contentFontSize:y,titleFontWeight:g,circleBorder:`2px solid ${n}`,circleBorderInfo:`2px solid ${o}`,circleBorderError:`2px solid ${r}`,circleBorderSuccess:`2px solid ${t}`,circleBorderWarning:`2px solid ${a}`,iconColor:n,iconColorInfo:o,iconColorError:r,iconColorSuccess:t,iconColorWarning:a,titleTextColor:s,contentTextColor:d,metaTextColor:n,lineColor:c})}const se={common:M,self:ae},B=1.25,ce=i("timeline",`
 position: relative;
 width: 100%;
 display: flex;
 flex-direction: column;
 line-height: ${B};
`,[p("horizontal",`
 flex-direction: row;
 `,[f(">",[i("timeline-item",`
 flex-shrink: 0;
 padding-right: 40px;
 `,[p("dashed-line-type",[f(">",[i("timeline-item-timeline",[l("line",`
 background-image: linear-gradient(90deg, var(--n-color-start), var(--n-color-start) 50%, transparent 50%, transparent 100%);
 background-size: 10px 1px;
 `)])])]),f(">",[i("timeline-item-content",`
 margin-top: calc(var(--n-icon-size) + 12px);
 `,[f(">",[l("meta",`
 margin-top: 6px;
 margin-bottom: unset;
 `)])]),i("timeline-item-timeline",`
 width: 100%;
 height: calc(var(--n-icon-size) + 12px);
 `,[l("line",`
 left: var(--n-icon-size);
 top: calc(var(--n-icon-size) / 2 - 1px);
 right: 0px;
 width: unset;
 height: 2px;
 `)])])])])]),p("right-placement",[i("timeline-item",[i("timeline-item-content",`
 text-align: right;
 margin-right: calc(var(--n-icon-size) + 12px);
 `),i("timeline-item-timeline",`
 width: var(--n-icon-size);
 right: 0;
 `)])]),p("left-placement",[i("timeline-item",[i("timeline-item-content",`
 margin-left: calc(var(--n-icon-size) + 12px);
 `),i("timeline-item-timeline",`
 left: 0;
 `)])]),i("timeline-item",`
 position: relative;
 `,[f("&:last-child",[i("timeline-item-timeline",[l("line",`
 display: none;
 `)]),i("timeline-item-content",[l("meta",`
 margin-bottom: 0;
 `)])]),i("timeline-item-content",[l("title",`
 margin: var(--n-title-margin);
 font-size: var(--n-title-font-size);
 transition: color .3s var(--n-bezier);
 font-weight: var(--n-title-font-weight);
 color: var(--n-title-text-color);
 `),l("content",`
 transition: color .3s var(--n-bezier);
 font-size: var(--n-content-font-size);
 color: var(--n-content-text-color);
 `),l("meta",`
 transition: color .3s var(--n-bezier);
 font-size: 12px;
 margin-top: 6px;
 margin-bottom: 20px;
 color: var(--n-meta-text-color);
 `)]),p("dashed-line-type",[i("timeline-item-timeline",[l("line",`
 --n-color-start: var(--n-line-color);
 transition: --n-color-start .3s var(--n-bezier);
 background-color: transparent;
 background-image: linear-gradient(180deg, var(--n-color-start), var(--n-color-start) 50%, transparent 50%, transparent 100%);
 background-size: 1px 10px;
 `)])]),i("timeline-item-timeline",`
 width: calc(var(--n-icon-size) + 12px);
 position: absolute;
 top: calc(var(--n-title-font-size) * ${B} / 2 - var(--n-icon-size) / 2);
 height: 100%;
 `,[l("circle",`
 border: var(--n-circle-border);
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 width: var(--n-icon-size);
 height: var(--n-icon-size);
 border-radius: var(--n-icon-size);
 box-sizing: border-box;
 `),l("icon",`
 color: var(--n-icon-color);
 font-size: var(--n-icon-size);
 height: var(--n-icon-size);
 width: var(--n-icon-size);
 display: flex;
 align-items: center;
 justify-content: center;
 `),l("line",`
 transition: background-color .3s var(--n-bezier);
 position: absolute;
 top: var(--n-icon-size);
 left: calc(var(--n-icon-size) / 2 - 1px);
 bottom: 0px;
 width: 2px;
 background-color: var(--n-line-color);
 `)])])]),me=Object.assign(Object.assign({},_.props),{horizontal:Boolean,itemPlacement:{type:String,default:"left"},size:{type:String,default:"medium"},iconSize:Number}),N=X("n-timeline"),de=w({name:"Timeline",props:me,setup(e,{slots:n}){const{mergedClsPrefixRef:o}=P(e),r=_("Timeline","-timeline",ce,se,e,o);return U(N,{props:e,mergedThemeRef:r,mergedClsPrefixRef:o}),()=>{const{value:t}=o;return m("div",{class:[`${t}-timeline`,e.horizontal&&`${t}-timeline--horizontal`,`${t}-timeline--${e.size}-size`,!e.horizontal&&`${t}-timeline--${e.itemPlacement}-placement`]},n)}}}),ue={time:[String,Number],title:String,content:String,color:String,lineType:{type:String,default:"default"},type:{type:String,default:"default"}},he=w({name:"TimelineItem",props:ue,slots:Object,setup(e){const n=q(N);n||G("timeline-item","`n-timeline-item` must be placed inside `n-timeline`."),le();const{inlineThemeDisabled:o}=P(),r=b(()=>{const{props:{size:a,iconSize:s},mergedThemeRef:d}=n,{type:c}=e,{self:{titleTextColor:g,contentTextColor:y,metaTextColor:R,lineColor:j,titleFontWeight:I,contentFontSize:V,[v("iconSize",a)]:D,[v("titleMargin",a)]:F,[v("titleFontSize",a)]:E,[v("circleBorder",c)]:W,[v("iconColor",c)]:O},common:{cubicBezierEaseInOut:H}}=d.value;return{"--n-bezier":H,"--n-circle-border":W,"--n-icon-color":O,"--n-content-font-size":V,"--n-content-text-color":y,"--n-line-color":j,"--n-meta-text-color":R,"--n-title-font-size":E,"--n-title-font-weight":I,"--n-title-margin":F,"--n-title-text-color":g,"--n-icon-size":J(s)||D}}),t=o?Q("timeline-item",b(()=>{const{props:{size:a,iconSize:s}}=n,{type:d}=e;return`${a[0]}${s||"a"}${d[0]}`}),r,n.props):void 0;return{mergedClsPrefix:n.mergedClsPrefixRef,cssVars:o?void 0:r,themeClass:t?.themeClass,onRender:t?.onRender}},render(){const{mergedClsPrefix:e,color:n,onRender:o,$slots:r}=this;return o?.(),m("div",{class:[`${e}-timeline-item`,this.themeClass,`${e}-timeline-item--${this.type}-type`,`${e}-timeline-item--${this.lineType}-line-type`],style:this.cssVars},m("div",{class:`${e}-timeline-item-timeline`},m("div",{class:`${e}-timeline-item-timeline__line`}),S(r.icon,t=>t?m("div",{class:`${e}-timeline-item-timeline__icon`,style:{color:n}},t):m("div",{class:`${e}-timeline-item-timeline__circle`,style:{borderColor:n}}))),m("div",{class:`${e}-timeline-item-content`},S(r.header,t=>t||this.title?m("div",{class:`${e}-timeline-item-content__title`},t||this.title):null),m("div",{class:`${e}-timeline-item-content__content`},$(r.default,()=>[this.content])),m("div",{class:`${e}-timeline-item-content__meta`},$(r.footer,()=>[this.time]))))}}),ge={key:0,class:"flex justify-center items-center py-8"},ze=w({__name:"ConversationDetailDrawer",props:{show:{type:Boolean},conversation:{},history:{},loading:{type:Boolean}},emits:["update:show"],setup(e,{emit:n}){const o=e,r=n;function t(s){r("update:show",s)}const a=b(()=>[...o.history].sort((s,d)=>new Date(s.createdAt||"").getTime()-new Date(d.createdAt||"").getTime()));return(s,d)=>(h(),x(u(oe),{show:o.show,width:800,"onUpdate:show":t},{default:z(()=>[C(u(Y),{title:e.conversation?`对话详情: ${e.conversation.name}`:"对话详情",closable:""},{default:z(()=>[C(u(re),{show:e.loading},{default:z(()=>[!e.conversation||e.history.length===0?(h(),T("div",ge,[C(u(Z),{description:"无对话记录"})])):(h(),x(u(de),{key:1},{default:z(()=>[(h(!0),T(ee,null,te(a.value,(c,g)=>(h(),x(u(he),{key:c.id,type:c.role==="user"?"info":"success",title:c.role==="user"?"用户":"AI",time:c.createdAt},{default:z(()=>[C(A,{message:c},null,8,["message"]),g<e.history.length-1?(h(),x(u(ie),{key:0})):ne("",!0)]),_:2},1032,["type","title","time"]))),128))]),_:1}))]),_:1},8,["show"])]),_:1},8,["title"])]),_:1},8,["show"]))}});export{ze as _};
