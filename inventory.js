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
    ["credits", "Credits"],
    ["premiumcredits", "Platinum"],
    ["platinum", "Platinum"],
    ["ducats", "Ducats"],
    ["voidtraces", "Void Traces"],
    ["standing", "Standing"],
    ["focus", "Focus"]
  ]);

  const INVENTORY_PATH_HINTS = [
    "inventory", "resources", "miscitems", "consumables", "components",
    "blueprints", "recipes", "relics", "mods", "prime", "parts", "currency"
  ];

  const CATEGORY_HINTS = [
    ["currency", "currency"],
    ["resource", "resources"],
    ["miscitems", "resources"],
    ["component", "parts"],
    ["parts", "parts"],
    ["prime", "parts"],
    ["blueprint", "blueprints"],
    ["recipe", "blueprints"],
    ["relic", "relics"],
    ["mod", "mods"],
    ["consumable", "gear"]
  ];

  function firstValue(object, keys) {
    for (const key of keys) {
      if (object && object[key] != null) return object[key];
    }
    return null;
  }

  function normalizeKey(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function readableName(rawName) {
    if (!rawName) return "Unknown item";
    const text = String(rawName);
    const last = text.includes("/") ? text.split("/").filter(Boolean).pop() : text;
    return last
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .trim();
  }

  function inferCategory(path, name) {
    const haystack = `${path} ${name}`.toLowerCase();
    for (const [hint, category] of CATEGORY_HINTS) {
      if (haystack.includes(hint)) return category;
    }
    return "other";
  }

  function likelyInventoryPath(path) {
    const lower = path.toLowerCase();
    return INVENTORY_PATH_HINTS.some(hint => lower.includes(hint));
  }

  function addOrMerge(map, item) {
    const key = item.uniqueName || `${item.category}:${item.name.toLowerCase()}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      return;
    }

    existing.quantity += item.quantity;
    existing.sources = Array.from(new Set([...(existing.sources || []), ...(item.sources || [])]));
    existing.confidence = Math.max(existing.confidence || 0, item.confidence || 0);
  }

  function extractCurrencies(node, path, map, depth = 0) {
    if (!node || typeof node !== "object" || depth > 8) return;

    for (const [key, value] of Object.entries(node)) {
      const nextPath = path ? `${path}.${key}` : key;

      if (typeof value === "number" && Number.isFinite(value)) {
        const normalized = normalizeKey(key);
        const currencyName = CURRENCY_KEYS.get(normalized);

        if (currencyName) {
          addOrMerge(map, {
            id: `currency:${normalized}`,
            name: currencyName,
            uniqueName: null,
            quantity: value,
            category: "currency",
            sourcePath: nextPath,
            sources: [nextPath],
            confidence: 1
          });
        }
      } else if (value && typeof value === "object") {
        extractCurrencies(value, nextPath, map, depth + 1);
      }
    }
  }

  function extractQuantityObjects(node, path, map, depth = 0) {
    if (!node || typeof node !== "object" || depth > 8) return;

    if (Array.isArray(node)) {
      node.forEach((entry, index) => {
        const entryPath = `${path}[${index}]`;

        if (entry && typeof entry === "object") {
          const rawCount = firstValue(entry, COUNT_KEYS);
          const rawName = firstValue(entry, NAME_KEYS);

          if (
            rawName != null &&
            rawCount != null &&
            Number.isFinite(Number(rawCount)) &&
            (likelyInventoryPath(path) || String(rawName).startsWith("/Lotus/"))
          ) {
            const quantity = Number(rawCount);
            const uniqueName =
              entry.uniqueName ||
              entry.UniqueName ||
              entry.ItemType ||
              entry.itemType ||
              (String(rawName).startsWith("/Lotus/") ? String(rawName) : null);

            const name = readableName(
              entry.name ||
              entry.Name ||
              entry.ItemName ||
              entry.itemName ||
              rawName
            );

            addOrMerge(map, {
              id: uniqueName || `${inferCategory(path, name)}:${name.toLowerCase()}`,
              name,
              uniqueName,
              quantity,
              category: inferCategory(path, name),
              sourcePath: entryPath,
              sources: [entryPath],
              confidence: likelyInventoryPath(path) ? 1 : 0.65
            });
          }
        }

        extractQuantityObjects(entry, entryPath, map, depth + 1);
      });

      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (value && typeof value === "object") {
        extractQuantityObjects(value, path ? `${path}.${key}` : key, map, depth + 1);
      }
    }
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

  function build(profile) {
    const map = new Map();

    extractCurrencies(profile, "", map);
    extractQuantityObjects(profile, "", map);

    const items = Array.from(map.values())
      .filter(item => Number.isFinite(item.quantity))
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.name.localeCompare(b.name);
      });

    return {
      version: 1,
      items,
      summary: summarize(items),
      generatedAt: Date.now()
    };
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
            0;

          return {
            ...component,
            owned,
            missing: Math.max(0, Number(component.itemCount || 0) - Number(owned || 0))
          };
        });

        const missing = componentState.filter(component => component.missing > 0);

        return {
          ...craftable,
          status: missing.length ? "missing-materials" : "materials-ready",
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
