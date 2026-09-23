const assert = require("node:assert/strict");
require("../inventory.js");

const { build, compactCatalog, readiness, readableName } = globalThis.TennoInventory;

const profile = {
  Credits: 125000,
  PremiumCredits: 75,
  Results: [
    {
      DisplayName: "TestTenno",
      Inventory: {
        Resources: [
          { ItemType: "/Lotus/Types/Items/MiscItems/OrokinCell", ItemCount: 14 },
          { ItemType: "/Lotus/Types/Items/MiscItems/NeuralSensor", ItemCount: 7 },
          { ItemType: "/Lotus/Types/Items/MiscItems/OrokinCell", ItemCount: 2 }
        ],
        Relics: [
          { name: "Lith A1 Relic", Count: 3 }
        ],
        Blueprints: [
          { Name: "Forma Blueprint", Quantity: 1 }
        ]
      }
    }
  ]
};

const inventory = build(profile);

assert.equal(inventory.summary.totalEntries, 6, "should normalize 6 unique inventory entries");
assert.equal(inventory.summary.currencies, 2, "should detect credits and platinum");

const credits = inventory.items.find(x => x.name === "Credits");
assert.equal(credits.quantity, 125000);

const platinum = inventory.items.find(x => x.name === "Platinum");
assert.equal(platinum.quantity, 75);

const orokin = inventory.items.find(x => x.uniqueName === "/Lotus/Types/Items/MiscItems/OrokinCell");
assert.ok(orokin, "Orokin Cell should be detected");
assert.equal(orokin.quantity, 16, "duplicate quantity rows should merge");
assert.equal(orokin.category, "resources");

const relic = inventory.items.find(x => x.name === "Lith A1 Relic");
assert.ok(relic);
assert.equal(relic.category, "relics");

const blueprint = inventory.items.find(x => x.name === "Forma Blueprint");
assert.ok(blueprint);
assert.equal(blueprint.category, "blueprints");

assert.equal(readableName("/Lotus/Types/Items/MiscItems/NeuralSensor"), "Neural Sensor");

const catalog = compactCatalog([
  {
    name: "Forma",
    uniqueName: "/Lotus/StoreItems/Types/Recipes/Components/FormaBlueprint",
    components: [
      { name: "Blueprint", itemCount: 1 },
      {
        name: "Orokin Cell",
        uniqueName: "/Lotus/Types/Items/MiscItems/OrokinCell",
        itemCount: 1
      },
      {
        name: "Neural Sensor",
        uniqueName: "/Lotus/Types/Items/MiscItems/NeuralSensor",
        itemCount: 1
      }
    ]
  },
  {
    name: "Expensive Test Item",
    components: [
      {
        name: "Orokin Cell",
        uniqueName: "/Lotus/Types/Items/MiscItems/OrokinCell",
        itemCount: 999
      }
    ]
  }
]);

assert.equal(catalog.length, 2);
assert.equal(catalog[0].components.length, 2, "Blueprint pseudo-component should be removed");

const ready = readiness(inventory.items, catalog, 10);
assert.equal(ready.length, 1);
assert.equal(ready[0].name, "Forma");
assert.equal(ready[0].status, "materials-ready");

console.log("inventory.test.js: all assertions passed");
