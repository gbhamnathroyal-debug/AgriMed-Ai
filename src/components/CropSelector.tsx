import React from 'react';
import { CropType } from '../types/index.ts';
import { Check } from 'lucide-react';

interface CropSelectorProps {
  selectedCrop: CropType;
  onSelectCrop: (crop: CropType) => void;
}

interface CropMeta {
  type: CropType;
  commonName: string;
  family: string;
  emoji: string;
  description: string;
  topDiseases: string;
  seasonNotice: string;
}

const CROPS: CropMeta[] = [
  {
    type: 'Tomato',
    commonName: 'Tomato',
    family: 'Solanaceae',
    emoji: '🍅',
    description: 'High-value fruit vegetable sensitive to early/late blights and vector-borne leaf curl.',
    topDiseases: 'Early Blight, Late Blight, Leaf Curl Virus, Bacterial Wilt',
    seasonNotice: 'Kharif / Rabi / Summer',
  },
  {
    type: 'Potato',
    commonName: 'Potato',
    family: 'Solanaceae',
    emoji: '🥔',
    description: 'Major tuber staple highly vulnerable to Phytophthora blight and soil-borne scurf.',
    topDiseases: 'Late Blight, Early Blight, Black Scurf, Common Scab',
    seasonNotice: 'Winter Rabi crop',
  },
  {
    type: 'Rice',
    commonName: 'Rice (Paddy)',
    family: 'Poaceae',
    emoji: '🌾',
    description: 'Primary grain crop exposed to panicle blast, sheath blight, and bacterial blights.',
    topDiseases: 'Blast, Sheath Blight, Bacterial Leaf Blight, Brown Spot',
    seasonNotice: 'Monsoon Kharif & Boro',
  },
  {
    type: 'Chilli',
    commonName: 'Chilli (Pepper)',
    family: 'Solanaceae',
    emoji: '🌶️',
    description: 'Commercial spice crop affected by fruit rot anthracnose, powdery mildew, and thrips/mite curl.',
    topDiseases: 'Anthracnose Die-Back, Murda Leaf Curl, Powdery Mildew',
    seasonNotice: 'Kharif / Summer',
  },
  {
    type: 'Cotton',
    commonName: 'Cotton',
    family: 'Malvaceae',
    emoji: '☁️',
    description: 'White gold fiber crop susceptible to bacterial black arm, leaf curl virus, and grey mildew.',
    topDiseases: 'Bacterial Blight (Black Arm), Leaf Curl (CLCuV), Grey Mildew',
    seasonNotice: 'Main season Kharif',
  },
];

export const CropSelector: React.FC<CropSelectorProps> = ({
  selectedCrop,
  onSelectCrop,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-emerald-200 tracking-wide flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40">
            1
          </span>
          Select Host Crop
        </label>
        <span className="text-xs text-emerald-400/70">
          5 Core Pathology Databases
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CROPS.map((crop) => {
          const isSelected = selectedCrop === crop.type;
          return (
            <button
              key={crop.type}
              type="button"
              onClick={() => onSelectCrop(crop.type)}
              className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? 'bg-gradient-to-b from-emerald-900/60 to-emerald-950/80 border-emerald-400 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-[#111a16]/60 border-emerald-900/40 hover:border-emerald-700/60 hover:bg-[#16231e]/70'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              <div className="text-3xl mb-1.5">{crop.emoji}</div>
              <span className="font-bold text-sm text-slate-100 tracking-tight">
                {crop.commonName}
              </span>
              <span className="text-[11px] font-mono text-emerald-400/80 mb-1">
                {crop.family}
              </span>

              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {crop.description}
              </p>

              <div className="mt-2.5 pt-2 border-t border-emerald-900/40 w-full flex items-center justify-between text-[10px] text-emerald-500/70 font-medium">
                <span>{crop.seasonNotice}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
