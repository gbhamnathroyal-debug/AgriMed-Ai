// Botanically Accurate, Crop-Specific Symptom Dictionary (ICAR / FAO / TNAU Aligned)

export interface CropSymptomMap {
  [cropKey: string]: string[];
}

export const CROP_SYMPTOMS_DICTIONARY: CropSymptomMap = {
  wheat: [
    'Orange or reddish-brown pustules on leaves and stems (Rust)',
    'Black powdery soot replacing grain earheads (Loose Smut)',
    'Yellowish stripe lesions running parallel along leaf veins (Yellow Rust)',
    'White powdery fungal patches on upper leaf blades (Powdery Mildew)',
    'Stunted yellowing plants with root rot',
  ],
  rice: [
    "Drying of central shoot ('Dead Heart') or white empty panicles ('White Ear')",
    'Diamond/spindle-shaped lesions with gray centers and brown margins (Blast)',
    'Water-soaked yellowish bacterial stripes starting from leaf tips (Bacterial Leaf Blight)',
    'Circular brown spots on coleoptile and leaves (Brown Spot)',
    "Circular patches of dried, brownish plants at base ('Hopper Burn')",
  ],
  paddy: [
    "Drying of central shoot ('Dead Heart') or white empty panicles ('White Ear')",
    'Diamond/spindle-shaped lesions with gray centers and brown margins (Blast)',
    'Water-soaked yellowish bacterial stripes starting from leaf tips (Bacterial Leaf Blight)',
    'Circular brown spots on coleoptile and leaves (Brown Spot)',
    "Circular patches of dried, brownish plants at base ('Hopper Burn')",
  ],
  tomato: [
    'Dark brown concentric target-board rings on older leaves (Early Blight)',
    'Water-soaked dark greasy patches on leaves and stems (Late Blight)',
    'Upward leaf curling with yellowing and stunted bushy growth (Leaf Curl Virus)',
    'Dark sunken leathery rot at the bottom blossom end of fruit (Blossom End Rot)',
    'Sudden daytime wilting of green foliage without yellowing (Bacterial Wilt)',
  ],
  potato: [
    'Water-soaked black lesions on leaf tips with white mildew underneath (Late Blight)',
    'Raised corky scab lesions on tuber surface (Common Scab)',
    'Dark brown concentric rings on lower leaves (Early Blight)',
    'Upward rolling of leaflets with purplish undersides (Potato Leafroll)',
    'Black sunken stem cankers and dark crust on tubers (Black Scurf)',
  ],
  cotton: [
    'Upward/downward leaf curling with sticky honeydew and sooty mold (Whitefly / Leaf Curl)',
    'Small angular water-soaked spots turning black on leaves and bolls (Bacterial Blight)',
    'Pink larvae boring inside flower buds (rosetted blooms) and bolls (Pink Bollworm)',
    'Sudden yellowing and bronzing of leaves (Para Wilt / Nutrient Deficiency)',
    'Marginal leaf reddening on lower canopy followed by boll shedding',
  ],
  chilli: [
    'Downward boat-shaped leaf curling with brittle stems (Mite / Murda Complex)',
    'Upward leaf curling and crinkling with silvery scars (Thrips)',
    'Sunken dark anthracnose lesions with concentric rings on ripe fruits (Fruit Rot / Dieback)',
    'Yellowing and shedding of flower buds and young fruits',
    'Collar rot and drooping of seedlings near soil line (Damping Off)',
  ],
  mango: [
    'Black sunken spots on leaves, flower panicles, and ripening fruits (Anthracnose)',
    'White powdery coating on flower panicles causing flower drop (Powdery Mildew)',
    'Sticky honeydew on leaves with black sooty mold (Mango Hopper)',
    'Compact bunchy malformation of floral shoots (Mango Malformation)',
    'Dark brown corky cracking and internal necrosis on developing fruits (Black Tip)',
  ],
  sugarcane: [
    'Reddish internal stalk tissue with white cross-bands and sour alcoholic odor (Red Rot)',
    'Black whip-like soot structure emerging from central spindle (Whip Smut)',
    'Yellowing and drying of outer leaves with grassy shoots at base (Grassy Shoot)',
    'Boreholes at internodes with frass and dead-heart in young shoots (Early Shoot Borer)',
    'Rust-colored narrow streaks on leaf blades turning dark brown',
  ],
  onion: [
    'Sunken purplish-brown spindle lesions with yellow halo on leaves (Purple Blotch)',
    'Tip dieback and silvery-white blotches with tiny insects in leaf axils (Thrips)',
    'Yellowing and wilting of leaves with soft rotting at bulb base (Basal Rot)',
    'Pale-green oval spots with violet downy mold in cool humid mornings (Downy Mildew)',
    'Concentric dark rings on yellowing leaf tips (Stemphylium Blight)',
  ],
  banana: [
    'Yellowing of older leaf margins progressing inward and petiole buckling (Panama Wilt)',
    'Tiny dark streaks expanding into reddish-brown necrotic patches on leaves (Sigatoka)',
    'Dark green streaks along leaf veins and bunched upright leaves at crown (Bunchy Top Virus)',
    'Black sunken circular lesions on ripening fruit skin (Anthracnose)',
    'Dark brown tunnel damage inside corm with toppling plants (Corm Weevil)',
  ],
  coffee: [
    'Orange-yellow powdery rust spots on undersides of leaves (Coffee Leaf Rust / Roya)',
    'Dark brown sunken lesions with pink spore masses on green berries (Berry Disease)',
    'Circular brown eye-spot lesions with light gray center on foliage (Cercospora)',
    'White cottony masses on berry clusters and tender roots (Mealybug)',
    'Wilting of branches with shot-holes bored into main stem (White Stem Borer)',
  ],
  soybean: [
    'Yellow mosaic mottling and blistering of young trifoliate leaves (Yellow Mosaic Virus)',
    'Small reddish-brown rust pustules on lower leaf surfaces (Soybean Rust)',
    'Large brown papery patches with white fungal strands webbing leaves (Aerial Blight)',
    'Girdling of stem with charcoal-gray discoloration and black microsclerotia (Charcoal Rot)',
    'Defoliation with green semi-looper caterpillars feeding on pods and leaves',
  ],
  turmeric: [
    'Long oval brown spots with bright yellow halos coalescing across leaves (Leaf Blotch)',
    'Water-soaked rotting at collar region and soft decaying rhizomes (Rhizome Rot)',
    'Concentric papery brown necrotic spots with black fruiting bodies (Leaf Spot)',
    'Yellowing of central shoot and bore holes with frass in pseudostem (Shoot Borer)',
    'White crusty scale insects colonizing underground rhizomes in storage',
  ],
  maize: [
    'Ragged window-pane leaf feeding and sawdust-like frass in whorl (Fall Armyworm)',
    'Long cigar-shaped gray-green lesions on lower leaves (Turcicum Leaf Blight)',
    'Pale yellow stripes along leaf veins with white downy growth underneath (Downy Mildew)',
    'Soft rotting of stalk internodes with foul smell and lodging (Bacterial Stalk Rot)',
    'Sunken dark powdery galls on tassels, ears, or stalks (Common Smut)',
  ],
  corn: [
    'Ragged window-pane leaf feeding and sawdust-like frass in whorl (Fall Armyworm)',
    'Long cigar-shaped gray-green lesions on lower leaves (Turcicum Leaf Blight)',
    'Pale yellow stripes along leaf veins with white downy growth underneath (Downy Mildew)',
    'Soft rotting of stalk internodes with foul smell and lodging (Bacterial Stalk Rot)',
    'Sunken dark powdery galls on tassels, ears, or stalks (Common Smut)',
  ],
  groundnut: [
    'Dark brown circular spots surrounded by bright yellow halo on leaflets (Early Tikka Spot)',
    'Black velvety lesions on leaf undersides causing premature defoliation (Late Leaf Spot)',
    'Orange-brown rust pustules on lower leaf surface without leaf drop (Rust)',
    'Sudden wilting of branches with white fungal threads & mustard-seed sclerotia at base (Stem Rot)',
    'Stunted bushy plants with mottled crinkled young leaves (Bud Necrosis / Rosette)',
  ],
  mustard: [
    'Circular concentric brown-black target spots on leaves and siliquae (Alternaria Blight)',
    'Creamy-white raised pustules on leaves and swollen deformed staghead stems (White Rust)',
    'Dense colonies of green-gray aphids sucking sap from flower buds and pods (Mustard Aphid)',
    'White powdery fungal dust covering leaves, stems, and pods (Powdery Mildew)',
    'Soft water-soaked stem rot with white cottony mold and black sclerotia inside stem',
  ],
  chickpea: [
    'Drooping of petioles and leaflets with dark brown internal root/xylem browning (Fusarium Wilt)',
    'Circular brown spots with concentric pycnidia rings on stems and pods (Ascochyta Blight)',
    'Gray fuzzy mold covering flowers and soft rotting of pods in cool weather (Botrytis Gray Mold)',
    'Circular holes bored in pods by green-brown caterpillars (Pod Borer / Helicoverpa)',
    'Yellowing from collar upward with white cottony fungal mat at soil level (Collar Rot)',
  ],
  pigeonpea: [
    'Gradual wilting of plants with purple-black vertical band on main stem (Fusarium Wilt)',
    'Small pale-green mosaic leaves and complete absence of flowering (Sterility Mosaic Virus)',
    'Dark brown water-soaked stem lesions causing girdling and breaking (Phytophthora Blight)',
    'Bored pods with webbing and larvae feeding on developing seeds (Pod Borer)',
    'Blistered papery mines on pods and shriveled grains (Pod Fly)',
  ],
  brinjal: [
    'Drooping of terminal shoots and bored holes with frass in fruits (Shoot & Fruit Borer)',
    'Proliferation of tiny pale-green leaves giving bushy appearance (Little Leaf Phytoplasma)',
    'Sudden wilting of green plant without leaf yellowing (Bacterial Wilt)',
    'Soft dark sunken water-soaked circular rot on developing fruits (Phomopsis Blight)',
    'Yellowing and upward cupping along leaf margins with whiteflies underneath (Jassids)',
  ],
  eggplant: [
    'Drooping of terminal shoots and bored holes with frass in fruits (Shoot & Fruit Borer)',
    'Proliferation of tiny pale-green leaves giving bushy appearance (Little Leaf Phytoplasma)',
    'Sudden wilting of green plant without leaf yellowing (Bacterial Wilt)',
    'Soft dark sunken water-soaked circular rot on developing fruits (Phomopsis Blight)',
    'Yellowing and upward cupping along leaf margins with whiteflies underneath (Jassids)',
  ],
  okra: [
    'Bright yellow network of veins with thickened green leaf tissue (Yellow Vein Mosaic Virus)',
    'White powdery dust on upper and lower leaf surfaces (Powdery Mildew)',
    'Twisted or bored tender pods and withered growing shoots (Shoot & Fruit Borer)',
    'Sooty dark-green olive mold on leaf undersides causing premature leaf drop (Cercospora)',
    'Root knots/galls causing stunted yellowing growth in warm sandy soil (Root-Knot Nematode)',
  ],
  cabbage: [
    'V-shaped yellow lesions starting at leaf margins with blackened veins (Black Rot)',
    'Irregular shot-hole chewing on leaves by tiny green caterpillars (Diamondback Moth)',
    'Dark concentric spots on outer wrapper leaves (Alternaria Leaf Spot)',
    'Swollen deformed spindle-like galls on roots causing daytime wilting (Clubroot)',
    'Water-soaked rotting of head with foul bacterial odor (Soft Rot)',
  ],
  cauliflower: [
    'V-shaped yellow lesions along leaf margins with black veins (Black Rot)',
    'Brownish curd discoloration and hollow water-soaked stem (Boron Deficiency)',
    'Narrow ruffled strap-like leaves with missing central curd (Whiptail / Molybdenum Deficiency)',
    'Irregular shot-holes in leaves by tiny green larvae (Diamondback Moth)',
    'Yellow angular patches on upper leaves with purplish downy mold underneath (Downy Mildew)',
  ],
  cucumber: [
    'Angular yellow leaf spots bounded by veins with gray-purple mold underneath (Downy Mildew)',
    'White talcum-like powdery fungal coating on both leaf surfaces (Powdery Mildew)',
    'Mottled light-and-dark green blistered mosaic on young leaves (Cucumber Mosaic Virus)',
    'Small punctures on tender fruits with internal maggots and fruit rot (Fruit Fly)',
    'Gummy amber ooze on cracked stem joints near ground (Gummy Stem Blight)',
  ],
  grapes: [
    'Oily yellow translucent spots on upper leaf with white downy growth below (Downy Mildew)',
    'Ash-gray powdery coating on berries causing berry cracking (Powdery Mildew)',
    'Sunken dark bird-eye spots with purple margins on canes and berries (Anthracnose)',
    'Silvery rust-colored scarring on berry skin (Thrips)',
    'White cottony mealybug clusters inside tight grape bunches with sticky sooty mold',
  ],
  pomegranate: [
    'Water-soaked dark oily spots on leaves and raised black cracks on fruits (Bacterial Blight / Telya)',
    'Circular brown-black spots on fruits with dark sunken lesions (Cercospora Fruit Spot)',
    'Round holes on rind with caterpillar droppings inside fruit (Fruit Borer / Anar Butterfly)',
    'Sudden wilting and drying of branches with shot-holes in trunk (Wilt Complex)',
    'Dry dark internal aril browning without external damage',
  ],
  citrus: [
    'Raised corky brown scabby lesions with yellow halos on leaves and fruits (Citrus Canker)',
    'Wavy silvery serpentine tunnels inside young flush leaves (Citrus Leaf Miner)',
    'Yellow mottling across leaf halves and small lopsided bitter fruits (Citrus Greening / HLB)',
    'Gummy bark cracking and dark ooze near lower trunk base (Phytophthora Gummosis)',
    'Twig dieback starting from tips inward with black fruiting bodies',
  ],
  papaya: [
    'Water-soaked dark green streaks on petioles and oily ringspots on fruits (Papaya Ringspot Virus)',
    'Water-soaked soft rotting at stem base near soil line causing toppling (Foot Rot)',
    'White powdery fungal growth on lower leaf surfaces and petioles (Powdery Mildew)',
    'Sunken orange-pink spore rings on ripening fruit skin (Anthracnose)',
    'White cottony mealybugs clustering heavily around fruit crowns and stems',
  ],
  apple: [
    'Olive-green velvety spots turning black on leaves and scabby corky fruit (Apple Scab)',
    'White powdery coating on young shoots and flower clusters (Powdery Mildew)',
    'Brown sunken papery cankers on branches with oozing gum (European Canker)',
    'Bronzing and stippling of leaves with fine webbing (European Red Mite)',
    'Yellowing leaves with premature summer leaf fall (Marssonina Blotch)',
  ],
  tea: [
    'Translucent pale-yellow circular blisters bulging on leaf undersides (Blister Blight)',
    'Minute reddish-brown feeding punctures turning necrotic on flush leaves (Tea Mosquito Bug)',
    'Rusty-red or coppery stippling on upper surface of mature leaves (Red Spider Mite)',
    'Velvety gray-brown spots on older maintenance foliage (Gray Blight)',
    'Branch dieback with black fungal crust under bark (Red Root / Thorny Stem Blight)',
  ],
  coconut: [
    'Drooping and yellowing of lower fronds with dark gummy bleeding on trunk (Stem Bleeding)',
    'Rotting of central spindle leaf with foul odor and fallen young nuts (Bud Rot)',
    'Triangular brown corky patches and longitudinal fissures at base of young nuts (Eriophyid Mite)',
    'Notched triangular cuts on emerging frond leaflets (Rhinoceros Beetle)',
    'Yellowing fronds with ribbed, flaccid leaflets bending downward (Root Wilt)',
  ],
  ginger: [
    'Yellowing of lower leaf margins progressing upward and foul-smelling rhizome rot (Soft Rot)',
    'Sudden rolling and curling of leaves without soft rhizome odor (Bacterial Wilt)',
    'Spindle-shaped water-soaked white-centered spots on leaves (Leaf Spot)',
    'Dead-heart in central shoot with tiny bore holes on pseudostem (Shoot Borer)',
    'Pale stunted foliage with swollen knots on feeder roots (Root-Knot Nematode)',
  ],
  garlic: [
    'Purplish-brown elliptical lesions with yellow margins on leaves (Purple Blotch)',
    'Yellowing and drying of leaf tips with tiny pale insects inside leaf sheath (Thrips)',
    'White fluffy mold around bulb base with tiny black sclerotia (White Rot)',
    'Pale sunken dry spots on outer cloves during field maturity or storage',
    'Vertical orange-yellow rust pustules along leaf blades (Garlic Rust)',
  ],
  pepper: [
    'Yellowing and dropping of leaves with blackened rotting collar and vines (Quick Wilt / Foot Rot)',
    'Slow yellowing decline of vines with root galls and necrosis (Slow Wilt)',
    'Dark sunken spots with yellow halo on leaves and blackening of spikes (Anthracnose / Pollu)',
    'Hollow blackened berries caused by tiny grub feeding inside (Pollu Beetle)',
    'Mottled crinkled narrow leaves on young flush shoots',
  ],
  cardamom: [
    'Water-soaked rotting of capsules and panicles emitting foul smell during monsoon (Azhukal Capsule Rot)',
    'Pale yellow streaks along leaf veins turning mosaic and stunted clumps (Katte Mosaic Virus)',
    'Corky brown scabby streaks on capsule skin reducing grade (Cardamom Thrips)',
    'Yellowing and drying of central leaf sheath with bore holes (Shoot & Capsule Borer)',
    'Clump rot and wilting of pseudostems near soil line',
  ],
  lentil: [
    'Sudden drooping of upper leaflets and root browning inside main taproot (Fusarium Wilt)',
    'Pinkish-orange pustules on lower leaves and stems in cool damp weather (Lentil Rust)',
    'Circular tan spots with dark fruiting bodies on leaves and pods (Ascochyta Blight)',
    'Collar rotting with white mycelial threads at soil line (Collar Rot)',
    'Wilting and yellowing patches caused by black aphids clustering on growing tips',
  ],
  sorghum: [
    'Sawdust-like frass and dead-heart in young whorl (Shoot Fly / Stem Borer)',
    'Elongated reddish-brown spots turning straw-colored with purple margins (Anthracnose)',
    'Pinkish-white sugary sticky honeydew dripping from spikelets (Sugary / Ergot Disease)',
    'Grain earheads replaced by elongated dark soot sacs (Grain Smut)',
    'Narrow yellow stripes turning necrotic with white downy mold below (Downy Mildew)',
  ],
  pearl_millet: [
    'Pale yellow leaves with white downy fungal growth underneath and leafy green earheads (Downy Mildew / Green Ear)',
    'Honeydew droplets oozing from florets turning into dark black ergot bodies (Ergot)',
    'Swollen bright green smut sori replacing individual grains on earhead (Smut)',
    'Small orange-brown rust pustules on upper leaf surfaces',
    'Wilted seedlings cut off at soil level',
  ],
  sunflower: [
    'Dark brown concentric target-board spots on lower leaves and heads (Alternaria Blight)',
    'Yellowing along veins with white cottony downy growth on leaf undersides (Downy Mildew)',
    'Chlorotic upward cupping of young leaves with stunted head (Sunflower Necrosis Virus)',
    'Dark brown-black stem lesions causing premature lodging (Charcoal Rot)',
    'Head rot with white mold and large black sclerotia inside flower disc',
  ],
  sesame: [
    'Floral parts transformed into leafy green structures without seed pods (Phyllody)',
    'Dark brown irregular angular spots on leaves and capsules (Alternaria / Cercospora)',
    'Blackening of stem near soil line with premature drying and wilting (Macrophomina Stem Rot)',
    'Rolled webbed top leaves with caterpillars feeding inside flowers and capsules (Leaf Webber)',
    'White powdery patches covering upper leaf surfaces',
  ],
  watermelon: [
    'Yellow angular spots on upper leaves with purplish downy mold underneath (Downy Mildew)',
    'White talcum-like powdery fungal dust on leaves and stems (Powdery Mildew)',
    'Sudden daytime wilting of individual vines with brown vascular streaks (Fusarium Wilt)',
    'Dark sunken water-soaked lesions on rind and stems (Anthracnose)',
    'Tiny dark punctures on tender fruits oozing clear gum (Fruit Fly)',
  ],
  strawberry: [
    'Fuzzy gray mold covering ripening berries and flower blossoms (Botrytis Gray Mold)',
    'Purple-red spots with white centers on older leaves (Common Leaf Spot)',
    'Upward curling of leaf edges with white powdery fungal coating below (Powdery Mildew)',
    'Sudden collapse and wilting of crown with reddish-brown core rot (Anthracnose Crown Rot)',
    'Bronzing and fine webbing under leaves with distorted small fruits (Two-Spotted Spider Mite)',
  ],
};

// Alias normalization map
const CROP_ALIASES: Record<string, string> = {
  'rice (paddy)': 'rice',
  'paddy (rice)': 'rice',
  'basmati rice': 'rice',
  'corn / maize': 'maize',
  'sweet corn': 'maize',
  'red chilli': 'chilli',
  'chili': 'chilli',
  'pepper (chilli)': 'chilli',
  'black pepper': 'pepper',
  'bell pepper': 'chilli',
  'capsicum': 'chilli',
  'bhindi': 'okra',
  'ladyfinger': 'okra',
  'bajra': 'pearl_millet',
  'pearl millet': 'pearl_millet',
  'jowar': 'sorghum',
  'gram': 'chickpea',
  'bengal gram': 'chickpea',
  'chana': 'chickpea',
  'tur': 'pigeonpea',
  'arhar': 'pigeonpea',
  'red gram': 'pigeonpea',
  'peanut': 'groundnut',
  'rapeseed': 'mustard',
  'sarson': 'mustard',
  'aubergine': 'brinjal',
  'masoor': 'lentil',
  'til': 'sesame',
};

export function getKnownCropSymptoms(cropName: string): string[] | null {
  if (!cropName || !cropName.trim()) return null;
  const cleaned = cropName.trim().toLowerCase();

  // Direct match
  if (CROP_SYMPTOMS_DICTIONARY[cleaned]) {
    return CROP_SYMPTOMS_DICTIONARY[cleaned];
  }

  // Alias match
  if (CROP_ALIASES[cleaned] && CROP_SYMPTOMS_DICTIONARY[CROP_ALIASES[cleaned]]) {
    return CROP_SYMPTOMS_DICTIONARY[CROP_ALIASES[cleaned]];
  }

  // Partial word match (e.g., "Winter Wheat" -> "wheat", "Alphonso Mango" -> "mango")
  for (const key of Object.keys(CROP_SYMPTOMS_DICTIONARY)) {
    const normalizedKey = key.replace('_', ' ');
    if (cleaned.includes(normalizedKey) || normalizedKey.includes(cleaned)) {
      return CROP_SYMPTOMS_DICTIONARY[key];
    }
  }

  for (const [alias, targetKey] of Object.entries(CROP_ALIASES)) {
    if (cleaned.includes(alias) && CROP_SYMPTOMS_DICTIONARY[targetKey]) {
      return CROP_SYMPTOMS_DICTIONARY[targetKey];
    }
  }

  return null;
}

export function getFallbackCropSymptoms(cropName: string): string[] {
  const displayCrop = cropName.trim() || 'Crop';
  return [
    `Concentric dark brown necrotic leaf spots or blight lesions on ${displayCrop} foliage`,
    `White powdery fungal patches or downy mildew coating on ${displayCrop} leaves`,
    `Water-soaked bacterial streaks or collar/stem rot on ${displayCrop} stems`,
    `Leaf curling, yellowing mosaic mottling, or stunting on ${displayCrop} shoots`,
    `Chewing/boring pest damage or sunken rot on ${displayCrop} fruits, pods, or roots`,
  ];
}
