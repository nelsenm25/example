import * as mc from "@minecraft/server"
import Config from "../../Configuration"
import Server from "../../main"
import { Database } from "../Database"
import ItemDatabase, { Item } from "../ItemDatabase"

const Auction = {}
const AuctionDB = new ItemDatabase("Auction2.5.1", Config.maxAuction)

const AuctionData = {
  playerName: String.prototype,
  price: Number.prototype,
  displayname: String.prototype,
  createdAt: Number.prototype
}

const AuctionItem = {
  item: mc.ItemStack.prototype,
  data: AuctionData,
  itemDB: Item.prototype
}

/**
 * Add Item to Auction House
 * @param {mc.ItemStack} item 
 * @param {AuctionData} data 
 */
Auction.addItem = async (item, data) => {
  await AuctionDB.add(item, data)
}

/**
 * Remove Item from Auction House
 * @param {AuctionItem} item 
 */
Auction.removeItem = async (item) => {
  await item.itemDB.delete()
}

/**
 * Check if Item is Valid
 * @param {AuctionItem} item 
 */
Auction.isValid = (item) => {
  return item.itemDB.isValid()
}

/**
 * Check if Item is Valid
 * @param {AuctionItem} item 
 */
 Auction.takeItem = async (item) => {
  return await item.itemDB.unStore(false)
}

/**
 * For each all data from Auction
 * @param {(item: AuctionItem) => void} callback 
 */
Auction.forEach = (callback) => {
  AuctionDB.forEach((data) => {
    let item = data.item
    let itemData = data.data
    let itemResult = {
      item: item,
      data: itemData,
      itemDB: data
    }

    callback(itemResult)
  })
}

/**
 * Get all Items from Auction
 * @returns {AuctionItem[]}
 */
Auction.getItems = () => {
  let items = []
  Auction.forEach((item) => items.push(item))

  return items
}

export default Auction
export { AuctionItem }

mc.system.afterEvents.scriptEventReceive.subscribe(async ({ id, sourceEntity }) => {
  if (id == "mce:convertauction2.4.0" && (sourceEntity != undefined && sourceEntity.typeId == "minecraft:player")) {
    sourceEntity.sendMessage("§eConverting...")
    let database = new Database(`AuctionItemDB`)
    Server.getDimension("minecraft:overworld").getEntities()
      .filter(e => e.typeId === "pao:database" && (e.nameTag.startsWith("Auction") && !e.nameTag.startsWith("Auction3.4.0")))
      .sort((a, b) => {
        let aTag = a.getTags().find(t => t.startsWith("spawntime:"))?.substring("spawntime:".length) ?? 0
        let bTag = b.getTags().find(t => t.startsWith("spawntime:"))?.substring("spawntime:".length) ?? 0

        let aTime = Number(aTag)
        let bTime = Number(bTag)

        return aTime - bTime ?? 1
      })
      .forEach(async (entity) => {
        let entityInventory = Server.getInventory(entity)
        for (let i = 0; i < entityInventory.size; i++) {
          let item = entityInventory.getItem(i)
          if (!item) continue;
          let dId = item.nameTag
          let data = database.get(dId)
          item.nameTag = undefined
          try {
            await Auction.addItem(item, data)
            database.delete(dId)
          } catch (err) {
            sourceEntity.dimension.spawnItem(item, sourceEntity.location)
            sourceEntity.sendMessage(`§c[Error]: Error when adding ${data.displayname} ${err}`)
          }
        }
        entity.triggerEvent("minecraft:despawn")
      })

    sourceEntity.sendMessage("§aConverted.")
  }
  if (id == "mce:convertauction2.5.0" && (sourceEntity != undefined && sourceEntity.typeId == "minecraft:player")) {
    const sleep = async (ms) => {
      return new Promise((resolve) => {
        mc.system.runTimeout(resolve, (ms / 1000) * 20)
      })
    }

    const readData = (item) => {
      let data = {}
      for (var d of item.getLore()) {
        if (d.startsWith("pao")) {
          let key = d.substring("pao".length).split("_")[0]
          let value = d.substring(d.split("_")[0].length + 1)

          data[key] = JSON.parse(value)
        }
      }

      return data
    }

    const removeData = (item) => {
      let lore = item.getLore()
      let n = 0
      lore.forEach(d => {
        if (d.startsWith("pao") && d.split("_")[1]) n += 1
      })

      lore = lore.slice(0, -n)
      item.setLore(lore)
      return item
    }

    sourceEntity.sendMessage("§eConverting...")
    const entities = Server.getDimension("minecraft:overworld").getEntities()
      .filter(e => e.typeId === "pao:database" && (e.nameTag.startsWith("Auction2.4.0")))
      .sort((a, b) => {
        let aTag = a.getTags().find(t => t.startsWith("spawntime:"))?.substring("spawntime:".length) ?? 0
        let bTag = b.getTags().find(t => t.startsWith("spawntime:"))?.substring("spawntime:".length) ?? 0

        let aTime = Number(aTag)
        let bTime = Number(bTag)

        return aTime - bTime ?? 1
      })

    for (const entity of entities) {
      let entityInventory = Server.getInventory(entity)
      for (let i = 0; i < entityInventory.size; i++) {
        let item = entityInventory.getItem(i)
        if (!item) continue;
        const data = readData(item)
        item = removeData(item)
        Auction.addItem(item, data)
        await sleep(100)
      }
      entity.triggerEvent("minecraft:despawn")
    }

    sourceEntity.sendMessage("§aConverted.")
  }
})