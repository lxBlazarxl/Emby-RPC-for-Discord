import express from "express";
import { fetchAndUploadPoster, getEmbyIconId } from "./assets.js";
import { setPresence, clearPresence } from "../discord/presence.js";

export const embyWebhookRouter = express.Router();

let currentPlayingId = null;
let currentLargeImageId = null;
let currentlyPaused = false;
let currentStartTimestamp = null;
let justAutoPlayed = false;

embyWebhookRouter.post("/emby-status", async (req, res) => {
  try {
    const payload = req.body;
    const event = payload.Event || "";

    if (
      [
        "playback.start",
        "playback.unpause",
        "playback.pause",
        "playback.progress",
      ].includes(event)
    ) {
      const item = payload.Item || {};
      const itemId = item.Id;
      const playbackInfo = payload.PlaybackInfo || {};

      let positionTicks = playbackInfo.PositionTicks;
      if (positionTicks === undefined || positionTicks === null) {
        positionTicks = payload.PlaybackPositionTicks || 0;
      }
      const runTimeTicks = item.RunTimeTicks || 0;
      const currentEpochMs = Date.now();
      let positionMs = positionTicks ? Math.floor(positionTicks / 10000) : 0;
      const runTimeMs = Math.floor(runTimeTicks / 10000);

      let isPaused = playbackInfo.IsPaused || false;
      if (event === "playback.pause") {
        if (runTimeTicks) {
          if (runTimeMs - positionMs < 10000) {
            justAutoPlayed = true;
            return res.status(200).send("Ignored fake auto-play pause");
          }
        }
        isPaused = true;
      } else if (["playback.start", "playback.unpause"].includes(event)) {
        isPaused = false;
      }

      if (
        event === "playback.progress" &&
        itemId === currentPlayingId &&
        isPaused === currentlyPaused
      ) {
        if (!isPaused && currentStartTimestamp) {
          const expectedPositionMs = currentEpochMs - currentStartTimestamp;
          if (Math.abs(expectedPositionMs - positionMs) > 10000) {
            // Position drifted significantly (e.g. seeking or fixing auto-play bad position)
          } else {
            return res.status(200).send("Ignored (No state change)");
          }
        } else {
          return res.status(200).send("Ignored (No state change)");
        }
      }

      currentlyPaused = isPaused;

      if (itemId !== currentPlayingId) {
        currentLargeImageId = await fetchAndUploadPoster(item);
        currentPlayingId = itemId;

        const itemType = item.Type || "Unknown";
        if (
          justAutoPlayed ||
          ["Audio", "Track"].includes(itemType) ||
          event === "playback.progress" || 
          (event === "playback.start" && runTimeMs > 0 && positionMs >= runTimeMs - 5000)
        ) {
          positionTicks = 0;
          positionMs = 0;
        }
        justAutoPlayed = false;
      } else {
        justAutoPlayed = false;
      }

      let startTimestamp = null;
      let endTimestamp = null;

      if (!isPaused && runTimeTicks) {
        startTimestamp = currentEpochMs - positionMs;
        endTimestamp = currentEpochMs - positionMs + runTimeMs;
        currentStartTimestamp = startTimestamp;
      }

      const embyIconId = await getEmbyIconId();

      const assets = {
        small_image: embyIconId,
        small_text: "Emby - Selfhosted Media",
      };

      if (currentLargeImageId) {
        assets.large_image = currentLargeImageId;
      }

      const itemType = item.Type || "Unknown";
      let activityName = item.Name || "Unknown Title";
      let activityDetails = "";
      let activityType = "PLAYING";
      let stateText = "Playing on Emby";

      if (["Audio", "Track"].includes(itemType)) {
        const artists = item.Artists || [];
        const artist =
          artists.length > 0
            ? artists[0]
            : item.AlbumArtist || "Unknown Artist";
        const trackName = item.Name || "Unknown Title";

        activityType = "LISTENING";
        activityName = trackName;
        activityDetails = trackName;
        stateText = `By ${artist} on Emby`;

        if (currentLargeImageId) {
          assets.large_text = item.Album || "Unknown Album";
        }
        console.log(`Updated Status: Listening to ${trackName} by ${artist}`);
      } else if (itemType === "Episode") {
        const seriesName = item.SeriesName || "Unknown Series";
        const epNum = item.IndexNumber || "?";
        const epTitle = item.Name || "Unknown Episode";

        activityType = "WATCHING";
        activityName = seriesName;
        activityDetails = seriesName;
        stateText = `Ep ${epNum} - ${epTitle}`;

        if (currentLargeImageId) {
          assets.large_text = "Watching on Emby";
        }
        console.log(
          `Updated Status: Watching ${seriesName} (Episode ${epNum})`,
        );
      } else if (itemType === "Movie") {
        activityType = "WATCHING";
        stateText = "Watching on Emby";
        const movieName = item.Name || "Unknown Movie";
        activityName = movieName;
        activityDetails = movieName;

        if (currentLargeImageId) {
          assets.large_text = movieName;
        }
        console.log(`Updated Status: Watching Movie: ${movieName}`);
      } else {
        activityName = item.Name || "Unknown Media";
        console.log(`Updated Status: Playing ${activityName}`);
      }

      if (isPaused) {
        activityName = `${activityName} (Paused)`;
      }

      const activityData = {
        activityType,
        name: activityName,
        details: activityDetails || null,
        state: stateText,
        assets,
        startTimestamp,
        endTimestamp,
      };

      await setPresence(activityData);
    } else if (event === "playback.stop") {
      const item = payload.Item || {};
      if (item.Id === currentPlayingId) {
        await clearPresence();
        currentPlayingId = null;
        console.log("Cleared Status");
      }
    }

    return res.status(200).send("Success");
  } catch (e) {
    console.log(`Error handling webhook:`, e);
    return res.status(400).send("Error");
  }
});
