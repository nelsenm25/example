import * as mc from "@minecraft/server"
import * as ui from "@minecraft/server-ui"
import ChestFormData from "../../Modules/ChestForms"
import Auction from "../../Modules/Data/Auction"
import { ForceOpen } from "../../Modules/Forms"
import Utility from "../../Modules/Utility"
import Config from "../../Configuration"

const auctionhouse = (Server) => {
  Server.Commands.register({
    name: "auctionhouse",
    description: "mce.command.auctionhouse.description",
    usage: "auctionhouse <add/view?>",
    aliases: ["auction", "ah"],
    settingname: "auction",
    category: "Money"
  }, async (data, player, args) => {
    const MainForm = new ChestFormData("shop")
      .title("Auction House")
      .pattern([0, 0], [
        "xxxxxxxxx",
        `${player.isAdmin() ? "xxpxmxyxx" : "xxpxxxyxx"}`,
        "xxxxxxxxx"
      ], {
        "x": { data: { itemName: '', itemDesc: [] }, iconPath: 'textures/blocks/glass_black' },
        "p": { data: { itemName: '§eAll Auctions', itemDesc: ["Show all listed auctions"] }, iconPath: 'minecraft:golden_carrot' },
        "m": { data: { itemName: '§eManage Auctions (§aAdmin§e)', itemDesc: ["Manage all listed auctions"] }, iconPath: 'minecraft:gold_block' },
        "y": { data: { itemName: '§eMy Auctions', itemDesc: ["Show all auction that listed by you"] }, iconPath: 'minecraft:gold_ingot' }
      })

    switch (args[0]?.toLowerCase()) {
      case "add":
        return MyAuction.addAuction(player, true)

      case "view":
        return AllAuction.allList(player, 1, true)

      default:
        player.sendMessage({ translate: "mce.ui.closechat" })
        let res = await ForceOpen(player, MainForm)
        if (!res.canceled) {
          switch (res.selection) {
            case 11:
              return AllAuction.allList(player)

            case 13:
              if (!player.checkPermission("auctionhouse")) return
              return ManageAuction.allList(player)

            case 15:
              return MyAuction.myList(player)

            default:
              break
          }
        }
        break
    }
  })

  // ALL AUCTIONS
  const SortType = {
    1: ["createdAt", "Creation Date"],
    2: ["price", "Price"],
    3: ["id", "Item Id"]
  }

  const AllAuction = {}

  /**
   * @param {mc.Player} player
   */
  AllAuction.allList = async (player, page = 1, show = false, sort = 1) => {
    let auctionItems = Auction.getItems().sort((a, b) =>
      SortType[sort][0] == "id" ?
        Utility.compareString(a.item.typeId, b.item.typeId) :
        a.data[SortType[sort][0]] - b.data[SortType[sort][0]])
    const nextSort = sort == Object.keys(SortType).length ? 1 : sort + 1
    const pages = Math.ceil((auctionItems.length || 1) / 45)
    const myListForm = new ChestFormData("shop")
      .title(`Auctions`)

    myListForm.pattern([5, 0], [
      'gg<gxg>gg'
    ], {
      "x": { data: { itemName: `§eSorted by: §c${SortType[sort][1]}`, itemDesc: [], enchanted: false, stackAmount: 1 }, iconPath: 'minecraft:mojang_banner_pattern' },
      ">": { data: { itemName: '§aNext Page', itemDesc: ["", `§8Pages: ${page} / ${pages}`], enchanted: false, stackAmount: 1 }, iconPath: 'textures/icons/right_arrow' },
      "<": { data: { itemName: '§aPrevious Page', itemDesc: ["", `§8Pages: ${page} / ${pages}`], enchanted: false, stackAmount: 1 }, iconPath: 'textures/icons/left_arrow' },
    })

    let startIndex = (page - 1) * 45
    let endIndex = startIndex + 45
    let pagedItems = auctionItems.slice(startIndex, endIndex)
    for (let i = 0; i < 45; i++) {
      if (!pagedItems[i]) continue;
      let item = pagedItems[i].item
      let itemData = pagedItems[i].data
      let itemDesc = []
      if (item.getComponent("minecraft:durability")) {
        let dura = item.getComponent("minecraft:durability")
        itemDesc.push(`§7Durability: ${dura.maxDurability - dura.damage} / ${dura.maxDurability}`)
      }
      let enchantments = item.getComponent("minecraft:enchantable")?.getEnchantments() ?? []
      let enchantedItem = false
      if (enchantments.length > 0) {
        enchantedItem = true
        enchantments.forEach(e => itemDesc.push(Utility.enchantToText(e)))
      }
      itemDesc.push("")
      itemDesc.push(`§7Seller: §e${itemData.playerName == player.name ? "You" : itemData.playerName}`)
      const currencyType = itemData.currencyType || "shop"
      const currencyName = currencyType === "shop" ? "Money" : "Shards"
      itemDesc.push(`§aClick to buy for ${currencyName} §r(§e${Utility.formatMoney(itemData.price)}§r)`)
      myListForm.button(i, `${itemData.displayname} §r(§e${item.typeId}§r)`, itemDesc, item.typeId, item.amount, enchantedItem)
    }

    if (show) player.sendMessage({ translate: "mce.ui.closechat" })
    let res = await ForceOpen(player, myListForm)
    if (!res.canceled) {
      if (res.selection == 47) {
        if (page > 1) return await AllAuction.allList(player, page - 1, false, sort)
      } else if (res.selection == 49) {
        return await AllAuction.allList(player, page, false, nextSort)
      } else if (res.selection == 51) {
        if (page < pages) return await AllAuction.allList(player, page + 1, false, sort)
      } else {
        let item = pagedItems[res.selection]
        if (!Auction.isValid(item)) return player.sendMessage({ translate: "mce.command.auctionhouse.item.unknown" })
        if (item.data.playerName == player.name) return player.sendMessage({ translate: "mce.command.auctionhouse.seller.self" })
        const currencyType = item.data.currencyType || "shop"
        const currentBalance = Server.Money.getMoney(player.name, currencyType)
        if (item.data.price > currentBalance) {
          const currencyName = currencyType === "shop" ? "Money" : "Shards"
          return player.sendMessage(`§cYou don't have enough ${currencyName}! Required: ${Utility.formatMoney(item.data.price)}, You have: ${Utility.formatMoney(currentBalance)}`)
        }
        let inventory = player.getInvetory()
        if (inventory.emptySlotsCount <= 0) return player.sendMessage({ translate: "mce.player.inventory.full" })
        if ((await PurchaseConfirm(player, item.data.displayname, item.data.price, currencyType)) == false) return
        let sellerName = item.data.playerName

        let cloneItem = await Auction.takeItem(item)
        await Server.Money.setMoney(player.name, currentBalance - item.data.price, currencyType)
        await Server.Money.setMoney(sellerName, Server.Money.getMoney(sellerName, currencyType) + item.data.price, currencyType)
        inventory.addItem(cloneItem)

        if (Server.getPlayer(sellerName)) Server.getPlayer(sellerName).sendMessage({ translate: "mce.player.auction.gotsold" })
        const currencyDisplay = currencyType === "shop" ? "Money" : "Shards"
        player.sendMessage({ translate: "mce.command.auctionhouse.purchased", with: [`${cloneItem.amount}`, item.data.displayname, `${Utility.formatMoney(item.data.price)} ${currencyDisplay}`] })
        await Server.sleep(1000)
        return await AllAuction.allList(player, page)
      }
      return await AllAuction.allList(player, page)
    }
  }

  // MY AUCTIONS

  const MyAuction = {}

  /**
   * @param {mc.Player} player
   */
  MyAuction.myList = async (player, page = 1) => {
    let myItems = Auction.getItems().filter(i => i.data.playerName == player.name)
    const pages = Math.ceil((myItems.length || 1) / 45)
    const myListForm = new ChestFormData("shop")
      .title(`My Auctions`)

    myListForm.pattern([5, 0], [
      'gg<gxg>gg'
    ], {
      "x": { data: { itemName: '§eCreate Auction', itemDesc: [], enchanted: false, stackAmount: 1 }, iconPath: 'minecraft:gold_nugget' },
      ">": { data: { itemName: '§aNext Page', itemDesc: ["", `§8Pages: ${page} / ${pages}`], enchanted: false, stackAmount: 1 }, iconPath: 'textures/icons/right_arrow' },
      "<": { data: { itemName: '§aPrevious Page', itemDesc: ["", `§8Pages: ${page} / ${pages}`], enchanted: false, stackAmount: 1 }, iconPath: 'textures/icons/left_arrow' },
    })

    let startIndex = (page - 1) * 45
    let endIndex = startIndex + 45
    let pagedItems = myItems.slice(startIndex, endIndex)
    for (let i = 0; i < 45; i++) {
      if (!pagedItems[i]) continue;
      let item = pagedItems[i].item
      let itemData = pagedItems[i].data
      let itemDesc = []
      if (item.getComponent("minecraft:durability")) {
        let dura = item.getComponent("minecraft:durability")
        itemDesc.push(`§7Durability: ${dura.maxDurability - dura.damage} / ${dura.maxDurability}`)
      }
      let enchantments = item.getComponent("minecraft:enchantable")?.getEnchantments() ?? []
      let enchantedItem = false
      if (enchantments.length > 0) {
        enchantedItem = true
        enchantments.forEach(e => itemDesc.push(Utility.enchantToText(e)))
      }
      itemDesc.push("")
      const currencyType = itemData.currencyType || "shop"
      const currencyName = currencyType === "shop" ? "Money" : "Shards"
      itemDesc.push(`§7Price: §e${Utility.formatMoney(itemData.price)} ${currencyName}`)
      itemDesc.push(`§cClick to remove from auction`)
      myListForm.button(i, `${itemData.displayname}`, itemDesc, item.typeId, item.amount, enchantedItem)
    }

    let res = await ForceOpen(player, myListForm)
    if (!res.canceled) {
      if (res.selection == 47) {
        if (page > 1) return await MyAuction.myList(player, page - 1)
      } else if (res.selection == 49) {
        return MyAuction.addAuction(player)
      } else if (res.selection == 51) {
        if (page < pages) return await MyAuction.myList(player, page + 1)
      } else {
        let item = pagedItems[res.selection]
        if (!Auction.isValid(item)) return player.sendMessage({ translate: "mce.command.auctionhouse.item.unknown" })
        let inventory = player.getInvetory()
        if (inventory.emptySlotsCount <= 0) return player.sendMessage({ translate: "mce.player.inventory.full" })

        let cloneItem = await Auction.takeItem(item)
        inventory.addItem(cloneItem)

        return player.sendMessage({ translate: "mce.command.auctionhouse.item.removed" })
      }
      return await MyAuction.myList(player, page)
    }
  }

  /**
   * @param {mc.Player} player
   */
  MyAuction.addAuction = async (player, show) => {
    let inventory = player.getInvetory()
    let slot = player.selectedSlotIndex
    let selectedSlot = inventory.getSlot(slot)
    let selectedItem = selectedSlot.getItem()
    if (!selectedItem) return player.sendMessage({ translate: "mce.command.auctionhouse.holditem" })
    selectedItem = selectedItem.clone()
    const addItemForm = new ui.ModalFormData()
      .title({ translate: "mce.ui.auctionhouse.title" })
      .textField({ translate: "mce.ui.auctionhouse.price" }, { translate: "mce.ui.auctionhouse.price.placeholder" })
      .textField({ translate: "mce.ui.auctionhouse.displayname" }, { translate: "mce.ui.auctionhouse.displayname.placeholder" })
      .dropdown("Currency Type", ["Money", "Shards"], 0)

    if (show) player.sendMessage({ translate: "mce.ui.closechat" })
    let res = await ForceOpen(player, addItemForm)
    if (!res.canceled) {
      if (!selectedSlot.getItem()) return player.sendMessage({ translate: "mce.command.auctionhouse.holditem" })
      var [price, name, currencyIndex] = res.formValues
      if (price == "") return player.sendMessage({ translate: "mce.ui.auctionhouse.inputform" })
      price = Number(price)
      if (!Number.isInteger(price)) return player.sendMessage({ translate: "mce.command.auctionhouse.add.price.inputnumber" })
      if (price <= 0) return player.sendMessage({ translate: "mce.command.auctionhouse.add.price.inputmorethanone" })
      if (name == "") name = Utility.getItemname(selectedItem)

      await inventory.setItem(slot)
      await Auction.addItem(selectedItem, {
        playerName: player.name,
        price: price,
        displayname: name,
        createdAt: Date.now(),
        currencyType: currencyIndex === 0 ? "shop" : "general"
      })

      return player.sendMessage({ translate: "mce.command.auctionhouse.item.added" })
    }
  }

  // MANAGE AUCTIONS

  const ManageAuction = {}

  /**
   * @param {mc.Player} player
   */
  ManageAuction.allList = async (player, page = 1, sort = 1) => {
    let auctionItems = Auction.getItems().sort((a, b) =>
      SortType[sort][0] == "id" ?
        Utility.compareString(a.item.typeId, b.item.typeId) :
        a.data[SortType[sort][0]] - b.data[SortType[sort][0]])
    const nextSort = sort == Object.keys(SortType).length ? 1 : sort + 1
    const pages = Math.ceil((auctionItems.length || 1) / 45)
    const myListForm = new ChestFormData("shop")
      .title(`Auctions`)

    myListForm.pattern([5, 0], [
      'gg<gxg>gg'
    ], {
      "x": { data: { itemName: `§eSorted by: §c${SortType[sort][1]}`, itemDesc: [], enchanted: false, stackAmount: 1 }, iconPath: 'minecraft:mojang_banner_pattern' },
      ">": { data: { itemName: '§aNext Page', itemDesc: ["", `§8Pages: ${page} / ${pages}`], enchanted: false, stackAmount: 1 }, iconPath: 'textures/icons/right_arrow' },
      "<": { data: { itemName: '§aPrevious Page', itemDesc: ["", `§8Pages: ${page} / ${pages}`], enchanted: false, stackAmount: 1 }, iconPath: 'textures/icons/left_arrow' },
    })

    let startIndex = (page - 1) * 45
    let endIndex = startIndex + 45
    let pagedItems = auctionItems.slice(startIndex, endIndex)
    for (let i = 0; i < 45; i++) {
      if (!pagedItems[i]) continue;
      let item = pagedItems[i].item
      let itemData = pagedItems[i].data
      let itemDesc = []
      if (item.getComponent("minecraft:durability")) {
        let dura = item.getComponent("minecraft:durability")
        itemDesc.push(`§7Durability: ${dura.maxDurability - dura.damage} / ${dura.maxDurability}`)
      }
      let enchantments = item.getComponent("minecraft:enchantable")?.getEnchantments() ?? []
      let enchantedItem = false
      if (enchantments.length > 0) {
        enchantedItem = true
        enchantments.forEach(e => itemDesc.push(Utility.enchantToText(e)))
      }
      itemDesc.push("")
      itemDesc.push(`§7Seller: §e${itemData.playerName == player.name ? "You" : itemData.playerName}`)
      const currencyType = itemData.currencyType || "shop"
      const currencyName = currencyType === "shop" ? "Money" : "Shards"
      itemDesc.push(`§7Price: §e${Utility.formatMoney(itemData.price)} ${currencyName}`)
      itemDesc.push(`§cClick to remove from auction`)
      myListForm.button(i, `${itemData.displayname} §r(§e${item.typeId}§r)`, itemDesc, item.typeId, item.amount, enchantedItem)
    }

    let res = await ForceOpen(player, myListForm)
    if (!res.canceled) {
      if (res.selection == 47) {
        if (page > 1) return await ManageAuction.allList(player, page - 1, sort)
      } else if (res.selection == 49) {
        return await ManageAuction.allList(player, page, nextSort)
      } else if (res.selection == 51) {
        if (page < pages) return await ManageAuction.allList(player, page + 1, sort)
      } else {
        let item = pagedItems[res.selection]
        if (!Auction.isValid(item)) return player.sendMessage({ translate: "mce.command.auctionhouse.item.unknown" })
        let inventory = player.getInvetory()
        if (inventory.emptySlotsCount <= 0) return player.sendMessage({ translate: "mce.player.inventory.full" })

        let cloneItem = await Auction.takeItem(item)
        inventory.addItem(cloneItem)

        return player.sendMessage({ translate: "mce.command.auctionhouse.item.removed" })
      }
      return await ManageAuction.allList(player, page)
    }
  }

  const PurchaseConfirm = async (player, itemName, price, currencyType) => {
    const currencyName = currencyType === "shop" ? "Money" : "Shards"
    let confirmBuyForm = new ui.MessageFormData()
      .title({ translate: "mce.ui.purchaseconfirmation.title" })
      .body({ translate: "mce.ui.purchaseconfirmation.description", with: [itemName, `${Utility.formatMoney(price)} ${currencyName}`] })
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

export default auctionhouse