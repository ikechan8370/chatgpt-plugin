import{a9 as p,at as G,as as k,b1 as O,bf as V,b2 as X,d as J,H as u,bg as ce,bh as me,ac as ie,bi as fe,af as le,bj as ve,b5 as be,aL as ge,aQ as Y,bk as he,aa as Z,a_ as H,bl as ye,bm as xe,Q as ee,aM as we,a$ as ze,ah as Ce,P as _,ai as te,av as I,ak as se,q as ke,l as Ie,s as Pe,v as Ne,o as j,c as q,a as l,e as a,w as r,u as s,g as y,x as T,D as oe,b as ae,n as ne,t as M,B as L,j as R,J as Se,k as Ue}from"./index-DiOlaFw7.js";import{h as $e,c as Te,t as Re}from"./channels-37ABqs0b.js";import{c as Be,a as _e}from"./presets-BS3U3IDk.js";import{f as Ke}from"./processors-CfsNJP5j.js";import{f as Ee}from"./toolGroup-DU7iLmXF.js";import{f as Ae,s as je}from"./config-C1didKoV.js";import{N as b,_ as re}from"./FormItem-vKUhSOMB.js";import{N as Fe}from"./RadioGroup-B4CgCHxQ.js";import{N as Q}from"./RadioButton-DUVibC9o.js";import{a as De,N as B}from"./Checkbox-0QrpZrph.js";import{N as F}from"./InputNumber-CWos1ewn.js";import{_ as Ge}from"./Alert-yZ-OHbHS.js";const Oe=p("steps",`
 width: 100%;
 display: flex;
`,[p("step",`
 position: relative;
 display: flex;
 flex: 1;
 `,[G("disabled","cursor: not-allowed"),G("clickable",`
 cursor: pointer;
 `),k("&:last-child",[p("step-splitor","display: none;")])]),p("step-splitor",`
 background-color: var(--n-splitor-color);
 margin-top: calc(var(--n-step-header-font-size) / 2);
 height: 1px;
 flex: 1;
 align-self: flex-start;
 margin-left: 12px;
 margin-right: 12px;
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `),p("step-content","flex: 1;",[p("step-content-header",`
 color: var(--n-header-text-color);
 margin-top: calc(var(--n-indicator-size) / 2 - var(--n-step-header-font-size) / 2);
 line-height: var(--n-step-header-font-size);
 font-size: var(--n-step-header-font-size);
 position: relative;
 display: flex;
 font-weight: var(--n-step-header-font-weight);
 margin-left: 9px;
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `,[O("title",`
 white-space: nowrap;
 flex: 0;
 `)]),O("description",`
 color: var(--n-description-text-color);
 margin-top: 12px;
 margin-left: 9px;
 transition:
 color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 `)]),p("step-indicator",`
 background-color: var(--n-indicator-color);
 box-shadow: 0 0 0 1px var(--n-indicator-border-color);
 height: var(--n-indicator-size);
 width: var(--n-indicator-size);
 border-radius: 50%;
 display: flex;
 align-items: center;
 justify-content: center;
 transition:
 background-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier);
 `,[p("step-indicator-slot",`
 position: relative;
 width: var(--n-indicator-icon-size);
 height: var(--n-indicator-icon-size);
 font-size: var(--n-indicator-icon-size);
 line-height: var(--n-indicator-icon-size);
 `,[O("index",`
 display: inline-block;
 text-align: center;
 position: absolute;
 left: 0;
 top: 0;
 white-space: nowrap;
 font-size: var(--n-indicator-index-font-size);
 width: var(--n-indicator-icon-size);
 height: var(--n-indicator-icon-size);
 line-height: var(--n-indicator-icon-size);
 color: var(--n-indicator-text-color);
 transition: color .3s var(--n-bezier);
 `,[V()]),p("icon",`
 color: var(--n-indicator-text-color);
 transition: color .3s var(--n-bezier);
 `,[V()]),p("base-icon",`
 color: var(--n-indicator-text-color);
 transition: color .3s var(--n-bezier);
 `,[V()])])]),G("vertical","flex-direction: column;",[X("show-description",[k(">",[p("step","padding-bottom: 8px;")])]),k(">",[p("step","margin-bottom: 16px;",[k("&:last-child","margin-bottom: 0;"),k(">",[p("step-indicator",[k(">",[p("step-splitor",`
 position: absolute;
 bottom: -8px;
 width: 1px;
 margin: 0 !important;
 left: calc(var(--n-indicator-size) / 2);
 height: calc(100% - var(--n-indicator-size));
 `)])]),p("step-content",[O("description","margin-top: 8px;")])])])])]),G("content-bottom",[X("vertical",[k(">",[p("step","flex-direction: column",[k(">",[p("step-line","display: flex;",[k(">",[p("step-splitor",`
 margin-top: 0;
 align-self: center;
 `)])])]),k(">",[p("step-content","margin-top: calc(var(--n-indicator-size) / 2 - var(--n-step-header-font-size) / 2);",[p("step-content-header",`
 margin-left: 0;
 `),p("step-content__description",`
 margin-left: 0;
 `)])])])])])])]);function Me(n,c){return typeof n!="object"||n===null||Array.isArray(n)?null:(n.props||(n.props={}),n.props.internalIndex=c+1,n)}function Ve(n){return n.map((c,g)=>Me(c,g))}const He=Object.assign(Object.assign({},le.props),{current:Number,status:{type:String,default:"process"},size:{type:String,default:"medium"},vertical:Boolean,contentPlacement:{type:String,default:"right"},"onUpdate:current":[Function,Array],onUpdateCurrent:[Function,Array]}),de=ge("n-steps"),qe=J({name:"Steps",props:He,slots:Object,setup(n,{slots:c}){const{mergedClsPrefixRef:g,mergedRtlRef:m}=ie(n),w=fe("Steps",m,g),h=le("Steps","-steps",Oe,ve,n,g);return be(de,{props:n,mergedThemeRef:h,mergedClsPrefixRef:g,stepsSlots:c}),{mergedClsPrefix:g,rtlEnabled:w}},render(){const{mergedClsPrefix:n}=this;return u("div",{class:[`${n}-steps`,this.rtlEnabled&&`${n}-steps--rtl`,this.vertical&&`${n}-steps--vertical`,this.contentPlacement==="bottom"&&`${n}-steps--content-bottom`]},Ve(ce(me(this))))}}),Le={status:String,title:String,description:String,disabled:Boolean,internalIndex:{type:Number,default:0}},W=J({name:"Step",props:Le,slots:Object,setup(n){const c=we(de,null);c||ze("step","`n-step` must be placed inside `n-steps`.");const{inlineThemeDisabled:g}=ie(),{props:m,mergedThemeRef:w,mergedClsPrefixRef:h,stepsSlots:$}=c,P=te(m,"vertical"),N=te(m,"contentPlacement"),S=_(()=>{const{status:d}=n;if(d)return d;{const{internalIndex:f}=n,{current:i}=m;if(i===void 0)return"process";if(f<i)return"finish";if(f===i)return m.status||"process";if(f>i)return"wait"}return"process"}),e=_(()=>{const{value:d}=S,{size:f}=m,{common:{cubicBezierEaseInOut:i},self:{stepHeaderFontWeight:t,[I("stepHeaderFontSize",f)]:o,[I("indicatorIndexFontSize",f)]:v,[I("indicatorSize",f)]:K,[I("indicatorIconSize",f)]:E,[I("indicatorTextColor",d)]:A,[I("indicatorBorderColor",d)]:U,[I("headerTextColor",d)]:C,[I("splitorColor",d)]:D,[I("indicatorColor",d)]:pe,[I("descriptionTextColor",d)]:ue}}=w.value;return{"--n-bezier":i,"--n-description-text-color":ue,"--n-header-text-color":C,"--n-indicator-border-color":U,"--n-indicator-color":pe,"--n-indicator-icon-size":E,"--n-indicator-index-font-size":v,"--n-indicator-size":K,"--n-indicator-text-color":A,"--n-splitor-color":D,"--n-step-header-font-size":o,"--n-step-header-font-weight":t}}),x=g?Ce("step",_(()=>{const{value:d}=S,{size:f}=m;return`${d[0]}${f[0]}`}),e,m):void 0,z=_(()=>{if(n.disabled)return;const{onUpdateCurrent:d,"onUpdate:current":f}=m;return d||f?()=>{d&&se(d,n.internalIndex),f&&se(f,n.internalIndex)}:void 0});return{stepsSlots:$,mergedClsPrefix:h,vertical:P,mergedStatus:S,handleStepClick:z,cssVars:g?void 0:e,themeClass:x?.themeClass,onRender:x?.onRender,contentPlacement:N}},render(){const{mergedClsPrefix:n,onRender:c,handleStepClick:g,disabled:m,contentPlacement:w,vertical:h}=this,$=Y(this.$slots.default,x=>{const z=x||this.description;return z?u("div",{class:`${n}-step-content__description`},z):null}),P=u("div",{class:`${n}-step-splitor`}),N=u("div",{class:`${n}-step-indicator`,key:w},u("div",{class:`${n}-step-indicator-slot`},u(he,null,{default:()=>Y(this.$slots.icon,x=>{const{mergedStatus:z,stepsSlots:d}=this;return z==="finish"||z==="error"?z==="finish"?u(Z,{clsPrefix:n,key:"finish"},{default:()=>H(d["finish-icon"],()=>[u(ye,null)])}):z==="error"?u(Z,{clsPrefix:n,key:"error"},{default:()=>H(d["error-icon"],()=>[u(xe,null)])}):null:x||u("div",{key:this.internalIndex,class:`${n}-step-indicator-slot__index`},this.internalIndex)})})),h?P:null),S=u("div",{class:`${n}-step-content`},u("div",{class:`${n}-step-content-header`},u("div",{class:`${n}-step-content-header__title`},H(this.$slots.title,()=>[this.title])),!h&&w==="right"?P:null),$);let e;return!h&&w==="bottom"?e=u(ee,null,u("div",{class:`${n}-step-line`},N,P),S):e=u(ee,null,N,S),c?.(),u("div",{class:[`${n}-step`,m&&`${n}-step--disabled`,!m&&g&&`${n}-step--clickable`,this.themeClass,$&&`${n}-step--show-description`,`${n}-step--${this.mergedStatus}-status`],style:this.cssVars,onClick:g},e)}}),Qe={class:"chaite-page setup-page"},We={key:0,class:"setup-grid"},Je={class:"chaite-panel form-panel","data-tour":"quick-setup"},Xe={class:"two"},Ye={class:"two"},Ze={class:"chaite-panel form-panel"},et={class:"two"},tt={class:"two"},st={class:"checks"},ot={key:1,class:"chaite-panel success-card"},at=J({__name:"index",setup(n){const c=ke(),g=Ie(),m=Pe(),w=R(""),h=R(1),$=R(!1),P=R(""),N=R([]),S=R([]),e=Se({adapterType:"openai",channelName:"",baseUrl:"",apiKey:"",model:"",features:["chat","tool"],priority:1,weight:1,presetName:"",prefix:"",systemPrompt:"你是一个活跃在 QQ 群聊中的 AI 助手。自然、友善地参与讨论。",temperature:.8,maxToken:4096,groupContext:!0,preProcessorIds:[],postProcessorIds:[],toolGroupIds:[],applyDefault:!0,enableBym:!1,bymProbability:.02}),x=_(()=>N.value.map(i=>({label:`${i.type==="pre"?"前置":"后置"} · ${i.name}`,value:i.id}))),z=_(()=>S.value.map(i=>({label:i.name,value:i.id})));function d(i){e.adapterType=i,(!e.baseUrl||["https://api.openai.com/v1","https://generativelanguage.googleapis.com","https://api.anthropic.com"].includes(e.baseUrl))&&(e.baseUrl=i==="openai"?"https://api.openai.com/v1":i==="gemini"?"https://generativelanguage.googleapis.com":"https://api.anthropic.com")}async function f(){if(!e.channelName||!e.baseUrl||!e.apiKey||!e.model||!e.presetName){c.warning("请填写渠道、连接、模型和预设名称");return}$.value=!0;let i="",t="";try{h.value=2;const o=e.preProcessorIds.filter(U=>N.value.find(C=>C.id===U)?.type==="pre"),v=e.postProcessorIds.filter(U=>N.value.find(C=>C.id===U)?.type==="post"),K=w.value?{code:0,data:{id:w.value}}:await Te({name:e.channelName,description:"通过快速接入向导创建",modelType:"settings",embedded:!1,adapterType:e.adapterType,type:e.adapterType,status:"enabled",priority:e.priority,weight:e.weight,models:[{name:e.model,features:e.features}],options:{baseUrl:e.baseUrl,apiKey:e.apiKey,features:e.features,preProcessorIds:o,postProcessorIds:v}});if(K.code!==0)throw new Error(K.message||"渠道创建失败");i=K.data.id;const E=await Re({id:i,model:e.model});if(!E.data?.success)throw new Error(`渠道测试失败：${E.data?.error||"未知错误"}`);P.value=`连接成功，耗时 ${E.data.elapsed}ms`;const A=await Be({name:e.presetName,description:`使用 ${e.channelName} / ${e.model}`,modelType:"settings",embedded:!1,local:!0,prefix:e.prefix,groupContext:e.groupContext?"enabled":"disable",sendMessageOption:{model:e.model,systemOverride:e.systemPrompt,temperature:e.temperature,maxToken:e.maxToken,toolGroupId:e.toolGroupIds}});if(A.code!==0)throw new Error(A.message||"预设创建失败");if(t=A.data.id,e.applyDefault||e.enableBym){const U=await Ae();if(U.code!==0)throw new Error(U.message||"插件配置读取失败");const C=U.data;e.applyDefault&&(C.llm={...C.llm||{},defaultModel:e.model,defaultChatPresetId:t}),e.enableBym&&(C.bym={...C.bym||{},enable:!0,defaultPreset:t,probability:e.bymProbability});const D=await je(C);if(D.code!==0)throw new Error(D.message||"群聊配置保存失败")}h.value=3,c.success("接入完成，新模型已经可以用于群聊")}catch(o){t&&await _e(t).catch(()=>{}),c.error(o instanceof Error?o.message:"接入失败"),h.value=i?2:1}finally{$.value=!1}}return Ne(async()=>{d("openai");const[i,t]=await Promise.all([Ke({pageSize:100}),Ee({pageSize:100})]);if(N.value=i.data?.items||i.data||[],S.value=t.data?.items||t.data||[],typeof m.query.channelId=="string"){const o=await $e(m.query.channelId);if(o.code===0){const v=o.data;w.value=v.id||"",e.channelName=v.name,e.adapterType=v.adapterType,e.baseUrl=v.options.baseUrl,e.apiKey=Array.isArray(v.options.apiKey)?v.options.apiKey[0]||"":v.options.apiKey,e.model=v.models[0]?.name||"",e.features=v.models[0]?.features||["chat"],e.priority=v.priority,e.weight=v.weight,e.presetName=`${v.name} 预设`}}}),(i,t)=>(j(),q("div",Qe,[t[37]||(t[37]=l("header",{class:"chaite-page-header"},[l("div",null,[l("h1",null,"快速接入"),l("p",null,"把一个 API、模型和 Key 一次配置成群聊中可直接使用的预设。")])],-1)),a(s(qe),{current:h.value,class:"steps"},{default:r(()=>[a(s(W),{title:"填写接入信息"}),a(s(W),{title:"创建并测试"}),a(s(W),{title:"群聊可用"})]),_:1},8,["current"]),h.value<3?(j(),q("div",We,[l("section",Je,[t[27]||(t[27]=l("div",{class:"section-head"},[l("span",null,"01"),l("div",null,[l("h2",null,"模型渠道"),l("p",null,"只填写分享者给你的内容，其余可以保持默认。")])],-1)),a(s(re),{"label-placement":"top"},{default:r(()=>[a(s(b),{label:"接口类型"},{default:r(()=>[a(s(Fe),{value:e.adapterType,"onUpdate:value":d},{default:r(()=>[a(s(Q),{value:"openai"},{default:r(()=>[...t[21]||(t[21]=[y("OpenAI 兼容",-1)])]),_:1}),a(s(Q),{value:"gemini"},{default:r(()=>[...t[22]||(t[22]=[y("Gemini",-1)])]),_:1}),a(s(Q),{value:"claude"},{default:r(()=>[...t[23]||(t[23]=[y("Claude",-1)])]),_:1})]),_:1},8,["value"])]),_:1}),l("div",Xe,[a(s(b),{label:"渠道名称"},{default:r(()=>[a(s(T),{value:e.channelName,"onUpdate:value":t[0]||(t[0]=o=>e.channelName=o),placeholder:"例如：群友分享的公益站"},null,8,["value"])]),_:1}),a(s(b),{label:"模型名称"},{default:r(()=>[a(s(T),{value:e.model,"onUpdate:value":t[1]||(t[1]=o=>e.model=o),placeholder:"例如：gpt-4o-mini"},null,8,["value"])]),_:1})]),a(s(b),{label:"API 地址"},{default:r(()=>[a(s(T),{value:e.baseUrl,"onUpdate:value":t[2]||(t[2]=o=>e.baseUrl=o)},null,8,["value"])]),_:1}),a(s(b),{label:"API Key"},{default:r(()=>[a(s(T),{value:e.apiKey,"onUpdate:value":t[3]||(t[3]=o=>e.apiKey=o),type:"password","show-password-on":"click",placeholder:"仅保存在你的机器人服务器"},null,8,["value"])]),_:1}),a(s(b),{label:"模型能力"},{default:r(()=>[a(s(De),{value:e.features,"onUpdate:value":t[4]||(t[4]=o=>e.features=o)},{default:r(()=>[a(s(B),{value:"chat",disabled:""},{default:r(()=>[...t[24]||(t[24]=[y("对话",-1)])]),_:1}),a(s(B),{value:"tool"},{default:r(()=>[...t[25]||(t[25]=[y("工具",-1)])]),_:1}),a(s(B),{value:"visual"},{default:r(()=>[...t[26]||(t[26]=[y("图片",-1)])]),_:1})]),_:1},8,["value"])]),_:1}),l("div",Ye,[a(s(b),{label:"优先级"},{default:r(()=>[a(s(F),{value:e.priority,"onUpdate:value":t[5]||(t[5]=o=>e.priority=o),min:0},null,8,["value"])]),_:1}),a(s(b),{label:"权重"},{default:r(()=>[a(s(F),{value:e.weight,"onUpdate:value":t[6]||(t[6]=o=>e.weight=o),min:1},null,8,["value"])]),_:1})])]),_:1})]),l("section",Ze,[t[32]||(t[32]=l("div",{class:"section-head"},[l("span",null,"02"),l("div",null,[l("h2",null,"预设与群聊"),l("p",null,"无需记住模型名称或离开本页。")])],-1)),a(s(re),{"label-placement":"top"},{default:r(()=>[l("div",et,[a(s(b),{label:"预设名称"},{default:r(()=>[a(s(T),{value:e.presetName,"onUpdate:value":t[7]||(t[7]=o=>e.presetName=o),placeholder:"例如：群聊小助手"},null,8,["value"])]),_:1}),a(s(b),{label:"触发前缀（可选）"},{default:r(()=>[a(s(T),{value:e.prefix,"onUpdate:value":t[8]||(t[8]=o=>e.prefix=o),placeholder:"例如：小助手"},null,8,["value"])]),_:1})]),a(s(b),{label:"角色设定"},{default:r(()=>[a(s(T),{value:e.systemPrompt,"onUpdate:value":t[9]||(t[9]=o=>e.systemPrompt=o),type:"textarea",autosize:{minRows:5,maxRows:10}},null,8,["value"])]),_:1}),l("div",tt,[a(s(b),{label:"温度"},{default:r(()=>[a(s(F),{value:e.temperature,"onUpdate:value":t[10]||(t[10]=o=>e.temperature=o),min:0,max:2,step:.1},null,8,["value"])]),_:1}),a(s(b),{label:"最大输出"},{default:r(()=>[a(s(F),{value:e.maxToken,"onUpdate:value":t[11]||(t[11]=o=>e.maxToken=o),min:1},null,8,["value"])]),_:1})]),a(s(b),{label:"处理器"},{default:r(()=>[a(s(oe),{value:e.preProcessorIds,"onUpdate:value":[t[12]||(t[12]=o=>e.preProcessorIds=o),t[13]||(t[13]=o=>{e.preProcessorIds=o,e.postProcessorIds=o})],multiple:"",clearable:"",options:x.value,placeholder:"可选：选择消息处理器"},null,8,["value","options"])]),_:1}),a(s(b),{label:"工具组"},{default:r(()=>[a(s(oe),{value:e.toolGroupIds,"onUpdate:value":t[14]||(t[14]=o=>e.toolGroupIds=o),multiple:"",clearable:"",options:z.value,placeholder:"可选：让模型使用工具"},null,8,["value","options"])]),_:1}),l("div",st,[a(s(B),{checked:e.groupContext,"onUpdate:checked":t[15]||(t[15]=o=>e.groupContext=o)},{default:r(()=>[...t[28]||(t[28]=[y("携带群聊上下文",-1)])]),_:1},8,["checked"]),a(s(B),{checked:e.applyDefault,"onUpdate:checked":t[16]||(t[16]=o=>e.applyDefault=o)},{default:r(()=>[...t[29]||(t[29]=[y("设为默认对话预设",-1)])]),_:1},8,["checked"]),a(s(B),{checked:e.enableBym,"onUpdate:checked":t[17]||(t[17]=o=>e.enableBym=o)},{default:r(()=>[...t[30]||(t[30]=[y("立即用于伪人模式",-1)])]),_:1},8,["checked"])]),e.enableBym?(j(),ae(s(b),{key:0,label:"伪人触发概率"},{default:r(()=>[a(s(F),{value:e.bymProbability,"onUpdate:value":t[18]||(t[18]=o=>e.bymProbability=o),min:0,max:1,step:.01},null,8,["value"])]),_:1})):ne("",!0)]),_:1}),P.value?(j(),ae(s(Ge),{key:0,type:"success","show-icon":!0,class:"result"},{default:r(()=>[y(M(P.value),1)]),_:1})):ne("",!0),a(s(L),{type:"primary",size:"large",block:"",loading:$.value,onClick:f},{default:r(()=>[...t[31]||(t[31]=[y("创建渠道、测试并应用到群聊",-1)])]),_:1},8,["loading"])])])):(j(),q("section",ot,[t[35]||(t[35]=l("div",{class:"success-icon"},"✓",-1)),t[36]||(t[36]=l("h2",null,"接入完成",-1)),l("p",null,M(e.channelName)+" 的 "+M(e.model)+" 已创建为“"+M(e.presetName)+"”。",1),l("div",null,[a(s(L),{type:"primary",onClick:t[19]||(t[19]=o=>s(g).push("/chat-preset"))},{default:r(()=>[...t[33]||(t[33]=[y("查看预设",-1)])]),_:1}),a(s(L),{secondary:"",onClick:t[20]||(t[20]=o=>s(g).push("/dashboard"))},{default:r(()=>[...t[34]||(t[34]=[y("返回驾驶台",-1)])]),_:1})])]))]))}}),gt=Ue(at,[["__scopeId","data-v-76c576de"]]);export{gt as default};
