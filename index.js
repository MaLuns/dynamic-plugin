
~(function () {

    const arrayify = (list) => Array.prototype.slice.call(list);
    const isPlainObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]';
    const isFunction = (fun) => Object.prototype.toString.call(fun) === '[object Function]';

    let cacheMount = []
    let cacheUnMount = []
    let context = {}

    class DynamicPlugin {

        currentPage = ''
        options = {
            // 需要固化标签：例如主题样式
            persistTags: false,
            // 需要忽略标签
            specialTags: false,

            // script 插入地方
            insertElement: 'load-script',
            // 需要重新加载或执行 script
            reloadElement: 'script[data-reload-script]'
        }

        add(options) {
            if (isFunction(options))
                cacheMount.push(options)

            if (isPlainObject(options)) {
                let { mount, unmount } = options
                if (isFunction(mount))
                    cacheMount.push(mount)
                if (isFunction(unmount))
                    cacheUnMount.push(unmount)
            }

            // 执行当前页面加载钩子
            this.runMount()
        }

        load(newHTML = '', options = {}) {
            this.currentPage = newHTML
            this.options = {
                ...this.options,
                ...options
            }

            // 执行上一个页面卸载构子
            this.runUnMount()

            // 处理 Head
            this.getHeadAndReplace()

            // 处理 Script
            this.getScriptAndInsert()
        }

        runMount() {
            while (cacheMount.length) {
                let item = cacheMount.shift();
                item.call(context);
            }
        }

        runUnMount() {
            while (cacheUnMount.length) {
                let item = cacheUnMount.shift();
                item.call(context);
            }
        }

        //#region 处理 Script
        getScriptAndInsert = () => {
            let nextHeadChildren = this.getNextScriptChildren();
            if (nextHeadChildren.length) {
                const run = async (newScripts) => {
                    let scripts = Array.from(document.scripts)
                    for (let index = 0; index < newScripts.length; index++) {
                        const script = newScripts[index];
                        if (script.src) {
                            // 如果已经加载 、并且不需要重新执行的 则跳过
                            if (scripts.findIndex(s => s.src === script.src && !s.dataset.reset) < 0) {
                                await this.loadScript(script);
                            }
                        } else {
                            this.runScriptBlock(script)
                        }
                    }
                }
                run(nextHeadChildren)
            }
        }

        loadScript(item) {
            return new Promise((resolve, reject) => {
                const element = document.createElement('script');
                for (const { name, value } of arrayify(item.attributes)) {
                    element.setAttribute(name, value);
                }
                element.textContent = item.textContent;
                element.setAttribute('async', 'false');
                element.onload = () => {
                    resolve()
                    if (document.body.contains(element)) {
                        document.body.removeChild(element);
                    }
                }
                element.onerror = reject
                document.body.appendChild(element)
            })
        }

        getNextScriptChildren() {
            const pageContent = this.currentPage.replace('<body', '<div id="DynamicPluginBody"').replace('</body>', '</div>');
            let element = document.createElement('div');
            element.innerHTML = pageContent;
            const children = element.querySelector('#DynamicPluginBody').querySelectorAll(this.options.reloadElement);

            // cleanup
            element.innerHTML = '';
            element = null;

            return children;
        }

        runScriptBlock(el) {
            const code = el.text || el.textContent || el.innerHTML || "";
            const parent = document.head || document.querySelector("head") || document.documentElement;
            const script = document.createElement('script')

            if (code.match("document.write")) {
                if (console && console.log) {
                    console.log("Script contains document.write. Can’t be executed correctly. Code skipped ");
                }
                return false;
            }

            try {
                script.appendChild(document.createTextNode(code));
            } catch (e) {
                // old IEs have funky script nodes
                script.text = code;
            }

            // 执行代码块
            parent.appendChild(script);
            // 移除执行后的代码块，避免污染标签
            if (parent.contains(script)) {
                parent.removeChild(script);
            }
        }

        insertScript(el) {
            const body = document.body;
            const asyncScript = document.querySelector(this.options.insertElement)
            body.insertBefore(el, asyncScript)
        }
        //#endregion


        //#region 处理 Head 
        getHeadAndReplace = () => {
            const headChildren = this.getHeadChildren();
            const nextHeadChildren = this.getNextHeadChildren();

            this.replaceTags(headChildren, nextHeadChildren);
        }

        getHeadChildren = () => {
            return document.head.children;
        }

        getNextHeadChildren = () => {
            const pageContent = this.currentPage.replace('<head', '<div id="DynamicPluginHead"').replace('</head>', '</div>');
            let element = document.createElement('div');
            element.innerHTML = pageContent;
            const children = element.querySelector('#DynamicPluginHead').children;

            // cleanup
            element.innerHTML = '';
            element = null;

            return children;
        }

        replaceTags = (oldTags, newTags) => {
            const head = document.head;
            const themeActive = Boolean(document.querySelector('[data-async-theme]'));
            const addTags = this.getTagsToAdd(oldTags, newTags, themeActive);
            const removeTags = this.getTagsToRemove(oldTags, newTags, themeActive);

            removeTags.reverse().forEach((item) => {
                head.removeChild(item.tag);
            });

            addTags.forEach((item) => {
                // Insert tag *after* previous version of itself to preserve JS variable scope and CSS cascaade
                head.insertBefore(item.tag, head.children[item.index + 1] || null);
            });
        };

        compareTags = (oldTag, newTag) => {
            const oldTagContent = oldTag.outerHTML;
            const newTagContent = newTag.outerHTML;
            return oldTagContent === newTagContent;
        };

        getTagsToRemove = (oldTags, newTags) => {
            const removeTags = [];
            for (let i = 0; i < oldTags.length; i++) {
                let foundAt = null;

                for (let j = 0; j < newTags.length; j++) {
                    if (this.compareTags(oldTags[i], newTags[j])) {
                        foundAt = j;
                        break;
                    }
                }

                // 新页面没有标签、也不是需要固化标签 则删除
                if (foundAt == null && oldTags[i].getAttribute('data-async-theme') === null && !this.isMatchesTag(oldTags[i], this.options.persistTags)) {
                    removeTags.push({ tag: oldTags[i] });
                }
            }

            return removeTags;
        };

        getTagsToAdd = (oldTags, newTags, themeActive) => {
            const addTags = [];

            for (let i = 0; i < newTags.length; i++) {
                let foundAt = null;

                for (let j = 0; j < oldTags.length; j++) {
                    if (this.compareTags(oldTags[j], newTags[i])) {
                        foundAt = j;
                        break;
                    }
                }

                // 就页面没有标签、也不是特殊标签 则新增
                if (foundAt == null && !this.isMatchesTag(newTags[i], this.options.specialTags)) {
                    addTags.push({ index: themeActive ? i + 1 : i, tag: newTags[i] });
                }
            }

            return addTags;
        };

        isMatchesTag = (item, matchesTag = this.options.persistTags) => {
            if (typeof matchesTag === 'function') {
                return matchesTag(item);
            }
            if (typeof matchesTag === 'string') {
                return item.matches(matchesTag);
            }
            return Boolean(matchesTag);
        };
        //#endregion
    }

    return window.DynamicPlugin = new DynamicPlugin();
})()
