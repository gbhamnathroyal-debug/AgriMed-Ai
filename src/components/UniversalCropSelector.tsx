import React, { useState, useEffect } from 'react';
import { CropCategory, CropPreset } from '../types/index.ts';
import { Search, Sprout, Check } from 'lucide-react';

interface UniversalCropSelectorProps {
  selectedCrop: string;
  selectedCategory: CropCategory;
  onSelectCrop: (cropName: string, category: CropCategory) => void;
}

const POPULAR_PRESETS: CropPreset[] = [
  // Grains
  { name: 'Wheat', category: 'Grains & Cereals', emoji: '🌾', scientificName: 'Triticum aestivum', commonProblems: ['Yellow / Stripe Rust', 'Leaf Blight', 'Loose Smut'] },
  { name: 'Rice (Paddy)', category: 'Grains & Cereals', emoji: '🍚', scientificName: 'Oryza sativa', commonProblems: ['Blast', 'Sheath Blight', 'Bacterial Blight'] },
  { name: 'Corn / Maize', category: 'Grains & Cereals', emoji: '🌽', scientificName: 'Zea mays', commonProblems: ['Fall Armyworm', 'Maydis Blight', 'Common Rust'] },
  { name: 'Barley', category: 'Grains & Cereals', emoji: '🌾', scientificName: 'Hordeum vulgare', commonProblems: ['Net Blotch', 'Powdery Mildew', 'Covered Smut'] },

  // Vegetables
  { name: 'Tomato', category: 'Vegetables', emoji: '🍅', scientificName: 'Solanum lycopersicum', commonProblems: ['Early Blight', 'Late Blight', 'Leaf Curl Virus', 'Blossom End Rot'] },
  { name: 'Potato', category: 'Vegetables', emoji: '🥔', scientificName: 'Solanum tuberosum', commonProblems: ['Late Blight', 'Black Scurf', 'Common Scab'] },
  { name: 'Chilli / Pepper', category: 'Vegetables', emoji: '🌶️', scientificName: 'Capsicum annuum', commonProblems: ['Anthracnose Fruit Rot', 'Murda Leaf Curl', 'Powdery Mildew'] },
  { name: 'Onion / Garlic', category: 'Vegetables', emoji: '🧅', scientificName: 'Allium cepa', commonProblems: ['Purple Blotch', 'Stemphylium Blight', 'Thrips'] },
  { name: 'Brinjal / Eggplant', category: 'Vegetables', emoji: '🍆', scientificName: 'Solanum melongena', commonProblems: ['Shoot & Fruit Borer', 'Phomopsis Blight', 'Little Leaf'] },
  { name: 'Cabbage & Cauliflower', category: 'Vegetables', emoji: '🥦', scientificName: 'Brassica oleracea', commonProblems: ['Diamondback Moth', 'Black Rot', 'Clubroot'] },
  { name: 'Okra / Ladyfinger', category: 'Vegetables', emoji: '🥬', scientificName: 'Abelmoschus esculentus', commonProblems: ['Yellow Vein Mosaic Virus', 'Powdery Mildew'] },

  // Fruits
  { name: 'Mango', category: 'Fruits', emoji: '🥭', scientificName: 'Mangifera indica', commonProblems: ['Anthracnose', 'Powdery Mildew', 'Die-Back'] },
  { name: 'Banana', category: 'Fruits', emoji: '🍌', scientificName: 'Musa acuminata', commonProblems: ['Sigatoka Leaf Spot', 'Panama Wilt (TR4)'] },
  { name: 'Apple', category: 'Fruits', emoji: '🍎', scientificName: 'Malus domestica', commonProblems: ['Apple Scab', 'Powdery Mildew', 'Fire Blight'] },
  { name: 'Citrus / Orange', category: 'Fruits', emoji: '🍊', scientificName: 'Citrus sinensis', commonProblems: ['Citrus Canker', 'Greening (HLB)', 'Gummosis'] },
  { name: 'Grape', category: 'Fruits', emoji: '🍇', scientificName: 'Vitis vinifera', commonProblems: ['Downy Mildew', 'Powdery Mildew', 'Black Rot'] },
  { name: 'Papaya', category: 'Fruits', emoji: '🍈', scientificName: 'Carica papaya', commonProblems: ['Papaya Ring Spot Virus', 'Anthracnose'] },

  // Cash Crops
  { name: 'Cotton', category: 'Cash Crops', emoji: '☁️', scientificName: 'Gossypium hirsutum', commonProblems: ['Bacterial Blight', 'Leaf Curl Virus', 'Pink Bollworm'] },
  { name: 'Sugarcane', category: 'Cash Crops', emoji: '🎋', scientificName: 'Saccharum officinarum', commonProblems: ['Red Rot', 'Smut', 'Early Shoot Borer'] },
  { name: 'Tobacco', category: 'Cash Crops', emoji: '🍂', scientificName: 'Nicotiana tabacum', commonProblems: ['Mosaic Virus', 'Black Shank', 'Frogeye Leaf Spot'] },

  // Pulses
  { name: 'Soybean', category: 'Pulses & Legumes', emoji: '🌱', scientificName: 'Glycine max', commonProblems: ['Rust', 'Yellow Mosaic Virus', 'Charcoal Rot'] },
  { name: 'Chickpea / Gram', category: 'Pulses & Legumes', emoji: '🫘', scientificName: 'Cicer arietinum', commonProblems: ['Fusarium Wilt', 'Ascochyta Blight', 'Pod Borer'] },
  { name: 'Groundnut / Peanut', category: 'Pulses & Legumes', emoji: '🥜', scientificName: 'Arachis hypogaea', commonProblems: ['Tikka Leaf Spot', 'Rust', 'Collar Rot'] },

  // Spices & Plantation
  { name: 'Coffee', category: 'Spices & Plantation', emoji: '☕', scientificName: 'Coffea arabica', commonProblems: ['Coffee Leaf Rust', 'Berry Borer', 'Black Rot'] },
  { name: 'Tea', category: 'Spices & Plantation', emoji: '🍵', scientificName: 'Camellia sinensis', commonProblems: ['Blister Blight', 'Red Rust', 'Tea Mosquito Bug'] },
  { name: 'Black Pepper', category: 'Spices & Plantation', emoji: '🌿', scientificName: 'Piper nigrum', commonProblems: ['Quick Wilt (Phytophthora)', 'Pollu Beetle'] },
  { name: 'Ginger & Turmeric', category: 'Spices & Plantation', emoji: '🫚', scientificName: 'Zingiber officinale', commonProblems: ['Rhizome Rot', 'Leaf Spot', 'Shoot Borer'] },
];

export const UniversalCropSelector: React.FC<UniversalCropSelectorProps> = ({
  selectedCrop,
  selectedCategory,
  onSelectCrop,
}) => {
  const [customInput, setCustomInput] = useState<string>(selectedCrop);
  const [isUserTyping, setIsUserTyping] = useState<boolean>(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');

  useEffect(() => {
    setCustomInput(selectedCrop);
    setIsUserTyping(false);
  }, [selectedCrop]);

  const categories: Array<CropCategory | 'All'> = [
    'All',
    'Grains & Cereals',
    'Vegetables',
    'Fruits',
    'Cash Crops',
    'Pulses & Legumes',
    'Spices & Plantation',
  ];

  const searchTerm = isUserTyping ? customInput.trim().toLowerCase() : '';
  const filteredPresets = POPULAR_PRESETS.filter((p) => {
    const matchesCat = activeCategoryFilter === 'All' || p.category === activeCategoryFilter;
    const matchesSearch =
      searchTerm === '' ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.category.toLowerCase().includes(searchTerm) ||
      p.scientificName.toLowerCase().includes(searchTerm);
    return matchesCat && matchesSearch;
  });

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      setIsUserTyping(false);
      onSelectCrop(customInput.trim(), selectedCategory);
    }
  };

  return (
    <div className="space-y-4">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <label className="text-base sm:text-lg font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
          <span>1. Which crop are you growing?</span>
        </label>
        <span className="text-xs text-[#57534E]">
          Search any crop worldwide or pick below
        </span>
      </div>

      {/* FREE-FORM CROP INPUT BAR */}
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              setIsUserTyping(true);
            }}
            placeholder="Type any crop (e.g. Wheat, Rice, Tomato, Chilli, Cotton, Mango, Coffee)..."
            className="w-full pl-10 pr-4 py-3 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl text-sm text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:bg-white focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
          />
        </div>

        <button
          type="submit"
          className="px-5 py-3 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white font-bold text-sm shadow-xs transition-all whitespace-nowrap active:scale-95 cursor-pointer"
        >
          Select Crop
        </button>
      </form>

      {/* Selected Crop Indicator Banner */}
      <div className="p-3.5 rounded-xl bg-[#F5F2EB] border border-[#E5DFD3] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-[#166534] text-white shrink-0">
            <Sprout className="w-4 h-4 text-white" />
          </span>
          <span className="text-xs sm:text-sm text-[#57534E]">
            Active Crop: <strong className="text-[#1C1917] font-bold text-sm sm:text-base ml-1">{selectedCrop}</strong>
          </span>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA] font-semibold w-fit">
          {selectedCategory}
        </span>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-[#F5F2EB] border border-[#E5DFD3] rounded-xl scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeCategoryFilter === cat
                ? 'bg-[#166534] hover:bg-[#14532D] text-white shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* PRESETS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto p-1">
        {filteredPresets.map((preset) => {
          const isSelected = selectedCrop.toLowerCase() === preset.name.toLowerCase();
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                setCustomInput(preset.name);
                setIsUserTyping(false);
                onSelectCrop(preset.name, preset.category);
              }}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-[#166534] hover:bg-[#14532D] border-[#166534] text-white shadow-[0_4px_16px_rgba(28,25,23,0.08)]'
                  : 'bg-white border-[#E5DFD3] hover:border-[#166534]/50 hover:bg-[#F5F2EB]/60 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{preset.emoji}</span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-white text-[#166534] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div className={`font-bold text-xs sm:text-sm truncate ${isSelected ? 'text-white' : 'text-[#1C1917]'}`}>{preset.name}</div>
                <div className={`text-[10px] font-mono truncate ${isSelected ? 'text-white/80' : 'text-[#57534E]'}`}>{preset.scientificName}</div>
              </div>
              <span className={`text-[10px] mt-2 block truncate ${isSelected ? 'text-white/75' : 'text-[#78716C]'}`}>
                {preset.category}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
