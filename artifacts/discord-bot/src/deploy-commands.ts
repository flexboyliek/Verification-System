import { REST, Routes } from "discord.js";
import * as checkCommand from "./commands/check.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID environment variables.");
  process.exit(1);
}

const commands = [checkCommand.data.toJSON()];

const rest = new REST().setToken(token);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash command(s) globally...`);

    const data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    }) as unknown[];

    console.log(`✅ Successfully registered ${data.length} slash command(s).`);
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
})();
