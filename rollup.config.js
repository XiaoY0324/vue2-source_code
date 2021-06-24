import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';

export default {
  input: 'src/index.js', // 打包入口
  output: {
    file: 'dist/vue.js', // 打包出口
    format: 'umd', // 常见格式 IIFE ESM CJS UMD
    name: 'Vue', // umd 模块需要配置 name, 会将导出的模块挂到 window 上
    sourcemap: true
  },
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**', // glob 写法, 忽略 node_modules 下所有包
    })
  ]
}