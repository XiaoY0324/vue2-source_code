// 创建虚拟 dom 节点 也就是 render 方法中  _c
export function createElement(vm, tag, data = {}, children) {
  // console.log('createElement 方法', tag, data, children, vm);
  return vnode(vm, tag, data, data.key, children, undefined); // key 挂在了虚拟dom上哦
}

 // 创建虚拟文本节点 也就是 render 方法中  _v
export function createTextElement(vm, text) {
  // console.log('createTextElement 方法', text, vm);
  return vnode(vm, undefined, undefined, undefined, undefined, text);
}

// 虚拟dom (比 ast 数更自由，随意组合属性，哪怕不合法的属性)
function vnode(vm, tag, data, key, children, text) {
  return {
    vm, 
    tag, 
    data, 
    key, 
    children,
    text
  }
}