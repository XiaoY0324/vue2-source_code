(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
}(this, (function () { 'use strict';

  function isFunction(val) {
    return typeof val === 'function';
  }
  function isObject(val) {
    return typeof val !== 'null' && typeof val === 'object';
  }
  function isArray(val) {
    return Object.prototype.toString.call(val) === '[object Array]';
  }
  const callbacks = [];
  let wating = false; // 防抖
  // 依次执行 nextTick 队列中的 callback

  function flushCallbacks() {
    callbacks.forEach(cb => cb());
    wating = false;
  } // 降级策略


  function timer(cb) {
    let timerFn = () => {};

    if (Promise) {
      timerFn = () => {
        Promise.resolve().then(cb);
      };
    } else if (MutationObserver) {
      // 微任务 监听节点变化的 api
      let textNode = document.createTextNode(1); // 随便创建个文本节点来监听

      let observe = new MutationObserver(cb); // 注册个回调

      observe.observe(textNode, {
        // 监控文本节点变化 characterData 代表文本内容
        characterData: true
      });

      timerFn = () => {
        textNode.textContent = 2;
      };
    } else if (setImmediate) {
      // ie 才认的 api，性能略高于 setTimeout  
      timerFn = () => {
        setImmediate(cb);
      };
    } else {
      // 再不支持 只能延时器了
      timerFn = () => {
        setTimeout(cb);
      };
    }

    timerFn();
  } // 源码中的调度器会优先调用 nextTick 方法(批量更新就调用)
  // 所以更新 dom 的操作会先入 callbacks 队列


  function nextTick(cb) {
    callbacks.push(cb);

    if (!wating) {
      // vue3 不考虑兼容，这里直接 Promise.resolve.then(flushCallbacks)
      // vue2 中考虑兼容性问题，有个降级策略
      timer(flushCallbacks);
      wating = true;
    }
  } // 策略模式，针对不同的 key 去做合并

  const strats = {}; // 针对不同 key 的策略，这里写四个生命周期的合并为栗，method 等合并同理

  ['beforeCreate', 'created', 'beforeMount', 'mounted'].forEach(method => {
    strats[method] = function (curVal, mixinVal) {
      if (mixinVal) {
        // Vue.options 默认值为空对象，所以原始配置中 key 对应的生命周期函数这里可能是空的
        // 首次是这样的，Vue.options = {}, options = { a, beforeCreate: function() {} }
        // 第二次是这样的，Vue.options = { a, beforeCreate: [fn] }, options = { b, beforeCreate: function() {} }
        if (curVal) {
          // 函数数组进行合并
          return curVal.concat(mixinVal);
        } else {
          // 公共配置没有生命周期，混入配置有，要把这些生命周期函数变为数组保存
          return [mixinVal];
        }
      } else {
        // 如果混入的 key 对应的值为空，直接使用原来的值
        return curVal;
      }
    };
  });
  function mergeOptions(curOptions, mixinOptions) {
    const res = {}; // 先遍历 Vue.options，如果混入 options 中该属性也存在，使用混入的变量替换

    for (let key in curOptions) {
      mergeField(key);
    } // 再遍历混入 options，如果某属性 Vue.options 没有，拷贝过来


    for (let key in mixinOptions) {
      if (!curOptions.hasOwnProperty(key)) {
        mergeField(key);
      }
    } // 合并配置


    function mergeField(key) {
      // 策略模式，针对不同的 key 进行合并(这里拿生命周期函数做示例)
      if (strats[key]) {
        res[key] = strats[key](curOptions[key], mixinOptions[key]);
      } else {
        // 优先使用新传递的属性区替换公共属性
        res[key] = mixinOptions[key] || curOptions[key];
      }
    }

    console.warn(res.data);
    return res;
  }

  function initGlobalAPI(Vue) {
    Vue.options = {}; // 所有的全局属性都会放到这个变量上

    Vue.mixin = function (mixinOptions) {
      // this 代表 Vue，静态属性 Vue.options
      this.options = mergeOptions(this.options, mixinOptions);
    };
  }

  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // 匹配双花括号 {{}}
  // 数组转对象 [{ name: 'aaa', value: 'bbb' }] => { aaa: 'bbb' }

  function genProps(attrs) {
    let str = '';

    for (let i = 0; i < attrs.length; i++) {
      let attr = attrs[i];

      if (attr.name === 'style') {
        // style: "color: red; background: blue;"
        let styleObj = {};
        attr.value.replace(/([^;:]+)\:([^;:]+)/g, function () {
          styleObj[arguments[1]] = arguments[2];
        });
        attr.value = styleObj;
      }

      str += `${attr.name}: ${JSON.stringify(attr.value)},`;
    }

    return `{${str.slice(0, -1)}}`; // 删掉多余的逗号
  } // 检查子节点 递归生成 code


  function gen(node) {
    if (node.type == 1) {
      // 节点类型
      return generate(node);
    } else {
      let text = node.text;

      if (!defaultTagRE.test(text)) {
        // 文本内容不包含双花括号
        return `_v("${text}")`;
      } else {
        // 双花括号内的当做变量进行拼接 -> hello {{ msg }} 你好呀
        let tokens = [];
        let match; // {{}} 结束索引 也是下一次遍历的开始索引 
        // defaultTagRE.lastIndex 也重置为 0，因为正则全局匹配和 exec 有冲突
        // 每次匹配完要重置下标

        let lastIdx = defaultTagRE.lastIndex = 0;

        while (match = defaultTagRE.exec(text)) {
          // 匹配到了 {{}}
          let startIdx = match.index; // 开始索引

          if (startIdx > lastIdx) {
            tokens.push(JSON.stringify(text.slice(lastIdx, startIdx)));
          } // 花括号内变量 考虑换行需要 trim
          // 花括号内可能是个对象，为了避免隐式转为 [object Object]
          // 使用 _s 包装，_s 其实就是调用了 JSON.stringify()


          tokens.push(`_s(${match[1].trim()})`);
          lastIdx = startIdx + match[0].length; // 结束索引
        } // 截取最好一段 比如 "hello {{ msg }} 你好呀" 中的 "你好呀"


        if (lastIdx < text.length) {
          tokens.push(JSON.stringify(text.slice(lastIdx)));
        }

        return `_v(${tokens.join('+')})`;
      }
    }
  } // 获取 ast 节点的儿子


  function genChildren(node) {
    let children = node.children; // 获取儿子

    if (children) {
      // 递归拼接
      return children.map(c => gen(c)).join(',');
    }

    return false;
  } // 生成类似 _c('div', { id: 'app', a: 1 }, _v('hello')) 这样的代码片段 也有可能是下面这种哦
  // _c('div', { id: 'app', a: 1 }, _c('span', { id: 'span'}, _v('套娃子节点')))
  // _c 表示创建元素的虚拟节点方法 _v 表示创建文本的虚拟节点方法


  function generate(astRoot) {
    let children = genChildren(astRoot); // 遍历 ast 树，将树拼接成字符串

    let code = `_c("${astRoot.tag}", ${astRoot.attrs.length ? genProps(astRoot.attrs) : 'undefined'}${children ? `,${children}` : ''})`;
    return code;
  }

  const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`; // 匹配标签名

  const qnameCapture = `((?:${ncname}\\:)?${ncname})`; // 获取标签名

  const startTagOpen = new RegExp(`^<${qnameCapture}`); // 匹配开始标签

  const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配闭合标签

  const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性的

  const startTagClose = /^\s*(\/?)>/; // 匹配标签结束的 > 符号
  // 将解析后的结果 通过栈组装成一个 ast 树结构

  function createAstElement(tagName, attrs) {
    return {
      tag: tagName,
      type: 1,
      // 元素类型
      children: [],
      parent: null,
      attrs
    };
  }

  let root = null; // 树的根节点

  let stack = []; // 保存每个节点的栈
  // 开始标签的处理方法

  function start(tagName, attrs) {
    // console.log('start', tagName, attrs);
    // 构建 ast 语法树
    let element = createAstElement(tagName, attrs); // 取出栈中的父节点 做节点关联

    let parent = stack[stack.length - 1];

    if (!root) {
      root = element;
    }

    element.parent = parent; // 记录父节点是谁

    if (parent) {
      parent.children.push(element);
    }

    stack.push(element); // 入栈
  } // 结束标签的处理方法


  function end(tagName) {
    // console.log('end tag:', tagName);
    let last = stack.pop(); // 弹出首位

    if (last.tag != tagName) {
      throw new Error('标签闭合有误');
    }
  } // 文本标签的处理方法


  function chars(text) {
    text = text.replace(/\s/g, ''); // 取出栈中的父节点 做节点关联

    let parent = stack[stack.length - 1];

    if (text) {
      parent.children.push({
        type: 3,
        // 文本标签
        text
      });
    }
  } // 将模板转成 ast 语法树


  function parserHTML(html) {
    // 解析完毕后 删除标签
    function advance(len) {
      html = html.substring(len);
    } // 解析开始标签


    function parseStartTag() {
      const start = html.match(startTagOpen);

      if (start) {
        // 把标签和属性通过正则组装成对象
        const match = {
          tagName: start[1],
          attrs: []
        };
        advance(start[0].length);
        let attr, end;

        while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
          advance(attr[0].length);
          match.attrs.push({
            name: attr[1],
            value: attr[3]
          });
        }

        if (end) {
          advance(end[0].length);
          return match;
        }
      }
    } // 看看解析的内容是否存在 存在就不停解析


    while (html) {
      // 匹配开始或结束标签前面的 <
      let startOrEnd = html.indexOf('<'); // 说明当前模板开头可能为开始标签<div>或结束标签</div>

      if (startOrEnd == 0) {
        // 尝试匹配开始标签 并把标签转成对象
        const startTagMatch = parseStartTag(); // 当前为开始标签

        if (startTagMatch) {
          // 处理开始标签转成的对象
          start(startTagMatch.tagName, startTagMatch.attrs);
          continue;
        } // 处理结束标签


        const endTagMatch = html.match(endTag);

        if (endTagMatch) {
          // 当前为结束标签
          end(endTagMatch[1]);
          advance(endTagMatch[0].length);
        }
      } // 处理文本 走到这里说明当前 html 为 123</div> 的


      let text;

      if (startOrEnd >= 0) {
        // 截取文本
        text = html.substring(0, startOrEnd);
      }

      if (text) {
        // 如果文本有值 处理文本并干掉文本
        chars(text);
        advance(text.length);
        continue;
      }
    }

    return root;
  }

  function compileToFunctions(html) {
    // 1. 将模板转成 ast 语法树
    let astRoot = parserHTML(html); // 2. 代码生成(根据树，生成 render 方法内部代码)
    //     比如 _c('div', { id: 'app', a: 1 }, _v("hello"+_s(msg)+"你好呀"))

    let code = generate(astRoot); // 3. 把生成的代码包装成 render (敲黑板)
    //    使用 Function 把字符串变成函数
    //    使用 with 保证模板上的变量取自 this，后续调用 render.call(vm) 即可

    let render = new Function(`with(this) { return ${code} }`); // console.log(render, 'render');

    return render;
  }

  // 观察者收集器
  // 每个属性上需要挂载一个 wacher 收集器 dep (defineReactive 方法顶部闭包方式保存)， 用来收集自己的 wachers，因为一个属性如果在多个组件用，是要多个 watcher
  let id$1 = 0; // 为了保证唯一性，也给加个序号

  class Dep {
    constructor() {
      this.id = id$1++;
      this.subs = []; // 存放 watcher
    }

    depend() {
      // Dep.target  dep 里要存放这个 watcher，watcher 要存放 dep，多对多的关系
      if (Dep.target) {
        // 这一步最终结果是 dep 和 wacher 是互相存
        Dep.target.addDep(this);
      }
    }

    addSub(watcher) {
      this.subs.push(watcher);
    } // 通知更新


    notify() {
      // 属性一改可能会更新 n 次
      this.subs.forEach(watcher => watcher.update());
    }

  }

  Dep.target = null; // 静态属性

  function pushTarget(watcher) {
    Dep.target = watcher;
  }
  function popTarget() {
    Dep.target = null;
  }

  let queue = [];
  let has = {}; // 存放 wacher ID，防止相同 watcher 更新多次

  let pending = false; // 清空 wacher 队列，每一个 watcher 都是一次更新操作(render + patch)

  function flushSchedulerQueue() {
    for (let i = 0; i < queue.length; i++) {
      queue[i].run(); // 更新
    }

    queue = [];
    has = {};
    pending = false;
  }

  function queueWatcher(watcher) {
    let id = watcher.id;

    if (has[id] == null) {
      queue.push(watcher);
      has[id] = true; // 开启一次异步批处理更新(防抖)

      if (!pending) {
        console.log('dom 更新 run'); // 不能使用延时器，不然我们想拿到更新后的 dom 节点，只能通过 setTimeout 去拿
        // 而且，我们希望尽早更新，同步代码执行完毕会先执行微任务，而不想等 setTimeout
        // setTimeout(flushSchedulerQueue, 0);

        nextTick(flushSchedulerQueue);
        pending = true;
      }
    }
  }

  // Dep 上挂载 watcher 的方式
  let id = 0; // 每 new 一次 watcher，id++
  // 观察者类

  class Watcher {
    // exprOrFn: 可能是个表达式(计算属性)或者更新的函数(vm._update(vm._render()))或字符串(watch 创建的 watcher，第二个参数是 key)
    // options：为 true 标识它是个渲染 watcher
    constructor(vm, exprOrFn, cb, options) {
      this.vm = vm;
      this.exprOrFn = exprOrFn;
      this.cb = cb;
      this.user = !!options.user; // 是不是用户 watcher, 取布尔值

      this.options = options;
      this.id = id++; // watcher 类实例化计数

      this.deps = []; // 防止一个模板绑定两次相同的值 存两个 dep <span> {{ msg + msg }}}</span>

      this.depsId = new Set();

      if (typeof exprOrFn == 'string') {
        // watch api 的 watcher
        // 如果是 watch: { name: handler } 走到这里，此时 exprOrFn 就是 'name'
        // 走到下面 this.get() 方法内部时，执行 pushTarget 函数会把 Dep.target = 本次 watch 的 watcher
        // 然后执行 this.getter 方法，我们 下面方法中 for 循环取值，这会触发取值被走 get 方法 
        // get 方法回去收集当前 Dep.target 也就是 watch API 创建的 watcher，至此完成此类 wacter 收集
        this.getter = function () {
          // watcher: { "age.n": handler } 取值需要改成 vm['age']['n']
          let path = exprOrFn.split('.'); // [age, n]

          let obj = vm;

          for (let i = 0; i < path.length; i++) {
            obj = obj[path[i]];
          }

          return obj;
        };
      } else {
        // 渲染 watcher
        // render 方法会去 vm 上重新取值，生成虚拟 dom，我们这里把它重命名为 getter
        this.getter = exprOrFn;
      } // 更新函数默认执行一次，首次渲染页面(生成虚拟 dom -> diff -> 真实 dom)
      // this.value 代表初始的 value，也就是记录 oldValue
      // watch api 的 watcher 会返回当前 key 对应的值，渲染 watcher 返回 undefined


      this.value = this.get();
      console.log(this.value, this);
    } // 重新取值并渲染，取值会调用 defineProperty.get 方法，我们让每个属性都能收集自己的 watcher(多对多的关系)
    // 每个组件的渲染都会初始化一个 wacher，组件内属性跟 watcher 做绑定
    // 每个属性可能有多个 watcher(全局的属性 msg 100 个组件使用，就会声明 100 个 wacher 实例跟 msg 做绑定)
    // 同一个 watcher 实例可能对应 n 多属性，比如 A 组件内有 100 变量，该 watcher 会收集 100 个 dep 供后续使用
    // 为了收集以上关系，我们声明一个 Dep 类


    get() {
      // console.log('dom 渲染');
      // 注意，这里代码只有要更新页面时(getter 就是更新页面方法)，才会走
      // 模板内绑定的变量，取值之前这里设置 Dep.target -> wacher
      // 注意，普通的 vm.msg 取值不会走该方法，也就是普通的读取变量 Dep.target -> null
      pushTarget(this); // 只有取值的时候，把当前 watcher 收集到当前属性的收集器 Dep 上，并渲染页面
      // 也就是说，当前变量在模板中使用到了，才会去收集 watcher (没用到不取)

      const value = this.getter(); // 取值之后 立马清空挂载的 wacher 实例

      popTarget();
      return value;
    } // 双向收集


    addDep(dep) {
      let id = dep.id; // 如果没存过这个 dep， 再存

      if (!this.depsId.has(id)) {
        this.depsId.add(id);
        this.deps.push(dep);
        dep.addSub(this);
      }
    } // 存起来要更新的操作，交给调度器


    update() {
      // 缓存 wacher，多次调用先缓存，等会儿去重一起更新。
      // 这就是为什么 vue 的数据更新是异步的
      queueWatcher(this);
    } // 调度器更新实际调用的方法


    run() {
      // 渲染操作的更新方法，后续还有其他更新
      // 更新后拿到新值
      let newValue = this.get();
      let oldValue = this.value;
      this.value = newValue; // 更新 oldValue

      if (this.user) {
        // 用户自定义的 watcher 的话，调用 cb 方法，传入 oldValue 和 newValue
        // 这个 cb 就是 watch: { name: handler } 中的 handler 啦
        this.cb.call(this.vm, oldValue, newValue);
      }
    }

  }

  /**
   * @description dom diff & 生成虚拟 dom 方法
   * @param { Element | Object } el 根 dom 节点
   * @param { Object } vnode 虚拟 dom 对象 
   */
  function patch(curElm, vnode) {
    // 把 vnode 生成真实 dom，挂载节点整个替换
    if (curElm.nodeType == 1) {
      const parentElm = curElm.parentNode; // 找到挂载节点的父节点

      const newElm = createElm(vnode); // 根据虚拟节点 创建真实节点

      parentElm.insertBefore(newElm, curElm.nextSibling); // 放在挂载节点的下一个元素

      parentElm.removeChild(curElm); // 删除掉挂载节点

      return newElm; // 新的根节点返还 重新挂载到 vm.$el 上
    }
  } // 创建真实 dom，并插入到页面(父节点)

  function createElm(vnode) {
    let {
      tag,
      data,
      children,
      text,
      vm
    } = vnode;

    if (typeof tag === 'string') {
      // 元素节点
      // 把当前真实节点挂载到虚拟节点的 elm 属性上，方便下层使用
      vnode.elm = document.createElement(tag); // 处理子节点(树的深度遍历)

      children.forEach(child => {
        // 插入到父真实节点上
        // console.log(child);
        vnode.elm.appendChild(createElm(child));
      });
    } else {
      // 文本节点
      // console.log('------text-------', text, vnode);
      vnode.elm = document.createTextNode(text);
    }

    return vnode.elm;
  }

  function lifecycleMixin(Vue) {
    // 生成真实 dom 的方法
    Vue.prototype._update = function (vdom) {
      const vm = this; // console.log(vm.$el, '_updata', vdom);
      // 既有初始化，又有更新
      // 老节点被干掉了 使用新节点

      vm.$el = patch(vm.$el, vdom); // diff 来啦
    }; // nextTick 方法


    Vue.prototype.$nextTick = nextTick;
  } // 后续每个组件渲染的时候都会有一个 watcher

  function mountComponent(vm, el) {
    // 更新函数 数据变化后 会再次调用此函数
    let updataComponent = () => {
      // 调用 render 函数，生成虚拟 dom，用虚拟 dom 生成真实 dom
      vm._update(vm._render());
    }; // 注掉原有更新逻辑
    // updataComponent();
    // 传入 true 标识着他是一个渲染 watcher，后续还会有其他 watcher，这里做个标识


    new Watcher(vm, updataComponent, () => {
      console.log('更新视图啦');
    }, true);
  }

  // 这里不对数组原型做操作，只针对 data 中的数组，增加了一层方法拦截
  let oldArrayPrototype = Array.prototype; // 挂载老的原型对象到 arrayMethod 上，arrayMethod.__proto__ 能拿到 oldArrayPrototype

  let arrayMethod = Object.create(oldArrayPrototype); // 只有这七个方法修改了原数组 所以要重写

  let methods = ['push', 'pop', 'splice', 'shift', 'unshift', 'reverse', 'sort'];
  methods.forEach(method => {
    // 先找自己身上，找不到去原型对象上找「arrayMethod 的原型对象是 oldArrayPrototype」
    // 比如 push 方法可以传多个参数，所以这里通过扩展运算符拿到参数列表
    arrayMethod[method] = function (...args) {
      // 调用原有数组方法
      oldArrayPrototype[method].call(this, ...args);
      let inserted = null; // 新插入的元素
      // 对新增的元素进行重新劫持，新增数组元素的方法只有 splice、push、unshift

      switch (method) {
        case 'splice':
          // splice 第二个参数后，就是新增的元素
          inserted = args.slice(2);

        case 'push':
        case 'unshift':
          // push 和 unshift 传入的元素即为新增元素
          inserted = args;
          break;
      } // 遍历 inserted，需要劫持的增加数据劫持，但是数据劫持的方法在 Observer 类上
      // 我们取巧的把 Observer 类的实例挂载到当前操作的数组上 叫 __ob__，具体见 Observer 中实现


      let ob = this.__ob__; // 接着劫持 本身是个数组

      if (inserted) ob.observeArray(inserted); // 调用数组的 observer.dep 属性，触发更新

      ob.dep.notify();
    };
  });

  // 如果给对象新增一个属性不会触发视图更新(给对象本身也增加一个 dep，dep 中存 watcher，如果增加一个属性后，我就手动的触发 watcher 的更新)

  class Observer {
    constructor(val) {
      // 给 Observer 实例增加一个 dep 属性，也就是 val.__ob__.dep
      // 注意此时 val 可能是对象也可能是数组，数组我们是需要加的，用于调用七种方法是调用 dep.notify
      // 对象加上也不影响，因为对象加属性是不会触发更新的(没有劫持)，而且后面实现对象 $set 需要使用到这个 dep
      this.dep = new Dep(); // 给对象和数组添加一个自定义属性，用于数组新增元素时的再次劫持
      // 不过切记 __ob__ 属性不能被枚举，不然如果 val 是个对象的话，就会把 __ob__ 也劫持
      // 这也是我们看到所有的 Vue 变量都有 __ob__ 属性的原因

      Object.defineProperty(val, '__ob__', {
        value: this,
        enumerable: false
      });

      if (isArray(val)) {
        // 我希望数组的变化可以触发视图更新
        // 如果是 val 数组，修改原型方法 这里就不考虑兼容 ie 了
        // 这里只针对 data 中的数组，没有重写 Array.prototype 上的方法
        val.__proto__ = arrayMethod;
        this.observeArray(val);
      } else {
        this.walk(val); // 遍历属性进行劫持
      }
    } // 递归遍历数组，对数组内部的对象再次重写 比如 [{}]  [[]]
    // 需要注意的是: 数组套对象的话，修改对象属性，也会触发更新，比如：
    // vm.arr[0].a = 100 ----> 触发更新
    // vm.arr[0] = 100   ----> 不会触发更新


    observeArray(val) {
      // 调用 observe 方法，数组内元素如果不是对象，则不会劫持
      val.forEach(itm => observe(itm));
    } // 遍历对象


    walk(data) {
      Object.keys(data).forEach(key => {
        // 使用 defineProperty 重新定义
        defineReactive(data, key, data[key]);
      });
    }

  } // 对数组里面的数组进行依赖收集


  function dependArray(val) {
    for (let i = 0; i < val.length; i++) {
      let current = val[i]; // current 是数组里面的数组

      current.__ob__ && current.__ob__.dep.depend(); // 递归收集，使闭包内的 Dep 保存 wacher

      if (Array.isArray(current)) {
        dependArray(current);
      }
    }
  } // vue2 慢的一个原因
  // 这里引出几条 vue2 的性能优化原则
  //   @1 不要把所有的数据都放在 data 中，闭包过多会损耗性能
  //   @2 尽量扁平化数据，不要嵌套多次，递归影响性能
  //   @3 不要频繁获取数据，会触发 get 方法，走 get 方法中的全部逻辑
  //   @4 如果数据某属性不需要响应式，可以使用 Object.freeze 冻结属性「源码里会跳过 defineReactive」


  function defineReactive(obj, key, value) {
    // 进行劫持(递归) 对象或数组返回 Observer 实例，普通值返回 undefined
    let childOb = observe(value);
    let dep = new Dep(); // 给当前变量声明一个 Dep(闭包中保存)，并收集 watcher
    // console.log(childOb, '就是当前数据 Observer 实例');

    Object.defineProperty(obj, key, {
      get() {
        // 这里就形成一个闭包，每次执行 defineReactive 上下文都不会被释放
        // 所以这就是 vue2 的性能瓶颈
        // console.log(key, 'get 取值啦');
        if (Dep.target) {
          // 说明是解析模板内变量 也就是 render 执行时候用到的 vm 中变量取值
          // console.log('渲染模板内属性', key);
          // 模板内变量的 Dep 里收集 watcher
          dep.depend(); // 数组本身添加 Dep 收集 watcher 去更新(对象也会被添加 Dep，但是对象的 Dep 暂时没有使用哦)
          // 如果 value 是个普通值，则 childOb 为 undefined

          if (childOb) {
            // 让数组和对象也记录 Dep，收集 watcher
            childOb.dep.depend(); // 如果当前 value 个数组，需要考虑二维数组的情况，因为某个字段是多维数组，取值只触发最外层数组的一次 get
            // 比如 hobbys -> [[1, 2, 3]]，我想让 hobbys[0].push('4') 也能更新
            // 取外层数组要对里面的 item 也行依赖收集 

            if (Array.isArray(value)) {
              console.log(value);
              dependArray(value);
            }
          }
        }

        return value;
      },

      set(newValue) {
        if (newValue !== value) {
          // console.log('触发set方法');
          // 设置新值重新劫持 
          observe(newValue);
          value = newValue; // 每个属性的闭包中的 dep 实例

          dep.notify(); // 告诉当前属性存放的 watcher 执行
        }
      }

    });
  }

  function observe(data) {
    // 如果不是对象，直接返回「非对象类型不进行递归劫持」
    if (!isObject(data)) return; // 如果被劫持过，就不再进行劫持了
    // 劫持过的话，把上次劫持的 Oberver 对象返回

    if (data.__ob__) {
      return data.__ob__;
    }
    // 劫持过的对象 把类的实例挂在到 data.__ob__

    return new Observer(data);
  }

  function initState(vm) {
    const options = vm.$options;

    if (options.data) {
      initData(vm);
    }

    if (options.watch) {
      initWatch(vm, options.watch);
    }
  } // 代理 -> 使用 vm.info 取到 vm.data.info「劫持过的 info」

  function proxyFn(vm, key, source) {
    Object.defineProperty(vm, key, {
      get() {
        return vm[source][key];
      },

      set(newVal) {
        vm[source][key] = newVal;
      }

    });
  }

  function initData(vm) {
    // 数据的初始化
    // 注意 data 可能是个对象 也可能是个函数
    //   + 对象：根实例
    //   + 函数：页面组件互相之间的数据隔离
    let data = vm.$options.data; // 注意修正 this，防止 data 函数执行 this 指向 window
    // 把 data 赋值给 vm 实例一个变量上，这里取名 _data，作为实例的属性数据源

    data = vm._data = isFunction(data) ? data.call(vm) : data; // 数据劫持

    observe(data); // 取 data.info => vm._data.info 做了一层代理获取到劫持后的 info
    // 这也是 vue 中我们可以用 this 访问和修改 data 中数据的原因

    for (let key in data) {
      proxyFn(vm, key, '_data');
    }
  }

  function initWatch(vm, watch) {
    for (let key in watch) {
      let handler = watch[key];

      if (Array.isArray(handler)) {
        // handler 为数组
        for (let i = 0; i < handler.length; i++) {
          // 创建个 watcher 去监听数据变化
          createWatcher(vm, key, handler[i]);
        }
      } else {
        // handler 为函数
        createWatcher(vm, key, handler);
      }
    }
  }

  function createWatcher(vm, key, handler) {
    return vm.$watch(key, handler);
  } // 把 $watch 扩展到原型上


  function stateMixin(Vue) {
    Vue.prototype.$watch = function (key, handler, options = {}) {
      options.user = true; // 标识用户自己写的 watcher, 跟渲染 watcher 区分开

      new Watcher(this, key, handler, options);
    };
  }

  function callHook(vm, hook) {
    const handlers = vm.$options[hook];

    if (handlers) {
      // 依次执行生命周期收集的钩子函数
      for (let i = 0; i < handlers.length; i++) {
        // 生命周期的 this 也指向当前实例，这就是为什么 vue2 中生命周期能拿到当前组件实例
        handlers[i].call(vm);
      }
    }
  }

  function initMixin(Vue) {
    // 后续组件化开发的时候，Vue.extend 可以创造一个子组件，子组件也可以调用 _init 方法
    Vue.prototype._init = function (options) {
      const vm = this; // 注意调用的时候是 实例._init, 所以这里的 this 指的是实例本身 
      // 把用户的配置放到实例上, 这样在其他方法中都可以共享 options 了
      // 同混入的 Vue.options 做合并(mixin), 注意参数顺序，组件 options 优先替换 全局 options

      vm.$options = mergeOptions(this.constructor.options, options); // console.warn(vm.$options);

      callHook(vm, 'beforeCreate'); // beforeCreate 在 initState 前执行
      // 因为数据的来源有很多种，比如 data、props、computed 等，我们要做一个统一的数据的初始化『数据劫持』

      initState(vm);

      if (vm.$options.el) {
        // 要将数据挂载到页面上『模板解析』
        // console.log('页面要挂载');
        // 现在数据已经被劫持了，数据变化需要更新视图(diff 算法更新需要更新的部分)
        // 在 vue2 中，使用的是更符合前端思维的 template 而不是更灵活的 JSX
        // vue3 template 写起来性能会高一些，内部做了很多优化，所以在 vue3 里面尽量不要使用 jsx
        // 挂载到的 DOM 节点，其实最终用的都是 $mount 方法
        // 处理 new Vue({ el })  写法
        vm.$mount(vm.$options.el);
      }
    }; // 挂载节点的方法(如果 options 中不传 el 的话)
    // 兼容 new Vue({}).$mount(el) 这种写法


    Vue.prototype.$mount = function (el) {
      const vm = this;
      const opts = vm.$options;
      el = document.querySelector(el); // 获取真实节点

      vm.$el = el; // 真实元素挂载到实例上

      if (!opts.render) {
        // 模板编译
        let template = opts.template;

        if (!template && el) {
          // outerHTML 取得是该元素和其所有子元素序列化后的字符串标签
          template = el.outerHTML;
        } // compileToFunctions 为模板编译的方法，模板 -> js 对象 -> ast -> render code -> 生成 render 函数


        let render = compileToFunctions(template); // el 节点本身

        opts.render = render;
      } // opts.render 就是渲染函数
      // console.warn(opts.render, 'opts.render');
      // 开始组件挂载流程(生命周期方法)，也就是模板解析(变量渲染到dom上)


      mountComponent(vm);
    };
  }

  // 创建虚拟 dom 节点 也就是 render 方法中  _c
  function createElement(vm, tag, data = {}, children) {
    // console.log('createElement 方法', tag, data, children, vm);
    return vnode(vm, tag, data, data.key, children, undefined); // key 挂在了虚拟dom上哦
  } // 创建虚拟文本节点 也就是 render 方法中  _v

  function createTextElement(vm, text) {
    // console.log('createTextElement 方法', text, vm);
    return vnode(vm, undefined, undefined, undefined, undefined, text);
  } // 虚拟dom (比 ast 数更自由，随意组合属性，哪怕不合法的属性)

  function vnode(vm, tag, data, key, children, text) {
    return {
      vm,
      tag,
      data,
      key,
      children,
      text
    };
  }

  function renderMixin(Vue) {
    // 创建 render 函数需要的三个方法
    Vue.prototype._c = function (tagName, data, ...children) {
      // createElement
      const vm = this;
      return createElement(vm, tagName, data, children);
    };

    Vue.prototype._v = function (text) {
      // createTextElement
      const vm = this;
      return createTextElement(vm, text);
    }; // 转字符串


    Vue.prototype._s = function (val) {
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    }; // 把 vm.$options 上的 render 方法 挂载到原型链


    Vue.prototype._render = function () {
      const vm = this; // 就是我们通过 ast 生成的 render 方法(或者原本就传了 render 方法)

      let render = vm.$options.render;
      let vnode = render.call(vm);
      return vnode;
    };
  }

  function Vue(options) {
    this._init(options);
  } // vue 增加静态方法，mixin 之类的


  initGlobalAPI(Vue); // 在 Vue 原型链上扩展初始化方法(init, $mount 等)

  initMixin(Vue); // 原型链挂载 _render -> 生成虚拟 dom 方法

  renderMixin(Vue); // 原型链挂载 _update -> 生成真实 dom 方法

  lifecycleMixin(Vue); // 扩展原型 $watcher 方法

  stateMixin(Vue);

  return Vue;

})));
//# sourceMappingURL=vue.js.map
