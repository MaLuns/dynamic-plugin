## dynamic-plugin

一个解决 Pjax 下动态加载插件的库。

## 使用方式

在 Pjax 拉取到新的页面时添加：
``` js
DynamicPlugin.load(NewHtml) // NewHtml 为新页面 html 字符串
```

### 添加动态脚本

添加 `data-reload-script` 后，打开页面后默认插入到

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