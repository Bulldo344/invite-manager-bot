import { Message } from 'eris';

import { IMClient } from '../../client';
import { createEmbed, sendReply } from '../../functions/Messaging';
import { BotCommand, CommandGroup } from '../../types';
import { Command, Context } from '../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.getBot,
			aliases: ['get-bot', 'invite-bot', 'inviteBot'],
			desc: 'Get an invite Link for the bot',
			group: CommandGroup.Info,
			guildOnly: false
		});
	}

	public async action(
		message: Message,
		args: any[],
		{ guild }: Context
	): Promise<any> {
		const embed = createEmbed(this.client);

		let params = [];
		params.push(`origin=getbot`);
		params.push(`user=${message.author.id}`);
		if (guild) {
			params.push(`guild=${guild.id}`);
		}

		embed.description =
			`[Add InviteManager to your server]` +
			`(https://invitemanager.co/add-bot?${params.join('&')})`;

		return sendReply(this.client, message, embed);
	}
}
