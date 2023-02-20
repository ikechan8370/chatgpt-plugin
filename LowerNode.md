## 本页面已过时

### Node.js >= 14 (并且 <18)时的安装方法

**如果不是 CentOS 7, RHEL 7, Ubuntu 18 请自行搜索并升级你的 Node.js 版本！**

**此教程是为了因 glibc 不支持升级 Node.js 的Linux发行版准备的。**
1. 进入 Yunzai 根目录
2. 安装依赖
```
pnpm install -w undici chatgpt showdown mathjax-node delay uuid remark strip-markdown node-fetch @waylaidwanderer/chatgpt-api keyv-file
```
**若使用API模式，chatgpt的版本号注意要大于4.2.0**

若不使用浏览器模式，可以不安装`random puppeteer-extra-plugin-recaptcha puppeteer-extra puppeteer-extra-plugin-stealth`这几个

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

再编辑`Yunzai根目录/plugins/chatgpt-plugin/config/config.js`文件，根据其中的注释修改必要配置项。

---
