const PROMPTS = [
  {
    id: "progression",
    title: "Progression Advisor",
    description: "Build a prioritized progression roadmap from my account state.",
    fields: [{ id: "goal", label: "Main progression goal", placeholder: "e.g. unlock The New War" }],
    prompt: `Act as my Warframe progression advisor. Analyze the Tenno Link profile data I provide. Prioritize Mastery Rank, Star Chart progress, quests, equipment progression, syndicates, likely bottlenecks, and the most useful next objectives. Give me a prioritized plan, explain why each step matters, and distinguish urgent progression from optional content. Do not assume I own resources, mods, blueprints, or items that are not represented. Verify current Warframe information when patch-specific details matter.`
  },
  {
    id: "next",
    title: "What Should I Do Next?",
    description: "Get one best immediate activity plus the next three objectives.",
    fields: [{ id: "time", label: "Time available", placeholder: "e.g. 30 minutes" }],
    prompt: `Using my Tenno Link Warframe data, tell me the single best activity to do next, then the next three objectives after it. Explain any progression path I may be neglecting and what I should avoid wasting time on right now. Optimize for efficient account progression rather than completionism, and verify current game details when needed.`
  },
  {
    id: "mastery",
    title: "Mastery Rank Planner",
    description: "Find efficient mastery opportunities and what to level next.",
    fields: [{ id: "target", label: "Mastery target", placeholder: "e.g. reach MR 16" }],
    prompt: `Analyze my Warframe profile specifically for Mastery Rank progression. Identify equipment I appear to have leveled, equipment that may still provide Mastery XP, easy mastery opportunities, and progression requirements that may block future Mastery Ranks. Give me immediate, short-term, and later priorities. Verify current item and mastery information when necessary.`
  },
  {
    id: "starchart",
    title: "Star Chart Advisor",
    description: "Suggest the best path across the Origin System.",
    fields: [{ id: "destination", label: "Destination or junction", placeholder: "e.g. reach Sedna" }],
    prompt: `Analyze my Tenno Link data with a focus on Star Chart progression. Determine completed mission records, likely accessible nodes, unfinished planets, junction progression, and progression gates. Recommend the best node and planet path from my current state. Resolve internal mission identifiers with current reliable Warframe sources when necessary.`
  },
  {
    id: "arsenal",
    title: "Arsenal Review",
    description: "Review frames and weapons for mastery and progression value.",
    fields: [{ id: "equipment", label: "Equipment to focus on", placeholder: "e.g. my current primary weapon" }],
    prompt: `Act as my Warframe arsenal advisor. Analyze my Warframes, primary, secondary and melee weapons, usage statistics, and leveling progress. Recommend what to keep leveling, what to prioritize for mastery, what may be worth replacing, and what equipment to consider obtaining next. Do not assume mod ownership unless it is present in the supplied data.`
  },
  {
    id: "farm",
    title: "Farming Planner",
    description: "Turn progression and live world state into a farming plan.",
    fields: [{ id: "materials", label: "Materials or items to farm", placeholder: "e.g. Orokin Cells, Neurodes" }, { id: "amount", label: "Target quantities (optional)", placeholder: "e.g. 10 Orokin Cells" }],
    prompt: `Using my Tenno Link player data and any supplied live world-state data, determine the most useful farms for my current stage. Address any materials and quantities I named first. Prioritize progression resources, equipment crafting, mastery progression, useful unlocks, and syndicate advancement. For each farm, give the item or resource, recommended mission or location, why I need it, and whether my current progression can reasonably access it. Verify current drop information.`
  },
  {
    id: "quests",
    title: "Quest Planner",
    description: "Create an ordered quest roadmap with prerequisites and unlocks.",
    fields: [{ id: "quest", label: "Quest or unlock goal", placeholder: "e.g. The New War" }],
    prompt: `Analyze my Warframe profile and build a quest progression roadmap. Identify quests I have likely completed, quests I may have access to, major quests to work toward, missing prerequisites, and the important systems or areas each quest unlocks. Return an ordered plan and verify current quest requirements when needed.`
  },
  {
    id: "syndicates",
    title: "Syndicate Advisor",
    description: "Analyze affiliations, standing and worthwhile next rewards.",
    fields: [{ id: "faction", label: "Faction or reward goal", placeholder: "e.g. Entrati rank 3" }],
    prompt: `Analyze the affiliation and standing data in my Warframe profile. Explain my current syndicate progression, which factions I am actively progressing, standing opportunities I may be wasting, useful rewards around my current ranks, and which reputation systems are worth prioritizing next. Distinguish normal syndicates, open-world factions, and other reputation systems.`
  },
  {
    id: "health",
    title: "Account Health Check",
    description: "Find neglected systems and progression bottlenecks.",
    fields: [{ id: "concern", label: "Area to check closely", placeholder: "e.g. missing mods" }],
    prompt: `Perform a comprehensive Warframe account health check using my Tenno Link data. Look for unfinished progression, underused systems, missed mastery opportunities, incomplete Star Chart progress, syndicate neglect, underleveled equipment, and likely bottlenecks. Summarize strengths, weaknesses, immediate priorities, and long-term priorities.`
  },
  {
    id: "beginner",
    title: "Beginner-Friendly Plan",
    description: "Simple next steps without overwhelming detail.",
    fields: [{ id: "difficulty", label: "What feels confusing?", placeholder: "e.g. modding and junctions" }],
    prompt: `Treat me as a relatively new Warframe player. Use my supplied profile data to create a simple progression plan without overwhelming me. Explain terminology when necessary. Tell me what to do now, what to farm, what to level, which quest to pursue, and which systems I can safely ignore for now.`
  },
  {
    id: "session",
    title: "Efficient 60-Minute Session",
    description: "Turn one hour into the most productive session possible.",
    fields: [{ id: "minutes", label: "Minutes available", placeholder: "60" }],
    prompt: `I have about 60 minutes to play Warframe. Using my player profile and any supplied live world-state data, create the most productive session possible. Optimize for account progression, mastery, useful farming, Star Chart advancement, and quests. Give me an ordered plan with approximate time allocations and avoid low-value activities for my current account.`
  },
  {
    id: "weekly",
    title: "Weekly Progress Review",
    description: "Summarize progress and give five measurable weekly goals.",
    fields: [{ id: "priority", label: "This week's priority", placeholder: "e.g. finish Mars" }],
    prompt: `Review my current Warframe profile as a weekly progression check-in. Summarize my account stage, mastery progress, Star Chart state, arsenal progression, syndicate progression, and important milestones. Then give me five measurable and realistic goals for the coming week.`
  }
];

const PROMPT_FRESHNESS = `Before recommending any Warframe build, farm, route, or strategy, check the latest relevant PC update and hotfix notes at https://www.warframe.com/en/patch-notes. Check current mechanics and prerequisites against https://wiki.warframe.com/; for drop locations or rates, cross-check https://www.warframe.com/droptables. Official patch notes and drop tables take priority when sources disagree. Look specifically for changes to the named Warframe, weapon, mods, arcanes, abilities, damage interactions, mission rewards, and farming methods. Do not reuse an older guide without confirming its key interactions still work. Include the update or hotfix version, publication date, and source links you actually checked. Distinguish confirmed current facts from inference. If you cannot browse or verify a claim, say that clearly, do not present a build or farm as current, and ask me for recent patch notes or offer a provisional answer labeled unverified. Do not invent citations. Never assume profile data proves item ownership, inventory balances, mission access, or quest completion when those fields are missing.`;
