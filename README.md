# yunzai-chatgpt
云崽qq机器人的chatgpt插件
## 版本要求
Node.js >= 16.8
## 安装
进入yunzai根目录
1. 安装依赖
```
pnpm install -w chatgpt undici
```
> 目前要求依赖chatgpt版本要大于2.0.0，如果报错可使用`pnpm update`更新一下。
2. 克隆项目
```
git clone https://github.com/ikechan8370/yunzai-chatgpt.git ./plugins/chatgpt
```
3. 修改配置
编辑`plugins/chatgpt/index.js`文件主要修改其中的`SESSION_TOKEN`常量，修改为你的openai账号的token。token获取参见下文。

## 使用
#chatgpt开头即可，例如：#chatgpt 介绍一下米哈游
![image](https://user-images.githubusercontent.com/21212372/205808552-a775cdea-0668-4273-865c-35c5d91ad37e.png)
（图片仅供参考，chatgpt在某些领域依然是人工智障，但语言起码流畅自信多了）

比如让他写代码
![image](https://user-images.githubusercontent.com/21212372/205810566-af10e141-1ab4-4629-998d-664eea3ad827.png)

发挥你的想象力吧！

## 关于openai token获取
1. 注册openai账号
进入https://chat.openai.com/ ，选择signup注册。目前openai不对包括俄罗斯、乌克兰、伊朗、中国等国家和地区提供服务，所以自行寻找办法使用其他国家和地区的ip登录。此外，注册可能需要验证所在国家和地区的手机号码，如果没有国外手机号可以试试解码网站，收费的推荐https://sms-activate.org/。
2. 获取token
注册并登录后进入https://chat.openai.com/chat ，打开浏览器检查界面（按F12），找到图中所示的token值完整复制即可。
![image](https://user-images.githubusercontent.com/21212372/205806905-a4bd2c47-0114-4815-85e4-ba63a10cf1b5.png)

其他问题可以参考使用的api库https://github.com/transitive-bullshit/chatgpt-api

## 其他
`index.js`文件中，
```
this.chatGPTApi = new ChatGPTAPI({
  sessionToken: SESSION_TOKEN,
  markdown: true,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
})
```
默认关闭了markdown支持，如果发现代码类回答显示有问题可以将其改为true试试。

此外，该api响应速度可能由于模型本身及网络原因不会太快，请勿频繁重发。后续准备加入限速等功能。

openai目前开放chatgpt模型的免费试用，在此期间本项目应该都可用，后续如果openai调整其收费策略，到时候视情况进行调整。

## 感谢
* https://github.com/transitive-bullshit/chatgpt-api
* https://chat.openai.com/

![Alt](https://repobeats.axiom.co/api/embed/076d597ede41432208435f233d18cb20052fb90a.svg "Repobeats analytics image")
