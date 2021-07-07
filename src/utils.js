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