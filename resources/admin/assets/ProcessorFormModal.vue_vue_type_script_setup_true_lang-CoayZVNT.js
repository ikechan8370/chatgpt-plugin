import{j as k,C as E}from"./index-D6EVDQ_e.js";import{d as N,be as L,L as f,o as x,c as A,b as B,w as s,e as o,u as a,N as U,x as y,D as T,g as p,B as c,a as V,G as j,M as R,n as q,j as w,P as D}from"./index-DiOlaFw7.js";import{_ as G}from"./FormItem-vKUhSOMB.js";import{N as I}from"./Grid-DZV-6Z9O.js";import{_ as u}from"./FormItemGridItem-sMOuXXRH.js";const z={style:{display:"flex","justify-content":"flex-end","margin-top":"24px"}},F=`import { asyncLocalStorage, PreProcessor } from 'chaite'

export class ExamplePreProcessor extends PreProcessor {
  name = 'example'

  /**
   * 处理逻辑
   * 可以通过\`asyncLocalStorage.getStore().getEvent()\`获取e实例
   * @param {import('chaite').UserMessage} message
   * @returns {Promise<import('chaite').UserMessage>}
   */
  async process (message) {
    const context = (/** @type {AsyncLocalStorage<import('chaite').ChaiteContext>} **/asyncLocalStorage).getStore()
    const e = context.getEvent()
    await e.reply('处理一下' + e.sender.nickname + '的问题')
    message.content.forEach((item) => {
      item.text = item.text.replace(/<|>/g, '')
    })
    return message
  }
}
`,d=`import { asyncLocalStorage, PostProcessor } from 'chaite'

export class ExamplePostProcessor extends PostProcessor {
  name = 'example'

  /**
   * 处理逻辑
   * 可以通过\`asyncLocalStorage.getStore().getEvent()\`获取e实例
   * @param {import('chaite').AssistantMessage} message
   * @returns {Promise<import('chaite').AssistantMessage>}
   */
  async process (message) {
    const context = (/** @type {AsyncLocalStorage<import('chaite').ChaiteContext>} **/asyncLocalStorage).getStore()
    const e = context.getEvent()
    await e.reply('处理一下AI对' + e.sender.nickname + '的回复')
    const rawResponse = message.content[0].text
    message.content[0].text = rawResponse.replace(/<|>/g, '')
    return message
  }
}
`,Q=N({__name:"ProcessorFormModal",props:{show:Boolean,editMode:Boolean,initialData:{type:Object,default:()=>({description:"",code:d,modelType:"executable",type:"post"})}},emits:["update:show","submit"],setup(m,{emit:_}){const i=m,g=_,C=L(),v=w(),r=D({get:()=>i.show,set:n=>g("update:show",n)}),P={name:{required:!0,trigger:["blur","input"],message:"请输入处理器名称"},description:{required:!0,trigger:["blur","input"],message:"请输入处理器描述"},code:{required:!0,trigger:["blur","input"],message:"请输入处理器代码"}},t=w({description:"",code:d,modelType:"executable",type:"post"});function b(){const n=t.value.type==="pre"?F:d;if(!t.value.code||t.value.code.trim()===""){t.value.code=n;return}C.warning({title:"确认覆盖",content:"当前编辑区已有代码，插入示例代码将覆盖现有内容，是否继续？",positiveText:"确认",negativeText:"取消",onPositiveClick:()=>{t.value.code=n}})}f(()=>i.initialData,n=>{i.editMode&&n&&(t.value={...n})},{immediate:!0});function h(){v.value?.validate().then(n=>{if(Array.isArray(n)){console.error(n);return}g("submit",t.value),r.value=!1})}const S=k();return f(r,n=>{!n&&!i.editMode&&(t.value={name:"",description:"",code:d})}),(n,e)=>{const M=T;return x(),A("div",null,[r.value?(x(),B(a(R),{key:0,show:r.value,"onUpdate:show":e[5]||(e[5]=l=>r.value=l),preset:"card",style:{width:"700px","max-width":"90vw"}},{default:s(()=>[o(a(U),{title:m.editMode?"编辑处理器":"添加处理器"},{default:s(()=>[o(a(G),{ref_key:"formRef",ref:v,rules:P,model:t.value},{default:s(()=>[o(a(I),{cols:24,"x-gap":12,"y-gap":16,responsive:"screen","item-responsive":""},{default:s(()=>[o(a(u),{span:"24",label:"名称",path:"name"},{default:s(()=>[o(a(y),{value:t.value.name,"onUpdate:value":e[0]||(e[0]=l=>t.value.name=l),placeholder:"请输入处理器名称"},null,8,["value"])]),_:1}),o(a(u),{span:"24",label:"描述",path:"description"},{default:s(()=>[o(a(y),{value:t.value.description,"onUpdate:value":e[1]||(e[1]=l=>t.value.description=l),type:"textarea",placeholder:"请输入处理器描述"},null,8,["value"])]),_:1}),o(a(u),{span:"24",label:"类型",path:"type"},{default:s(()=>[o(M,{value:t.value.type,"onUpdate:value":e[2]||(e[2]=l=>t.value.type=l),options:[{value:"post",label:"后置"},{value:"pre",label:"前置"}],placeholder:"请输入处理器描述"},null,8,["value"])]),_:1}),o(a(u),{span:"24",label:"代码",path:"code"},{label:s(()=>[e[7]||(e[7]=p(" 代码 ",-1)),o(a(c),{quaternary:"",type:"warning",style:{"font-size":"12px"},onClick:b},{default:s(()=>[...e[6]||(e[6]=[p(" 点击插入示例代码 ",-1)])]),_:1})]),default:s(()=>[o(a(E),{modelValue:t.value.code,"onUpdate:modelValue":e[3]||(e[3]=l=>t.value.code=l),style:{width:"100%"},lang:a(S),basic:""},null,8,["modelValue","lang"])]),_:1})]),_:1}),V("div",z,[o(a(j),null,{default:s(()=>[o(a(c),{onClick:e[4]||(e[4]=l=>r.value=!1)},{default:s(()=>[...e[8]||(e[8]=[p(" 取消 ",-1)])]),_:1}),o(a(c),{type:"primary",onClick:h},{default:s(()=>[...e[9]||(e[9]=[p(" 确定 ",-1)])]),_:1})]),_:1})])]),_:1},8,["model"])]),_:1},8,["title"])]),_:1},8,["show"])):q("",!0)])}}});export{Q as _};
