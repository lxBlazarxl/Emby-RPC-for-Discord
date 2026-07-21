import { config } from "./src/config.js";

async function run() {
  const headers = { Authorization: config.discordToken };
  const assetsUrl = `https://discord.com/api/v9/oauth2/applications/${config.appId}/assets`;

  try {
    const resp = await fetch(assetsUrl, { headers });
    if (resp.ok) {
      const assetsList = await resp.json();
      console.log("Assets:", assetsList);
      for (const asset of assetsList) {
        if (asset.name.startsWith("emby_icon")) {
          console.log(`Deleting ${asset.name}...`);
          await fetch(`${assetsUrl}/${asset.id}`, { method: "DELETE", headers });
        }
      }
    } else {
      console.log("Error:", resp.status, await resp.text());
    }
  } catch (e) {
    console.log(e);
  }
}

run();
