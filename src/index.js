import express from "express";
import { config } from "./config.js";
import { client } from "./discord/client.js";
import { embyWebhookRouter } from "./emby/webhook.js";

const app = express();
app.use(express.json());

app.use("/", embyWebhookRouter);

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  // Clear any stuck presences from old scripts or previous crashes
  client.user.setActivity(null);
});

const PORT = config.port || 8068;

app.listen(PORT, () => {
  console.log(`Listening for Emby status webhooks on port ${PORT}...`);
});

if (config.discordToken) {
  client.login(config.discordToken).catch((err) => {
    console.error(
      "Failed to login to Discord. Check your USER_TOKEN.",
      err.message,
    );
  });
} else {
  console.log(
    "No USER_TOKEN found. Please open the configuration page to set it up.",
  );
  setInterval(() => {}, 60000);
}
