export function isFunction(val) {
  return typeof val === 'function';
}

export function isObject(val) {
  return typeof val !== 'null' && typeof val === 'object';
}

export function isArray(val) {
  return Object.prototype.toString.call(val) === '[object Array]';
}

const callbacks = [];
let wating = false; // 防抖

// 依次执行 nextTick 队列中的 callback
function flushCallbacks() {
  callbacks.forEach(cb => cb());
  wating = false;
}

// 降级策略
function timer(cb) {
  let timerFn = () => {};

  if (Promise) {
    timerFn = () => {
      Promise.resolve().then(cb);
    };
  } else if (MutationObserver) { // 微任务 监听节点变化的 api
    let textNode = document.createTextNode(1); // 随便创建个文本节点来监听
    let observe = new MutationObserver(cb); // 注册个回调

    observe.observe(textNode, { // 监控文本节点变化 characterData 代表文本内容
      characterData: true
    });

    timerFn = () => {
      textNode.textContent = 2;
    }
  } else if (setImmediate) { // ie 才认的 api，性能略高于 setTimeout  
    timerFn = () => {
      setImmediate(cb);
    }
  } else {
    // 再不支持 只能延时器了
    timerFn = () => {
      setTimeout(cb);
    }
  }
  
  timerFn();
}


// 源码中的调度器会优先调用 nextTick 方法(批量更新就调用)
// 所以更新 dom 的操作会先入 callbacks 队列
export function nextTick(cb) {
  callbacks.push(cb);

  if (!wating) {
    // vue3 不考虑兼容，这里直接 Promise.resolve.then(flushCallbacks)
    // vue2 中考虑兼容性问题，有个降级策略
    timer(flushCallbacks);
    wating = true;
  }
}


// 策略模式，针对不同的 key 去做合并
const strats = {};

// 针对不同 key 的策略，这里写四个生命周期的合并为栗，method 等合并同理
['beforeCreate', 'created', 'beforeMount', 'mounted'].forEach(method => {
  strats[method] = function(curVal, mixinVal) {
    if (mixinVal) {
      // Vue.options 默认值为空对象，所以原始配置中 key 对应的生命周期函数这里可能是空的
      // 首次是这样的，Vue.options = {}, options = { a, beforeCreate: function() {} }
      // 第二次是这样的，Vue.options = { a, beforeCreate: [fn] }, options = { b, beforeCreate: function() {} }
      if (curVal) { 
        // 函数数组进行合并
        return curVal.concat(mixinVal);
      } else {
        // 公共配置没有生命周期，混入配置有，要把这些生命周期函数变为数组保存
        return [mixinVal]
      }
    } else {
      // 如果混入的 key 对应的值为空，直接使用原来的值
      return curVal; 
    }
  }
});

export function mergeOptions(curOptions, mixinOptions) {
  const res = {};

  // 先遍历 Vue.options，如果混入 options 中该属性也存在，使用混入的变量替换
  for (let key in curOptions) {
    mergeField(key);
  }

  // 再遍历混入 options，如果某属性 Vue.options 没有，拷贝过来
  for (let key in mixinOptions) {
    if (!curOptions.hasOwnProperty(key)) {
      mergeField(key);
    }
  }

  // 合并配置
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
