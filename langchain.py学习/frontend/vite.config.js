import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
//vite里面包括了很多功能，比如热更新、模块联邦、代码分割等等，可以大大提升开发效率和用户体验。
//在这个配置文件中，我们引入了vue插件，这样就可以在项目中使用Vue.js框架了。你可以根据需要添加其他插件或者配置项来满足你的项目需求。
