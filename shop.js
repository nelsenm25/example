import * as mc from "@minecraft/server"
import * as ui from "@minecraft/server-ui"
import Shop from "../../Modules/Data/Shop"
import Utility from "../../Modules/Utility"
import { ForceOpen } from "../../Modules/Forms"
import ChestFormData from "../../Modules/ChestForms"

/**
 * @param {import("../../main").default} Server 
 */
const shop = (Server) => {
  Server.Commands.register({
    name: "shop",
    description: "mce.command.shop.description",
    usage: "shop <category?>",
    category: "Money"
  }, async (data, player, args) => {
    let groups = Shop.getGroups()
    if (Object.keys(groups).length <= 0) return player.sendMessage({ translate: "mce.command.shop.noitems" })
    if (args[0]) {
      const selectedGroup = args[0]
      if (!Object.keys(groups).includes(selectedGroup)) return player.sendMessage("§cCategory not found!")
      const items = Shop.getItems().filter(item => item.data.category == selectedGroup)
      player.sendMessage({ translate: "mce.ui.closechat" })
      return ShopForm.selectItem(player, items)
    }
    player.sendMessage({ translate: "mce.ui.closechat" })
    return ShopForm.mainForm(player)
  })

  const ShopForm = {}

  /**
   * 
   * @param {mc.Player} player 
   */
  ShopForm.mainForm = (player) => {
    return ShopForm.selectGroup(player)
  }
  const SortType = {
    1: ["price", "Price"]
  }
  /**
   * Select Group Shop Form
   * @param {mc.Player} player 
   * @param {string[]} groups 
   * @param {StructureItem[]} items
   * @returns {string}
   */
  ShopForm.selectGroup = async (player) => {
    const groups = Shop.getGroups()
    const selectGroupForm = new ChestFormData("shop")
      .title("Shop")

    let slot = 0
    Object.values(groups).forEach(group => {
      let itemLength = Shop.getAmountByData({ category: group.displayname })
      selectGroupForm.button(slot, group.displayname + `§r (§e${itemLength}§r)`, [], group.icon, 1, group.enchantedIcon ?? false)
      slot += 1
    })

    let res = await ForceOpen(player, selectGroupForm)
    if (!res) return undefined
    if (!res.canceled) {
      let group = Object.keys(groups)[res.selection]
      const items = Shop.getItems().filter(item => item.data.category == group)
      return ShopForm.selectItem(player, items)
    }

    return undefined
  }

  /**
   * Search Item Shop Form
   * @param {mc.Player} player 
   * @param {StructureItem[]} items 
   */
  ShopForm.searchItems = (player, items) => {
    const searchItemsUI = new ui.ModalFormData()
      .title("Search items")
      .textField("Input item name:", "Input here")

    ForceOpen(player, searchItemsUI).then(res => {
      if (!res.canceled) {
        const [search] = res.formValues
        items = items.filter(i => i.data.displayname.toLowerCase().includes(search.toLowerCase()))

        return ShopForm.selectItem(player, items, 1, 1, false)
      }
    })
  }

  /**
   * Select Item Shop Form
   * @param {mc.Player} player 
   * @param {StructureItem[]} items 
   * @param {number} page
   * @returns {StructureItem}
   */
  ShopForm.selectItem = async (player, items, page = 1, sort = 1, search = true) => {
    if (items.length == 0) return player.sendMessage("§cNo items found.")
    items = items.sort((a, b) => a.data.price - b.data.price)
    const nextSort = sort == Object.keys(SortType).length ? 1 : sort + 1
    let groupName = items[0].data.category
    const pages = Math.ceil(items.length / 45)
    const selectItemForm = new ChestFormData("shop")
      .title(`${groupName} Shop`)

    selectItemForm.pattern([5, 0], [
      'sg<gxg>gg'
    ], {
      "s": search ? { data: { itemName: `§7Search Items`, itemDesc: [], enchanted: false, stackAmount: 1 }, iconPath: 'minecraft:spyglass' } : null,
      "x": { data: { itemName: `§eSorted by: §c${SortType[sort][1]}`, itemDesc: [], enchanted: false, stackAmount: 1 }, iconPath: 'minecraft:mojang_banner_pattern' },
      ">": { data: { itemName: '§aNext Page', itemDesc: ["", `§8Pages: ${page} / ${pages}`], enchanted: false, stackAmount: 1 }, iconPath: 'textures/icons/right_arrow' },
      "<": { data: { itemName: '§aPrevious Page', itemDesc: ["", `§8Pages: ${page} / ${pages}`], enchanted: false, stackAmount: 1 }, iconPath: 'textures/icons/left_arrow' },
    })

    let startIndex = (page - 1) * 45
    let endIndex = startIndex + 45
    let pagedItems = items.slice(startIndex, endIndex)
    for (let i = 0; i < 45; i++) {
      if (!pagedItems[i]) continue;
      let item = pagedItems[i].item
      let itemData = pagedItems[i].data
      let itemDesc = []
      let enchantments = item.getComponent("minecraft:enchantable")?.getEnchantments() ?? []
      let enchantedItem = false
      if (enchantments.length > 0) {
        enchantedItem = true
        enchantments.forEach(e => itemDesc.push(Utility.enchantToText(e)))
      }
      itemDesc.push("")
      itemDesc.push(`§aClick to buy §r(§e${itemData.price <= 0 ? "Free" : Utility.formatMoney(itemData.price)}§r)`)
      selectItemForm.button(i, itemData.displayname, itemDesc, itemData.icon, 1, enchantedItem)
    }

    let res = await ForceOpen(player, selectItemForm)
    if (!res.canceled) {
      if (res.selection == 45) {
        if (search) return ShopForm.searchItems(player, items)
      } else if (res.selection == 47) {
        if (page > 1) return ShopForm.selectItem(player, items, page - 1, sort)
      } else if (res.selection == 49) {
        return ShopForm.selectItem(player, items, page, nextSort)
      } else if (res.selection == 51) {
        if (page < pages) return ShopForm.selectItem(player, items, page + 1, sort)
      } else {
        const selectedItem = pagedItems[res.selection]
        let amount = await ShopForm.inputAmount(player, selectedItem)
        if (!amount) return
        let playerInventory = player.getInvetory()
        if (playerInventory.emptySlotsCount <= 0 || itemCanGet(player, selectedItem.item) <= 0)
          return player.sendMessage({ translate: "mce.player.inventory.full" })
        if (amount > itemCanGet(player, selectedItem.item) || amount < 1)
         return player.sendMessage("§cInput valid amount!")
        let price = selectedItem.data.price * amount
        let confirm = await ShopForm.confirmBuy(player, selectedItem, price)
        if (!confirm) return player.sendMessage({ translate: "mce.command.shop.purchase.canceled" })
        let playerMoney = player.getMoney()
        if (price > playerMoney) return player.sendMessage({ translate: "mce.command.insufficientfunds" })

        let item = selectedItem.itemDB.unStore()

        player.setMoney(playerMoney - price)
        separateAmount(amount, item.maxAmount).forEach((amount) => {
          item.amount = amount
          player.getInvetory().addItem(item)
        })

        player.sendMessage({ translate: "mce.command.shop.purchase.successfully", with: [`${amount}`, selectedItem.data.displayname, Utility.formatMoney(price)] })
        return ShopForm.selectItem(player, items, page, sort, search)
      }
      return ShopForm.selectItem(player, items, page)
    }
  }

  /**
   * Input Amount Shop Form
   * @param {mc.Player} player 
   * @param {StructureItem} item
   * @returns {number | NaN} 
   */
  ShopForm.inputAmount = async (player, item) => {
    const inputAmountForm = new ui.ModalFormData()
      .title(`${item.data.displayname} Shop`)
      .textField(`Input amount (Max ${itemCanGet(player, item.item)}):`, "Input number here", "1")

    let res = await ForceOpen(player, inputAmountForm)
    if (!res.canceled) {
      let [amount] = res.formValues;
      let numberAmount = Number(amount)
      return numberAmount
    }
    return undefined
  }

  /**
   * Confirm Purchase Shop Form
   * @param {mc.Player} player 
   * @param {StructureItem} item 
   * @param {number} price 
   * @returns {boolean}
   */
  ShopForm.confirmBuy = async (player, item, price) => {
    let confirmBuyForm = new ui.MessageFormData()
      .title({ translate: "mce.ui.purchaseconfirmation.title" })
      .body({ translate: "mce.ui.purchaseconfirmation.description", with: [item.data.displayname, Utility.formatMoney(price)] })
      .button2({ translate: "mce.ui.purchaseconfirmation.accept" })
      .button1({ translate: "mce.ui.purchaseconfirmation.cancel" })

    let res = await ForceOpen(player, confirmBuyForm)
    if (!res.canceled) {
      if (res.selection === 1) {
        return true
      } else {
        return false
      }
    }

    return false
  }
}

/**
 * 
 * @param {mc.Player} player 
 * @param {mc.ItemStack} targetItem 
 */
const itemCanGet = (player, targetItem) => {
  const inventory = player.getInvetory()
  let canGet = inventory.emptySlotsCount * targetItem.maxAmount
  for (let slot = 0; slot < inventory.size; slot++) {
    const item = inventory.getItem(slot)
    if (!item) continue
    if (item.isStackableWith(targetItem) && item.amount < targetItem.maxAmount) {
      canGet += item.maxAmount - item.amount
    }
  }

  return canGet
}

const separateAmount = (amount, maxAmount) => {
    const divide = Math.floor(amount / maxAmount);
    const left = amount % maxAmount;

    const result = new Array(divide).fill(maxAmount);
    if (left !== 0) {
      result.push(left);
    }

    return result;
}

export default shop
