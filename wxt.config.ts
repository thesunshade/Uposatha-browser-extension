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
        128: "images/full.png",
      },
    },
    icons: {
      128: "images/full.png",
    },
    permissions: ["alarms"],
  },
});
