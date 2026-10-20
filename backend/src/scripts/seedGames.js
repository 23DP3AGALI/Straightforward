import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { closeDatabase, withTransaction } from "../config/db.js";

const games = [
  ["Valorant", "Tactical FPS", [["Rank", "select", true, ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"]], ["Main agent", "text", true], ["Preferred role", "select", false, ["Duelist", "Controller", "Initiator", "Sentinel"]]]],
  ["Counter-Strike 2", "Tactical FPS", [["Rank", "text", true], ["Premier rating", "number", false], ["Preferred map", "select", false, ["Mirage", "Inferno", "Nuke", "Ancient", "Anubis", "Dust II"]]]],
  ["Overwatch 2", "Hero Shooter", [["Rank", "select", true, ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"]], ["Main heroes", "text", true], ["Role", "select", true, ["Tank", "Damage", "Support"]]]],
  ["Tom Clancy's Rainbow Six Siege", "Tactical FPS", [["Rank", "select", true, ["Copper", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Champion"]], ["Main operators", "text", true], ["Preferred side", "select", false, ["Attack", "Defense", "Both"]]]],
  ["Apex Legends", "Battle Royale", [["Rank", "select", true, ["Rookie", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Apex Predator"]], ["Main legends", "text", true], ["Preferred drop style", "select", false, ["Hot drop", "Balanced", "Safe rotation"]]]],
  ["Fortnite", "Battle Royale", [["Build mode", "select", true, ["Build", "Zero Build", "Both"]], ["Arena rank", "text", false], ["Preferred mode", "select", false, ["Battle Royale", "Reload", "Creative"]]]],
  ["PUBG: Battlegrounds", "Battle Royale", [["Region", "select", true, ["Europe", "North America", "Asia", "South America", "Oceania"]], ["Preferred map", "text", false], ["Play style", "select", false, ["Aggressive", "Tactical", "Casual"]]]],
  ["Call of Duty: Warzone", "Battle Royale", [["Input", "select", true, ["Controller", "Mouse and keyboard"]], ["Preferred mode", "text", true], ["K/D ratio", "number", false]]],
  ["The Finals", "Hero Shooter", [["Main build", "select", true, ["Light", "Medium", "Heavy"]], ["Preferred mode", "text", false], ["Play style", "select", false, ["Objective", "Combat", "Support"]]]],
  ["Marvel Rivals", "Hero Shooter", [["Main heroes", "text", true], ["Role", "select", true, ["Vanguard", "Duelist", "Strategist"]], ["Competitive rank", "text", false]]],
  ["League of Legends", "MOBA", [["Rank", "select", true, ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Emerald", "Diamond", "Master", "Grandmaster", "Challenger"]], ["Main lane", "select", true, ["Top", "Jungle", "Mid", "ADC", "Support"]], ["Main champions", "text", false]]],
  ["Dota 2", "MOBA", [["MMR", "number", false], ["Preferred position", "select", true, ["Carry", "Mid", "Offlane", "Soft Support", "Hard Support"]], ["Main heroes", "text", false]]],
  ["Smite 2", "MOBA", [["Rank", "text", false], ["Preferred role", "select", true, ["Solo", "Jungle", "Mid", "Carry", "Support"]], ["Main gods", "text", false]]],
  ["World of Warcraft", "MMORPG", [["Region and realm", "text", true], ["Main class and spec", "text", true], ["Preferred activity", "select", true, ["Raids", "Mythic+", "PvP", "Questing", "Social"]]]],
  ["Final Fantasy XIV", "MMORPG", [["Data center and world", "text", true], ["Main job", "text", true], ["Preferred content", "select", true, ["Raids", "Trials", "Dungeons", "Crafting", "Social"]]]],
  ["Guild Wars 2", "MMORPG", [["Main profession", "text", true], ["Preferred mode", "select", true, ["PvE", "WvW", "PvP", "Exploration"]], ["World", "text", false]]],
  ["The Elder Scrolls Online", "MMORPG", [["Alliance", "select", false, ["Aldmeri Dominion", "Daggerfall Covenant", "Ebonheart Pact"]], ["Main role", "select", true, ["Tank", "Healer", "Damage"]], ["Preferred content", "text", false]]],
  ["Genshin Impact", "Action RPG", [["Server region", "select", true, ["Europe", "America", "Asia", "TW/HK/MO"]], ["Adventure rank", "number", true], ["Looking to do", "select", false, ["Bosses", "Domains", "Exploration", "Events"]]]],
  ["Honkai: Star Rail", "Turn-Based RPG", [["Server region", "select", true, ["Europe", "America", "Asia"]], ["Trailblaze level", "number", true], ["Favorite character", "text", false]]],
  ["Destiny 2", "Looter Shooter", [["Main class", "select", true, ["Hunter", "Titan", "Warlock"]], ["Power level", "number", false], ["Preferred activity", "select", true, ["Raids", "Dungeons", "PvP", "Nightfalls"]]]],
  ["Warframe", "Looter Shooter", [["Mastery rank", "number", false], ["Main Warframes", "text", true], ["Preferred activity", "select", true, ["Missions", "Relics", "Bosses", "Steel Path", "Fashion"]]]],
  ["Elden Ring", "Action RPG", [["Journey", "select", true, ["First playthrough", "New Game+", "Co-op run"]], ["Build / level", "text", false], ["Platform", "select", true, ["PC", "PlayStation", "Xbox"]]]],
  ["Path of Exile 2", "Action RPG", [["League", "text", true], ["Main class / build", "text", true], ["Preferred activity", "select", false, ["Campaign", "Mapping", "Bossing", "Trading"]]]],
  ["Monster Hunter Wilds", "Action RPG", [["Hunter rank", "number", false], ["Main weapon", "text", true], ["Preferred hunt", "text", false]]],
  ["Diablo IV", "Action RPG", [["Season", "text", true], ["Main class / build", "text", true], ["Preferred activity", "select", false, ["Dungeons", "Bosses", "Helltides", "Co-op"]]]],
  ["Minecraft", "Sandbox", [["Edition", "select", true, ["Java", "Bedrock"]], ["Play style", "select", true, ["Survival", "Creative", "Building", "Modded"]], ["Server / version", "text", false]]],
  ["Roblox", "Sandbox", [["Favorite experiences", "text", true], ["Preferred style", "select", false, ["Roleplay", "Obby", "Simulator", "Survival", "Strategy"]], ["Voice chat", "select", false, ["Yes", "No"]]]],
  ["Grand Theft Auto Online", "Open World", [["Platform", "select", true, ["PC", "PlayStation", "Xbox"]], ["Preferred activities", "text", true], ["Session style", "select", false, ["Missions", "Racing", "Freemode", "Roleplay"]]]],
  ["Rust", "Survival", [["Preferred team size", "number", false], ["Experience", "select", true, ["New", "Casual", "Experienced", "Veteran"]], ["Play style", "select", false, ["PvP", "Building", "Farming", "Mixed"]]]],
  ["Terraria", "Sandbox", [["World difficulty", "select", true, ["Classic", "Expert", "Master"]], ["Character mode", "select", true, ["Classic", "Mediumcore", "Hardcore"]], ["Preferred activity", "text", false]]],
  ["Stardew Valley", "Cozy Co-op", [["Farm style", "select", false, ["Standard", "Riverland", "Forest", "Hill-top", "Four Corners", "Meadowlands"]], ["Preferred focus", "select", true, ["Farming", "Mining", "Fishing", "Social", "Mixed"]], ["Platform", "text", false]]],
  ["Sea of Thieves", "Adventure", [["Preferred crew role", "text", false], ["Play style", "select", true, ["Voyages", "PvP", "Tall Tales", "Casual sailing"]], ["Platform", "select", false, ["PC", "Xbox", "PlayStation"]]]],
  ["Phasmophobia", "Horror Co-op", [["Difficulty", "select", true, ["Amateur", "Intermediate", "Professional", "Custom"]], ["Experience", "select", true, ["Beginner", "Intermediate", "Experienced"]], ["Preferred map", "text", false]]],
  ["Dead by Daylight", "Horror Multiplayer", [["Main survivor / killer", "text", false], ["Preferred side", "select", true, ["Survivor", "Killer", "Both"]], ["Experience", "select", false, ["New", "Casual", "Experienced"]]]],
  ["Rocket League", "Sports", [["Rank", "select", true, ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "Grand Champion", "SSL"]], ["Main mode", "select", true, ["2v2", "3v3", "1v1", "Extra modes"]], ["Platform", "text", false]]],
  ["EA Sports FC 26", "Sports", [["Division / rank", "text", false], ["Preferred mode", "select", true, ["Ultimate Team", "Clubs", "Career", "Seasons"]], ["Position / role", "text", false]]],
  ["NBA 2K26", "Sports", [["Platform", "select", true, ["PlayStation 5", "Xbox Series X|S", "PC", "Other"]], ["Preferred mode", "select", true, ["Park", "Rec", "Pro-Am", "MyTeam"]], ["Position / build", "text", false]]],
  ["Forza Horizon 5", "Racing", [["Preferred activity", "select", true, ["Road racing", "Dirt", "Drifting", "Exploration", "Playground"]], ["Favorite cars", "text", false], ["Driving assists", "select", false, ["Casual", "Simulation", "Mixed"]]]],
  ["Team Fortress 2", "Hero Shooter", [["Main classes", "text", true], ["Preferred mode", "select", true, ["Casual", "Competitive", "Mann vs. Machine", "Community"]], ["Main maps", "text", false]]],
  ["Don't Starve Together", "Survival", [["Main character", "text", false], ["World experience", "select", true, ["New", "Casual", "Experienced"]], ["Preferred focus", "select", false, ["Exploration", "Bosses", "Building", "Survival"]]]],
  ["Baldur's Gate 3", "Tactical RPG", [["Main class", "text", true], ["Campaign experience", "select", true, ["First run", "Replay", "Honor Mode"]], ["Preferred play style", "select", false, ["Story", "Tactical", "Completionist"]]], 1086940],
  ["Cyberpunk 2077", "Action RPG", [["Build / lifepath", "text", true], ["Difficulty", "select", false, ["Easy", "Normal", "Hard", "Very Hard"]], ["Preferred co-op platform", "text", false]], 1091500],
  ["The Witcher 3: Wild Hunt", "Open-World RPG", [["Difficulty", "select", true, ["Just the Story", "Story and Sword", "Blood and Broken Bones", "Death March"]], ["Playthrough", "select", true, ["Base game", "Complete Edition", "New Game+"]], ["Favorite activity", "text", false]], 292030],
  ["The Elder Scrolls V: Skyrim Special Edition", "Open-World RPG", [["Character build", "text", true], ["Play style", "select", true, ["Exploration", "Roleplay", "Questing", "Modded"]], ["Platform", "select", false, ["PC", "PlayStation", "Xbox", "Switch"]]], 489830],
  ["Fallout 4", "Open-World RPG", [["Character build", "text", true], ["Play style", "select", true, ["Story", "Exploration", "Building", "Survival"]], ["Modded", "select", false, ["Vanilla", "Modded"]]], 377160],
  ["Starfield", "Open-World RPG", [["Character build", "text", true], ["Preferred activity", "select", true, ["Missions", "Exploration", "Ship building", "Outposts"]], ["Difficulty", "text", false]], 1716740],
  ["Hades", "Roguelike", [["Best clear / heat", "text", false], ["Favorite weapon", "text", true], ["Play style", "select", false, ["Casual runs", "High heat", "Completionist"]]], 1145360],
  ["Hades II", "Roguelike", [["Progress / fear level", "text", false], ["Favorite weapon", "text", true], ["Preferred run style", "select", false, ["Casual", "Challenge", "Completionist"]]], 1145350],
  ["Hollow Knight", "Metroidvania", [["Progress", "text", false], ["Experience", "select", true, ["First playthrough", "Replay", "Completionist"]], ["Favorite boss", "text", false]], 367520],
  ["Hollow Knight: Silksong", "Metroidvania", [["Progress", "text", false], ["Experience", "select", true, ["First playthrough", "Replay", "Completionist"]], ["Favorite area", "text", false]], 1030300],
  ["Celeste", "Precision Platformer", [["Chapter / progress", "text", false], ["Preferred challenge", "select", true, ["Story", "B-Sides", "C-Sides", "Farewell"]], ["Assist mode", "select", false, ["On", "Off"]]], 504230],
  ["Dead Cells", "Roguelike", [["Boss cell level", "number", false], ["Favorite weapon", "text", true], ["Run focus", "select", false, ["Unlocks", "Bosses", "Daily challenge"]]], 588650],
  ["Ori and the Will of the Wisps", "Metroidvania", [["Progress", "text", false], ["Preferred difficulty", "select", true, ["Easy", "Normal", "Hard"]], ["Favorite ability", "text", false]], 1057090],
  ["Cuphead", "Run-and-Gun", [["Progress", "text", false], ["Preferred mode", "select", true, ["Regular", "Expert", "Co-op"]], ["Main character", "select", false, ["Cuphead", "Mugman", "Ms. Chalice"]]], 268910],
  ["Blasphemous 2", "Metroidvania", [["Progress", "text", false], ["Main weapon", "select", true, ["Ruego Al Alba", "Sarmiento & Centella", "Veredicto"]], ["Preferred challenge", "text", false]], 2114740],
  ["Lethal Company", "Horror Co-op", [["Experience", "select", true, ["New recruit", "Regular", "Veteran"]], ["Preferred role", "select", true, ["Scout", "Shoveler", "Looting", "Ship"]], ["Challenge moons", "text", false]], 1966720],
  ["Among Us", "Social Deduction", [["Preferred role", "select", true, ["Crewmate", "Impostor", "Both"]], ["Lobby size", "number", false], ["Preferred settings", "text", false]], 945360],
  ["Content Warning", "Horror Co-op", [["Experience", "select", true, ["New", "Casual", "Experienced"]], ["Preferred role", "text", false], ["Video challenge", "select", false, ["Casual", "High risk"]]], 2881650],
  ["Left 4 Dead 2", "Co-op Shooter", [["Preferred campaign", "text", false], ["Difficulty", "select", true, ["Easy", "Normal", "Advanced", "Expert"]], ["Play style", "select", false, ["Campaign", "Versus", "Survival"]]], 550],
  ["Deep Rock Galactic", "Co-op Shooter", [["Main class", "select", true, ["Driller", "Engineer", "Gunner", "Scout"]], ["Promotion / level", "text", false], ["Preferred mission", "text", false]], 548430],
  ["HELLDIVERS 2", "Co-op Shooter", [["Level", "number", false], ["Preferred role", "select", true, ["Anti-tank", "Support", "Crowd control", "Flexible"]], ["Difficulty", "select", false, ["Casual", "Challenging", "Helldive"]]], 553850],
  ["PAYDAY 3", "Co-op Heist", [["Infamy level", "number", false], ["Preferred role", "select", true, ["Stealth", "Loud", "Flexible"]], ["Difficulty", "select", false, ["Normal", "Hard", "Very Hard", "Overkill"]]], 1272080],
  ["GTFO", "Co-op Horror", [["Experience", "select", true, ["New", "Experienced", "Veteran"]], ["Preferred role", "text", false], ["Expedition", "text", false]], 493520],
  ["No Man's Sky", "Space Exploration", [["Preferred activity", "select", true, ["Exploration", "Building", "Missions", "Expeditions"]], ["Game mode", "select", true, ["Normal", "Survival", "Permadeath", "Creative"]], ["Platform", "text", false]], 275850],
  ["Subnautica", "Survival Adventure", [["Experience", "select", true, ["First playthrough", "Replay", "Completionist"]], ["Preferred mode", "select", true, ["Survival", "Freedom", "Creative"]], ["Favorite biome", "text", false]], 264710],
  ["Valheim", "Survival Co-op", [["World difficulty", "select", true, ["Casual", "Normal", "Hard", "Very Hard"]], ["Preferred role", "select", true, ["Builder", "Explorer", "Fighter", "Gatherer"]], ["Progress / boss", "text", false]], 892970],
  ["7 Days to Die", "Survival Crafting", [["Experience", "select", true, ["New", "Casual", "Veteran"]], ["Preferred role", "select", true, ["Builder", "Looting", "Fighting", "Flexible"]], ["Difficulty / day length", "text", false]], 251570],
  ["Sons Of The Forest", "Survival Horror", [["Experience", "select", true, ["New", "Casual", "Experienced"]], ["Preferred role", "select", true, ["Building", "Exploration", "Combat", "Gathering"]], ["Difficulty", "text", false]], 1326470],
  ["Project Zomboid", "Survival Simulation", [["Experience", "select", true, ["Beginner", "Intermediate", "Veteran"]], ["Preferred role", "select", true, ["Builder", "Farmer", "Fighter", "Scavenger"]], ["Sandbox settings", "text", false]], 108600],
  ["Sid Meier's Civilization VI", "4X Strategy", [["Favorite leader", "text", false], ["Game speed", "select", true, ["Online", "Quick", "Standard", "Epic", "Marathon"]], ["Preferred victory", "select", false, ["Science", "Culture", "Domination", "Diplomacy"]]], 289070],
  ["Age of Empires II: Definitive Edition", "Real-Time Strategy", [["Rank / ELO", "number", false], ["Main civilization", "text", true], ["Preferred mode", "select", true, ["1v1", "Team games", "Co-op", "Campaign"]]], 813780],
  ["Age of Empires IV", "Real-Time Strategy", [["Rank", "text", false], ["Main civilization", "text", true], ["Preferred mode", "select", true, ["1v1", "Team games", "Co-op", "Campaign"]]], 1466860],
  ["Stellaris", "Grand Strategy", [["Experience", "select", true, ["New", "Intermediate", "Veteran"]], ["Empire / play style", "text", true], ["Preferred galaxy size", "select", false, ["Small", "Medium", "Large", "Huge"]]], 281990],
  ["Crusader Kings III", "Grand Strategy", [["Favorite start / ruler", "text", false], ["Experience", "select", true, ["New", "Intermediate", "Veteran"]], ["Play style", "select", true, ["Roleplay", "Conquest", "Dynasty building"]]], 1158310],
  ["Total War: WARHAMMER III", "Grand Strategy", [["Main faction", "text", true], ["Preferred mode", "select", true, ["Campaign co-op", "Battles", "Immortal Empires"]], ["Difficulty", "text", false]], 1142710],
  ["Factorio", "Automation Builder", [["Experience", "select", true, ["New", "Casual", "Veteran"]], ["Preferred role", "select", true, ["Building", "Logistics", "Combat", "Planning"]], ["Mods", "select", false, ["Vanilla", "Modded"]]], 427520],
  ["Satisfactory", "Factory Builder", [["Experience", "select", true, ["New pioneer", "Experienced", "Veteran"]], ["Preferred role", "select", true, ["Builder", "Logistics", "Exploration"]], ["Progress tier", "text", false]], 526870],
  ["RimWorld", "Colony Simulation", [["Experience", "select", true, ["New", "Casual", "Veteran"]], ["Preferred storyteller", "text", false], ["Play style", "select", true, ["Building", "Challenge", "Storytelling"]]], 294100],
  ["Cities: Skylines II", "City Builder", [["City theme", "text", false], ["Experience", "select", true, ["New mayor", "Experienced", "Veteran"]], ["Play style", "select", true, ["Realistic", "Creative", "Traffic management"]]], 949230],
  ["Euro Truck Simulator 2", "Driving Simulation", [["Preferred region", "text", false], ["Driving style", "select", true, ["Relaxed", "Realistic", "Convoy"]], ["Wheel / controller", "text", false]], 227300],
  ["Assetto Corsa", "Racing Simulation", [["Main car class", "text", false], ["Preferred mode", "select", true, ["Track day", "Drift", "Racing", "Cruise"]], ["Wheel / controller", "text", false]], 244210],
  ["DiRT Rally 2.0", "Rally Racing", [["Experience", "select", true, ["Beginner", "Intermediate", "Expert"]], ["Favorite class", "text", false], ["Input", "select", true, ["Controller", "Wheel", "Keyboard"]]], 690790],
  ["BeamNG.drive", "Driving Simulation", [["Preferred activity", "select", true, ["Freeroam", "Racing", "Scenarios", "Stunts"]], ["Favorite vehicle", "text", false], ["Input", "select", false, ["Controller", "Wheel", "Keyboard"]]], 284160],
  ["F1 25", "Formula Racing", [["Team / driver", "text", false], ["Experience", "select", true, ["Beginner", "Intermediate", "Expert"]], ["Preferred mode", "select", true, ["Career", "League racing", "Time trial"]]]],
  ["Tabletop Simulator", "Board Game Sandbox", [["Favorite games", "text", true], ["Preferred session", "select", true, ["Board games", "Card games", "RPGs", "Party games"]], ["Voice chat", "select", false, ["Yes", "No"]]], 286160],
  ["Goose Goose Duck", "Social Deduction", [["Preferred role", "select", true, ["Goose", "Duck", "Neutral", "Any"]], ["Experience", "select", true, ["New", "Casual", "Experienced"]], ["Preferred map", "text", false]], 1568590],
  ["Fall Guys", "Party Platformer", [["Preferred rounds", "select", true, ["Race", "Survival", "Team", "Final"]], ["Skill level", "select", true, ["Casual", "Competitive"]], ["Voice chat", "select", false, ["Yes", "No"]]], 1097150],
  ["Human: Fall Flat", "Physics Co-op", [["Favorite level", "text", false], ["Play style", "select", true, ["Casual", "Puzzle solving", "Speedrun"]], ["Experience", "select", false, ["New", "Experienced"]]], 477160],
  ["Party Animals", "Party Brawler", [["Preferred mode", "select", true, ["Last Stand", "Team Score", "Arcade"]], ["Play style", "select", true, ["Casual", "Competitive"]], ["Favorite character", "text", false]], 1260320],
  ["War Thunder", "Vehicle Combat", [["Main nation", "text", true], ["Vehicle type", "select", true, ["Aircraft", "Ground", "Naval", "Mixed"]], ["Battle rating", "number", false]], 236390],
  ["World of Tanks", "Vehicle Combat", [["Main nation", "text", false], ["Preferred vehicle class", "select", true, ["Light", "Medium", "Heavy", "Tank destroyer", "SPG"]], ["Battle tier", "number", false]], 1407200],
  ["Enlisted", "Squad Shooter", [["Main faction", "text", false], ["Preferred mode", "select", true, ["Squads", "Conquest", "Invasion"]], ["Favorite class", "text", false]], 2051620],
  ["Brawlhalla", "Platform Fighter", [["Rank", "text", false], ["Main legends", "text", true], ["Preferred mode", "select", true, ["Ranked 1v1", "Ranked 2v2", "Friendly 2v2", "Brawl"]]], 291550],
  ["Paladins", "Hero Shooter", [["Rank", "text", false], ["Main champions", "text", true], ["Preferred role", "select", true, ["Front Line", "Damage", "Support", "Flank"]]], 444090],
  ["Mortal Kombat 1", "Fighting Game", [["Main fighter", "text", true], ["Experience", "select", true, ["New", "Casual", "Competitive"]], ["Preferred mode", "select", false, ["Online", "Local", "Invasions"]]], 1971870],
  ["TEKKEN 8", "Fighting Game", [["Main character", "text", true], ["Rank", "text", false], ["Preferred mode", "select", true, ["Ranked", "Quick match", "Player match"]]], 1778820],
  ["Street Fighter 6", "Fighting Game", [["Main character", "text", true], ["League / rank", "text", false], ["Preferred mode", "select", true, ["Ranked", "Casual", "Battle Hub"]]], 1364780],
  ["Guilty Gear -Strive-", "Fighting Game", [["Main character", "text", true], ["Floor / rank", "text", false], ["Preferred mode", "select", true, ["Ranked tower", "Park", "Room"]]], 1384160],
  ["A Short Hike", "Cozy Adventure", [["Favorite activity", "select", true, ["Exploration", "Fishing", "Finding feathers", "Relaxing"]], ["Playthrough", "select", true, ["First time", "Replay"]], ["Favorite spot", "text", false]], 1055540],
  ["It Takes Two", "Co-op Adventure", [["Platform", "select", true, ["PC", "PlayStation", "Xbox", "Switch"]], ["Progress", "text", false], ["Preferred role", "select", true, ["Cody", "May", "Either"]]], 1426210],
];

const existingSteamIds = {
  "Counter-Strike 2": 730,
  "Overwatch 2": 2357570,
  "Tom Clancy's Rainbow Six Siege": 359550,
  "Apex Legends": 1172470,
  "PUBG: Battlegrounds": 578080,
  "Call of Duty: Warzone": 1962663,
  "The Finals": 2073850,
  "Marvel Rivals": 2767030,
  "Dota 2": 570,
  "Smite 2": 2437170,
  "Final Fantasy XIV": 39210,
  "Guild Wars 2": 1284210,
  "The Elder Scrolls Online": 306130,
  "Destiny 2": 1085660,
  "Warframe": 230410,
  "Elden Ring": 1245620,
  "Path of Exile 2": 2694490,
  "Monster Hunter Wilds": 2246340,
  "Diablo IV": 2344520,
  "Grand Theft Auto Online": 271590,
  Rust: 252490,
  Terraria: 105600,
  "Stardew Valley": 413150,
  "Sea of Thieves": 1172620,
  Phasmophobia: 739630,
  "Dead by Daylight": 381210,
  "Rocket League": 252950,
  "Forza Horizon 5": 1551360,
  "Team Fortress 2": 440,
  "Don't Starve Together": 322330,
};

const categoryImages = {
  "Tactical FPS": "photo-1542751371-adc38448a05e",
  "Hero Shooter": "photo-1542751371-adc38448a05e",
  "Battle Royale": "photo-1511512578047-dfb367046420",
  MOBA: "photo-1542751371-adc38448a05e",
  MMORPG: "photo-1511512578047-dfb367046420",
  "Action RPG": "photo-1511512578047-dfb367046420",
  "Turn-Based RPG": "photo-1511512578047-dfb367046420",
  "Looter Shooter": "photo-1542751371-adc38448a05e",
  Sandbox: "photo-1547394765-185e1e68f34e",
  "Open World": "photo-1511512578047-dfb367046420",
  Survival: "photo-1511512578047-dfb367046420",
  "Cozy Co-op": "photo-1547394765-185e1e68f34e",
  Adventure: "photo-1511512578047-dfb367046420",
  "Horror Co-op": "photo-1511512578047-dfb367046420",
  "Horror Multiplayer": "photo-1511512578047-dfb367046420",
  Sports: "photo-1461896836934-ffe607ba8211",
  Racing: "photo-1492144534655-ae79c964c9d7",
  "Tactical RPG": "photo-1511512578047-dfb367046420",
  "Open-World RPG": "photo-1511512578047-dfb367046420",
  Roguelike: "photo-1511512578047-dfb367046420",
  Metroidvania: "photo-1511512578047-dfb367046420",
  "Precision Platformer": "photo-1511512578047-dfb367046420",
  "Run-and-Gun": "photo-1542751371-adc38448a05e",
  "Co-op Shooter": "photo-1542751371-adc38448a05e",
  "Co-op Heist": "photo-1542751371-adc38448a05e",
  "Co-op Horror": "photo-1511512578047-dfb367046420",
  "Space Exploration": "photo-1451187580459-43490279c0fa",
  "Survival Adventure": "photo-1511512578047-dfb367046420",
  "Survival Co-op": "photo-1511512578047-dfb367046420",
  "Survival Crafting": "photo-1511512578047-dfb367046420",
  "Survival Horror": "photo-1511512578047-dfb367046420",
  "Survival Simulation": "photo-1511512578047-dfb367046420",
  "4X Strategy": "photo-1509198397868-475647b2a1e5",
  "Real-Time Strategy": "photo-1509198397868-475647b2a1e5",
  "Grand Strategy": "photo-1509198397868-475647b2a1e5",
  "Automation Builder": "photo-1581091226825-a6a2a5aee158",
  "Factory Builder": "photo-1581091226825-a6a2a5aee158",
  "Colony Simulation": "photo-1581091226825-a6a2a5aee158",
  "City Builder": "photo-1480714378408-67cf0d13bc1b",
  "Driving Simulation": "photo-1492144534655-ae79c964c9d7",
  "Racing Simulation": "photo-1492144534655-ae79c964c9d7",
  "Rally Racing": "photo-1492144534655-ae79c964c9d7",
  "Formula Racing": "photo-1492144534655-ae79c964c9d7",
  "Board Game Sandbox": "photo-1606503153255-59d8b8b821f7",
  "Social Deduction": "photo-1606503153255-59d8b8b821f7",
  "Party Platformer": "photo-1547394765-185e1e68f34e",
  "Physics Co-op": "photo-1547394765-185e1e68f34e",
  "Party Brawler": "photo-1547394765-185e1e68f34e",
  "Vehicle Combat": "photo-1542751371-adc38448a05e",
  "Squad Shooter": "photo-1542751371-adc38448a05e",
  "Platform Fighter": "photo-1542751371-adc38448a05e",
  "Fighting Game": "photo-1542751371-adc38448a05e",
  "Cozy Adventure": "photo-1547394765-185e1e68f34e",
  "Co-op Adventure": "photo-1511512578047-dfb367046420",
};

const singlePlayerGames = new Set([
  "Cyberpunk 2077",
  "The Witcher 3: Wild Hunt",
  "The Elder Scrolls V: Skyrim Special Edition",
  "Fallout 4",
  "Starfield",
  "Hades",
  "Hades II",
  "Hollow Knight",
  "Hollow Knight: Silksong",
  "Celeste",
  "Dead Cells",
  "Ori and the Will of the Wisps",
  "Blasphemous 2",
  "A Short Hike",
  "Subnautica",
]);

const demoPlayerCount = 20;
const demoNicks = [
  "LunarPixel", "QuietComet", "RavenArcade", "MistyQuest", "CopperNova",
  "PixelHarbor", "EchoRunner", "VelvetFox", "CloudCircuit", "AmberQuest",
  "FrostyOrbit", "MapleGamer", "NeonBadger", "SilverMoss", "OrbitSparrow",
  "CrimsonMango", "NightLantern", "SunnyRogue", "JadeVoyager", "CosmicLynx",
];
const demoAbout = [
  "Usually online in the evenings. I enjoy a relaxed team and clear communication.",
  "Here to find friendly teammates, learn together, and have a good time.",
  "I like coordinating with the team and trying different strategies.",
  "Mostly play after school or work. Happy to join casual or ranked sessions.",
];

const demoTextValues = {
  rank: ["Silver", "Gold", "Platinum", "Diamond", "Ascendant"],
  rating: ["9200", "11800", "14600", "17100", "19800"],
  mmr: ["1200", "2400", "3800", "5200", "6800"],
  level: ["24", "38", "52", "67", "81"],
  region: ["Europe", "North America", "Europe", "Asia", "Europe"],
  server: ["Europe", "North America", "Europe", "Asia", "Europe"],
  platform: ["PC", "PlayStation", "Xbox", "PC", "Cross-platform"],
  language: ["English", "English, Latvian", "English, Russian", "Latvian", "English"],
  role: ["Flexible", "Support", "Objective-focused", "Flexible", "Team player"],
  position: ["Flexible", "Support", "Damage", "Team player", "Objective-focused"],
  mode: ["Casual co-op", "Ranked", "Team play", "Objective-focused", "Flexible"],
  activity: ["Co-op missions", "Team objectives", "Casual sessions", "Progression", "Flexible"],
  class: ["Support build", "Flexible build", "Damage build", "Team utility", "Balanced build"],
  character: ["Flexible pick", "Support main", "Team-focused", "Learning new picks", "Comfort pick"],
  hero: ["Flexible pick", "Support main", "Team-focused", "Learning new picks", "Comfort pick"],
  champion: ["Flexible pick", "Support main", "Team-focused", "Learning new picks", "Comfort pick"],
  weapon: ["Flexible loadout", "Team utility", "Comfort pick", "Learning new options", "Balanced setup"],
  map: ["Flexible", "Mirage", "Inferno", "Nuke", "Ancient"],
  build: ["Balanced build", "Support build", "Team-focused", "Flexible setup", "Learning new builds"],
  experience: ["Intermediate", "Casual", "Experienced", "Learning", "Intermediate"],
  favorite: ["Exploration", "Team play", "Co-op missions", "Casual sessions", "Progression"],
  default: ["Friendly and team-focused", "Usually available evenings", "Relaxed co-op player", "Open to learning together", "Looking for a friendly team"],
};

function getImageUrl(name, category, steamAppId) {
  const appId = steamAppId || existingSteamIds[name];
  if (appId) return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
  const photoId = categoryImages[category] || "photo-1542751371-adc38448a05e";
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=640&q=80`;
}

function sampleDemoValue(field, playerIndex, fieldIndex, options) {
  if (field.lauka_tips === fieldTypes.select) {
    return options[(playerIndex * 3 + fieldIndex) % options.length];
  }
  if (field.lauka_tips === fieldTypes.checkbox) return playerIndex % 2 ? "true" : "false";
  if (field.lauka_tips === fieldTypes.number) return String(1 + ((playerIndex * 13 + fieldIndex * 7) % 99));

  const name = field.nosaukums.toLowerCase();
  const key = Object.keys(demoTextValues)
    .filter((candidate) => candidate !== "default")
    .find((candidate) => name.includes(candidate));
  const choices = demoTextValues[key] || demoTextValues.default;
  return choices[(playerIndex + fieldIndex) % choices.length];
}

async function ensureDemoUsers(client) {
  const users = [];
  for (let index = 1; index <= demoPlayerCount; index += 1) {
    const oldNick = `DemoPlayer${String(index).padStart(2, "0")}`;
    const nick = demoNicks[index - 1];
    const avatar = `https://api.dicebear.com/9.x/adventurer/svg?seed=StraightForwardPlayer${String(index).padStart(2, "0")}`;
    const existing = await client.query(
      "SELECT id, is_demo, nick, avatar FROM lietotajs WHERE email = ?",
      [`${oldNick.toLowerCase()}@demo.invalid`],
    );
    if (existing.rows[0]) {
      if (!existing.rows[0].is_demo) throw new Error(`Reserved account email for ${oldNick} belongs to a non-demo account.`);
      let currentNick = existing.rows[0].nick;
      if (currentNick === oldNick) {
        const conflict = await client.query(
          "SELECT id FROM lietotajs WHERE LOWER(nick) = LOWER(?) AND id <> ?",
          [nick, existing.rows[0].id],
        );
        if (conflict.rows[0]) throw new Error(`Cannot rename ${oldNick}: nickname ${nick} is already in use.`);
        await client.query("UPDATE lietotajs SET nick = ? WHERE id = ?", [nick, existing.rows[0].id]);
        await client.query("UPDATE admin SET vards = ? WHERE id = ?", [nick, existing.rows[0].id]);
        currentNick = nick;
      }
      if (!existing.rows[0].avatar || existing.rows[0].avatar.includes("StraightForwardDemo")) {
        await client.query("UPDATE lietotajs SET avatar = ? WHERE id = ?", [avatar, existing.rows[0].id]);
      }
      users.push({
        id: existing.rows[0].id,
        nick: currentNick,
        avatar: !existing.rows[0].avatar || existing.rows[0].avatar.includes("StraightForwardDemo")
          ? avatar
          : existing.rows[0].avatar,
      });
      continue;
    }

    const nickConflict = await client.query(
      "SELECT id, is_demo FROM lietotajs WHERE nick = ?",
      [nick],
    );
    if (nickConflict.rows[0]) {
      if (!nickConflict.rows[0].is_demo) throw new Error(`Cannot create demo account: nickname ${nick} already belongs to a non-demo account.`);
      users.push({ id: nickConflict.rows[0].id, nick, avatar });
      continue;
    }

    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    const inserted = await client.query(
      `INSERT INTO lietotajs (email, nick, age, kontakt_informacija, password_hash, avatar, is_demo)
       VALUES (?, ?, ?, '', ?, ?, TRUE)`,
      [`${oldNick.toLowerCase()}@demo.invalid`, nick, 18 + ((index * 7) % 20), passwordHash, avatar],
    );
    users.push({ id: inserted.insertId, nick, avatar });
  }
  return users;
}

async function seedDemoProfiles(client, users, gameId) {
  const profilePlaceholders = users.map(() => "(?, ?, ?)").join(", ");
  const profileParameters = users.flatMap((user, index) => [
    demoAbout[index % demoAbout.length],
    user.id,
    gameId,
  ]);
  await client.query(
    `INSERT INTO anketa (apraksts, lietotajs_id, spele_id)
     VALUES ${profilePlaceholders}
     ON DUPLICATE KEY UPDATE
       apraksts = IF(anketa.apraksts LIKE 'DEMO PROFILE%', VALUES(apraksts), anketa.apraksts),
       ir_dzesta = FALSE`,
    profileParameters,
  );

  const { rows: profiles } = await client.query(
    `SELECT id, lietotajs_id FROM anketa
     WHERE spele_id = ? AND lietotajs_id IN (${users.map(() => "?").join(", ")})`,
    [gameId, ...users.map((user) => user.id)],
  );
  const { rows: fields } = await client.query(
    `SELECT f.id, f.nosaukums, f.lauka_tips,
            GROUP_CONCAT(v.vertiba ORDER BY v.id SEPARATOR '\\n') AS options
     FROM speles_lauks f
     LEFT JOIN speles_lauka_variants v ON v.speles_lauks_id = f.id
     WHERE f.spele_id = ?
     GROUP BY f.id, f.nosaukums, f.lauka_tips
     ORDER BY f.id`,
    [gameId],
  );

  for (const field of fields) {
    let options = field.options ? field.options.split("\n") : [];
    if (field.lauka_tips === fieldTypes.select && !options.length) {
      const fallbackOption = "Flexible";
      await client.query(
        "INSERT IGNORE INTO speles_lauka_variants (speles_lauks_id, vertiba) VALUES (?, ?)",
        [field.id, fallbackOption],
      );
      options = [fallbackOption];
    }
    const values = profiles.map((profile) => {
      const playerIndex = users.findIndex((user) => String(user.id) === String(profile.lietotajs_id));
      return [
        profile.id,
        field.id,
        sampleDemoValue(field, playerIndex, field.id, options),
      ];
    });
    if (!values.length) continue;
    await client.query(
      `INSERT INTO anketas_lauka_vertiba (anketa_id, speles_lauks_id, vertiba)
       VALUES ${values.map(() => "(?, ?, ?)").join(", ")}
       ON DUPLICATE KEY UPDATE vertiba = anketas_lauka_vertiba.vertiba`,
      values.flat(),
    );
  }
}

const fieldTypes = {
  text: "teksts",
  number: "skaitlis",
  select: "izvele",
  checkbox: "atzimes_rukis",
};

async function seed() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  await withTransaction(async (client) => {
    const { rows: admins } = await client.query("SELECT id FROM admin ORDER BY id LIMIT 1");
    if (!admins[0]) throw new Error("Create the bootstrap administrator by starting the backend before seeding games.");
    const adminId = admins[0].id;
    const demoUsers = await ensureDemoUsers(client);

    for (const [name, category, fieldSpecs, steamAppId] of games) {
      const image = getImageUrl(name, category, steamAppId);
      const isMultiplayer = !singlePlayerGames.has(name);
      await client.query(
        `INSERT INTO spele (nosaukums, attels, category, is_multiplayer, admin_id)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           attels = IF(spele.attels IS NULL OR spele.attels = '', VALUES(attels), spele.attels),
           category = VALUES(category),
           is_multiplayer = VALUES(is_multiplayer)`,
        [name, image, category, isMultiplayer, adminId],
      );
      const { rows: gameRows } = await client.query("SELECT id FROM spele WHERE nosaukums = ?", [name]);
      const gameId = gameRows[0].id;

      for (const [fieldName, type, required = false, options = []] of fieldSpecs) {
        const { rows: fieldRows } = await client.query(
          "SELECT id FROM speles_lauks WHERE spele_id = ? AND nosaukums = ?",
          [gameId, fieldName],
        );
        let fieldId = fieldRows[0]?.id;
        if (!fieldId) {
          const result = await client.query(
            "INSERT INTO speles_lauks (spele_id, nosaukums, lauka_tips, ir_obligats) VALUES (?, ?, ?, ?)",
            [gameId, fieldName, fieldTypes[type], required],
          );
          fieldId = result.insertId;
        }

        for (const option of options) {
          await client.query(
            "INSERT IGNORE INTO speles_lauka_variants (speles_lauks_id, vertiba) VALUES (?, ?)",
            [fieldId, option],
          );
        }
      }
      if (isMultiplayer) await seedDemoProfiles(client, demoUsers, gameId);
    }
  });
  console.log(`Seeded ${games.length - singlePlayerGames.size} multiplayer games, 20 labeled demo profiles per game, and marked ${singlePlayerGames.size} single-player games hidden.`);
}

try {
  await seed();
} finally {
  await closeDatabase();
}
