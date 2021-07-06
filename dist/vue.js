(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
}(this, (function () { 'use strict';

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

  /**
   * @description dom diff & 生成虚拟 dom 方法
   * @param { Element | Object } el 首次为真实 dom 节点，后续为虚拟 dom 
   * @param { Object } vnode 虚拟 dom 对象 
   */
  function patch(el, vnode) {
    // 首次渲染，el 为 vm.$el 是个真实节点, 此时把 vnode 生成真实 dom，整个替换
    if (el.nodeType == 1) {
      const parentElm = el.parentNode; // 找到挂载节点的父节点

      const newElm = createElm(vnode); // 根据虚拟节点 创建真实节点

      parentElm.insertBefore(newElm, el.nextSibling); // 放在挂载节点的下一个元素

      parentElm.removeChild(el); // 删除掉挂载节点
    }
  } // 创建真实 dom

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

    console.log(vnode.elm);
    return vnode.elm;
  }

  function lifecycleMixin(Vue) {
    // 生成真实 dom 的方法
    Vue.prototype._update = function (vdom) {
      const vm = this; // console.log(vm.$el, '_updata', vdom);
      // 既有初始化，又有更新

      patch(vm.$el, vdom); // diff 来啦
    };
  }
  function mountComponent(vm, el) {
    // 更新函数 数据变化后 会再次调用此函数
    let updataComponent = () => {
      // 调用 render 函数，生成虚拟 dom
      let vdom = vm._render();

      console.log(vdom, '虚拟dom'); // 用虚拟 dom 生成真实 dom

      vm._update(vdom);
    };

    updataComponent();
  }

  function isFunction(val) {
    return typeof val === 'function';
  }
  function isObject(val) {
    return typeof val !== 'null' && typeof val === 'object';
  }
  function isArray(val) {
    return Object.prototype.toString.call(val) === '[object Array]';
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

      if (inserted) ob.observeArray(inserted);
    };
  });

  class Observer {
    constructor(val) {
      // 给对象和数组添加一个自定义属性，用于数组新增元素时的再次劫持
      // 不过切记 __ob__ 属性不能被枚举，不然如果 val 是个对象的话，就会把 __ob__ 也劫持
      // 这也是我们看到所有的 Vue 变量都有 __ob__ 属性的原因
      Object.defineProperty(val, '__ob__', {
        value: this,
        enumerable: false
      });

      if (isArray(val)) {
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

  } // vue2 慢的一个原因
  // 这里引出几条 vue2 的性能优化原则
  //   @1 不要把所有的数据都放在 data 中，闭包过多会损耗性能
  //   @2 尽量扁平化数据，不要嵌套多次，递归影响性能
  //   @3 不要频繁获取数据，会触发 get 方法，走 get 方法中的全部逻辑
  //   @4 如果数据某属性不需要响应式，可以使用 Object.freeze 冻结属性「源码里会跳过 defineReactive」


  function defineReactive(obj, key, value) {
    observe(value); // 递归进行劫持

    Object.defineProperty(obj, key, {
      get() {
        // 这里就形成一个闭包，每次执行 defineReactive 上下文都不会被释放
        // 所以这就是 vue2 的性能瓶颈
        return value;
      },

      set(newValue) {
        if (newValue == value) return; // console.log('触发set方法');
        // 设置新值重新劫持 

        observe(newValue);
        value = newValue;
      }

    });
  }

  function observe(data) {
    // 如果不是对象，直接返回「非对象类型不进行递归劫持」
    if (!isObject(data)) return; // 如果被劫持过，就不再进行劫持了

    if (data.__ob__) return; // 如果一个数据被劫持过了，就不要重复劫持了，这里用类来实现
    // 劫持过的对象 把类的实例挂在到 data.__ob__

    return new Observer(data);
  }

  function initState(vm) {
    const options = vm.$options;

    if (options.data) {
      initData(vm);
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

  function initMixin(Vue) {
    // 后续组件化开发的时候，Vue.extend 可以创造一个子组件，子组件也可以调用 _init 方法
    Vue.prototype._init = function (options) {
      const vm = this; // 注意调用的时候是 实例._init, 所以这里的 this 指的是实例本身 
      // 把用户的配置放到实例上, 这样在其他方法中都可以共享 options 了

      vm.$options = options; // 因为数据的来源有很多种，比如 data、props、computed 等，我们要做一个统一的数据的初始化『数据劫持』

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
  } // 在 Vue 原型链上扩展方法 


  initMixin(Vue); // 原型链挂载 _render -> 生成虚拟 dom 方法

  renderMixin(Vue); // 原型链挂载 _update -> 生成真实 dom 方法

  lifecycleMixin(Vue);

  return Vue;

})));
//# sourceMappingURL=vue.js.map
