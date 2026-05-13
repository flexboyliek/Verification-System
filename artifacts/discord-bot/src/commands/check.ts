import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from "discord.js";
import { GAME_PASSES } from "../gamepasses.js";
import { checkAnyGamePass, getRobloxUserId } from "../roblox.js";

export const data = new SlashCommandBuilder()
  .setName("check")
  .setDescription("Check if a Roblox user owns a Chaos Worldwide game pass");

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("gamepass_select")
    .setPlaceholder("Select a game pass...")
    .addOptions(
      GAME_PASSES.map((gp) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(gp.name)
          .setValue(gp.name)
      )
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );

  await interaction.reply({
    content: "**Chaos Worldwide — Game Pass Checker**\nSelect a game pass to check:",
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  const selectResponse = await interaction.channel
    ?.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: (i) =>
        i.customId === "gamepass_select" && i.user.id === interaction.user.id,
      time: 60_000,
    })
    .catch(() => null);

  if (!selectResponse) {
    await interaction.editReply({
      content: "Timed out — no game pass selected.",
      components: [],
    });
    return;
  }

  const selectedName = selectResponse.values[0];
  const gamePass = GAME_PASSES.find((gp) => gp.name === selectedName);

  if (!gamePass) {
    await selectResponse.update({
      content: "Unknown game pass selected.",
      components: [],
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("username_modal")
    .setTitle(`Check: ${gamePass.name}`);

  const usernameInput = new TextInputBuilder()
    .setCustomId("roblox_username")
    .setLabel("Roblox Username")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter exact Roblox username...")
    .setRequired(true)
    .setMaxLength(20);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput)
  );

  await selectResponse.showModal(modal);

  const modalSubmit = await selectResponse
    .awaitModalSubmit({
      filter: (i) =>
        i.customId === "username_modal" && i.user.id === interaction.user.id,
      time: 120_000,
    })
    .catch(() => null);

  if (!modalSubmit) {
    await interaction.editReply({
      content: "Timed out — no username entered.",
      components: [],
    });
    return;
  }

  const username = modalSubmit.fields.getTextInputValue("roblox_username").trim();

  await modalSubmit.deferUpdate();
  await interaction.editReply({
    content: `🔍 Checking **${username}** for **${gamePass.name}**...`,
    components: [],
  });

  const userId = await getRobloxUserId(username);

  if (!userId) {
    await interaction.editReply({
      content: `❌ Could not find a Roblox user named **${username}**. Check the spelling and try again.`,
    });
    return;
  }

  const owns = await checkAnyGamePass(userId, gamePass.ids);

  const statusEmoji = owns ? "✅" : "❌";
  const statusText = owns ? "**OWNS**" : "**does NOT own**";

  await interaction.editReply({
    content:
      `${statusEmoji} **${username}** ${statusText} the **${gamePass.name}** game pass.\n` +
      `-# Checked ${gamePass.ids.length} pass ID(s) | Chaos Worldwide`,
  });
}
