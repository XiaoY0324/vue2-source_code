const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; // 匹配双花括号 {{}}

// 数组转对象 [{ name: 'aaa', value: 'bbb' }] => { aaa: 'bbb' }
function genProps(attrs) {
  let str = '';

  for (let i = 0; i < attrs.length; i++) {
    let attr = attrs[i];

    if (attr.name === 'style') { // style: "color: red; background: blue;"
      let styleObj = {};

      attr.value.replace(/([^;:]+)\:([^;:]+)/g, function() {
        styleObj[arguments[1]] = arguments[2];
      });

      attr.value = styleObj;
    }

    str += `${ attr.name }: ${ JSON.stringify(attr.value) },`
  }

  return `{${ str.slice(0, -1) }}` // 删掉多余的逗号
}

// 检查子节点 递归生成 code
function gen(node) {
  if (node.type == 1) {
    // 节点类型
    return generate(node);
  } else {
    let text = node.text;

    if (!defaultTagRE.test(text)) {
      // 文本内容不包含双花括号
      return `_v("${ text }")`;
    } else {
      // 双花括号内的当做变量进行拼接 -> hello {{ msg }} 你好呀
      let tokens = [];
      let match;
      // {{}} 结束索引 也是下一次遍历的开始索引 
      // defaultTagRE.lastIndex 也重置为 0，因为正则全局匹配和 exec 有冲突
      // 每次匹配完要重置下标
      let lastIdx = defaultTagRE.lastIndex = 0; 

      while(match = defaultTagRE.exec(text)) {
        // 匹配到了 {{}}
        let startIdx = match.index; // 开始索引

        if (startIdx > lastIdx) {
          tokens.push(JSON.stringify(text.slice(lastIdx, startIdx)));
        }

        // 花括号内变量 考虑换行需要 trim
        // 花括号内可能是个对象，为了避免隐式转为 [object Object]
        // 使用 _s 包装，_s 其实就是调用了 JSON.stringify()
        tokens.push(`_s(${ match[1].trim() })`);
        
        lastIdx = startIdx + match[0].length; // 结束索引
      }

      // 截取最好一段 比如 "hello {{ msg }} 你好呀" 中的 "你好呀"
      if (lastIdx < text.length) {
        tokens.push(JSON.stringify(text.slice(lastIdx)));
      }

      return `_v(${ tokens.join('+') })`;
    }
  }
}

// 获取 ast 节点的儿子
function genChildren(node) {
  let children = node.children; // 获取儿子

  if (children) {
    // 递归拼接
    return children.map(c => gen(c)).join(',');
  }

  return false;
}


// 生成类似 _c('div', { id: 'app', a: 1 }, _v('hello')) 这样的代码片段 也有可能是下面这种哦
// _c('div', { id: 'app', a: 1 }, _c('span', { id: 'span'}, _v('套娃子节点')))
// _c 表示创建元素的虚拟节点方法 _v 表示创建文本的虚拟节点方法
export function generate(astRoot) { 
  let children = genChildren(astRoot);

  // 遍历 ast 树，将树拼接成字符串
  let code = `_c("${ astRoot.tag }", ${
    astRoot.attrs.length ? genProps(astRoot.attrs) : 'undefined'
  }${
    children ? `,${ children }` : '' 
  })`;

  return code;
}