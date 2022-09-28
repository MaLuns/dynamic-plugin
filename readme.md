## dynamic-plugin

一个解决 Pjax 下动态加载插件的库。

## 使用方式

在 Pjax 拉取到新的页面时添加：
``` js
DynamicPlugin.load(NewHtml,options) 
```
- NewHtml：为新页面 html 字符串
- options：为可选配置
    - persistTags: 需要固化标签，默认 `false`
    - specialTags：需要忽略标签，默认 `false`
    - insertElement：script 插入地方，默认 `load-script`
    - reloadElement：需要重新加载或执行 script，默认为 `script[data-reload-script]`

### 添加动态脚本

添加 `data-reload-script` 后，在打开页面是会被视为需要重新加载或执行代码块

三方脚本：

``` html
<script src="src" data-reload-script></script>
```

代码块：
``` html
<script data-reload-script>
    DynamicPlugin.add({
        // 页面加载时执行
        mount() {
            this.timer = setInterval(() => {
                document.getElementById('time').innerText = new Date().toString()
            }, 1000)
        },
        // 页面卸载时执行
        unmount() {
            window.clearInterval(this.timer)
            this.timer = null
        }
    })
</script>
```