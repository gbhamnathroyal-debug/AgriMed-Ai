import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { getKnownCropSymptoms, getFallbackCropSymptoms } from '../src/utils/cropSymptoms.ts';
import { getLanguageOption } from '../src/utils/i18n.ts';

let aiClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined = undefined;

function isKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 15);
}

function getAiClient(): GoogleGenAI {
  const currentKey = process.env.GEMINI_API_KEY;
  if (!aiClient || cachedApiKey !== currentKey) {
    cachedApiKey = currentKey;
    aiClient = new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const AGRONOMIST_SYSTEM_INSTRUCTION = `
You are AgriMed AI's Universal Master Agronomist and Senior Plant Pathologist — a world-renowned field consultant with expertise in EVERY crop grown across the globe.
When answering any agronomy or farming question:
1. Provide practical, field-tested, and scientifically validated advice.
2. EXACT DOSAGES: Always state concentration per liter AND the exact total quantity for a standard 16-liter backpack spray tank (e.g., "2.5 g/L = 40 g per 16L backpack sprayer").
3. DUAL PRESCRIPTION: Always provide both:
   a) A proven targeted chemical solution (with active ingredient, formulation, mode of action).
   b) An organic / bio-control alternative (e.g. Trichoderma, Pseudomonas fluorescens, Bacillus subtilis, Neem Azadirachtin, fermented bio-washes).
4. SAFETY & PHI: Clearly specify Pre-Harvest Interval (PHI in days), REI (worker re-entry interval), and personal protective equipment (PPE).
5. FORMATTING: Use structured Markdown with bold headers, concise bullet points, and clean dosage callouts.
`;

export interface ChatAttachmentInput {
  data: string;
  mimeType: string;
  fileName?: string;
}

export async function askAgronomist(
  question: string,
  history: Array<{ sender: 'user' | 'assistant'; text: string }> = [],
  cropContext?: string,
  language?: string,
  attachment?: ChatAttachmentInput
): Promise<string> {
  const langOption = getLanguageOption(language);
  const isNonEnglish = langOption.code !== 'en';

  const languageDirective = isNonEnglish
    ? `\n6. CROSS-LANGUAGE UNDERSTANDING & RESPONSE LANGUAGE (${langOption.fullLabel}):
   - The farmer may type or speak via voice input in ANY Indian regional language (Hindi, Telugu, Kannada, Tamil, Marathi, Bengali, Punjabi, Gujarati, Malayalam) or English/Hinglish. Understand the farmer's meaning accurately regardless of the input script or language.
   - Write the entire advisory, section headers, explanations, and field instructions naturally in ${langOption.englishName} (${langOption.nativeLabel} script).
   - IMPORTANT: Keep chemical/fungicide/pesticide product trade names, active ingredients (e.g., Propiconazole 25% EC, Mancozeb 75% WP, Azoxystrobin 23% SC), biological agent names (Trichoderma viride, Pseudomonas fluorescens), and 16L dosage units (g/L, ml/L, g/16L, ml/16L, PHI) clearly printed in English/Latin script alongside the ${langOption.englishName} instructions so the farmer can verify agro-shop bottle labels accurately.`
    : `\n6. CROSS-LANGUAGE UNDERSTANDING & RESPONSE LANGUAGE (English):
   - The farmer may type or speak via voice input in ANY Indian regional language (Hindi, Telugu, Kannada, Tamil, Marathi, Bengali, Punjabi, Gujarati, Malayalam) or English/Hinglish. Understand the regional-language query accurately and write your entire response clearly in English.`;

  const attachmentDirective = attachment?.data
    ? `\n7. ATTACHED MEDIA / REPORT INSPECTION RULES:
   - Carefully examine the attached ${attachment.mimeType === 'application/pdf' || attachment.mimeType === 'text/plain' ? 'soil/lab document' : 'crop/leaf/pest photograph'}${attachment.fileName ? ` ("${attachment.fileName}")` : ''}.
   - Describe the actual visual signs, lesions, pests, nutrient patterns, or soil/lab metrics visible in the attachment.
   - Explicitly state your **Confidence Level (High / Moderate / Low)**. If the image is blurry, dark, too far away, obstructed, or does not show a plant/soil report, clearly state that uncertainty and ask the farmer for a sharper daylight close-up rather than guessing.
   - NEVER invent unverified chemical product names or unverified dosages. Only state exact g/L and 16L backpack tank dosages when clearly established by agronomic standards; if uncertain, recommend verified organic/cultural steps or local KVK / agronomist verification.`
    : '';

  if (isKeyConfigured()) {
    try {
      const chatPromise = (async () => {
        const ai = getAiClient();
        const contents: any[] = [];

        const recentHistory = history.slice(-6);
        for (const msg of recentHistory) {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
          });
        }

        let promptText = question.trim() || 'Please analyze the attached file and provide agronomic guidance.';
        if (cropContext && cropContext !== 'General') {
          promptText = `[Active Crop Context: ${cropContext}]\n${promptText}`;
        }
        promptText = isNonEnglish
          ? `[Understand input in any Indian language/English and respond in ${langOption.fullLabel} — keep chemical/trade names clear in English alongside local instructions]\n${promptText}`
          : `[Understand input in any Indian language/English and respond clearly in English]\n${promptText}`;
        if (attachment?.data && attachment?.mimeType) {
          promptText = `[Attached file: ${attachment.fileName || 'upload'} (${attachment.mimeType})]\n${promptText}`;
        }

        const userParts: any[] = [];
        if (attachment?.data && attachment?.mimeType) {
          userParts.push({
            inlineData: {
              data: attachment.data,
              mimeType: attachment.mimeType,
            },
          });
        }
        userParts.push({ text: promptText });

        contents.push({
          role: 'user',
          parts: userParts,
        });

        // Try primary Gemini 4 Hydrogen model followed by Gemini 3.1 Flash Lite
        const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
        for (const model of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction: `${AGRONOMIST_SYSTEM_INSTRUCTION}${languageDirective}${attachmentDirective}`,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            });
            if (response.text && response.text.trim()) {
              return response.text.trim();
            }
          } catch (modelErr: any) {
            console.warn(`Gemini chat model ${model} error:`, modelErr?.status || '', modelErr?.message || 'Unknown error');
            continue;
          }
        }
        return null;
      })();

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 25000)
      );

      const reply = await Promise.race([chatPromise, timeoutPromise]);
      if (reply) {
        return reply;
      }
    } catch (err: any) {
      console.warn('Gemini chat error:', err?.message || err);
    }
  }

  // Universal Offline Agronomy Knowledge Fallback Engine
  if (attachment?.data) {
    const fileLabel = attachment.fileName || 'your attached file';
    let textPreview = '';
    if (attachment.mimeType === 'text/plain') {
      try {
        textPreview = Buffer.from(attachment.data, 'base64').toString('utf8').slice(0, 400).trim();
      } catch {}
    }
    return `### **Attachment Received (${fileLabel}) — Verification Notice**\n\n**Confidence Level:** **Low / Uncertain (Live multimodal AI service temporarily unavailable)**\n\nI received **${fileLabel}** (\`${attachment.mimeType}\`), but live visual/document inspection could not complete right now. To avoid guessing or providing unverified dosages:\n- Please retry in a few seconds, or describe the **visible leaf spots, pest insects, soil pH/NPK numbers, and affected plant stage** in text.\n- Avoid spraying any unverified pesticide until symptoms are confirmed.${textPreview ? `\n\n**Detected Text Snippet:**\n> ${textPreview.replace(/\n+/g, ' ')}` : ''}`;
  }

  const advice = generateUniversalAgronomicAdvice(question, cropContext, langOption.code !== 'en' ? langOption.fullLabel : undefined);
  return advice;
}

function generateUniversalAgronomicAdvice(query: string, crop?: string, languageLabel?: string): string {
  const q = query.toLowerCase();
  const c = crop || 'General';
  const langBanner = languageLabel
    ? `**Selected Language / भाषा / భాష (${languageLabel}):** Chemical & bio-control trade names with 16L tank dosages are shown clearly below.\n\n`
    : '';

  if (q.includes('calcium') || q.includes('blossom') || q.includes('rot')) {
    return `### **Diagnosis: Blossom End Rot vs. Early Fruit Rot in ${c}**

1. **Clinical Distinction:**
- **Blossom End Rot (BER):** A physiological disorder caused by **localized calcium (Ca) deficiency** in rapidly expanding fruit tissue, frequently induced by irregular irrigation or high soil salinity. Starts as a water-soaked spot strictly at the blossom end (distal tip) of the fruit, later turning dark brown, flat, and leathery. No fungal mycelium is present.
- **Fruit Rot (Anthracnose / Alternaria):** A fungal pathogen causing sunken circular lesions anywhere on the fruit surface, with visible black acervuli or dark fungal mold spores.

---

### **Foliar Treatment & Exact 16L Tank Dosage:**
- **Nutritional Correction (Calcium Spray):**
  - **Calcium Nitrate [Ca(NO₃)₂]:** Mix **50 g to 60 g per 16-Liter backpack tank** (approx. 3.5 g/L).
  - Add **Soluble Boron (20% Di-sodium Octaborate Tetrahydrate):** **15 g per 16-Liter tank** (1 g/L) — Boron is essential for calcium transport across cell walls.
  - Spray twice: first at peak bloom, second 10 days later.

- **Protective Chemical Option (If fungal rot is present):**
  - **Azoxystrobin 23% SC:** **16 ml per 16L tank** (1 ml/L).
  - **PHI (Pre-Harvest Interval):** 3 to 5 days.

- **Organic & Bio-Control Alternative:**
  - **Fermented Eggshell + Vinegar Tea (Water-Soluble Calcium):** Dilute 100 ml extract per 16L tank.
  - **Trichoderma harzianum 2% WP:** **80 g per 16L tank** as a canopy mist.

---

### **Safety & Agronomic Practices:**
- Maintain consistent drip soil moisture (avoid alternate drying and flooding).
- Mulch soil with straw or silver-black reflective plastic mulch to prevent moisture swings.`;
  }

  if (q.includes('npk') || q.includes('fertilizer') || q.includes('flowering') || q.includes('schedule')) {
    return `### **Universal Precision Fertilizer & NPK Advisory for ${c}**

During the **flowering to early fruit / seed development stage**, crop demand shifts heavily from vegetative Nitrogen (N) towards **Phosphorus (P)** for root/flower vigor and **Potassium (K)** for fruit sizing, sugar accumulation, and disease resistance.

---

### **Recommended Foliar & Fertigation Schedule:**
1. **Foliar Nutrient Booster:**
   - **Water Soluble NPK 13-0-45 (Potassium Nitrate):** **60 g to 75 g per 16-Liter backpack tank** (4-5 g/L).
   - **Chelated Micronutrient Mix (Fe, Zn, Mn, Cu, B, Mo):** **20 g per 16-Liter tank** (1.25 g/L).
   - Apply early in the morning (before 9:00 AM) or after 4:30 PM for maximum stomatal uptake.

2. **Bio-Stimulant / Organic Alternative:**
   - **Seaweed Extract (Ascophyllum nodosum):** **32 ml per 16-Liter tank** (2 ml/L) — stimulates cytokinin and auxin production to prevent flower drop.
   - **Panchagavya / Fermented Bio-Wash (3%):** 480 ml per 16L spray tank.

---

### **Soil Fertility & pH Guidelines:**
- Optimal root zone pH: **6.0 to 6.8** (slightly acidic to neutral).
- If soil pH > 7.5, apply sulfur-coated urea or elemental sulfur (25 kg/acre) to free up immobilized micronutrients.
- Maintain adequate soil organic carbon (>0.75%) by incorporating well-rotted farmyard manure.`;
  }

  if (q.includes('trichoderma') || q.includes('bio-slurry') || q.includes('manure')) {
    return `### **Field Protocol: Enriching Farm Yard Manure (FYM) with Trichoderma**

*Trichoderma harzianum* or *viride* is a beneficial antagonistic fungus that parasitizes soil-borne pathogens like *Fusarium*, *Rhizoctonia*, *Pythium*, and *Sclerotium*.

---

### **Preparation Recipe (For 1 Acre Application):**
1. **Materials Needed:**
   - Well-decomposed Farm Yard Manure (FYM) or Vermicompost: **500 kg to 1,000 kg**
   - *Trichoderma* 2% WP: **2 kg to 4 kg**
   - Jaggery (crude raw brown sugar): **1 kg** dissolved in 10 liters of non-chlorinated water (microbial substrate)

2. **Step-by-Step Multiplication:**
   - Spread the FYM in a shady area (under tree cover or thatch roof).
   - Dissolve the *Trichoderma* powder and jaggery in 20 liters of water.
   - Sprinkle the liquid evenly over the manure pile while turning it with a spade.
   - Maintain moisture at **30-40%** (when squeezed in hand, it should form a moist ball without dripping).
   - Cover the pile with damp jute gunny bags or banana leaves.
   - Let incubate for **7 to 10 days**. White greenish fungal mycelial fluff will cover the pile.

3. **Field Application:**
   - Broadcast the enriched manure evenly across the field before final harrowing, or apply 250 g in the planting pit around the root zone.
   - **Spray Tank Bio-Drench Alternative:** Dissolve **80 g Trichoderma per 16-Liter backpack tank** and drench directly around the plant crowns.`;
  }

  return `${langBanner}### **AgriMed AI Agronomic Field Advisory for ${c}**

Thank you for your agronomic consultation regarding **${query}** on **${c}**.

---

### **1. Key Diagnosis & Actionable Insights:**
- Ensure optimal plant vigor by checking soil moisture, leaf underside pest activity, and electrical conductivity (EC).
- For foliar protection, clean spray water (pH 6.0 to 6.5) is critical to prevent chemical alkaline hydrolysis.

---

### **2. Precision Prescription per 16-Liter Backpack Tank:**
- **Chemical Option:**
  - **Foliar Treatment:** **32 g to 40 g (for powders)** or **16 ml to 20 ml (for liquids)** per standard 16L spray tank.
  - **Water Volume:** 150 to 200 Liters (approx. **10 to 12 tanks per acre**).
  - **Pre-Harvest Interval (PHI):** Minimum 7 to 14 days before harvest.

- **Organic & Bio-Control Alternative:**
  - **Neem Oil (Azadirachtin 10,000 ppm):** **48 ml per 16L tank** (3 ml/L) with 10 ml natural surfactant/liquid soap.
  - **Trichoderma / Bacillus subtilis:** **80 g per 16L tank** applied in late afternoon.
  - **PHI for Organics:** 0 to 1 day (safe and residue-free).

---

### **3. Safety & PPE Protocols:**
- Wear chemical-resistant nitrile gloves, N95 face mask, and eye protection.
- Spray strictly in the direction of the wind (never against wind drift).
- Keep children and livestock away from sprayed fields for 24 hours (REI).`;
}

const cropSymptomCache = new Map<string, string[]>();

export async function getCropSymptomsFromAi(cropName: string): Promise<{ symptoms: string[]; source: 'dictionary' | 'gemini' | 'fallback' }> {
  const normalized = (cropName || '').trim().toLowerCase();
  if (!normalized) {
    return { symptoms: getFallbackCropSymptoms('Crop'), source: 'fallback' };
  }

  // 1. Check verified agronomic dictionary first
  const known = getKnownCropSymptoms(normalized);
  if (known) {
    return { symptoms: known, source: 'dictionary' };
  }

  // 2. Check memory cache
  if (cropSymptomCache.has(normalized)) {
    return { symptoms: cropSymptomCache.get(normalized)!, source: 'gemini' };
  }

  // 3. Query Gemini for custom/rare crop symptoms with 12s timeout guard
  if (isKeyConfigured()) {
    try {
      const aiPromise = (async (): Promise<string[] | null> => {
        const ai = getAiClient();
        const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
        for (const model of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: `List the 5 most common, botanically accurate, visually recognizable field disease and pest symptoms specifically for the crop "${cropName.trim()}". Each symptom should be concise (8-14 words) and include the likely disorder/pest name in parentheses at the end, e.g., "Dark sunken spots on pods with orange spore rings (Anthracnose)".`,
              config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    symptoms: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '5 botanically accurate field symptoms specific to this crop',
                    },
                  },
                  required: ['symptoms'],
                },
              },
            });
            const rawText = response.text;
            if (rawText) {
              const parsed = JSON.parse(rawText);
              if (Array.isArray(parsed.symptoms) && parsed.symptoms.length >= 3) {
                return parsed.symptoms.slice(0, 5);
              }
            }
          } catch (err: any) {
            console.warn(`Gemini crop symptoms (${model}) error:`, err?.message || err);
            continue;
          }
        }
        return null;
      })();

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000));
      const result = await Promise.race([aiPromise, timeoutPromise]);
      if (result && result.length > 0) {
        cropSymptomCache.set(normalized, result);
        return { symptoms: result, source: 'gemini' };
      }
    } catch {}
  }

  // 4. Clean crop-tailored fallback
  const fallback = getFallbackCropSymptoms(cropName);
  return { symptoms: fallback, source: 'fallback' };
}

export interface ResearchedDiseasePayload {
  diseaseName: string;
  scientificName: string;
  crop: string;
  cropCategory: 'Grains & Cereals' | 'Vegetables' | 'Fruits' | 'Cash Crops' | 'Pulses & Legumes' | 'Spices & Plantation' | 'Other / Custom';
  pathogenType: 'Fungal' | 'Bacterial' | 'Viral' | 'Oomycete' | 'Pest / Insect / Mite' | 'Nutrient Deficiency' | 'Physiological Disorder';
  symptoms: string[];
  verifiedChemical: string;
  activeIngredient: string;
  formulation: string;
  safeDosagePerLiter: number;
  dosageUnit: 'g' | 'ml';
  safeDosagePer16LTank: number;
  organicAlternative: string;
  organicDosagePer16LTank: number;
  organicUnit: 'g' | 'ml';
  phiDays: number;
  reiHours: number;
  culturalPractices: string[];
  safetyWarnings: string[];
  sourceReference: string;
  sourceUrls: Array<{ title: string; url: string }>;
  verificationStatus: string;
  weatherConditions: {
    temperature: string;
    humidity: string;
    trigger: string;
  };
}

function extractJsonObject(rawText: string): any | null {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function researchDiseaseWorldwideWithSearch(
  query: string,
  cropHint?: string
): Promise<{ result: ResearchedDiseasePayload | null; error?: string }> {
  if (!isKeyConfigured()) {
    return {
      result: null,
      error: 'GEMINI_API_KEY is not configured on the server. Please configure it in Secrets.',
    };
  }

  const cleanedQuery = query.trim();
  const cropContextText = cropHint && cropHint !== 'All' ? ` (Crop focus: ${cropHint})` : '';

  const prompt = `Search reliable agricultural extension databases (ICAR, FAO, CIBRC, CABI, university plant pathology extensions) for the plant disease, pest, or crop condition matching: "${cleanedQuery}"${cropContextText}.

Return ONLY a single valid JSON object (no markdown commentary before or after) with these exact keys:
{
  "diseaseName": "Official common disease or pest name",
  "scientificName": "Latin binomial pathogen/pest scientific name",
  "crop": "Primary host crop name (e.g. Banana, Turmeric, Coffee, Soybean, Tomato)",
  "cropCategory": "One of: Grains & Cereals | Vegetables | Fruits | Cash Crops | Pulses & Legumes | Spices & Plantation | Other / Custom",
  "pathogenType": "One of: Fungal | Bacterial | Viral | Oomycete | Pest / Insect / Mite | Nutrient Deficiency | Physiological Disorder",
  "symptoms": ["4 concise visually recognizable field symptoms on leaves/stems/fruits"],
  "verifiedChemical": "Recommended registered fungicide/bactericide/insecticide product & formulation",
  "activeIngredient": "Active chemical ingredient & %",
  "formulation": "Formulation code e.g. WP, SC, WG, EC, SL",
  "safeDosagePerLiter": 2.0,
  "dosageUnit": "g or ml",
  "organicAlternative": "Verified bio-control or botanical option (e.g. Trichoderma viride / Pseudomonas fluorescens / Neem Azadirachtin)",
  "organicDosagePer16LTank": 80,
  "organicUnit": "g or ml",
  "phiDays": 7,
  "reiHours": 24,
  "weatherConditions": {
    "temperature": "Favorable temperature range e.g. 24-30°C",
    "humidity": "Favorable humidity e.g. >80% RH",
    "trigger": "Brief epidemiological trigger summary"
  },
  "culturalPractices": ["2-3 practical field sanitation or cultural management steps"],
  "safetyWarnings": ["2 PPE and spray safety rules"],
  "sourceReference": "Short citation naming the ICAR / FAO / University extension source found"
}`;

  try {
    const searchPromise = (async (): Promise<{ result: ResearchedDiseasePayload | null; error?: string }> => {
      const ai = getAiClient();
      const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
      let lastErrMsg = '';

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });

          const rawText = response.text || '';

          // Extract grounding URLs from Google Search chunks
          const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const seenUrls = new Set<string>();
          const sourceUrls: Array<{ title: string; url: string }> = [];
          for (const chunk of rawChunks) {
            const uri = chunk?.web?.uri;
            const title = chunk?.web?.title;
            if (typeof uri === 'string' && /^https?:\/\//i.test(uri) && !seenUrls.has(uri)) {
              seenUrls.add(uri);
              sourceUrls.push({
                title: (typeof title === 'string' && title.trim()) ? title.trim() : uri,
                url: uri,
              });
            }
          }

          let parsed = extractJsonObject(rawText);

          // If Search Grounding returned rich grounded prose instead of raw JSON, structure it cleanly while preserving Search URLs
          if ((!parsed || !parsed.diseaseName) && rawText.trim().length > 40) {
            try {
              const formatResp = await ai.models.generateContent({
                model,
                contents: `Extract the plant pathology details from this grounded research text into the requested JSON structure:\n\n${rawText}`,
                config: {
                  responseMimeType: 'application/json',
                  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                },
              });
              parsed = extractJsonObject(formatResp.text || '');
            } catch (fmtErr: any) {
              lastErrMsg = fmtErr?.message || lastErrMsg;
            }
          }

          if (!parsed || !parsed.diseaseName) {
            lastErrMsg = `Model ${model} returned unparseable output (${rawText.slice(0, 80)})`;
            continue;
          }

          const safeDoseL = Number(parsed.safeDosagePerLiter);
          const validDoseL = Number.isFinite(safeDoseL) && safeDoseL > 0 ? Math.round(safeDoseL * 100) / 100 : 2.0;
          const validDose16 = Math.round(validDoseL * 16 * 100) / 100;
          const unit: 'g' | 'ml' = String(parsed.dosageUnit).toLowerCase() === 'ml' ? 'ml' : 'g';

          const org16 = Number(parsed.organicDosagePer16LTank);
          const validOrg16 = Number.isFinite(org16) && org16 > 0 ? Math.round(org16 * 100) / 100 : 80;
          const orgUnit: 'g' | 'ml' = String(parsed.organicUnit).toLowerCase() === 'ml' ? 'ml' : 'g';

          const allowedCategories = [
            'Grains & Cereals',
            'Vegetables',
            'Fruits',
            'Cash Crops',
            'Pulses & Legumes',
            'Spices & Plantation',
            'Other / Custom',
          ];
          const cropCategory = allowedCategories.includes(parsed.cropCategory)
            ? parsed.cropCategory
            : 'Other / Custom';

          const allowedPathogens = [
            'Fungal',
            'Bacterial',
            'Viral',
            'Oomycete',
            'Pest / Insect / Mite',
            'Nutrient Deficiency',
            'Physiological Disorder',
          ];
          const pathogenType = allowedPathogens.includes(parsed.pathogenType)
            ? parsed.pathogenType
            : 'Fungal';

          const payload: ResearchedDiseasePayload = {
            diseaseName: String(parsed.diseaseName).trim(),
            scientificName: String(parsed.scientificName || 'Scientific taxon').trim(),
            crop: String(parsed.crop || (cropHint && cropHint !== 'All' ? cropHint : 'General Crop')).trim(),
            cropCategory,
            pathogenType,
            symptoms: Array.isArray(parsed.symptoms) && parsed.symptoms.length > 0
              ? parsed.symptoms.map((s: any) => String(s).trim()).filter(Boolean)
              : ['Characteristic foliar lesions and reduced vigor'],
            verifiedChemical: String(parsed.verifiedChemical || 'Targeted Broad-Spectrum Fungicide').trim(),
            activeIngredient: String(parsed.activeIngredient || parsed.verifiedChemical || 'Active Ingredient').trim(),
            formulation: String(parsed.formulation || 'WP').trim(),
            safeDosagePerLiter: validDoseL,
            dosageUnit: unit,
            safeDosagePer16LTank: validDose16,
            organicAlternative: String(parsed.organicAlternative || 'Trichoderma viride / Cold-Pressed Neem Oil').trim(),
            organicDosagePer16LTank: validOrg16,
            organicUnit: orgUnit,
            phiDays: Number.isFinite(Number(parsed.phiDays)) ? Number(parsed.phiDays) : 7,
            reiHours: Number.isFinite(Number(parsed.reiHours)) ? Number(parsed.reiHours) : 24,
            weatherConditions: {
              temperature: String(parsed.weatherConditions?.temperature || '22-30°C'),
              humidity: String(parsed.weatherConditions?.humidity || '>75% RH'),
              trigger: String(parsed.weatherConditions?.trigger || 'High canopy moisture and warm field conditions'),
            },
            culturalPractices: Array.isArray(parsed.culturalPractices) && parsed.culturalPractices.length > 0
              ? parsed.culturalPractices.map((s: any) => String(s).trim()).filter(Boolean)
              : ['Prune severely infected tissue and improve air circulation'],
            safetyWarnings: Array.isArray(parsed.safetyWarnings) && parsed.safetyWarnings.length > 0
              ? parsed.safetyWarnings.map((s: any) => String(s).trim()).filter(Boolean)
              : ['Wear nitrile gloves, mask, and eye protection', 'Follow product label instructions strictly'],
            sourceReference: String(parsed.sourceReference || 'Google Search Grounded Agricultural Extension').trim(),
            sourceUrls,
            verificationStatus: 'AI-Researched (Verify Label)',
          };

          return { result: payload };
        } catch (err: any) {
          const rawMsg = err?.message || String(err);
          console.warn(`Gemini Search Grounding (${model}) error:`, rawMsg);
          lastErrMsg = formatGeminiApiError(rawMsg);
          continue;
        }
      }

      return {
        result: null,
        error: lastErrMsg || 'Could not retrieve structured pathology results from Google Search grounding.',
      };
    })();

    const timeoutPromise = new Promise<{ result: null; error: string }>((resolve) =>
      setTimeout(() => resolve({ result: null, error: 'Worldwide pathology research timed out. Please try again.' }), 22000)
    );

    return await Promise.race([searchPromise, timeoutPromise]);
  } catch (err: any) {
    return { result: null, error: formatGeminiApiError(err?.message || 'Worldwide pathology research failed.') };
  }
}

function formatGeminiApiError(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const code = parsed?.error?.code;
    const status = parsed?.error?.status;
    const msg = parsed?.error?.message;
    if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
      return 'Gemini API quota exceeded (429 RESOURCE_EXHAUSTED). Please check your Gemini API key plan or quota in Settings > Secrets and try again.';
    }
    if (code === 400 || code === 403 || status === 'PERMISSION_DENIED') {
      return `Gemini API authorization error (${code || status}): ${msg || 'Check GEMINI_API_KEY in Settings > Secrets.'}`;
    }
    if (msg) return String(msg);
  } catch {
    if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
      return 'Gemini API quota exceeded (429 RESOURCE_EXHAUSTED). Please check your Gemini API key plan or quota in Settings > Secrets and try again.';
    }
  }
  return raw;
}

export async function transcribeFarmerAudio(
  audioBase64: string,
  mimeType: string,
  language?: string
): Promise<{ transcript: string; error?: string }> {
  if (!isKeyConfigured()) {
    return {
      transcript: '',
      error: 'GEMINI_API_KEY is not configured on the server. Please configure it in Secrets.',
    };
  }

  const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase() || 'audio/webm';
  const langOption = getLanguageOption(language);
  const requestedLanguageLabel = langOption ? `${langOption.fullLabel}` : (language || 'English');
  const prompt = `Transcribe this farmer's spoken audio accurately. If they speak in an Indian language, transcribe it clearly in their spoken language (or the requested target language: ${requestedLanguageLabel}). Return ONLY the transcribed text.`;

  try {
    const transcribePromise = (async (): Promise<{ transcript: string; error?: string }> => {
      const ai = getAiClient();
      const modelsToTry = ['gemini-2.5-flash', 'gemini-3.5-transcribe', 'gemini-4-hydrogen'];
      let lastErrMsg = '';

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMimeType,
                    data: audioBase64,
                  },
                },
                { text: prompt },
              ],
            },
          });

          const text = (response.text || '').trim();
          if (text) {
            return { transcript: text };
          }
          lastErrMsg = 'No speech was detected in the recorded audio.';
        } catch (modelErr: any) {
          const rawMsg = modelErr?.message || String(modelErr);
          console.warn(`Gemini audio transcription (${model}) error:`, rawMsg);
          lastErrMsg = formatGeminiApiError(rawMsg);
          continue;
        }
      }

      return {
        transcript: '',
        error: lastErrMsg || 'Could not transcribe audio. Please try speaking clearly again.',
      };
    })();

    const timeoutPromise = new Promise<{ transcript: string; error: string }>((resolve) =>
      setTimeout(
        () => resolve({ transcript: '', error: 'Audio transcription timed out. Please try a shorter recording.' }),
        25000
      )
    );

    return await Promise.race([transcribePromise, timeoutPromise]);
  } catch (err: any) {
    return {
      transcript: '',
      error: formatGeminiApiError(err?.message || 'Audio transcription failed.'),
    };
  }
}
