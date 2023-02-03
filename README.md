云崽qq机器人的chatgpt插件
## 版本要求
Node.js >= 18 / Node.js >= 14(with node-fetch)


## 安装
1. 进入 Yunzai根目录
2. 检查 Node.js 版本，并根据对应的 Node.js 版本选择安装教程。
```
node -v
```
---

### Node.js >= 18
1. 进入 Yunzai根目录
2. 安装依赖
```
pnpm install -w undici chatgpt showdown mathjax-node delay uuid remark strip-markdown
```
**chatgpt的版本号注意要大于4.0.0**

3. 克隆项目
```
git clone https://github.com/ikechan8370/chatgpt-plugin.git ./plugins/chatgpt-plugin
```
4. 修改配置

编辑`plugins/chatgpt-plugin/config/index.js`文件主要修改其中的`apiKey`

---

### Node.js >= 14
**如果不是 CentOS 7, RHEL 7, Ubuntu 18 请自行搜索并升级你的 Node.js 版本！**

**此教程是为了因 glibc 不支持升级 Node.js 的Linux发行版准备的。**
1. 进入 Yunzai 根目录
2. 安装依赖
```
pnpm install -w undici chatgpt showdown mathjax-node delay uuid remark strip-markdown node-fetch
```
**chatgpt的版本号注意要大于4.0.0**

3. 克隆项目
```
git clone https://github.com/ikechan8370/chatgpt-plugin.git ./plugins/chatgpt-plugin
```
4. 修改配置

修改 Yunzai根目录/node_modules/.pnpm/chatgpt\@4.1.0/node_modules/chatgpt/build/index.js 

**此处 chatgpt\@4.1.0 路径不是绝对的！请根据自己安装的版本进行替换！**

**将 // src/fetch.ts 部分修改成如下样子，其他部分不要动**
```
// src/fetch.ts
import fetch from 'node-fetch';
globalThis.fetch = fetch;
```

再编辑`Yunzai根目录/plugins/chatgpt-plugin/config/index.js`文件，主要修改其中的`apiKey`

---


## 使用

### 基本使用
@机器人 发送聊内容即可
![img.png](resources/img/example1.png)
发挥你的想象力吧！

### 获取帮助
发送#chatgpt帮助

## TODO
* 触发方式优化
* 更灵活的Conversation管理

## 关于openai token获取
1. 注册openai账号
进入https://chat.openai.com/ ，选择signup注册。目前openai不对包括俄罗斯、乌克兰、伊朗、中国等国家和地区提供服务，所以自行寻找办法使用其他国家和地区的ip登录。此外，注册可能需要验证所在国家和地区的手机号码，如果没有国外手机号可以试试解码网站，收费的推荐https://sms-activate.org/。
2. 获取API key
进入账户后台创建API key：https://platform.openai.com/account/api-keys

其他问题可以参考使用的api库https://github.com/transitive-bullshit/chatgpt-api


## 其他

OpenAI 已开放其官方API，并增加了定价策略，请等待此部分内容更新。

> 该api响应速度可能由于模型本身及网络原因不会太快，请勿频繁重发。后续准备加入限速等功能。因网络问题和模型响应速度问题可能出现500、503、404等各种异常状态码，此时等待官方恢复即可。实测复杂的中文对话更容易触发503错误（超时）。如出现429则意味着超出了免费账户调用频率，只能暂时停用，放置一段时间再继续使用。
>
> openai目前开放chatgpt模型的免费试用，在此期间本项目应该都可用，后续如果openai调整其收费策略，到时候视情况进行调整。
>
> 如果在linux系统上发现emoj无法正常显示，可以搜索安装支持emoj的字体，如Ubuntu可以使用`sudo apt install fonts-noto-color-emoji`

## 感谢
* https://github.com/transitive-bullshit/chatgpt-api
* https://chat.openai.com/

![Alt](https://repobeats.axiom.co/api/embed/076d597ede41432208435f233d18cb20052fb90a.svg "Repobeats analytics image")
