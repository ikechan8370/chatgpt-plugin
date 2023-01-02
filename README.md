云崽qq机器人的chatgpt插件
## 版本要求
Node.js >= 16.8
## 安装
进入yunzai根目录
1. 安装依赖
```
pnpm install -w undici showdown mathjax-node puppeteer-extra puppeteer-extra-plugin-stealth puppeteer-extra-plugin-recaptcha delay
```
2. 克隆项目
```
git clone https://github.com/ikechan8370/chatgpt-plugin.git ./plugins/chatgpt-plugin
```
3. 修改配置
编辑`plugins/chatgpt/config/index.js`文件主要修改其中的`username`和`password`配置。特殊需求可自行修改token

## 使用

### 基本使用
@机器人 发送聊内容即可
![img.png](resources/img/example1.png)
发挥你的想象力吧！

### 获取帮助
发送#chatgpt帮助

## 关于openai token获取
1. 注册openai账号
进入https://chat.openai.com/ ，选择signup注册。目前openai不对包括俄罗斯、乌克兰、伊朗、中国等国家和地区提供服务，所以自行寻找办法使用其他国家和地区的ip登录。此外，注册可能需要验证所在国家和地区的手机号码，如果没有国外手机号可以试试解码网站，收费的推荐https://sms-activate.org/。
2. 获取token
注册并登录后进入https://chat.openai.com/chat ，打开浏览器检查界面（按F12），找到图中所示的token值完整复制即可。
![image](https://user-images.githubusercontent.com/21212372/205806905-a4bd2c47-0114-4815-85e4-ba63a10cf1b5.png)

其他问题可以参考使用的api库https://github.com/transitive-bullshit/chatgpt-api


## 其他

该api响应速度可能由于模型本身及网络原因不会太快，请勿频繁重发。后续准备加入限速等功能。因网络问题和模型响应速度问题可能出现500、503、404等各种异常状态码，此时等待官方恢复即可。实测复杂的中文对话更容易触发503错误（超时）。如出现429则意味着超出了免费账户调用频率，只能暂时停用，放置一段时间再继续使用。

openai目前开放chatgpt模型的免费试用，在此期间本项目应该都可用，后续如果openai调整其收费策略，到时候视情况进行调整。

如果在linux系统上发现emoj无法正常显示，可以搜索安装支持emoj的字体，如Ubuntu可以使用`sudo apt install fonts-noto-color-emoji`

使用服务器没有界面的，可以尝试安装Xserver和桌面，本人使用轻量级的xvfb+fluxbox：
```
$ sudo apt-get install x11vnc xvfb fluxbox
$ x11vnc -create -env FD_PROG=/usr/bin/fluxbox \
	-env X11VNC_FINDDISPLAY_ALWAYS_FAILS=1 \
  -env X11VNC_CREATE_GEOM=${1:-1024x768x16} \
  -gone 'killall Xvfb' \
  -bg -nopw
```
然后远程连接其vnc（默认5900）运行Yunzai即可调用非无头浏览器，除了chrome之外，还推荐brave浏览器，据说出验证码概率低。

## 感谢
* https://github.com/transitive-bullshit/chatgpt-api
* https://chat.openai.com/

![Alt](https://repobeats.axiom.co/api/embed/076d597ede41432208435f233d18cb20052fb90a.svg "Repobeats analytics image")
