import { config } from "./src/config.js";

async function run() {
  const headers = { Authorization: config.discordToken };
  const assetsUrl = `https://discord.com/api/v9/oauth2/applications/${config.appId}/assets`;

  try {
    const resp = await fetch(assetsUrl, { headers });
    if (resp.ok) {
      const assetsList = await resp.json();
      console.log("Assets:", assetsList);
    } else {
      console.log("Error:", resp.status, await resp.text());
    }
  } catch (e) {
    console.log(e);
  }
}

run();
