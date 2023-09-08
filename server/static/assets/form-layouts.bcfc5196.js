import{O as u,Q as y,R as F,S as e,D as l,_ as f,T as a,$ as d,H as _,a4 as c,aN as x,Z as C,a0 as b,a1 as g,U,W as w}from"./index.f985de17.js";import{V as H}from"./VCheckbox.833361ee.js";import"./VCheckboxBtn.b7a3a8e0.js";const z=b("label",{for:"firstName"},"First Name",-1),I=b("label",{for:"email"},"Email",-1),R=b("label",{for:"mobile"},"Mobile",-1),k=b("label",{for:"password"},"Password",-1),E={__name:"DemoFormLayoutHorizontalForm",setup(N){const m=u(""),n=u(""),r=u(),i=u(),p=u(!1);return(v,o)=>(y(),F(C,{onSubmit:o[5]||(o[5]=x(()=>{},["prevent"]))},{default:e(()=>[l(f,null,{default:e(()=>[l(a,{cols:"12"},{default:e(()=>[l(f,{"no-gutters":""},{default:e(()=>[l(a,{cols:"12",md:"3"},{default:e(()=>[z]),_:1}),l(a,{cols:"12",md:"9"},{default:e(()=>[l(d,{id:"firstName",modelValue:m.value,"onUpdate:modelValue":o[0]||(o[0]=t=>m.value=t),placeholder:"First Name","persistent-placeholder":""},null,8,["modelValue"])]),_:1})]),_:1})]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(f,{"no-gutters":""},{default:e(()=>[l(a,{cols:"12",md:"3"},{default:e(()=>[I]),_:1}),l(a,{cols:"12",md:"9"},{default:e(()=>[l(d,{id:"email",modelValue:n.value,"onUpdate:modelValue":o[1]||(o[1]=t=>n.value=t),placeholder:"Email","persistent-placeholder":""},null,8,["modelValue"])]),_:1})]),_:1})]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(f,{"no-gutters":""},{default:e(()=>[l(a,{cols:"12",md:"3"},{default:e(()=>[R]),_:1}),l(a,{cols:"12",md:"9"},{default:e(()=>[l(d,{id:"mobile",modelValue:r.value,"onUpdate:modelValue":o[2]||(o[2]=t=>r.value=t),type:"number",placeholder:"Number","persistent-placeholder":""},null,8,["modelValue"])]),_:1})]),_:1})]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(f,{"no-gutters":""},{default:e(()=>[l(a,{cols:"12",md:"3"},{default:e(()=>[k]),_:1}),l(a,{cols:"12",md:"9"},{default:e(()=>[l(d,{id:"password",modelValue:i.value,"onUpdate:modelValue":o[3]||(o[3]=t=>i.value=t),type:"password",placeholder:"Password","persistent-placeholder":""},null,8,["modelValue"])]),_:1})]),_:1})]),_:1}),l(a,{"offset-md":"3",cols:"12",md:"9"},{default:e(()=>[l(H,{modelValue:p.value,"onUpdate:modelValue":o[4]||(o[4]=t=>p.value=t),label:"Remember me"},null,8,["modelValue"])]),_:1}),l(a,{"offset-md":"3",cols:"12",md:"9",class:"d-flex gap-4"},{default:e(()=>[l(_,{type:"submit"},{default:e(()=>[c(" Submit ")]),_:1}),l(_,{color:"secondary",variant:"tonal",type:"reset"},{default:e(()=>[c(" Reset ")]),_:1})]),_:1})]),_:1})]),_:1}))}},S=b("label",{for:"firstNameHorizontalIcons"},"First Name",-1),$=b("label",{for:"emailHorizontalIcons"},"Email",-1),L=b("label",{for:"mobileHorizontalIcons"},"Mobile",-1),M=b("label",{for:"passwordHorizontalIcons"},"Password",-1),D={__name:"DemoFormLayoutHorizontalFormWithIcons",setup(N){const m=u(""),n=u(""),r=u(),i=u(),p=u(!1);return(v,o)=>(y(),F(C,{onSubmit:o[5]||(o[5]=x(()=>{},["prevent"]))},{default:e(()=>[l(f,null,{default:e(()=>[l(a,{cols:"12"},{default:e(()=>[l(f,{"no-gutters":""},{default:e(()=>[l(a,{cols:"12",md:"3"},{default:e(()=>[S]),_:1}),l(a,{cols:"12",md:"9"},{default:e(()=>[l(d,{id:"firstNameHorizontalIcons",modelValue:m.value,"onUpdate:modelValue":o[0]||(o[0]=t=>m.value=t),"prepend-inner-icon":"mdi-account-outline",placeholder:"First Name","persistent-placeholder":""},null,8,["modelValue"])]),_:1})]),_:1})]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(f,{"no-gutters":""},{default:e(()=>[l(a,{cols:"12",md:"3"},{default:e(()=>[$]),_:1}),l(a,{cols:"12",md:"9"},{default:e(()=>[l(d,{id:"emailHorizontalIcons",modelValue:n.value,"onUpdate:modelValue":o[1]||(o[1]=t=>n.value=t),"prepend-inner-icon":"mdi-email-outline",placeholder:"Email","persistent-placeholder":""},null,8,["modelValue"])]),_:1})]),_:1})]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(f,{"no-gutters":""},{default:e(()=>[l(a,{cols:"12",md:"3"},{default:e(()=>[L]),_:1}),l(a,{cols:"12",md:"9"},{default:e(()=>[l(d,{id:"mobileHorizontalIcons",modelValue:r.value,"onUpdate:modelValue":o[2]||(o[2]=t=>r.value=t),type:"number","prepend-inner-icon":"mdi-cellphone",placeholder:"Number","persistent-placeholder":""},null,8,["modelValue"])]),_:1})]),_:1})]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(f,{"no-gutters":""},{default:e(()=>[l(a,{cols:"12",md:"3"},{default:e(()=>[M]),_:1}),l(a,{cols:"12",md:"9"},{default:e(()=>[l(d,{id:"passwordHorizontalIcons",modelValue:i.value,"onUpdate:modelValue":o[3]||(o[3]=t=>i.value=t),"prepend-inner-icon":"mdi-lock-outline",type:"password",placeholder:"Password","persistent-placeholder":""},null,8,["modelValue"])]),_:1})]),_:1})]),_:1}),l(a,{"offset-md":"3",cols:"12",md:"9"},{default:e(()=>[l(H,{modelValue:p.value,"onUpdate:modelValue":o[4]||(o[4]=t=>p.value=t),label:"Remember me"},null,8,["modelValue"])]),_:1}),l(a,{"offset-md":"3",cols:"12",md:"9",class:"d-flex gap-4"},{default:e(()=>[l(_,{type:"submit"},{default:e(()=>[c(" Submit ")]),_:1}),l(_,{color:"secondary",type:"reset",variant:"tonal"},{default:e(()=>[c(" Reset ")]),_:1})]),_:1})]),_:1})]),_:1}))}},P={__name:"DemoFormLayoutMultipleColumn",setup(N){const m=u(""),n=u(""),r=u(""),i=u(""),p=u(""),v=u(""),o=u(!1);return(t,s)=>(y(),F(C,{onSubmit:s[7]||(s[7]=x(()=>{},["prevent"]))},{default:e(()=>[l(f,null,{default:e(()=>[l(a,{cols:"12",md:"6"},{default:e(()=>[l(d,{modelValue:m.value,"onUpdate:modelValue":s[0]||(s[0]=V=>m.value=V),label:"First Name",placeholder:"First Name"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12",md:"6"},{default:e(()=>[l(d,{modelValue:n.value,"onUpdate:modelValue":s[1]||(s[1]=V=>n.value=V),label:"Last Name",placeholder:"Last Name"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12",md:"6"},{default:e(()=>[l(d,{modelValue:v.value,"onUpdate:modelValue":s[2]||(s[2]=V=>v.value=V),label:"Email",placeholder:"Email"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12",md:"6"},{default:e(()=>[l(d,{modelValue:r.value,"onUpdate:modelValue":s[3]||(s[3]=V=>r.value=V),label:"City",placeholder:"City"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12",md:"6"},{default:e(()=>[l(d,{modelValue:i.value,"onUpdate:modelValue":s[4]||(s[4]=V=>i.value=V),label:"Country",placeholder:"Country"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12",md:"6"},{default:e(()=>[l(d,{modelValue:p.value,"onUpdate:modelValue":s[5]||(s[5]=V=>p.value=V),label:"Company",placeholder:"Company"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(H,{modelValue:o.value,"onUpdate:modelValue":s[6]||(s[6]=V=>o.value=V),label:"Remember me"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12",class:"d-flex gap-4"},{default:e(()=>[l(_,{type:"submit"},{default:e(()=>[c(" Submit ")]),_:1}),l(_,{type:"reset",color:"secondary",variant:"tonal"},{default:e(()=>[c(" Reset ")]),_:1})]),_:1})]),_:1})]),_:1}))}},B={__name:"DemoFormLayoutVerticalForm",setup(N){const m=u(""),n=u(""),r=u(),i=u(),p=u(!1);return(v,o)=>(y(),F(C,{onSubmit:o[5]||(o[5]=x(()=>{},["prevent"]))},{default:e(()=>[l(f,null,{default:e(()=>[l(a,{cols:"12"},{default:e(()=>[l(d,{modelValue:m.value,"onUpdate:modelValue":o[0]||(o[0]=t=>m.value=t),label:"First Name",placeholder:"First Name"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(d,{modelValue:n.value,"onUpdate:modelValue":o[1]||(o[1]=t=>n.value=t),label:"Email",type:"email",placeholder:"Email"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(d,{modelValue:r.value,"onUpdate:modelValue":o[2]||(o[2]=t=>r.value=t),label:"Mobile",type:"number",placeholder:"Number"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(d,{modelValue:i.value,"onUpdate:modelValue":o[3]||(o[3]=t=>i.value=t),label:"Password",type:"password",placeholder:"password"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(H,{modelValue:p.value,"onUpdate:modelValue":o[4]||(o[4]=t=>p.value=t),label:"Remember me"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12",class:"d-flex gap-4"},{default:e(()=>[l(_,{type:"submit"},{default:e(()=>[c(" Submit ")]),_:1}),l(_,{type:"reset",color:"secondary",variant:"tonal"},{default:e(()=>[c(" Reset ")]),_:1})]),_:1})]),_:1})]),_:1}))}},T={__name:"DemoFormLayoutVerticalFormWithIcons",setup(N){const m=u(""),n=u(""),r=u(),i=u(),p=u(!1);return(v,o)=>(y(),F(C,{onSubmit:o[5]||(o[5]=x(()=>{},["prevent"]))},{default:e(()=>[l(f,null,{default:e(()=>[l(a,{cols:"12"},{default:e(()=>[l(d,{modelValue:m.value,"onUpdate:modelValue":o[0]||(o[0]=t=>m.value=t),"prepend-inner-icon":"mdi-account-outline",label:"First Name",placeholder:"First Name"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(d,{modelValue:n.value,"onUpdate:modelValue":o[1]||(o[1]=t=>n.value=t),"prepend-inner-icon":"mdi-email-outline",label:"Email",type:"email",placeholder:"Email"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(d,{modelValue:r.value,"onUpdate:modelValue":o[2]||(o[2]=t=>r.value=t),"prepend-inner-icon":"mdi-cellphone",label:"Mobile",type:"number",placeholder:"Number"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(d,{modelValue:i.value,"onUpdate:modelValue":o[3]||(o[3]=t=>i.value=t),"prepend-inner-icon":"mdi-lock-outline",label:"Password",type:"password",placeholder:"password"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(H,{modelValue:p.value,"onUpdate:modelValue":o[4]||(o[4]=t=>p.value=t),label:"Remember me"},null,8,["modelValue"])]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(_,{type:"submit",class:"me-2"},{default:e(()=>[c(" Submit ")]),_:1}),l(_,{color:"secondary",type:"reset",variant:"tonal"},{default:e(()=>[c(" Reset ")]),_:1})]),_:1})]),_:1})]),_:1}))}},Z={__name:"form-layouts",setup(N){return(m,n)=>(y(),g("div",null,[l(f,null,{default:e(()=>[l(a,{cols:"12",md:"6"},{default:e(()=>[l(U,{title:"Horizontal Form"},{default:e(()=>[l(w,null,{default:e(()=>[l(E)]),_:1})]),_:1})]),_:1}),l(a,{cols:"12",md:"6"},{default:e(()=>[l(U,{title:"Horizontal Form with Icons"},{default:e(()=>[l(w,null,{default:e(()=>[l(D)]),_:1})]),_:1})]),_:1}),l(a,{cols:"12",md:"6"},{default:e(()=>[l(U,{title:"Vertical Form"},{default:e(()=>[l(w,null,{default:e(()=>[l(B)]),_:1})]),_:1})]),_:1}),l(a,{cols:"12",md:"6"},{default:e(()=>[l(U,{title:"Vertical Form with Icons"},{default:e(()=>[l(w,null,{default:e(()=>[l(T)]),_:1})]),_:1})]),_:1}),l(a,{cols:"12"},{default:e(()=>[l(U,{title:"Multiple Column"},{default:e(()=>[l(w,null,{default:e(()=>[l(P)]),_:1})]),_:1})]),_:1})]),_:1})]))}};export{Z as default};
