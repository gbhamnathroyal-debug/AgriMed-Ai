import React, { useState, useMemo } from 'react';
import { PlantPart, DiseaseRule } from '../types/index.ts';
import { Search, CheckSquare, Square, X } from 'lucide-react';

interface SymptomChecklistProps {
  cropDiseases: DiseaseRule[];
  selectedSymptoms: string[];
  onToggleSymptom: (symptom: string) => void;
  onClearSymptoms: () => void;
}

export const SymptomChecklist: React.FC<SymptomChecklistProps> = ({
  cropDiseases,
  selectedSymptoms,
  onToggleSymptom,
  onClearSymptoms,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPart, setSelectedPart] = useState<PlantPart | 'All'>('All');

  // Extract all unique symptoms from the current crop's diseases
  const availableSymptoms = useMemo(() => {
    const list: Array<{ symptom: string; part: PlantPart; isKey: boolean }> = [];
    const seen = new Set<string>();

    for (const d of cropDiseases) {
      for (const s of d.symptoms) {
        if (!seen.has(s.toLowerCase())) {
          seen.add(s.toLowerCase());
          // Approximate plant part category
          let part: PlantPart = 'Leaves';
          if (s.toLowerCase().includes('fruit') || s.toLowerCase().includes('pod') || s.toLowerCase().includes('boll') || s.toLowerCase().includes('panicle')) {
            part = 'Fruit/Pod';
          } else if (s.toLowerCase().includes('stem') || s.toLowerCase().includes('collar') || s.toLowerCase().includes('twig') || s.toLowerCase().includes('branch') || s.toLowerCase().includes('sheath')) {
            part = 'Stem';
          } else if (s.toLowerCase().includes('root') || s.toLowerCase().includes('tuber') || s.toLowerCase().includes('soil')) {
            part = 'Roots';
          } else if (s.toLowerCase().includes('wilt') || s.toLowerCase().includes('stunt') || s.toLowerCase().includes('collapse') || s.toLowerCase().includes('entire')) {
            part = 'Whole Plant';
          }

          const isKey = d.keyIndicators.some((k: string) => k.toLowerCase() === s.toLowerCase());
          list.push({ symptom: s, part, isKey });
        }
      }
    }
    return list;
  }, [cropDiseases]);

  // Filtered by search term and plant part
  const filteredSymptoms = useMemo(() => {
    return availableSymptoms.filter((item) => {
      const matchesSearch =
        searchTerm === '' ||
        item.symptom.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPart =
        selectedPart === 'All' || item.part === selectedPart;
      return matchesSearch && matchesPart;
    });
  }, [availableSymptoms, searchTerm, selectedPart]);

  const plantParts: Array<PlantPart | 'All'> = [
    'All',
    'Leaves',
    'Stem',
    'Fruit/Pod',
    'Roots',
    'Whole Plant',
  ];

  return (
    <div className="space-y-3">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-sm font-semibold text-emerald-200 tracking-wide flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40">
            2
          </span>
          Select Observed Symptoms & Field Signs
        </label>

        {selectedSymptoms.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30">
              {selectedSymptoms.length} symptom{selectedSymptoms.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onClearSymptoms}
              className="text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-emerald-500/60 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search symptoms (e.g., concentric rings, curling, blights, ooze, rot)..."
            className="w-full pl-9 pr-3 py-2 bg-[#0c1411] border border-emerald-900/50 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Plant Part Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-1 bg-[#0c1411] border border-emerald-900/40 rounded-xl">
          {plantParts.map((part) => (
            <button
              key={part}
              type="button"
              onClick={() => setSelectedPart(part)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                selectedPart === part
                  ? 'bg-emerald-600/80 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-emerald-300'
              }`}
            >
              {part}
            </button>
          ))}
        </div>
      </div>

      {/* Symptoms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1 border border-emerald-900/30 rounded-xl bg-[#0b120f]/60">
        {filteredSymptoms.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-slate-400">
            No symptoms matching <span className="text-emerald-400 font-mono">"{searchTerm}"</span> for this category.
          </div>
        ) : (
          filteredSymptoms.map((item) => {
            const isChecked = selectedSymptoms.includes(item.symptom);
            return (
              <button
                key={item.symptom}
                type="button"
                onClick={() => onToggleSymptom(item.symptom)}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all text-xs border ${
                  isChecked
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-100 shadow-sm shadow-emerald-900/20'
                    : 'bg-[#101915]/50 border-emerald-900/30 text-slate-300 hover:border-emerald-700/50 hover:bg-[#13201a]/70'
                }`}
              >
                <div className="mt-0.5 text-emerald-400 flex-shrink-0">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 fill-emerald-500/20 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-emerald-700" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium leading-relaxed">{item.symptom}</span>
                    {item.isKey && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                        Hallmark
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-500/70 block mt-0.5">
                    Category: {item.part}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
