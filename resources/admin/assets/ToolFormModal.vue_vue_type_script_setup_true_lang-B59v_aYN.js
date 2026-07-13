import{j as T,C as h}from"./index-D6EVDQ_e.js";import{d as N,L as c,o as f,c as M,b as B,w as l,e as n,u as a,N as j,x,a as k,G as V,B as v,g,M as q,n as E,j as y,P as U}from"./index-DiOlaFw7.js";import{_ as A}from"./FormItem-vKUhSOMB.js";import{N as R}from"./Grid-DZV-6Z9O.js";import{_ as p}from"./FormItemGridItem-sMOuXXRH.js";const D={style:{display:"flex","justify-content":"flex-end","margin-top":"24px"}},S=N({__name:"ToolFormModal",props:{show:Boolean,editMode:Boolean,initialData:{type:Object,default:()=>({})}},emits:["update:show","submit"],setup(u,{emit:_}){const i=u,d=_,m=y(),s=U({get:()=>i.show,set:o=>d("update:show",o)}),w={name:{required:!0,trigger:["blur","input"],message:"请输入工具名称"},description:{required:!0,trigger:["blur","input"],message:"请输入工具描述"},code:{required:!0,trigger:["blur","input"],message:"请输入工具代码"}},b=T(),t=y({description:"",code:`import { CustomTool } from 'chaite'

export class ExampleTool extends CustomTool {
  name = 'example'
  function = {
    name: 'example',
    description: 'example',
    parameters: {
      type: 'object',
      properties: {
        example: {
          type: 'string',
          description: 'example'
        }
      },
      required: ['example']
    }
  }

  async run (args) {
    return args.example
  }
}

export default new ExampleTool()
`,modelType:"executable"});c(()=>i.initialData,o=>{i.editMode&&o&&(t.value={...o})},{immediate:!0});function C(){m.value?.validate().then(o=>{if(Array.isArray(o)){console.error(o);return}d("submit",t.value),s.value=!1})}return c(s,o=>{!o&&!i.editMode&&(t.value={name:"",description:"",code:`import { CustomTool } from 'chaite'

export class ExampleTool extends CustomTool {
  name = 'example'
  function = {
    name: 'example',
    description: 'example',
    parameters: {
      type: 'object',
      properties: {
        example: {
          type: 'string',
          description: 'example'
        }
      },
      required: ['example']
    }
  }

  async run (args) {
    return args.example
  }
}

export default new ExampleTool()
`})}),(o,e)=>(f(),M("div",null,[s.value?(f(),B(a(q),{key:0,show:s.value,"onUpdate:show":e[4]||(e[4]=r=>s.value=r),preset:"card",style:{width:"700px","max-width":"90vw"}},{default:l(()=>[n(a(j),{title:u.editMode?"编辑工具":"添加工具"},{default:l(()=>[n(a(A),{ref_key:"formRef",ref:m,rules:w,model:t.value},{default:l(()=>[n(a(R),{cols:24,"x-gap":12,"y-gap":16,responsive:"screen","item-responsive":""},{default:l(()=>[n(a(p),{span:"24",label:"名称",path:"name"},{default:l(()=>[n(a(x),{value:t.value.name,"onUpdate:value":e[0]||(e[0]=r=>t.value.name=r),placeholder:"请输入工具名称"},null,8,["value"])]),_:1}),n(a(p),{span:"24",label:"描述",path:"description"},{default:l(()=>[n(a(x),{value:t.value.description,"onUpdate:value":e[1]||(e[1]=r=>t.value.description=r),type:"textarea",placeholder:"请输入工具描述"},null,8,["value"])]),_:1}),n(a(p),{span:"24",label:"代码",path:"code"},{default:l(()=>[n(a(h),{modelValue:t.value.code,"onUpdate:modelValue":e[2]||(e[2]=r=>t.value.code=r),style:{width:"100%"},lang:a(b),basic:""},null,8,["modelValue","lang"])]),_:1})]),_:1}),k("div",D,[n(a(V),null,{default:l(()=>[n(a(v),{onClick:e[3]||(e[3]=r=>s.value=!1)},{default:l(()=>[...e[5]||(e[5]=[g(" 取消 ",-1)])]),_:1}),n(a(v),{type:"primary",onClick:C},{default:l(()=>[...e[6]||(e[6]=[g(" 确定 ",-1)])]),_:1})]),_:1})])]),_:1},8,["model"])]),_:1},8,["title"])]),_:1},8,["show"])):E("",!0)]))}});export{S as _};
