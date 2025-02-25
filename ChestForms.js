import { ActionFormData } from '@minecraft/server-ui';
import { typeIdToID, typeIdToDataId } from "./typeIds.js";
import { BlockTypes, ItemStack, ItemTypes, world } from '@minecraft/server';
import Config from '../Configuration.js';
import { TextureList } from '../textureList.js';
import Setting from './Setting.js';

/**
 * Credit:
 * Maintained by Herobrine64 & LeGend077.
*/
const experimentalItems = []
const MCEItems = ["pao:claimblock1", "pao:claimblock10", "pao:claimblock100"]
const items = ItemTypes.getAll().filter(item => (!item.id.startsWith("minecraft:") && !item.id.endsWith("spawn_egg") && !BlockTypes.get(item.id)))
let number_of_1_16_100_items = items.length;
for (const item of experimentalItems) {
	if (ItemTypes.get(item)) number_of_1_16_100_items += 1
}
for (const item of MCEItems) {
	if (ItemTypes.get(item)) number_of_1_16_100_items -= 1
}

number_of_1_16_100_items = Setting.get("NumberOf_1_16_100_Items") ?? number_of_1_16_100_items
number_of_1_16_100_items += MCEItems.length
console.warn(`[System] Custom item amount: ${number_of_1_16_100_items} item(s).`)
const sizes = new Map([
	['single', ['§l§8[§r§7Chest§l§8]§r', 27]], ['double', ['§l§8[§r§7Large Chest§l§8]§r', 54]],
	['small', ['§l§8[§r§7Chest§l§8]§r', 27]], ['large', ['§l§8[§r§7Large Chest§l§8]§r', 54]],
	['pao_chest', ['§l§8[§r§7Chest§l§8]§r', 54]], ['shop', ['§l§8[§r§7Shop§l§8]§r', 54]]
]);

export default class ChestFormData {
	#titleText; #buttonArray;
	constructor(size = 'small') {
		const sizing = sizes.get(size) ?? ['§c§h§e§s§t§2§7§r', 27];
		/** @internal */
		this.#titleText = sizing[0];
		/** @internal */
		this.#buttonArray = [];
		for (let i = 0; i < sizing[1]; i++)
			this.#buttonArray.push(['', undefined]);
		this.slotCount = sizing[1];
	}
	title(text) {
		this.#titleText += text;
		return this;
	}
	button(slot, itemName, itemDesc, texture, stackSize = 1, enchanted = false) {
		const numberCustomItems = Setting.get("NumberOf_1_16_100_Items")  ?? number_of_1_16_100_items
		const ID = typeIdToDataId.get(texture) ?? typeIdToID.get(texture);
		this.#buttonArray.splice(slot, 1, [`stack#${Math.min(Math.max(stackSize, 1) || 1, 99).toString().padStart(2, '0')}§r${itemName ?? ''}§r${itemDesc?.length ? `\n§r${itemDesc.join('\n§r')}` : ''}`,
		(((ID + (ID < 256 ? 0 : numberCustomItems)) * 65536) + (!!enchanted * 32768)) || (TextureList[texture] ?? texture)
		]);
		return this;
	}
	pattern(from, pattern, key) {
		for (let i = 0; i < pattern.length; i++) {
			const row = pattern[i];
			for (let j = 0; j < row.length; j++) {
				const letter = row.charAt(j);
				if (key[letter]) {
					const slot = from[1] + j + (from[0] + i) * 9; // Calculate slot index
					const data = key[letter].data;
					const itemName = data.itemName ?? ""
					const itemDesc = data.itemDesc ?? []
					const texture = key[letter].iconPath ?? ""
					const stackSize = data.stackAmount ?? 1
					const enchanted = data.enchanted ?? false
					// console.warn(itemName, itemDesc, texture, stackSize, enchanted)
					this.button(slot, itemName, itemDesc, texture, stackSize, enchanted)
				}
			}
		}
		return this;
	}
	show(player) {
		const form = new ActionFormData()
			.title(this.#titleText);
		this.#buttonArray.forEach(button => {
			form.button(button[0], button[1]?.toString());
		})
		return form.show(player)
	}
}