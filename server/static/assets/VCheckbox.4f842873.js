import{m as g,V as t}from"./VCheckboxBtn.1933d686.js";import{p as A,ae as F,af as I,n as B,u as U,ag as D,ah as R,o as _,ac as $,ai as j,aj as l,D as u,J as c}from"./index.cab6d7eb.js";const J=A({...F(),...I(g(),["inline"])},"VCheckbox"),z=B()({name:"VCheckbox",inheritAttrs:!1,props:J(),emits:{"update:modelValue":e=>!0,"update:focused":e=>!0},setup(e,r){let{attrs:d,slots:a}=r;const s=U(e,"modelValue"),{isFocused:n,focus:i,blur:m}=D(e),V=R(),b=_(()=>e.id||`checkbox-${V}`);return $(()=>{const[p,k]=j(d),[f,M]=l.filterProps(e),[h,N]=t.filterProps(e);return u(l,c({class:["v-checkbox",e.class]},p,f,{modelValue:s.value,"onUpdate:modelValue":o=>s.value=o,id:b.value,focused:n.value,style:e.style}),{...a,default:o=>{let{id:v,messagesId:x,isDisabled:P,isReadonly:C}=o;return u(t,c(h,{id:v.value,"aria-describedby":x.value,disabled:P.value,readonly:C.value},k,{modelValue:s.value,"onUpdate:modelValue":y=>s.value=y,onFocus:i,onBlur:m}),a)}})}),{}}});export{z as V};