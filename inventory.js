(() => {
  const COUNT_KEYS = [
    "ItemCount", "itemCount", "Count", "count",
    "Quantity", "quantity", "Amount", "amount", "Owned", "owned"
  ];

  const NAME_KEYS = [
    "uniqueName", "UniqueName", "ItemType", "itemType",
    "type", "Type", "name", "Name", "ItemName", "itemName"
  ];

  const CURRENCY_KEYS = new Map([
    ["credits", "Credits"], ["premiumcredits", "Platinum"], ["platinum", "Platinum"],
    ["ducats", "Ducats"], ["voidtraces", "Void Traces"], ["endo", "Endo"]
  ]);
  const COLLECTIONS = {
    Resources:"resources", resources:"resources", MiscItems:"resources", Materials:"resources",
    Components:"parts", Parts:"parts", Blueprints:"blueprints", Recipes:"blueprints",
    Relics:"relics", Projections:"relics", Mods:"mods", Upgrades:"mods",
    Consumables:"gear", Gear:"gear", Items:"other", items:"other"
  };
  function firstValue(object, keys) {
    for (const key of keys) if (object?.[key] != null) return object[key];
    return null;
  }
  function readableName(rawName) {
    if (!rawName) return "Unknown item";
    return String(rawName).split("/").filter(Boolean).pop()
      .replace(/([a-z])([A-Z])/g,"$1 $2").replace(/_/g," ").trim();
  }
  function validQuantity(value) {
    return (typeof value === "number" || typeof value === "string" && value.trim() !== "") &&
      Number.isFinite(Number(value)) && Number(value) >= 0;
  }
  // Only account/inventory containers are balances. Never recurse into stats,
  // affiliations, loadouts, challenges, recipe costs or lifetime earnings.
  function containers(profile) {
    const roots = [{node:profile?.Results?.[0],path:"Results[0]"},{node:profile,path:"root"}];
    const result = [];
    for (const root of roots) {
      if (!root.node || typeof root.node !== "object") continue;
      for (const key of ["Inventory","inventory"]) {
        const inventory = root.node[key];
        if (inventory && typeof inventory === "object" && !Array.isArray(inventory)) {
          for (const wallet of ["Wallet","wallet","Currencies"]) if (inventory[wallet])
            result.push({node:inventory[wallet],path:`${root.path}.${key}.${wallet}`});
          result.push({node:inventory,path:`${root.path}.${key}`});
        }
      }
      for (const wallet of ["Wallet","wallet","Currencies"]) if (root.node[wallet])
        result.push({node:root.node[wallet],path:`${root.path}.${wallet}`});
      result.push(root);
    }
    return result;
  }
  function summarize(items) {
    return {
      totalEntries: items.length,
      categories: items.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {}),
      currencies: items.filter(item => item.category === "currency").length,
      resources: items.filter(item => item.category === "resources").length
    };
  }

  function build(profile, catalog = {}) {
    const map = new Map();
    const reportedCollections = [];
    for (const {node,path} of containers(profile)) {
      for (const [field,name] of CURRENCY_KEYS) {
        const entry = Object.entries(node).find(([key]) => key.toLowerCase() === field);
        if (!entry || !validQuantity(entry[1]) || map.has(`currency:${name}`)) continue;
        const sourcePath = `${path}.${entry[0]}`;
        map.set(`currency:${name}`, {id:`currency:${name}`,name,uniqueName:null,quantity:Number(entry[1]),
          category:"currency",sourcePath,sources:[sourcePath],confidence:1});
      }
      for (const [field,fallback] of Object.entries(COLLECTIONS)) {
        if (!Array.isArray(node[field])) continue;
        const collection = `${path}.${field}`;
        reportedCollections.push(collection);
        node[field].forEach((entry,i) => {
          const rawName = firstValue(entry,NAME_KEYS), rawCount = firstValue(entry,COUNT_KEYS);
          if (typeof rawName !== "string" || !validQuantity(rawCount)) return;
          const uniqueName = firstValue(entry,["uniqueName","UniqueName","ItemType","itemType"]) ||
            (rawName.startsWith("/Lotus/") ? rawName : null);
          const metadata = catalog[uniqueName];
          const name = metadata?.name || readableName(firstValue(entry,["name","Name","ItemName","itemName"]) || rawName);
          const category = metadata?.category && ["resources","parts","blueprints","relics","mods","gear","arcanes"].includes(metadata.category)
            ? metadata.category : fallback;
          const id = uniqueName || `${category}:${name.toLowerCase()}`;
          const sourcePath = `${collection}[${i}]`;
          const previous = map.get(id);
          if (previous) {
            // Multiple stacks in one collection add; mirrored containers do not.
            if (previous.collection === collection) previous.quantity += Number(rawCount);
            previous.sources.push(sourcePath);
            return;
          }
          map.set(id,{id,name,uniqueName,quantity:Number(rawCount),category,collection,
            sourcePath,sources:[sourcePath],confidence:1});
        });
      }
    }
    const items = Array.from(map.values()).sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    return {version:2,items,summary:summarize(items),reportedCollections,
      availability:{currencies:items.some(x=>x.category === "currency") ? "reported" : "not-reported",
        materials:items.some(x=>["resources","parts"].includes(x.category)) ? "reported" : "not-reported"},generatedAt:Date.now()};
  }

  function unwrapCatalog(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    if (Array.isArray(payload?.payload)) return payload.payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  }

  function compactCatalog(payload) {
    return unwrapCatalog(payload)
      .filter(item => Array.isArray(item?.components) && item.components.length)
      .map(item => ({
        name: item.name,
        uniqueName: item.uniqueName,
        category: item.category || item.type || "Unknown",
        imageName: item.imageName || null,
        buildPrice: item.buildPrice ?? null,
        buildTime: item.buildTime ?? null,
        buildQuantity: item.buildQuantity ?? 1,
        components: item.components
          .filter(component => component && component.name !== "Blueprint")
          .map(component => ({
            name: component.name,
            uniqueName: component.uniqueName || null,
            itemCount: Number(component.itemCount ?? 0),
            category: component.category || null,
            imageName: component.imageName || null
          }))
      }));
  }

  function readiness(inventoryItems, craftables, limit = 12) {
    const byUnique = new Map();
    const byName = new Map();

    for (const item of inventoryItems || []) {
      if (item.uniqueName) byUnique.set(item.uniqueName, item.quantity);
      byName.set(item.name.toLowerCase(), item.quantity);
    }

    return (craftables || [])
      .map(craftable => {
        const componentState = (craftable.components || []).map(component => {
          const owned =
            (component.uniqueName && byUnique.get(component.uniqueName)) ??
            byName.get(String(component.name || "").toLowerCase()) ??
            null;

          return {
            ...component,
            owned,
            missing: owned === null ? null : Math.max(0, Number(component.itemCount) - owned)
          };
        });

        const invalid = !componentState.length || componentState.some(component => !Number.isFinite(component.itemCount) || component.itemCount <= 0);
        const missing = componentState.filter(component => component.missing === null || component.missing > 0);

        return {
          ...craftable,
          status: invalid || missing.length ? "unverified-materials" : "materials-ready",
          missingCount: missing.length,
          components: componentState
        };
      })
      .filter(item => item.status === "materials-ready")
      .slice(0, limit);
  }

  globalThis.TennoInventory = {
    build,
    compactCatalog,
    readiness,
    readableName
  };
})();
