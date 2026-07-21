import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import crypto from "crypto";
import sharp from "sharp";
import { config } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let EMBY_ICON_ID = null;

export async function getEmbyIconId() {
  if (EMBY_ICON_ID) return EMBY_ICON_ID;

  const headers = { Authorization: config.discordToken };
  const assetsUrl = `https://discord.com/api/v9/oauth2/applications/${config.appId}/assets`;

  try {
    const resp = await fetch(assetsUrl, { headers });
    let assetsList = [];
    if (resp.ok) {
      assetsList = await resp.json();
    }

    const iconPath = path.join(__dirname, "../../assets/emby.png");
    if (fs.existsSync(iconPath)) {
      let iconBuffer = fs.readFileSync(iconPath);
      const hash = crypto.createHash("md5").update(iconBuffer).digest("hex").substring(0, 10);
      const expectedName = `emby_icon_${hash}`;

      for (const asset of assetsList) {
        if (asset.name === expectedName) {
          EMBY_ICON_ID = String(asset.id);
          return EMBY_ICON_ID;
        }
      }

      for (const asset of assetsList) {
        if ((asset.name || "").startsWith("emby_icon_")) {
          await fetch(`${assetsUrl}/${asset.id}`, { method: "DELETE", headers });
        }
      }

      const image = sharp(iconBuffer);
      const metadata = await image.metadata();
      const maxDim = Math.max(metadata.width, metadata.height);
      iconBuffer = await image
        .resize(maxDim, maxDim, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      const b64Image = iconBuffer.toString("base64");
      const payload = {
        name: expectedName,
        type: 1,
        image: `data:image/png;base64,${b64Image}`,
      };

      const uploadResp = await fetch(assetsUrl, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (uploadResp.ok) {
        const data = await uploadResp.json();
        EMBY_ICON_ID = String(data.id);
        return EMBY_ICON_ID;
      }
    } else {
      console.log(
        "WARNING: Could not find emby.png in the project folder! Small icon will not be set.",
      );
    }
  } catch (e) {
    console.log(`Error handling emby icon:`, e);
  }
  return null;
}

export async function uploadDiscordAsset(
  itemId,
  imageBuffer,
  mimeType = "image/jpeg",
) {
  const headers = { Authorization: config.discordToken };
  const assetsUrl = `https://discord.com/api/v9/oauth2/applications/${config.appId}/assets`;

  try {
    const resp = await fetch(assetsUrl, { headers });
    if (resp.ok) {
      const assets = await resp.json();
      for (const asset of assets) {
        if ((asset.name || "").startsWith("emby_song")) {
          await fetch(`${assetsUrl}/${asset.id}`, {
            method: "DELETE",
            headers,
          });
        }
      }
    }

    const uniqueName = `emby_song_${Math.floor(Date.now() / 1000)}`;
    const b64Image = imageBuffer.toString("base64");
    const payload = {
      name: uniqueName,
      type: 1,
      image: `data:${mimeType};base64,${b64Image}`,
    };

    const uploadResp = await fetch(assetsUrl, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (uploadResp.ok) {
      const data = await uploadResp.json();
      return String(data.id);
    } else {
      console.log(`Failed to upload asset: ${await uploadResp.text()}`);
      return null;
    }
  } catch (e) {
    console.log(`Error managing Discord assets:`, e);
    return null;
  }
}

export async function fetchAndUploadPoster(item) {
  try {
    const itemType = item.Type;
    let itemId = null;

    if (itemType === "Episode") {
      itemId = item.SeriesId || item.ParentId || item.Id;
    } else {
      const imageTags = item.ImageTags || {};
      if (imageTags.Primary) {
        itemId = item.Id;
      } else {
        itemId = item.AlbumId || item.ParentId || item.Id;
      }
    }

    if (!itemId) return null;

    const posterEndpoint = `${config.embyUrl}/Items/${itemId}/Images/Primary?format=jpg`;
    const headers = { "X-Emby-Token": config.embyApiKey };

    const resp = await fetch(posterEndpoint, { headers });
    if (!resp.ok) return null;

    const arrayBuffer = await resp.arrayBuffer();
    let imageBuffer = Buffer.from(arrayBuffer);
    let mimeType = "image/jpeg";

    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const maxDim = Math.max(metadata.width, metadata.height);
      if (metadata.width !== metadata.height) {
        imageBuffer = await image
          .resize(maxDim, maxDim, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();
        mimeType = "image/png";
      }
    } catch (e) {
      console.log(`Error padding image:`, e);
    }

    return await uploadDiscordAsset(itemId, imageBuffer, mimeType);
  } catch (e) {
    console.log(`Error fetching poster:`, e);
    return null;
  }
}
