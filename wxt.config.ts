import { defineConfig } from "wxt";

export default defineConfig({
  manifestVersion: 3,
  manifest: {
    name: "Uposatha Day Countdown",
    description: "Browser action icon that shows how many days until the next poya day and whether it is a new or full moon.",
    version: "0.1.0",
    action: {
      default_title: "Next poya day",
      default_icon: {
        128: "icon/128.png",
      },
    },
    icons: {
      128: "icon/128.png",
    },
    permissions: ["alarms"],
    browser_specific_settings: {
      gecko: {
        id: "{9608726a-2f8e-486e-aa12-d216967880b4}",
        // @ts-ignore
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
  },
});
