import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import DfaPlayground from "./components/DfaPlayground.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("DfaPlayground", DfaPlayground);
  },
} satisfies Theme;
