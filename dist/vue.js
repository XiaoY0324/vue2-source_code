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

  // 这里不对数组原型做操作，只针对 data 中的数组，增加了一层方法拦截
  let oldArrayPrototype = Array.prototype; // 挂载老的原型对象到 arrayMethod 上，arrayMethod.__proto__ 能拿到 oldArrayPrototype

  let arrayMethod = Object.create(oldArrayPrototype); // 只有这七个方法修改了原数组 所以要重写

  let methods = ['push', 'pop', 'splice', 'shift', 'unshift', 'reverse', 'sort'];
  methods.forEach(method => {
    // 先找自己身上，找不到去原型对象上找「arrayMethod 的原型对象是 oldArrayPrototype」
    // 比如 push 方法可以传多个参数，所以这里通过扩展运算符拿到参数列表
    arrayMethod[method] = function (...args) {
      console.log('数组的方法进行重写'); // 调用原有数组方法

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
        if (newValue == value) return;
        console.log('触发set方法'); // 设置新值重新劫持 

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

    console.log(data);
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
        console.log('页面要挂载'); // 现在数据已经被劫持了，数据变化需要更新视图(diff 算法更新需要更新的部分)
        // 在 vue2 中，使用的是更符合前端思维的 template 而不是更灵活的 JSX
        // vue3 template 写起来性能会高一些，内部做了很多优化，所以在 vue3 里面尽量不要使用 jsx
        // 挂载到的 DOM 节点，其实最终用的都是 $mount 方法
        // 处理 new Vue({ el })  写法

        vm.$mount(vm.$options.el);
      }
    }; // 挂载节点的方法(如果 options 中不传 el 的话)
    // 兼容 new Vue({}).$mount(el) 这种写法


    Vue.prototype.$mount = function (el) {
      el = document.querySelector(el); // 获取真实节点
    };
  }

  function Vue(options) {
    this._init(options);
  } // 在 Vue 原型链上扩展方法 


  initMixin(Vue);

  return Vue;

})));
//# sourceMappingURL=vue.js.map
