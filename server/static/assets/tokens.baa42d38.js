import{K as F,O as i,Q as B,R as S,S as a,D as e,bw as I,bK as H,a4 as n,Y as P,aI as f,H as c,J as V,U as k,aF as C,W as q,aV as z,_ as w,T as y,$ as J,aH as x,aU as O,a5 as A,bo as Q,a0 as N,F as W,aD as Y,P as D}from"./index.cab6d7eb.js";import{a as b}from"./VDialog.463538c9.js";import{q as j}from"./VDataTable.f49e173a.js";import"./VCheckboxBtn.1933d686.js";import"./VTable.1606610f.js";const E=N("span",{class:"text-h5"},"\u65B0\u589EToken",-1),G=["onClick"],L={__name:"BingTokens",setup(U){const s=F(),_=i([{title:"Token",align:"start",sortable:!1,key:"Token"},{title:"\u7528\u91CF",key:"Usage"},{title:"\u72B6\u6001",key:"State"},{title:"",key:"actions",sortable:!1}]),r=i(),d=i(),u=i(),m=i(),g=i(),K=o=>o>800?"error":o>600?"warning":"success",p=()=>{D.post(`${s.getters.serverApi}sysconfig`,{token:s.getters.userToken}).then(o=>{o.data&&(o.data.error?s.commit("app/ADD_SNACKBAR",{message:o.data.error,color:"error"}):r.value=o.data.redisConfig.bingTokens)}).catch(o=>{s.commit("app/ADD_SNACKBAR",{message:o.message,color:"error"}),console.log(o)})},v=o=>{s.getters.runmode==="online"?D.post(`${s.getters.serverApi}saveconfig`,{token:s.getters.userToken,...o}).then(l=>{var t;(t=l.data)!=null&&t.error?s.commit("app/ADD_SNACKBAR",{message:l.data.error,color:"error"}):s.commit("app/ADD_SNACKBAR",{message:"\u4FDD\u5B58\u6210\u529F",color:"success"}),p()}).catch(l=>{p(),s.commit("app/ADD_SNACKBAR",{message:l.message,color:"error"}),console.log(l)}):s.commit("app/ADD_SNACKBAR",{message:"\u4EC5\u652F\u6301\u5728\u7EBF\u6A21\u5F0F\u64CD\u4F5C",color:"warn"})},R=()=>{const o={redisConfig:{bingTokens:[...r.value,{Token:m.value,State:"\u6B63\u5E38",Usage:0}]}};v(o),d.value=!1},h=()=>{const o=r.value.findIndex(t=>t.Token===g.value);o!==-1&&r.value.splice(o,1);const l={redisConfig:{bingTokens:[...r.value]}};v(l),u.value=!1},$=async o=>{try{await navigator.clipboard.writeText(o),s.commit("app/ADD_SNACKBAR",{message:"\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F",color:"info"})}catch(l){console.error("\u526A\u8D34\u677F\u590D\u5236\u5931\u8D25: ",l)}};return p(),(o,l)=>(B(),S(Y(j),{headers:_.value,items:r.value,class:"elevation-1"},{top:a(()=>[e(I,{flat:""},{default:a(()=>[e(H,null,{default:a(()=>[n("Bing Token \u7BA1\u7406")]),_:1}),e(P,{class:"mx-4",inset:"",vertical:""}),e(f),e(b,{modelValue:d.value,"onUpdate:modelValue":l[2]||(l[2]=t=>d.value=t),"max-width":"500px"},{activator:a(({props:t})=>[e(c,V({color:"primary",dark:"",class:"mb-2"},t),{default:a(()=>[n(" \u6DFB\u52A0Token ")]),_:2},1040)]),default:a(()=>[e(k,null,{default:a(()=>[e(C,null,{default:a(()=>[E]),_:1}),e(q,null,{default:a(()=>[e(z,null,{default:a(()=>[e(w,null,{default:a(()=>[e(y,{cols:"12"},{default:a(()=>[e(J,{modelValue:m.value,"onUpdate:modelValue":l[0]||(l[0]=t=>m.value=t),label:"Token"},null,8,["modelValue"])]),_:1})]),_:1})]),_:1})]),_:1}),e(x,null,{default:a(()=>[e(f),e(c,{color:"blue-darken-1",variant:"text",onClick:l[1]||(l[1]=t=>{d.value=!1,m.value=""})},{default:a(()=>[n(" \u53D6\u6D88 ")]),_:1}),e(c,{color:"blue-darken-1",variant:"text",onClick:R},{default:a(()=>[n(" \u6DFB\u52A0 ")]),_:1})]),_:1})]),_:1})]),_:1},8,["modelValue"]),e(b,{modelValue:u.value,"onUpdate:modelValue":l[4]||(l[4]=t=>u.value=t),"max-width":"550px"},{default:a(()=>[e(k,null,{default:a(()=>[e(C,{class:"text-h5"},{default:a(()=>[n("\u662F\u5426\u786E\u8BA4\u5220\u9664\u8BE5Token\uFF1F\u5220\u9664\u540E\u5C06\u65E0\u6CD5\u6062\u590D\uFF01")]),_:1}),e(x,null,{default:a(()=>[e(f),e(c,{color:"blue-darken-1",variant:"text",onClick:l[3]||(l[3]=t=>u.value=!1)},{default:a(()=>[n("\u53D6\u6D88")]),_:1}),e(c,{color:"error",variant:"text",onClick:h},{default:a(()=>[n("\u786E\u8BA4\u5220\u9664")]),_:1}),e(f)]),_:1})]),_:1})]),_:1},8,["modelValue"])]),_:1})]),"item.Usage":a(({item:t})=>[e(O,{color:K(t.columns.Usage)},{default:a(()=>[n(A(t.columns.Usage),1)]),_:2},1032,["color"])]),"item.Token":a(({item:t})=>[e(Q,{activator:"parent",location:"bottom",text:t.columns.Token},{activator:a(({props:T})=>[N("span",V(T,{onClick:M=>$(t.columns.Token)}),A(t.columns.Token.substring(0,50))+"... ",17,G)]),_:2},1032,["text"])]),"item.actions":a(({item:t})=>[e(W,{size:"small",onClick:T=>{g.value=t.raw.Token,u.value=!0}},{default:a(()=>[n(" mdi-delete ")]),_:2},1032,["onClick"])]),_:1},8,["headers","items"]))}},oe={__name:"tokens",setup(U){return(s,_)=>(B(),S(w,null,{default:a(()=>[e(y,{cols:"12"},{default:a(()=>[e(k,null,{default:a(()=>[e(L)]),_:1})]),_:1})]),_:1}))}};export{oe as default};
