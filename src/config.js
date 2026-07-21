import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

export const config = {
  discordToken: process.env.USER_TOKEN,
  embyUrl: process.env.EMBY_SERVER_URL,
  embyApiKey: process.env.EMBY_API_KEY,
  appId: process.env.APPLICATION_ID,
  port: process.env.PORT,
};
