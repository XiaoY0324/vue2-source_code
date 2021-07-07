vue2 手写

# 目录结构
- src
  - complier
    - generat.js         ---------  ast 语法树转代码片段
    - index.js           ---------  模板编译入口，接收代码片段，转成 render 函数
    - parser.js          ---------  正则分词，解析模板，生成 ast 语法树  
  - observe
    - array.js           ---------  数组方法重写
    - dep.js             ---------  观察者收集器
    - index.js           ---------  Observer 观察者类 真正的数据劫持方法
    - scheduler.js       ---------  dep.notify -> watcher.update -> watcher 更新调度器(合并 watch，异步更新)
    - watcher.js         ---------  watcher 观察者类
  - vdom
    - index.js           ---------  创建虚拟 dom
    - patch.js           ---------  dom diff, 创建真实 dom
  - index.js             ---------  入口文件
  - initMixin.js         ---------  vue 挂载init 方法
  - lifecycle.js         ---------  实例化 watcher 观察者，每个组件初始化都会走这里
  - render.js            ---------  创建 render 函数需要的三个方法: _c, _v, _s
  - state.js             ---------  数据劫持入口
  - utils.js             ---------  工具方法

# vue2 执行关键步骤
```js
// --------------------------- 数据劫持 ----------------------------
// @1 new Vue 会调用 _init 方法进行初始化操作
// @2 会将用户的选项放到 vm.$options 上
// @3 会对当前属性上搜索有没有 data 数据，有则初始化 --- initState 方法
// @4 有 data 则判断 data 是不是一个函数，如果是函数取返回值 initData
// @5 observe 去观测 data 中的数据
// @6 vm 上取值也能取到 data 中的数据，原因是做了一层取值代理 vm.a => vm._data.a
// @7 如果更新对象不存在的属性，会导致视图不能更新，如果是数组更新索引和长度，则不会触发更新
// @8 赋值成一个新对象，新对象会被进行劫持，如果是数组存放新内容 push unshift 等新增的元素也会被劫持。
// @9 通过 __ob__ 进行标识这个对象是否被监控过
// @10 如果就是想通过索引更改数组触发更新，使用 $set 方法，该方法内部使用 splice
```