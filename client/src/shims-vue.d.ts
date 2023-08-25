declare module "*.vue" {
  import { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, never>>;
  export default component;
}
