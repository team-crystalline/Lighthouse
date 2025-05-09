// See you soon, ...
var undefinedUser = ['friend.', 'buddy.', "okay?", "now. Don't be a stranger."]

// (Alter) is feeling...
var moods=[
    // Positive
    {name: "Joyous", positive: true, emoji: "😄"}, // 0
    {name: "Loved", positive: true, emoji: "🤗"}, // 1
    {name: "Satisfied", positive: true, emoji: "🙂"}, // 2
    {name: "Content", positive: true, emoji: "😌"}, // 3
    {name: "Interested", positive: true, emoji: "😮"}, //4
    {name: "Amused", positive: true, emoji: "😆"}, // 5
    {name: "Happy", positive: true, emoji: "😀"}, // 6
    {name: "Serene", positive: true, emoji: "😊"}, // 7
    {name: "Awestruck", positive: true, emoji: "🤩"}, // 8
    {name: "Sleepy", positive: true, emoji: "😴"}, // 9
    {name: "Afraid", positive: false, emoji: "😨"}, // 10
    {name: "Frustrated", positive: false, emoji: "😖"}, // 11
    {name: "Overwhelmed", positive: false, emoji: "😖"}, // 12
    {name: "Dazed", positive: false, emoji: "😵"}, // 13
    {name: "Confused", positive: false, emoji: "🤨"}, // 14
    {name: "Angry", positive: false, emoji: "😡"}, // 15
    {name: "Enraged", positive: false, emoji: "🤬"}, // 16
    {name: "Disgusted", positive: false, emoji: "🤢"}, // 17
    {name: "Sad", positive: false, emoji: "🙁"}, // 18
    {name: "Lonely", positive: false, emoji: "😢"}, // 19
    {name: "Upset", positive: false, emoji: "😭"}, // 20
    {name: "Melancholy", positive: false, emoji: "😔"}, // 21
    {name: "Annoyed", positive: false, emoji: "😒"}, // 22
    {name: "Tired", positive: false, emoji: "🥱"}, // 23
    {name: "Stressed", positive: false, emoji: "😖"}, // 24
	{name: "Dissociated", positive: false, emoji: `😵`},
	{name: "Blank", positive: false, emoji: "😐"},
	{name: "Unsure", positive: false, emoji: "❓"},
	{name: "Unwell", positive: false, emoji: "😷"},
	{name: "Hurt", postive: false, emoji: "😢"},
	{name: "Affectionate", positive: true, emoji: "💖"},
	{name: "Unreal", positive: false, emoji: "😶‍🌫️"},
	{name: "Distressed", positive: false, emoji: "😫"},
	{name: "Bored", positive: false, emoji: "🥱"},
    {name: "Silly", positive: true, emoji:"🤪"}
]

var tuning={
    //           ms     s   m    h    d   w
    cookietime: 1000 * 60 * 60 * 24 * 7 * 2 //2 weeks
}

var skinGroups=["Default", "Misc. User Skins", "Galaxii Kingdom", "Constellation Collection", "Chaotic Troop", "Pax Vesania Collective", "Pride", "DivineChrysalism", "GOOPYGAMER9000", "Era vulgaris", "Unlockables", "DNA System"] 

// Group 1: Default Skins.
// Group 2: Single user skins (These users didn't make more than 2 skins)
// Group 3: Galaxii Kingdom
// Group 4: Constellation Collection
// Group 5: Chaotic Troop
// Group 6: Pax Vesania Collective
// Group 7: Pride
// Group 8: DivineChrysalism
// Group 9: GOOPYGAMER9000
// Group 10: Era Vulgaris
// Group 11: Unlockables
// Group 12: Metallic
var journals=[
	{val: '1', c: "Red", group:1, ext:"png"}, 
	{val: '2', c: "Orange", group:1, ext:"png"}, 
	{val: '3', c: "Yellow", group:1, ext:"png"}, 
	{val: '4', c: "Green", group:1, ext:"png"}, 
	{val: '5', c: "Teal", group:1, ext:"png"}, 
	{val: '6', c: "Blue", group:1, ext:"png"}, 
	{val: '7', c: "Purple", group:1, ext:"png"}, 
	{val: '8', c: "Pink", group:1, ext:"png"}, 
	{val: '9', c: "White", group:1, ext:"png"}, 
	{val: '10', c: "Black", group:1, ext:"png"}, 
	{val: '23', c:"Brown", group:1, ext:"png"},
	{val: '11', c: "Rainbow", group:1, ext:"png"}, 
	{val: '12', c: "Ocean", group:1, ext:"png"}, 
	{val: '13', c: "Space", group:1, ext:"png"}, 
	{val: '14', c: "Winter", group:1, ext:"png"}, 
	{val: '15', c: "Autumn", group:1, ext:"png"}, 
	{val: '16', c: "Spring", group:1, ext:"png"}, 
	{val: '17', c: "Summer", group:1, ext:"png"}, 
	{val: '18', c: "Flowers", group:1, ext:"png"},
	{val: '19', c: "Old Journal", group: 11, ext: "png"},	
	{val: '20', c: "Witchy", group:1, ext:"png"},
	{val: '21', c: "Spraypaint", group:1, ext:"png"},
	{val: '22', c: "Princess", group:1, ext:"png"},
	{val: '24', c: "Coniferous (🎨Quantum System)", group:2, ext:"png"},
	{val: '25', c: "Cosmos (🎨Galaxii Kingdom)", group:3, ext:"png"},
	{val: '26', c: "Lunar (🎨Galaxii Kingdom)", group:3, ext:"png"},
	{val: '27', c: "Axolotl (🎨Galaxii Kingdom)", group:3, ext:"png"},
	{val: '28', c: "Fantasy (🎨Galaxii Kingdom)", group:3, ext:"png"},
	{val: '29', c: "Fangs (CW: Teeth) (🎨Galaxii Kingdom)", group:3, ext:"png"},
	{val: '30', c: "Lighthouse (🎨Galaxii Kingdom)", group:3, ext:"png"},
	{val: '32', c: "Fiery (🎨Galaxii Kingdom)", group:3, ext:"png"},
	{val: '31', c: "Constellation (🎨Constellation Collective)", group:4, ext:"png"},
	{val: '35', c: "Sun in Shadows (🎨 Constellation Collective)", group:4, ext:"png"},
	{val: '36', c: "Tangerine (🎨 Constellation Collective)", group:4, ext:"png"},
	{val: '33', c: "Composition Notebook (🎨 Chaotic Troop)", group:5, ext:"png"},
	{val: '34', c: "Spiralbound Notebook (🎨 Chaotic Troop)", group:5, ext:"png"},
	{val: '37', c: "Neon Galaxy (🎨 Tragicomic Troupe)", group:2, ext:"png"},
	{val: '38', c: "Notebook (🎨 Pax Vesania Collective)", group:6, ext:"png"},
	{val: '39', c: "String-bound Notebook (🎨 Pax Vesania Collective)", group:6, ext:"png"},
	{val: '40', c: "Spellbook (🎨 Pax Vesania Collective)", group:6, ext:"png"},
	{val: '41', c: "Trans Pride (🎨 Redgrave System)", group:7, ext:"png"},
	{val: '42', c: "Nonbinary Pride (🎨 Redgrave System)", group:7, ext:"png"},
	{val: '43', c: "Pan Pride (🎨 Redgrave System)", group:7, ext:"png"},
	{val: '44', c: "Blossoms (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '45', c: "Vaporwave Sunset (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '46', c: "Watermelon Sweet (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '47', c: "Beholding (🎨 Calculator System)", group:2, ext:"png"},
	{val: '48', c: "Dreamy Paradise (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '49', c: "Buried (🎨 Calculator System)", group:2, ext:"png"},
	{val: '50', c: "Lavender Gift (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '51', c: "Teddybear Blanket (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '52', c: "MISSINGTEXTURE.PNG (🎨 GOOPYGAMER9000)", group:9, ext:"png"},
	{val: '53', c: "Cartman's Jornal (🎨 loserraysxd)", group:2, ext:"png"},
	{val: '54', c: "Pink Frosted Journal (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '55', c: "Journl (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '56', c: "Magic Midnight Dreams (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '57', c: "Melty Goo (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '58', c: "Lavender Boba (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '59', c: "Star Cat (🎨 GhostyStarShaker)", group:2, ext:"png"},
	{val: '60', c: "POISON GRADIENT (🎨 GOOPYGAMER9000)", group:9, ext:"png"},
	{val: '61', c: "GREEN TO BLUE (🎨 GOOPYGAMER9000)", group:9, ext:"png"},
	{val: '62', c: "A FUNKY LIL ALIEN GUY (🎨 GOOPYGAMER9000)", group:9, ext:"png"},
	{val: '63', c: "pink stars (🎨 era vulgaris)", group:2, ext:"png"},
	{val: '64', c: "lightshow (🎨 era vulgaris)", group:2, ext:"png"},
	{val: '65', c: "Retro Classic (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '66', c: "Vaporwave Nightscape (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '67', c: "Chained Spellbook (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '68', c: "aurora borealis (🎨 era vulgaris)", group:10, ext:"png"},
	{val: '69', c: "hacker (🎨 era vulgaris)", group:10, ext:"png"},
	{val: '70', c: "embers (🎨 era vulgaris)", group:10, ext:"png"},
	{val: '71', c: "Sparkly UwU (🎨📽 redactedsys)", group:2, ext:"gif"},
	{val: '72', c: "moist (🎨 Nomf)", group:2, ext:"png"},
	{val: '73', c: "Emmengards Plural Rings 1 (🎨 The Fairgrounds)", group:7, ext:"png"},
	{val: '74', c: "Emmengards Plural Rings 2 (🎨 The Fairgrounds)", group:7, ext:"png"},
	{val: '75', c: "System Pride Flag (Rings) (🎨 The Fairgrounds)", group:7, ext:"png"},
	{val: '76', c: "System Pride Flag (Plural Symbol) (🎨 The Fairgrounds)", group:7, ext:"png"},
	{val: '77', c: "Enchantment Book (🎨 The Fairgrounds)", group:2, ext:"png"},
	{val: '78', c: "Ideals (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '79', c: "Level 94 (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '80', c: "Starburst (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '81', c: "Gamebook (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '82', c: "Creature (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '83', c: "Do Not Enter (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '84', c: "Froggie (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '85', c: "Lesbian Pride (🎨 Perichoresis, sunshade collective)", group:7, ext:"png"},
	{val: '86', c: "Gay Pride (🎨 Perichoresis, sunshade collective)", group:7, ext:"png"},
	{val: '87', c: "Bi Pride (🎨 Perichoresis, sunshade collective)", group:7, ext:"png"},
	{val: '88', c: "Untitled (🎨 The Rainy Day System)", group:2, ext:"webp"},
	{val: '89', c: "Snake Journal (🎨 Snakes & Roses Sys.)", group:2, ext:"png"},
	{val: '90', c: "Rose and Thorns Journal (🎨 Snakes & Roses Sys.)", group:2, ext:"png"},
	{val: '91', c: "LGBTQ+ Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '92', c: "Polyamorous Pride 1 (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '93', c: "Grayromantic Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '94', c: "Graysexual Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '95', c: "Polyamourous Pride 2 (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '96', c: "Intersex Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '97', c: "Demiromantic Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '98', c: "Demisexual Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '99', c: "Ambiamorous Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '100', c: "Omisexual Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '101', c: "Asexual Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '102', c: "Polysexual Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '103', c: "Aromantic Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '104', c: "Aroace Pride (🎨 sunshade collective)", group:7, ext:"png"},
	{val: '105', c: "Beloved Journal (🎨 post-human-oddity)", group:2, ext:"png"},
	{val: '106', c: "Loki Green (🎨 The Sanctums)", group:2, ext:"png"},
	{val: '107', c: "Green Back (🎨 The Sanctums)", group:2, ext:"png"},
	{val: '108', c: "Loki Heart (🎨 The Sanctums)", group:2, ext:"png"},
	{val: '109', c: "Toxic Goo Journal (🎨 Chaotic Troop)", group:5, ext:"png"},
	{val: '110', c: "ENA Journal (🎨 Chaotic Troop)", group:5, ext:"png"},
	{val: '111', c: "Redskies (🎨 nexus operating system)", group:7, ext:"png"},
	{val: '112', c: "Rose Journal (🎨 Velvet Empire)", group:2, ext:"png"},
	{val: '113', c: "Minding in Blue (🎨 Velvet Empire)", group:2, ext:"png"},
	{val: '114', c: "Green Heart (🎨 The Sanctums)", group:2, ext:"png"},
	{val: '115', c: "Orange Heart (🎨 The Sanctums)", group:2, ext:"png"},
	{val: '116', c: "Smiley Journal (🎨 Nexus Operating System)", group:2, ext:"png"},
	{val: '117', c: "Hot Topic (Red) (🎨 Renkindle)", group:2, ext:"png"},
	{val: '118', c: "Hot Topic (White) (🎨 Renkindle)", group:2, ext:"png"},
	{val: '119', c: "Hot Topic (Mint) (🎨 Renkindle)", group:2, ext:"png"},
	{val: '120', c: "Hot Topic (Progress Pride) (🎨 Renkindle)", group:2, ext:"png"},
	{val: '121', c: "Vincian (🎨 dna system)", group:7, ext:"png"},
	{val: '122', c: "Lesbian (🎨 dna system)", group:7, ext:"png"},
	{val: '123', c: "Bi (🎨 dna system)", group:7, ext:"png"},
	{val: '124', c: "Pan (🎨 dna system)", group:7, ext:"png"},
	{val: '125', c: "Trans (🎨 dna system)", group:7, ext:"png"},
	{val: '126', c: "Nonbinary (🎨 dna system)", group:7, ext:"png"},
	{val: '127', c: "Asexual (🎨 dna system)", group:7, ext:"png"},
	{val: '128', c: "Aromantic (🎨 dna system)", group:7, ext:"png"},
	{val: '129', c: "Aroace (🎨 dna system)", group:7, ext:"png"},
	{val: '130', c: "Agender (🎨 dna system)", group:7, ext:"png"},
	{val: '131', c: "Genderfluid (🎨 dna system)", group:7, ext:"png"},
	{val: '132', c: "Omni (🎨 dna system)", group:7, ext:"png"},
	{val: '133', c: "Gold (🎨 dna system)", group:12, ext:"png"},
	{val: '134', c: "Silver (🎨 dna system)", group:12, ext:"png"},
	{val: '135', c: "Obsidian (🎨 dna system)", group:12, ext:"png"},
	{val: '136', c: "Morganite (🎨 dna system)", group:12, ext:"png"},
	{val: '137', c: "Amethyst (🎨 dna system)", group:12, ext:"png"},
	{val: '138', c: "Ruby (🎨 dna system)", group:12, ext:"png"},
	{val: '139', c: "Black Opal (🎨 dna system)", group:12, ext:"png"},
	{val: '140', c: "Sapphire (🎨 dna system)", group:12, ext:"png"},
	{val: '141', c: "Emerald (🎨 dna system)", group:12, ext:"png"},
	{val: '142', c: "Demigirl (🎨 dna system)", group:7, ext:"png"},
	{val: '143', c: "Demiboy (🎨 dna system)", group:7, ext:"png"},
	{val: '144', c: "Deminonbinary (🎨 dna system)", group:7, ext:"png"},
	{val: '145', c: "Transmasc (🎨 dna system)", group:7, ext:"png"},
	{val: '146', c: "Transfem (🎨 dna system)", group:7, ext:"png"},
	{val: '147', c: "Transneutral (🎨 dna system)", group:7, ext:"png"},
	{val: '148', c: "Transandrogynous (🎨 dna system)", group:7, ext:"png"},
	{val: '149', c: "Transfemmasc (🎨 dna system)", group:7, ext:"png"},
	{val: '150', c: "Transxenine (🎨 dna system)", group:7, ext:"png"},
	{val: '151', c: "Plural Peafowl (🎨 Ceefax)", group:7, ext:"png"},
	{val: '152', c: "Overgrown (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '153', c: "Modern Bubble Pop (🎨 DivineChrysalism)", group:8, ext:"png"},
	{val: '154', c: "Purple Eclipse (🎨 Solar Union)", group:2, ext:"png"},
	{val: '155', c: "Sculked (🎨 Solar Union)", group:2, ext:"png"},
	{val: '156', c: "Skaia (🎨 Solar Union)", group:2, ext:"png"},
	{val: '157', c: "Boygirl (🎨 Redgrave System)", group:7, ext:"png"},
	{val: '158', c: "Paint Spill, Blue (🎨 neoteric wilds)", group:2, ext:"png"},
	{val: '159', c: "Paint Spill, Red (🎨 neoteric wilds)", group:2, ext:"png"},
	{val: '160', c: "Paint Spill, Yellow (🎨 neoteric wilds)", group:2, ext:"png"},
	{val: '161', c: "Paint Spill, Green (🎨 neoteric wilds)", group:2, ext:"png"},
	{val: '162', c: "Icing and Sprinkles (🎨 neoteric wilds)", group:2, ext:"png"},
	{val: '163', c: "In da Jungle (🎨 The Saturniid System)", group:2, ext:"png"},
	{val: '164', c: "A Sunny Day (🎨 The Ethereal System)", group:2, ext:"png"},
	{val: '165', c: "Symbolless Plural Peafowl Flag (🎨 The Circuit Cozy System)", group:7, ext:"png"},
	{val: '166', c: "Plural Peafowl Flag with Ampersand (🎨 The Circuit Cozy System)", group:7, ext:"png"},
	{val: '167', c: "Plural Peafowl Flag with Peafowl (🎨 The Circuit Cozy System)", group:7, ext:"png"},
]

var editorColours=[
	{color: 'red',label: 'Red'},
	{color: '#ff691f',label: 'Orange'},
	{ color: '#ffc20a',label: 'Yellow'},
	{color: 'green',label: 'Green'},
	{color: 'teal',label: 'Teal'},
	{color: 'blue',label: 'Blue'},
	{color: 'purple',label: 'Purple'},
	{color: '#ff0f83',label: 'Pink'},
	{color:'#663c28', label: 'Brown'}, 
	{color: 'lightgray', label: 'Silver'}, 
	{color: 'gray', label: 'Stone'}, 
	{color: 'black', label: 'Black'}, 
	{color: 'white', label: "White"}
]

const options = {
	weekday: 'short',
	year: 'numeric',
	month: 'short',
	day: 'numeric',
  };
  const timeOptions={
	hour: '2-digit', 
	minute:'2-digit'
  }

  const alterTypes=["Apparently Normal Part", "Emotional/Traumatised Part", "Younger Part", "Older Part",  "Introject (Factual)", "Introject (Fictional)", "Non-human", "Robot", "Animal", "Fragment", "Introject (Mixed)"]
  const dayNames= ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames=["January","February","March","April","May","June","July",
"August","September","October","November","December"];

module.exports={
	tuning,
	journals,
	moods,
	editorColours,
	options,
	timeOptions,
	skinGroups,
	alterTypes,
	dayNames,
	monthNames
}

console.log("➬ General Vars loaded.")