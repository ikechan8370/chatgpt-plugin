# yunzai-chatgpt
云崽qq机器人的chatgpt插件

## 安装
进入yunzai根目录
1. 安装依赖
```
pnpm install -w chatgpt undici
```
2. 克隆项目
```
git clone https://github.com/ikechan8370/yunzai-chatgpt.git ./plugins/chatgpt
```
3. 修改配置
编辑`plugins/chatgpt/index.js`文件主要修改其中的`SESSION_TOKEN`常量，修改为你的openai账号的token。

## 关于openai token获取
1. 注册openai账号
进入https://chat.openai.com/，选择signup注册。目前openai不对包括俄罗斯、乌克兰、伊朗、中国等国家和地区提供服务，所以自行寻找办法使用其他国家和地区的ip登录。此外，注册可能需要验证所在国家和地区的手机号码，如果没有国外手机号可以试试解码网站，收费的推荐https://sms-activate.org/。
2. 获取token
注册并登录后进入https://chat.openai.com/chat，打开浏览器检查界面（按F12），找到图中所示的token值完整复制即可。
![image](https://user-images.githubusercontent.com/21212372/205806905-a4bd2c47-0114-4815-85e4-ba63a10cf1b5.png)

其他问题可以参考使用的api库https://github.com/transitive-bullshit/chatgpt-api

## 其他
`index.js`文件第35行中，
```
const api = new ChatGPTAPI({ sessionToken: SESSION_TOKEN, markdown: false })
```
默认关闭了markdown支持，如果发现代码类回答显示有问题可以将其改为true试试。

## 感谢
* https://github.com/transitive-bullshit/chatgpt-api
* https://chat.openai.com/
