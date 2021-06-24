// 这里不对数组原型做操作，只针对 data 中的数组，增加了一层方法拦截
 let oldArrayPrototype = Array.prototype; 
// 挂载老的原型对象到 arrayMethod 上，arrayMethod.__proto__ 能拿到 oldArrayPrototype
let arrayMethod = Object.create(oldArrayPrototype); 

// 只有这七个方法修改了原数组 所以要重写
let methods = ['push', 'pop', 'splice', 'shift', 'unshift', 'reverse', 'sort'];

methods.forEach(method => {
  // 先找自己身上，找不到去原型对象上找「arrayMethod 的原型对象是 oldArrayPrototype」
  // 比如 push 方法可以传多个参数，所以这里通过扩展运算符拿到参数列表
  arrayMethod[method] = function(...args) {
    console.log('数组的方法进行重写');
    // 调用原有数组方法
    oldArrayPrototype[method].call(this, ...args);

    let inserted = null; // 新插入的元素

    // 对新增的元素进行重新劫持，新增数组元素的方法只有 splice、push、unshift
    switch(method) {
      case 'splice':
        // splice 第二个参数后，就是新增的元素
        inserted = args.slice(2);
      case 'push':
      case 'unshift':
        // push 和 unshift 传入的元素即为新增元素
        inserted = args;
        break;
    }

    // 遍历 inserted，需要劫持的增加数据劫持，但是数据劫持的方法在 Observer 类上
    // 我们取巧的把 Observer 类的实例挂载到当前操作的数组上 叫 __ob__，具体见 Observer 中实现
    let ob = this.__ob__;

    // 接着劫持 本身是个数组
    if (inserted) ob.observeArray(inserted);
  }
});

export default arrayMethod;