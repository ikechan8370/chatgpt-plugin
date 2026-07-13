import{as as $,a9 as f,at as k,b1 as p,bW as O,bX as q,d as M,H as a,ac as A,bi as F,af as E,cw as G,b5 as K,ah as W,P as Q,aL as X,ai as J,aM as Y,a$ as Z,p as V,m as U,o as h,c as w,a as c,q as ee,v as re,e as l,w as d,g as P,u as n,B as z,N as oe,cu as te,W as se,b as S,Q as ae,R as ne,z as ie,t as le,a2 as j,cv as de,j as m,k as ce}from"./index-DiOlaFw7.js";import{I as ue}from"./preview-open-CKotEAXT.js";import{N as ve,_ as me}from"./ConversationDetailDrawer.vue_vue_type_script_setup_true_lang-DBpboPzH.js";import{N as fe}from"./DataTable-XCAY1Qt1.js";import{N as pe}from"./text-BRvV26J-.js";import{N as he}from"./Popconfirm-BzNLpFVp.js";import"./MessageContentCard-2yw-Wtr8.js";import"./CollapseItem-BsiRv73D.js";import"./Image-De0g31j9.js";import"./download-C2161hUv.js";import"./Code-D2VK6okE.js";import"./Checkbox-0QrpZrph.js";import"./RadioGroup-B4CgCHxQ.js";import"./Ellipsis-CVquosyY.js";import"./prop-NnGblK-3.js";const be=$([f("list",`
 --n-merged-border-color: var(--n-border-color);
 --n-merged-color: var(--n-color);
 --n-merged-color-hover: var(--n-color-hover);
 margin: 0;
 font-size: var(--n-font-size);
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 padding: 0;
 list-style-type: none;
 color: var(--n-text-color);
 background-color: var(--n-merged-color);
 `,[k("show-divider",[f("list-item",[$("&:not(:last-child)",[p("divider",`
 background-color: var(--n-merged-border-color);
 `)])])]),k("clickable",[f("list-item",`
 cursor: pointer;
 `)]),k("bordered",`
 border: 1px solid var(--n-merged-border-color);
 border-radius: var(--n-border-radius);
 `),k("hoverable",[f("list-item",`
 border-radius: var(--n-border-radius);
 `,[$("&:hover",`
 background-color: var(--n-merged-color-hover);
 `,[p("divider",`
 background-color: transparent;
 `)])])]),k("bordered, hoverable",[f("list-item",`
 padding: 12px 20px;
 `),p("header, footer",`
 padding: 12px 20px;
 `)]),p("header, footer",`
 padding: 12px 0;
 box-sizing: border-box;
 transition: border-color .3s var(--n-bezier);
 `,[$("&:not(:last-child)",`
 border-bottom: 1px solid var(--n-merged-border-color);
 `)]),f("list-item",`
 position: relative;
 padding: 12px 0; 
 box-sizing: border-box;
 display: flex;
 flex-wrap: nowrap;
 align-items: center;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[p("prefix",`
 margin-right: 20px;
 flex: 0;
 `),p("suffix",`
 margin-left: 20px;
 flex: 0;
 `),p("main",`
 flex: 1;
 `),p("divider",`
 height: 1px;
 position: absolute;
 bottom: 0;
 left: 0;
 right: 0;
 background-color: transparent;
 transition: background-color .3s var(--n-bezier);
 pointer-events: none;
 `)])]),O(f("list",`
 --n-merged-color-hover: var(--n-color-hover-modal);
 --n-merged-color: var(--n-color-modal);
 --n-merged-border-color: var(--n-border-color-modal);
 `)),q(f("list",`
 --n-merged-color-hover: var(--n-color-hover-popover);
 --n-merged-color: var(--n-color-popover);
 --n-merged-border-color: var(--n-border-color-popover);
 `))]),ge=Object.assign(Object.assign({},E.props),{size:{type:String,default:"medium"},bordered:Boolean,clickable:Boolean,hoverable:Boolean,showDivider:{type:Boolean,default:!0}}),H=X("n-list"),xe=M({name:"List",props:ge,slots:Object,setup(t){const{mergedClsPrefixRef:e,inlineThemeDisabled:s,mergedRtlRef:v}=A(t),g=F("List",v,e),N=E("List","-list",be,G,t,e);K(H,{showDividerRef:J(t,"showDivider"),mergedClsPrefixRef:e});const b=Q(()=>{const{common:{cubicBezierEaseInOut:_},self:{fontSize:C,textColor:x,color:y,colorModal:I,colorPopover:D,borderColor:R,borderColorModal:B,borderColorPopover:r,borderRadius:o,colorHover:i,colorHoverModal:L,colorHoverPopover:T}}=N.value;return{"--n-font-size":C,"--n-bezier":_,"--n-text-color":x,"--n-color":y,"--n-border-radius":o,"--n-border-color":R,"--n-border-color-modal":B,"--n-border-color-popover":r,"--n-color-modal":I,"--n-color-popover":D,"--n-color-hover":i,"--n-color-hover-modal":L,"--n-color-hover-popover":T}}),u=s?W("list",void 0,b,t):void 0;return{mergedClsPrefix:e,rtlEnabled:g,cssVars:s?void 0:b,themeClass:u?.themeClass,onRender:u?.onRender}},render(){var t;const{$slots:e,mergedClsPrefix:s,onRender:v}=this;return v?.(),a("ul",{class:[`${s}-list`,this.rtlEnabled&&`${s}-list--rtl`,this.bordered&&`${s}-list--bordered`,this.showDivider&&`${s}-list--show-divider`,this.hoverable&&`${s}-list--hoverable`,this.clickable&&`${s}-list--clickable`,this.themeClass],style:this.cssVars},e.header?a("div",{class:`${s}-list__header`},e.header()):null,(t=e.default)===null||t===void 0?void 0:t.call(e),e.footer?a("div",{class:`${s}-list__footer`},e.footer()):null)}}),ye=M({name:"ListItem",slots:Object,setup(){const t=Y(H,null);return t||Z("list-item","`n-list-item` must be placed in `n-list`."),{showDivider:t.showDividerRef,mergedClsPrefix:t.mergedClsPrefixRef}},render(){const{$slots:t,mergedClsPrefix:e}=this;return a("li",{class:`${e}-list-item`},t.prefix?a("div",{class:`${e}-list-item__prefix`},t.prefix()):null,t.default?a("div",{class:`${e}-list-item__main`},t):null,t.suffix?a("div",{class:`${e}-list-item__suffix`},t.suffix()):null,this.showDivider&&a("div",{class:`${e}-list-item__divider`}))}});function ke(){return V.Get("/api/state/list",{params:{pageSize:100}})}function we(t){return V.Delete(`/api/state/${t}`)}function _e(t,e){return V.Get(`/api/state/history/${e}`,{params:{messageId:t}})}const Ce={style:{display:"inline-block"},viewBox:"0 0 48 48",width:"1.2em",height:"1.2em"};function $e(t,e){return h(),w("svg",Ce,[...e[0]||(e[0]=[c("g",{fill:"none",stroke:"currentColor","stroke-linejoin":"round","stroke-width":"4"},[c("path",{d:"M9 10v34h30V10z"}),c("path",{"stroke-linecap":"round",d:"M20 20v13m8-13v13M4 10h40"}),c("path",{d:"m16 10l3.289-6h9.488L32 10z"})],-1)])])}const ze=U({name:"icon-park-outline-delete",render:$e}),Ne={style:{display:"inline-block"},viewBox:"0 0 48 48",width:"1.2em",height:"1.2em"};function Ie(t,e){return h(),w("svg",Ne,[...e[0]||(e[0]=[c("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"4",d:"M44 24c0 11.046-8.954 20-20 20H4V24C4 12.954 12.954 4 24 4s20 8.954 20 20m-30-6h18m-18 8h18m-18 8h10"},null,-1)])])}const De=U({name:"icon-park-outline-message",render:Ie}),Re={class:"chaite-page"},Be={class:"chaite-page-header"},Pe={key:0,class:"flex justify-center items-center py-8"},je=M({__name:"index",setup(t){const e=ee(),s=m([]),v=m(!1),g=m(!1),N=m(""),b=m([]),u=m(!1),_=m(null),C=m([]),x=m(!1);async function y(){v.value=!0;try{const r=await ke();r.code===0?s.value=Array.isArray(r.data)?r.data:r.data.items||[]:e.error(r.message||"加载用户状态失败")}catch(r){e.error(r.message||"获取用户状态时发生错误")}finally{v.value=!1}}function I(r){N.value=r;const o=s.value.find(i=>i.userId===r);o&&(b.value=o.conversations,g.value=!0)}async function D(r){try{const o=await we(r);o.code===0?(e.success("删除用户状态成功"),await y()):e.error(o.message||"删除用户状态失败")}catch(o){e.error(o.message||"删除用户状态时发生错误")}}async function R(r){_.value=r,u.value=!0,x.value=!0;try{const o=await _e(r.lastMessageId,r.id);o.code===0?C.value=o.data:e.error(o.message||"获取对话历史失败")}catch(o){e.error(o.message||"获取对话历史时发生错误")}finally{x.value=!1}}const B=[{title:"用户ID",key:"userId"},{title:"昵称",key:"nickname",render:r=>r.nickname||"未设置"},{title:"对话数量",key:"conversationCount",render:r=>r.conversations?.length||0},{title:"当前对话",key:"currentConversation",render:r=>{const o=r.conversations?.find(i=>i.id===r.current.conversationId);return o?o.name:"无"}},{title:"预设",key:"settings.preset",render:r=>r.settings?.preset||"默认"},{title:"模型",key:"settings.model",render:r=>r.settings?.model||"未设置"},{title:"操作",key:"actions",render:r=>[a(z,{quaternary:!0,size:"small",onClick:()=>I(r.userId)},{default:()=>"查看对话",icon:()=>a(j,null,{default:()=>a(De)})}),a(he,{onPositiveClick:()=>D(r.userId.toString())},{trigger:()=>a(z,{quaternary:!0,size:"small",type:"error"},{default:()=>"删除",icon:()=>a(j,null,{default:()=>a(ze)})}),default:()=>"确定要删除此用户状态吗？此操作不可撤销。"})]}];return re(()=>{y()}),(r,o)=>(h(),w("div",Re,[c("header",Be,[o[3]||(o[3]=c("div",null,[c("h1",null,"用户与会话"),c("p",null,"查看用户当前模型、预设和历史对话。")],-1)),l(n(z),{type:"primary",onClick:y},{default:d(()=>[...o[2]||(o[2]=[P("刷新",-1)])]),_:1})]),l(n(oe),{class:"chaite-panel",bordered:!1},{default:d(()=>[l(n(ve),{show:v.value},{default:d(()=>[l(n(fe),{columns:B,data:s.value,bordered:!1,striped:""},null,8,["data"])]),_:1},8,["show"])]),_:1}),l(n(de),{show:g.value,"onUpdate:show":o[0]||(o[0]=i=>g.value=i),width:500},{default:d(()=>[l(n(te),{title:"用户对话列表",closable:""},{default:d(()=>[b.value.length===0?(h(),w("div",Pe,[l(n(se),{description:"该用户没有对话记录"})])):(h(),S(n(xe),{key:1},{default:d(()=>[(h(!0),w(ae,null,ne(b.value,i=>(h(),S(n(ye),{key:i.id},{default:d(()=>[l(n(ie),{justify:"space-between",align:"center"},{default:d(()=>[c("div",null,[l(n(pe),null,{default:d(()=>[P(le(i.name),1)]),_:2},1024)]),c("div",null,[l(n(z),{text:"",type:"primary",onClick:L=>R(i)},{icon:d(()=>[l(n(j),null,{default:d(()=>[l(n(ue))]),_:1})]),default:d(()=>[o[4]||(o[4]=P(" 查看详情 ",-1))]),_:1},8,["onClick"])])]),_:2},1024)]),_:2},1024))),128))]),_:1}))]),_:1})]),_:1},8,["show"]),l(me,{show:u.value,"onUpdate:show":o[1]||(o[1]=i=>u.value=i),conversation:_.value,history:C.value,loading:x.value},null,8,["show","conversation","history","loading"])]))}}),Qe=ce(je,[["__scopeId","data-v-4aa16cc4"]]);export{Qe as default};
