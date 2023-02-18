# 云崽qq机器人的chatgpt插件

## 特点

* 支持单人连续对话Conversation，群聊中支持加入其他人的对话
* API模式下，使用 GPT-3 API及相关模型配置尽可能逼近ChatGPT体验，支持自定义部分模型参数，仅需OpenAI Api Key，开箱即用
* 支持问答图片截图
* API3模式下，绕过Cloudflare防护直接访问ChatGPT的SSE API，与官方体验一致，且保留对话记录，在官网可查。
* 提供基于浏览器的解决方案作为备选，API3不可用的情况下或担心账户安全的用户可以选择使用浏览器模式。
* 支持新[必应](https://www.bing.com/new)（Beta）

## 版本要求
Node.js >= 18 / Node.js >= 14(with node-fetch)
小白尽可能使用18版本以上的nodejs

## 安装与使用方法

### 安装

在安装之前，请先判断自己需要使用哪种模式，本插件支持官方API/第三方API/浏览器/必应四种模式。也可以选择**我全都要**(通过qq发送命令`#chatgpt切换浏览器/API/API2/API3/Bing`实时切换)

对于轻量用户可以先使用API模式，有较高要求再转为使用其他模式。

> #### API模式和浏览器模式如何选择？
>
> * API模式会调用OpenAI官方提供的GPT-3 LLM API，只需要提供API Key。一般情况下，该种方式响应速度更快，可配置项多，且不会像chatGPT官网一样总出现不可用的现象，但其聊天效果明显较官网差。但注意GPT-3的API调用是收费的，新用户有18美元试用金可用于支付，价格为`$0.0200/ 1K tokens`。（问题和回答**加起来**算token）
> * 【当前不可用】API2模式会调用第三方提供的基于OpenAI text-davinci-002-render模型（官网同款）的API，需要提供ChatGPT的Token。效果比单纯的GPT-3 API好很多，但同时将Token提供给了第三方API，其中风险自行承担。
> * API3模式会调用第三方提供的官网反代API，他会帮你绕过CF防护，需要提供ChatGPT的Token。效果与官网和浏览器一致，但稳定性不一定。设置token和API2方法一样。
> * 浏览器模式通过在本地启动Chrome等浏览器模拟用户访问ChatGPT网站，使得获得和官方以及API2模式一模一样的回复质量，同时保证安全性。缺点是本方法对环境要求较高，需要提供桌面环境和一个可用的代理（能够访问ChatGPT的IP地址），且响应速度不如API，而且高峰期容易无法使用。一般作为API3的下位替代。
> * 必应（Bing）将调用微软新必应接口进行对话。需要在必应网页能够正常使用新必应且设置有效的Bing登录Cookie方可使用。
1. 进入 Yunzai根目录
2. 检查 Node.js 版本

```
node -v
```
若 Node.js >= 18，根据下方步骤安装即可。否则参考[这里](LowerNode.md)

3. 请将 chatgpt-plugin 放置在 Yunzai-Bot 的 plugins 目录下

推荐使用 git 进行安装，以方便后续升级。在 Yunzai-Bot 根目录夹打开终端，运行下述指令进行安装

```sh
git clone --depth=1 https://github.com/ikechan8370/chatgpt-plugin.git ./plugins/chatgpt-plugin/
pnpm install -w undici chatgpt showdown mathjax-node delay uuid remark strip-markdown @waylaidwanderer/chatgpt-api keyv-file
```

如果是手工下载的 zip 压缩包，请将解压后的 chatgpt-plugin 文件夹（请删除压缩自带的-master后缀）放置在 Yunzai-Bot 目录下的 plugins 文件夹内

如果您需要使用基于浏览器的访问模式，请运行下述指令

> 浏览器模式仅为备选，如您需要使用浏览器模式，您还需要有**桌面环境**，优先级建议：必应>API>浏览器

其中`random puppeteer-extra-plugin-recaptcha puppeteer-extra puppeteer-extra-plugin-stealth`为用于模拟浏览器登录的依赖

```sh
pnpm install -w undici chatgpt showdown mathjax-node delay uuid remark strip-markdown random puppeteer-extra-plugin-recaptcha puppeteer-extra puppeteer-extra-plugin-stealth @waylaidwanderer/chatgpt-api keyv-file
```

请注意：**若使用API模式，chatgpt的版本号注意要大于4.4.0**
**若使用Bing模式，@waylaidwanderer/chatgpt-api 尽可能保持最新版本**

3. 修改配置

编辑`plugins/chatgpt-plugin/config/index.js`文件，根据其中的注释修改必要配置项

4. 重启Yunzai-Bot

> ### 我想使用浏览器模式，但是我是linux云服务器没有桌面环境怎么办？
>
> linux云服务器可以安装窗口管理器和vnc创建并访问虚拟桌面环境
>
> 1. 安装xvfb和fluxbox
>
>    - Ubuntu：`sudo apt-get install x11vnc xvfb fluxbox`
>
>    - CentOS：`sudo yum install x11vnc Xvfb fluxbox`
>
> 2. 启动桌面环境
>
>    建议用tmux或screen等使其能够后台运行
>
>    注意：本命令使用默认5900端口和**无密码**，注意通过防火墙等保护，**切勿**在公网环境或不安全的网络环境下使用！！！
>    `x11vnc -create -env FD_PROG=/usr/bin/fluxbox -env X11VNC_FINDDISPLAY_ALWAYS_FAILS=1   -env X11VNC_CREATE_GEOM=${1:-1024x768x16}   -nopw -forever`
>
> 3. 使用vnc客户端连接至云桌面
>
>    右键Applications > Shells > Bash打开终端，然后进入Yunzai目录下运行node app即可。
>
> 实测该方案资源占用低，运行稳定，基本1核2G的轻量云服务器就足够了。

---



### 相关配置

#### 配置文件相关

配置文件位置：`plugins/chatgpt-plugin/config/index.js`

部分关键配置项，其他请参照文件内注释：

|       名称        |        含义         |                          解释                          |
| :---------------: | :-----------------: | :----------------------------------------------------: |
|       PROXY       |      代理地址       |   请在此处配置你的代理，例如`http://127.0.0.1:7890`    |
|      API_KEY      | openai账号的API Key | 获取地址：https://platform.openai.com/account/api-keys |
| username/password | openai的账号和密码  |                           /                            |

#### Token相关

与Token相关的设置需在qq与机器人对话设置，设置后方可使用对应的api

|        名称         |         含义         |                             解释                             |        设置方式        |
| :-----------------: | :------------------: | :----------------------------------------------------------: | :--------------------: |
| ChatGPT AccessToken | ChatGPT登录后的Token |                        具体解释见下方                        |   \#chatgpt设置token   |
|      必应token      |  必应登录后的Token   | 必应（Bing）将调用微软新必应接口进行对话。需要在必应网页能够正常使用新必应且设置有效的Bing 登录Cookie方可使用 | \#chatgpt设置必应token |



> #### 我没有注册openai账号？如何获取
>
> 您可以按照以下方法获取openai账号
>
> 进入https://chat.openai.com/ ，选择signup注册。目前openai不对包括俄罗斯、乌克兰、伊朗、中国等国家和地区提供服务，所以自行寻找办法使用**其他国家和地区**的ip登录。此外，注册可能需要验证所在国家和地区的手机号码，如果没有国外手机号可以试试解码网站，收费的推荐https://sms-activate.org/
>
> #### 我有openai账号了，如何获取API key和Access Token？
>
> - 获取API key
>   - 进入账户后台创建API key（Create new secret key）：https://platform.openai.com/account/api-keys
>
> - 获取Access Token
>   - **登录后**访问https://chat.openai.com/api/auth/session
>   - 您会获得类似如下一串json字符串`{"user":{"id":"AAA","name":"BBB","email":"CCC","image":"DDD","picture":"EEE","groups":[]},"expires":"FFF","accessToken":"XXX"}`
>   - 其中的XXX即为`ChatGPT AccessToken`
>
> #### ChatGPT AccessToken 设置了有什么用？我为什么用不了API模式
>
> - 请参考上方 [API模式和浏览器模式如何选择？](#API模式和浏览器模式如何选择？)
> - 部分API需要在和机器人的聊天里输入`#chatgpt设置token`才可以使用
>
> #### 我有新必应的测试资格了，如何获取必应Token？
>
> 1. JS一键获取
>
> 登录www.bing.com，刷新一下网页，按F12或直接打开开发者模式，点击Console/控制台，运行如下代码，执行后即在您的剪切板存储了必应Token
>
> ```js
> copy(document.cookie.split(";").find(cookie=>cookie.trim().startsWith("_U=")).split("=")[1]);
> ```
>
> 2. 手动获取
>
> 登录www.bing.com，刷新一下网页，按F12或直接打开开发者模式，点击Application/存储，点击左侧Storage下的Cookies，展开找到[https://www.bing.com](https://www.bing.com/) 项，在右侧列表Name项下找到"\_U"，_U的value即为必应Token
>
> 
>
> 其他问题可以参考使用的api库 https://github.com/transitive-bullshit/chatgpt-api 以及 https://github.com/waylaidwanderer/node-chatgpt-api



### 使用方法

根据配置文件中的toggleMode决定联通方式。

- at模式：@机器人 发送聊内容即可

- prefix模式：【#chat+问题】，本模式可以避免指令冲突。

发挥你的想象力吧，~~调教~~拟造出你自己的机器人风格！



关于部分API模式下配置中的一些模型的配置项：

* `model`：通常保持空即可，除非你想调用特定的模型，比如你用gpt-3微调的学到特定领域知识的机器人。API1模式下将强制使用chatGPT模型。

* `promptPrefixOverride`：通常保持空即可。如果你想调整机器人回复的风格，可以在这里加入对机器人的一些暗示，比如要求用中文，要求回答长一点/短一点。甚至可以让它有自己的小脾气。下图为我让他不要回答太简单的问题，并且表现出不耐烦。

* `assistantLabel`：默认为ChatGPT，表示机器人认知中的自己的名字。你可以修改为其他名字。

* `plus`：如果你购买了ChatGPT Plus，将这个值改为true可以使响应速度更快。

#### 文本/图片回复模式

>  #chatgpt文本/图片模式

可以控制机器人回复的方式

#### 对话相关

> #chatgpt对话列表
>
> #结束对话 [@某人]
>
> #清空chat队列
>
> #移出chat队列首位
>
> #chatgpt开启/关闭问题确认
>
> ...

#### 设置相关

> #chat切换浏览器/API/API2/API3/Bing
>
> #chatgpt设置[必应]Token
>
> ...

#### 获取帮助

> #chatgpt帮助
>
> #chatgpt模式帮助

发送#chatgpt帮助，有更多选项可以配置



## 示例与截图

- 程序员版

![img.png](resources/img/example1.png)

- 傲娇版

![)T@~XY~NWXUM S1)D$7%I3H](https://user-images.githubusercontent.com/21212372/217540723-0b97553a-f4ba-41df-ae0c-0449f73657fc.png)
![image](https://user-images.githubusercontent.com/21212372/217545618-3793d9f8-7941-476b-81f8-4255ac216cf7.png)

## TODO
* 更灵活的Conversation管理
* 版本号和归档
* API2/3模式下自动获取/刷新Token
* API2/3模式下多token管理和切换

## 其他

### 关于未来更新

OpenAI 即将开放其官方ChatGPT API，且微软必应也公开发布了基于ChatGPT的问答搜索，能够为实现更好、更快的聊天机器人提供更多途径。

### 常见问题

1. 如果在linux系统上发现图片模式下emoj无法正常显示，可以搜索安装支持emoj的字体，如Ubuntu可以使用`sudo apt install fonts-noto-color-emoji`

2. 我和机器人聊天但没有任何反应怎么办？

   可能是由于Yunzai-bot异常退出等原因造成Redis 队列中有残留的等待问题。使用`#清空队列`命令清除队列后再试。

4. Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'xxx'.

   请参照本文档前面的安装依赖部分重新依赖。随着项目更新可能引入新的依赖。

   > 一般情况下请按照 [安装](#安装) 小节的内容重新安装依赖即可

## 感谢

* https://github.com/transitive-bullshit/chatgpt-api
* https://github.com/waylaidwanderer/node-chatgpt-api
* https://chat.openai.com/

## 由于issue实在较多且大多重复，建了个QQ群，欢迎各位小白大佬来玩

![0AC75C5D0DD03D46962B38C8C1FBFD4F的副本](https://user-images.githubusercontent.com/21212372/218388938-637eeb82-cd3c-472e-b157-40d19c74d69c.png)

## 贡献者

<a href="https://github.com/ikechan8370/chatgpt-plugin/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ikechan8370/chatgpt-plugin" />
</a>

![Alt](https://repobeats.axiom.co/api/embed/076d597ede41432208435f233d18cb20052fb90a.svg "Repobeats analytics image")
