vue2 手写

# 目录结构
- src
  - observe
    - array.js    // 数组方法重写
    - index.js    // 观察者类 真正的数据劫持方法
  - index.js      // 入口文件
  - initMixin.js  // vue 挂载init 方法
  - state.js      // 数据劫持入口
  - utils.js      // 工具方法

  ```js
  // @1 new Vue 会调用 _init 方法进行初始化操作
  // @2 会将用户的选项放到 vm.$options 上
  // @3 会对当前属性上搜索有没有 data 数据，有则初始化 --- initState 方法
  // @4 有 data 则判断 data 是不是一个函数，如果是函数取返回值 initData
  // @5 observe 去观测 data 中的数据
  // @6 vm 上取值也能取到 data 中的数据，原因是做了一层取值代理 vm.a => vm._data.a
  // @7 如果更新对象不存在的属性，会导致视图不跟拿高薪，如果是数组更新索引和长度，则不会触发更新
  // @8 赋值成一个新对象，新对象会被进行劫持，如果是数组存放新内容 push unshift 等新增的元素也会被劫持。
  // @9 通过 __ob__ 进行标识这个对象是否被监控过
  // @10 如果就是想通过索引更改数组触发更新，使用 $set 方法，该方法内部使用 splice
  // 
  ```