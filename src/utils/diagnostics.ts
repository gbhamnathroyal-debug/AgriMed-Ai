import { CropType, DiseaseRule } from '../types/index.ts';

export interface DiagnosticMatch {
  disease: DiseaseRule;
  confidenceScore: number;
  matchedSymptoms: string[];
  totalDiseaseSymptoms: number;
  hasKeyIndicatorMatch: boolean;
}

/**
 * Diagnostic match scoring algorithm
 * Scores disease candidates based on matched symptoms and weighted key indicators
 */
export function diagnoseCropSymptoms(
  selectedCrop: CropType,
  selectedSymptoms: string[],
  availableDiseases: DiseaseRule[]
): DiagnosticMatch[] {
  if (!selectedSymptoms || selectedSymptoms.length === 0) {
    return [];
  }

  const cropDiseases = availableDiseases.filter(
    (d) => d.crop.toLowerCase() === selectedCrop.toLowerCase()
  );

  const normalizedSelected = selectedSymptoms.map((s) => s.trim().toLowerCase());

  const matches: DiagnosticMatch[] = [];

  for (const disease of cropDiseases) {
    const matchedSymptoms: string[] = [];
    let keyIndicatorMatched = false;

    // Check each disease symptom
    for (const dSymptom of disease.symptoms) {
      const normD = dSymptom.toLowerCase();
      // Exact match or substring overlap
      const hasMatch = normalizedSelected.some(
        (sel) => normD.includes(sel) || sel.includes(normD)
      );
      if (hasMatch) {
        matchedSymptoms.push(dSymptom);
      }
    }

    // Check key indicators (hallmark features)
    for (const indicator of disease.keyIndicators) {
      const normInd = indicator.toLowerCase();
      const hasMatch = normalizedSelected.some(
        (sel) => normInd.includes(sel) || sel.includes(normInd)
      );
      if (hasMatch) {
        keyIndicatorMatched = true;
      }
    }

    if (matchedSymptoms.length > 0 || keyIndicatorMatched) {
      // Calculate score
      const symptomOverlapRatio = matchedSymptoms.length / Math.max(disease.symptoms.length, 1);
      const userSelectedRatio = matchedSymptoms.length / Math.max(selectedSymptoms.length, 1);
      
      // Base score combination (harmonic-like)
      let score = (symptomOverlapRatio * 0.5 + userSelectedRatio * 0.5) * 100;
      
      // Boost for key hallmark indicators
      if (keyIndicatorMatched) {
        score = Math.min(99, score + 20);
      }

      // If user selected 2+ symptoms and all matched, high confidence
      if (matchedSymptoms.length >= 2 && matchedSymptoms.length === selectedSymptoms.length) {
        score = Math.max(88, score);
      }

      const finalScore = Math.min(100, Math.max(15, Math.round(score)));

      matches.push({
        disease,
        confidenceScore: finalScore,
        matchedSymptoms,
        totalDiseaseSymptoms: disease.symptoms.length,
        hasKeyIndicatorMatch: keyIndicatorMatched,
      });
    }
  }

  // Sort descending by confidence score
  return matches.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
