import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";
import "element-plus/dist/index.css";

import "./assets/css/main.scss";

const app = createApp(App);

import Antd from "ant-design-vue";
import "ant-design-vue/dist/antd.css";

app.use(createPinia());
app.use(router).use(Antd);

app.mount("#app");
