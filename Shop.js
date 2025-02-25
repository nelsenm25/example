import * as mc from "@minecraft/server"
import Config from "../../Configuration"
import Server from "../../main"
import { Database } from "../Database"
import ItemDatabase, { Item } from "../ItemDatabase"
import Utility from "../Utility"

const { system } = mc

const ShopDB = new ItemDatabase("Shop2.5.1", Config.maxShop)
const ShopGroupDB = new Database("ShopGroupDB")

const StrucutreCategory = {
  displayname: String.prototype,
  icon: String.prototype
}

const StructureData = {
  displayname: String.prototype,
  icon: String.prototype,
  price: Number.prototype,
  category: String.prototype,
  oneTimePurchase: Boolean.prototype,
  currencyType: String.prototype // "shop" for money, "general" for shards
}
const StructureItem = {
  item: mc.ItemStack.prototype,
  data: StructureData,
  itemDB: Item.prototype
}

const Shop = {}

Shop.maxGroup = 27

/**
 * Add group to Shop
 * @param {string} groupname 
 * @param {StrucutreCategory} data
 */
Shop.addGroup = async (groupname, data) => {
  await ShopGroupDB.set(groupname, data)
}
/**
 * Set group in Shop
 * @param {string} groupname 
 * @param {StrucutreCategory} data
 */
Shop.setGroup = async (groupname, data) => {
  await ShopGroupDB.set(groupname, data)
}

/**
 * Check group from Shop
 * @param {string} groupname 
 * @param {boolean} data
 */
Shop.hasGroup = async (groupname) => {
  return ShopGroupDB.has(groupname)
}

/**
 * Delete group from Shop
 * @param {string} groupname 
 */
Shop.removeGroup = async (groupname) => {
  await ShopGroupDB.delete(groupname)
}

/**
 * Add item to Shop
 * @param {mc.ItemStack} item 
 * @param {StructureData} data 
 */
Shop.addItem = (item, data) => {
  // Set default currency type to "shop" if not specified
  if (!data.currencyType) data.currencyType = "shop"
  return ShopDB.add(item, data)
}

/**
 * Delete item from Shop
 * @param {StructureItem} item 
 */
Shop.removeItem = async (item) => {
  await item.itemDB.delete()
}

/**
 * Edit data item from Shop
 * @param {StructureItem} item 
 * @param {Object} data 
 */
Shop.editItem = async (item, data) => {
  await item.itemDB.editData(data)
}

/**
 * Check item from Shop
 * @param {StructureItem} item 
 */
Shop.isValid = async (item) => {
  return await item.itemDB.isValid()
}

/**
 * For each all data from Shop
 * @param {(item: StructureItem) => void} callback 
 */
Shop.forEach = (callback) => {
  ShopDB.forEach(data => {
    let item = data.item
    let itemData = data.data
    if (!itemData) {
      data.delete()
      return
    }
    // console.warn(JSON.stringify(itemData))
    let itemResult = {
      item: item,
      data: {
        price: itemData.price,
        category: itemData.category,
        displayname: itemData.displayname,
        icon: itemData.icon,
      },
      itemDB: data
    }

    callback(itemResult)
  })
}

/**
 * 
 * @returns {Object}
 */
Shop.getGroups = () => {
  const groups = {}
  ShopGroupDB.forEach((key, value) => {
    groups[key] = value
  })

  let result = {}
  for (const group of Object.keys(groups).sort(Utility.compareString)) {
    result[group] = groups[group]
  }
  return result 
}

/**
 * Get All items from Shop
 * @returns {StructureItem[]}
 */
Shop.getItems = () => {
  let items = []
  Shop.forEach((itemData) => {
    items.push(itemData)
  })

  return items
}

Shop.getSize = () => {
  return ShopDB.length
}

Shop.resetData = async () => {
  await ShopGroupDB.clear()
  await ShopDB.clear()
}

/**
 * Get items amount with same data
 * @param {any} data 
 * @returns {number}
 */
Shop.getAmountByData = (data) => {
  return ShopDB.getAmountByData(data)
}

export default Shop
export { StructureItem }

mc.system.afterEvents.scriptEventReceive.subscribe(async ({ id, sourceEntity }) => {
  if (id == "mce:convertshop2.4.0" && (sourceEntity != undefined && sourceEntity.typeId == "minecraft:player")) {
    sourceEntity.sendMessage("§eConverting...")
    let database = new Database(`ShopItemDB`)
    Server.getDimension("minecraft:overworld").getEntities()
      .filter(e => e.typeId === "pao:database" && (e.nameTag.startsWith("Shop") && !e.nameTag.startsWith("Shop2.4.0")))
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
            await Shop.addItem(item, data)
            database.delete(dId)
          } catch (err) {
            sourceEntity.sendMessage(`§c[Error]: Error when adding ${data.displayname} ${err}`)
          }
        }
        entity.triggerEvent("minecraft:despawn")
      })

    sourceEntity.sendMessage("§aConverted.")
  }
  if (id == "mce:convertshop2.5.0" && (sourceEntity != undefined && sourceEntity.typeId == "minecraft:player")) {
    const sleep = async (ms) => {
      return new Promise((resolve) => {
        system.runTimeout(resolve, (ms / 1000) * 20)
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
      .filter(e => e.typeId === "pao:database" && (e.nameTag.startsWith("Shop2.4.0")))
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
        Shop.addItem(item, data)
        await sleep(100)
      }
      entity.triggerEvent("minecraft:despawn")
    }

    sourceEntity.sendMessage("§aConverted.")
  }
  if (id == "mce:shopHardReset2.5.1" && (sourceEntity != undefined && sourceEntity.typeId == "minecraft:player")) {
    sourceEntity.sendMessage("§eReseting...")
    await ShopGroupDB.clear()
    await ShopDB.hardReset()

    sourceEntity.sendMessage("§aReseted.")
  }
})