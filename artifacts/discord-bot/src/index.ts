import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import * as checkCommand from "./commands/check.js";

interface Command {
  data: { name: string; toJSON(): unknown };
  execute: (interaction: Parameters<typeof checkCommand.execute>[0]) => Promise<void>;
}

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("Missing DISCORD_TOKEN environment variable.");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = new Collection<string, Command>();
commands.set(checkCommand.data.name, checkCommand as Command);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ Logged in as ${readyClient.user.tag}`);
  console.log(`   Serving ${readyClient.guilds.cache.size} guild(s)`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);
    const errorMsg = {
      content: "An error occurred while running this command.",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMsg).catch(console.error);
    } else {
      await interaction.reply(errorMsg).catch(console.error);
    }
  }
});

client.login(token);
