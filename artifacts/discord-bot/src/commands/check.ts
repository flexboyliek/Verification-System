import {
  ActionRowBuilder,
  ApplicationIntegrationType,
  ChatInputCommandInteraction,
  Colors,
  ComponentType,
  EmbedBuilder,
  InteractionContextType,
  MessageFlags,
  ModalBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { GAME_PASSES, hasRankFollowup } from "../gamepasses.js";
import { checkAnyGamePass, getRobloxAvatar, getRobloxUserId } from "../roblox.js";

const OWNED_FOLLOWUP = `You have successfully received your rank.

Please remember that abusing administrative commands is strictly prohibited. This includes, but is not limited to: btools, :m / :n announcements, copying tools, charaudio, setmsg, stun commands, forcing players to sit, or kicking/banning/flinging users without proper authorization.

Failure to follow community and administrative guidelines may result in punishment or rank removal.`;

const NOT_OWNED_FOLLOWUP = `Please ensure that you purchased the gamepass in order for us to move forward and give you the correct rank.`;

const BRAND_COLOR = 0x9b59b6;

const E = {
  world:   "<:000_world:1495816055065673921>",
  chaos:   "<:chaos:1482613303422357544>",
  x:       "<:x_:1201028880941715486>",
  ticket:  "<:ticketicon:1227333019212316732>",
  person:  "<:Person:1498804921737416765>",
};

export const data = new SlashCommandBuilder()
  .setName("check")
  .setDescription("Check if a Roblox user owns a Chaos Worldwide game pass")
  .setIntegrationTypes(
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall
  )
  .setContexts(
    InteractionContextType.Guild,
    InteractionContextType.BotDM,
    InteractionContextType.PrivateChannel
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("gamepass_select")
    .setPlaceholder("Pick a game pass...")
    .addOptions(
      GAME_PASSES.map((gp) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(gp.name)
          .setValue(gp.name)
          .setEmoji({ id: "1227333019212316732", name: "ticketicon" })
      )
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu
  );

  const promptEmbed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`${E.world} Chaos Worldwide — Game Pass Checker`)
    .setDescription(
      "Select a game pass from the dropdown below, then enter a Roblox username to check ownership."
    )
    .setFooter({ text: "Chaos Worldwide Bot • Powered by Remy" })
    .setTimestamp();

  await interaction.reply({
    embeds: [promptEmbed],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  const reply = await interaction.fetchReply();

  const selectResponse = await reply
    .awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: (i) =>
        i.customId === "gamepass_select" && i.user.id === interaction.user.id,
      time: 60_000,
    })
    .catch(() => null);

  if (!selectResponse) {
    const timeoutEmbed = new EmbedBuilder()
      .setColor(Colors.Grey)
      .setTitle(`${E.x} Timed Out`)
      .setDescription("No game pass was selected in time. Run `/check` again to retry.")
      .setFooter({ text: "Chaos Worldwide Bot" });

    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    return;
  }

  const selectedName = selectResponse.values[0];
  const gamePass = GAME_PASSES.find((gp) => gp.name === selectedName);

  if (!gamePass) {
    await selectResponse.update({
      content: "Unknown game pass selected.",
      components: [],
      embeds: [],
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId("username_modal")
    .setTitle(gamePass.name);

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
    const timeoutEmbed = new EmbedBuilder()
      .setColor(Colors.Grey)
      .setTitle(`${E.x} Timed Out`)
      .setDescription("No username was entered in time. Run `/check` again to retry.")
      .setFooter({ text: "Chaos Worldwide Bot" });

    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    return;
  }

  const username = modalSubmit.fields.getTextInputValue("roblox_username").trim();

  await modalSubmit.deferUpdate();

  const loadingEmbed = new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`${E.chaos} Checking...`)
    .setDescription(`Looking up **${username}** for the **${gamePass.name}** game pass...`)
    .setFooter({ text: "Chaos Worldwide Bot • Powered by Remy" });

  await interaction.editReply({ embeds: [loadingEmbed], components: [] });

  const userId = await getRobloxUserId(username);

  if (!userId) {
    const notFoundEmbed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setTitle(`${E.x} User Not Found`)
      .setDescription(
        `Could not find a Roblox account named **${username}**.\nDouble-check the spelling and try again.`
      )
      .setFooter({ text: "Chaos Worldwide Bot • Powered by Remy" })
      .setTimestamp();

    await interaction.editReply({ embeds: [notFoundEmbed] });
    return;
  }

  const [owns, avatarUrl] = await Promise.all([
    checkAnyGamePass(userId, gamePass.ids),
    getRobloxAvatar(userId),
  ]);

  const resultEmbed = new EmbedBuilder()
    .setColor(owns ? Colors.Green : Colors.Red)
    .setTitle(owns ? "✅ Game Pass Owned" : `${E.x} Game Pass Not Owned`)
    .addFields(
      { name: `${E.person} Roblox User`, value: `**${username}**`, inline: true },
      { name: `${E.ticket} Game Pass`, value: `**${gamePass.name}**`, inline: true },
      {
        name: "📋 Status",
        value: owns
          ? "✅ **OWNS** this game pass"
          : `${E.x} **Does NOT own** this game pass`,
        inline: false,
      }
    )
    .setFooter({
      text: `Chaos Worldwide Bot • Checked ${gamePass.ids.length} pass ID(s) • Powered by Remy`,
    })
    .setTimestamp();

  if (avatarUrl) resultEmbed.setThumbnail(avatarUrl);

  await interaction.editReply({ content: "Check complete!", embeds: [], components: [] });
  await interaction.followUp({ embeds: [resultEmbed] });

  if (hasRankFollowup(gamePass.name)) {
    await interaction.followUp({ content: owns ? OWNED_FOLLOWUP : NOT_OWNED_FOLLOWUP });
  }
}
