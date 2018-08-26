import { Message } from 'eris';
import moment from 'moment';

import { IMClient } from '../../client';
import { createEmbed, sendEmbed } from '../../functions/Messaging';
import {
	channels,
	InviteCodeAttributes,
	inviteCodes,
	members
} from '../../sequelize';
import { BotCommand, CommandGroup } from '../../types';
import { Command, Context } from '../Command';

export default class extends Command {
	public constructor(client: IMClient) {
		super(client, {
			name: BotCommand.inviteCodes,
			aliases: [
				'inviteCode',
				'invite-code',
				'invite-codes',
				'getInviteCode',
				'get-invite-code',
				'get-invite-codes',
				'showInviteCode',
				'show-invite-code'
			],
			desc: 'Get a list of all your invite codes',
			// clientPermissions: ['MANAGE_GUILD'],
			group: CommandGroup.Invites,
			guildOnly: true
		});
	}

	public async action(
		message: Message,
		args: any[],
		{ guild, t, settings }: Context
	): Promise<any> {
		const lang = settings.lang;

		let codes: InviteCodeAttributes[] = await inviteCodes.findAll({
			where: {
				guildId: guild.id
			},
			include: [
				{
					attributes: [],
					model: members,
					as: 'inviter',
					where: {
						id: message.author.id
					},
					required: true
				}
			],
			raw: true
		});

		const activeCodes = (await guild.getInvites())
			.filter(code => code.inviter && code.inviter.id === message.author.id)
			.map(code => code);

		const newCodes = activeCodes.filter(
			code => !codes.find(c => c.code === code.code)
		);

		const newDbCodes = newCodes.map(code => ({
			code: code.code,
			channelId: code.channel ? code.channel.id : null,
			maxAge: code.maxAge,
			maxUses: code.maxUses,
			uses: code.uses,
			temporary: code.temporary,
			guildId: code.guild.id,
			inviterId: code.inviter ? code.inviter.id : null
		}));

		// Insert any new codes that haven't been used yet
		if (newCodes.length > 0) {
			await channels.bulkCreate(
				newCodes.map(c => ({
					id: c.channel.id,
					guildId: c.guild.id,
					name: c.channel.name
				})),
				{
					updateOnDuplicate: ['name']
				}
			);
			await inviteCodes.bulkCreate(newDbCodes);
		}

		codes = codes.concat(newDbCodes);

		const validCodes = codes.filter(
			c =>
				c.maxAge === 0 ||
				moment(c.createdAt)
					.add(c.maxAge, 'second')
					.isAfter(moment())
		);
		const temporaryInvites = validCodes.filter(i => i.maxAge > 0);
		const permanentInvites = validCodes.filter(i => i.maxAge === 0);
		const recommendedCode = permanentInvites.reduce(
			(max, val) => (val.uses > max.uses ? val : max),
			permanentInvites[0]
		);

		const embed = createEmbed(this.client, {
			title: t('CMD_INVITECODES_TITLE', { guild: guild.name })
		});

		if (permanentInvites.length === 0 && temporaryInvites.length === 0) {
			embed.description = t('CMD_INVITECODES_NO_CODES');
		} else {
			if (recommendedCode) {
				embed.fields.push({
					name: t('CMD_INVITECODES_RECOMMENDED_CODE_TITLE'),
					value: `https://discord.gg/${recommendedCode.code}`
				});
			} else {
				embed.fields.push({
					name: t('CMD_INVITECODES_RECOMMENDED_CODE_TITLE'),
					value: t('CMD_INVITECODES_RECOMMENDED_CODE_NONE')
				});
			}
		}
		if (permanentInvites.length > 0) {
			// embed.addBlankField();
			embed.fields.push({
				name: t('CMD_INVITECODES_PERMANENT_TITLE'),
				value: t('CMD_INVITECODES_PERMANENT_TEXT')
			});
			permanentInvites.forEach(i => {
				embed.fields.push({
					name: `${i.code}`,
					value: t('CMD_INVITECODES_PERMANENT_ENTRY', {
						uses: i.uses,
						maxAge: i.maxAge,
						maxUses: i.maxUses,
						channelId: i.channelId
					}),
					inline: true
				});
			});
		}
		if (temporaryInvites.length > 0) {
			// embed.addBlankField();
			embed.fields.push({
				name: t('CMD_INVITECODES_TEMPORARY_TITLE'),
				value: t('CMD_INVITECODES_TEMPORARY_TEXT')
			});
			temporaryInvites.forEach(i => {
				const maxAge = moment
					.duration(i.maxAge, 's')
					.locale(lang)
					.humanize();
				const expires = moment(i.createdAt)
					.add(i.maxAge, 's')
					.locale(lang)
					.fromNow();
				embed.fields.push({
					name: `${i.code}`,
					value: t('CMD_INVITECODES_PERMANENT_ENTRY', {
						uses: i.uses,
						maxAge,
						maxUses: i.maxUses,
						channelId: i.channelId,
						expires
					}),
					inline: true
				});
			});
		}

		sendEmbed(this.client, await message.author.getDMChannel(), embed);
		// TODO: Start the message with @user
		message.channel.createMessage(t('CMD_INVITECODES_DM_SENT'));
	}
}
