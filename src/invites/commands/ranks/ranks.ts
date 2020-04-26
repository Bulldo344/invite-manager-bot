import { Message } from 'eris';

import { CommandContext, IMCommand } from '../../../framework/commands/Command';
import { Cache } from '../../../framework/decorators/Cache';
import { IMModule } from '../../../framework/Module';
import { NumberResolver } from '../../../framework/resolvers';
import { RanksCache } from '../../cache/RanksCache';

const RANKS_PER_PAGE = 10;

export default class extends IMCommand {
	@Cache() private ranksCache: RanksCache;

	public constructor(module: IMModule) {
		super(module, {
			name: 'ranks',
			aliases: ['show-ranks', 'showRanks'],
			args: [
				{
					name: 'page',
					resolver: NumberResolver
				}
			],
			group: 'Ranks',
			guildOnly: true,
			defaultAdminOnly: false
		});
	}

	public async action(message: Message, [_page]: [number], flags: {}, { guild, t }: CommandContext): Promise<any> {
		const ranks = await this.ranksCache.get(guild.id);

		if (ranks.length === 0) {
			return this.sendReply(message, t('cmd.ranks.none'));
		}

		const maxPage = Math.ceil(ranks.length / RANKS_PER_PAGE);
		const startPage = Math.max(Math.min(_page ? _page - 1 : 0, maxPage - 1), 0);
		await this.showPaginated(message, startPage, maxPage, (page) => {
			let description = '';

			ranks.slice(page * RANKS_PER_PAGE, (page + 1) * RANKS_PER_PAGE).forEach((rank) => {
				description +=
					t('cmd.ranks.entry', {
						role: `<@&${rank.roleId}>`,
						numInvites: rank.numInvites,
						description: rank.description
					}) + '\n';
			});

			return this.createEmbed({
				title: t('cmd.ranks.title'),
				description
			});
		});
	}
}
