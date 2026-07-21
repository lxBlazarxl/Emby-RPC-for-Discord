import { client } from "./client.js";
import { config } from "../config.js";
import { RichPresence } from "discord.js-selfbot-v13";

export async function setPresence(activityData) {
  if (!client.isReady()) {
    console.log("Discord client not ready yet.");
    return;
  }

  if (!activityData) {
    client.user.setActivity(null);
    return;
  }
  
  let rp = new RichPresence(client)
    .setApplicationId(config.appId)
    .setType(activityData.activityType)
    .setName(activityData.name);
  
  if (activityData.details) rp.setDetails(activityData.details);
  if (activityData.state) rp.setState(activityData.state);
  
  if (activityData.startTimestamp) rp.setStartTimestamp(activityData.startTimestamp);
  if (activityData.endTimestamp) rp.setEndTimestamp(activityData.endTimestamp);

  const assets = activityData.assets || {};
  
  if (assets.large_image) {
    rp.setAssetsLargeImage(assets.large_image);
    if (assets.large_text) rp.setAssetsLargeText(assets.large_text);
  }
  
  if (assets.small_image) {
    rp.setAssetsSmallImage(assets.small_image);
    if (assets.small_text) rp.setAssetsSmallText(assets.small_text);
  }

  client.user.setActivity(rp);
}

export async function clearPresence() {
  if (client.isReady()) {
    client.user.setPresence({ activities: [] });
  }
}
