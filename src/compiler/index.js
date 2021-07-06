import { generate } from "./generate";
import { parserHTML } from "./parser";

// 模板编译原理
export function compileToFunctions(html) {
  // 1. 将模板转成 ast 语法树
  let astRoot = parserHTML(html);
  // 2. 代码生成(根据树，生成 render 方法内部代码)
  //     比如 _c('div', { id: 'app', a: 1 }, _v("hello"+_s(msg)+"你好呀"))
  let code = generate(astRoot);

  // 3. 把生成的代码包装成 render (敲黑板)
  //    使用 Function 把字符串变成函数
  //    使用 with 保证模板上的变量取自 this，后续调用 render.call(vm) 即可
  let render = new Function(`with(this) { return ${ code } }`); 
  // console.log(render, 'render');
  return render;
}