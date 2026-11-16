export type CropCategory = 
  | 'Grains & Cereals'
  | 'Vegetables'
  | 'Fruits'
  | 'Cash Crops'
  | 'Pulses & Legumes'
  | 'Spices & Plantation'
  | 'Other / Custom';

export type PathogenType = 
  | 'Fungal' 
  | 'Bacterial' 
  | 'Viral' 
  | 'Oomycete' 
  | 'Pest / Insect / Mite' 
  | 'Nutrient Deficiency' 
  | 'Physiological Disorder';

export type CropType = 'Tomato' | 'Potato' | 'Rice' | 'Chilli' | 'Cotton' | string;

export type PlantPart = 
  | 'Leaves' 
  | 'Stem' 
  | 'Fruit / Pod / Grain' 
  | 'Fruit/Pod' 
  | 'Roots / Tuber' 
  | 'Roots' 
  | 'Whole Plant' 
  | string;

export type SeverityLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface DiseaseRule {
  id: string;
  crop: CropType;
  name: string;
  scientificName: string;
  pathogenType: PathogenType | string;
  severity: SeverityLevel;
  affectedParts: PlantPart[] | string[];
  symptoms: string[];
  keyIndicators: string[];
  weatherConditions: {
    temperature: string;
    humidity: string;
    trigger: string;
  };
  chemicalPrescription: ChemicalPrescription;
  organicControl: OrganicControl;
  phiDays: number;
  reiHours: number;
  safetyWarnings: string[];
  culturalPractices: string[];
  sourceReference?: string;
  sourceUrls?: Array<{ title: string; url: string }>;
  verificationStatus?: string;
}

export interface ChemicalPrescription {
  name: string;
  activeIngredient: string;
  tradeNames: string[]; // e.g. ['Beam', 'Bavistin', 'Amistar Top', 'Ridomil Gold']
  formulation: string; // e.g. '75% WP', '250 SC', '17.8% SL', '20% WG'
  dosePerLiter: number; // in g/L or ml/L
  unit: 'g' | 'ml';
  dosePer16LTank: number; // e.g. 40g or 16ml
  applicationMethod: string;
  sprayIntervalDays: number;
  maxApplicationsPerSeason: number;
  modeOfAction: string;
  targetStage: string;
}

export interface OrganicControl {
  name: string;
  activeBioAgent: string;
  formulation: string;
  dosePerLiter: number;
  unit: 'g' | 'ml';
  dosePer16LTank: number;
  preparationInstructions: string;
  applicationMethod: string;
  mechanism: string;
}

export interface UniversalDiagnosisResult {
  id: string;
  cropName: string;
  cropCategory: CropCategory;
  diseaseName: string;
  scientificName: string;
  pathogenType: PathogenType;
  severity: SeverityLevel;
  confidenceScore: number;
  confidenceLevel?: 'High' | 'Moderate' | 'Low';
  uncertaintyReason?: string;
  uncertaintyNote?: string;
  isPlantImageValid?: boolean;
  keySymptomsIdentified: string[];
  symptomsObserved?: string[];
  causeAndTriggers: string;
  chemicalPrescription: ChemicalPrescription;
  organicControl: OrganicControl;
  phiDays: number; // Pre-Harvest Interval
  reiHours: number; // Restricted Entry Interval
  safetyPpe: string[];
  culturalPractices: string[];
  imageAnalyzed?: string; // base64 or preview url
  imagePath?: string;
  source?: 'ai-live' | 'expert-database';
  alternativeDiagnoses?: string[];
  recommendedNextSteps?: string[];
  nextSteps?: string[];
  whenToConsultExpert?: string;
  consultExpertWarning?: string;
  verifiedTreatmentId?: string | null;
  verifiedTreatmentFound?: boolean;
  sourceReference?: string;
}

export type UserRole = 'farmer' | 'admin';

export interface User {
  _id: string;
  googleId?: string;
  fullName?: string;
  name: string;
  email: string;
  passwordHash?: string;
  resetOtp?: string;
  resetOtpExpires?: number;
  authProvider?: 'local' | 'google';
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface DiseaseInformationDocument {
  _id: string;
  diseaseName: string;
  scientificName: string;
  crop: string;
  cropCategory: CropCategory;
  pathogenType: PathogenType;
  verifiedChemical: string;
  activeIngredient: string;
  tradeNames?: string[];
  formulation: string;
  safeDosagePerLiter: number;
  dosageUnit: 'g' | 'ml';
  safeDosagePer16LTank: number;
  organicAlternative: string;
  organicDosagePer16LTank: number;
  organicUnit: 'g' | 'ml';
  phiDays: number;
  reiHours: number;
  sourceReference: string; // ICAR / CIBRC / FAO aligned
  sourceUrls?: Array<{ title: string; url: string }>;
  verificationStatus?: string;
  symptoms?: string[];
  weatherConditions?: {
    temperature: string;
    humidity: string;
    trigger: string;
  };
  culturalPractices: string[];
  safetyWarnings: string[];
}

export interface DiagnosisDocument {
  _id: string;
  userId: string;
  crop: string;
  cropCategory?: string;
  imagePath?: string;
  isPlantImageValid: boolean;
  symptomsObserved: string[];
  diseaseDetected: string;
  scientificName?: string;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Moderate' | 'Low';
  uncertaintyReason: string;
  alternativeDiagnoses: string[];
  verifiedTreatmentId: string | null;
  verifiedTreatmentFound: boolean;
  chemicalPrescription?: ChemicalPrescription;
  organicControl?: OrganicControl;
  phiDays?: number;
  reiHours?: number;
  nextSteps: string[];
  consultExpertWarning: string;
  sourceReference?: string;
  createdAt: string;
  notes?: string;
  tankSizeLiters?: number;
}

export interface ConsultationRecord {
  _id: string;
  id?: string | number;
  userId?: string;
  crop: string;
  cropCategory: string;
  symptoms: string[];
  diseaseName: string;
  scientificName: string;
  pathogenType: string;
  confidenceScore: number;
  prescribedChemical: string;
  chemicalDosagePerTank: string;
  organicAlternative: string;
  phiDays: number;
  tankSizeLiters: number;
  notes?: string;
  diagnosis?: UniversalDiagnosisResult;
  chemicalRx?: ChemicalPrescription;
  organicRx?: OrganicControl;
  tankCalculation?: any;
  chatHistory?: ChatMessage[];
  createdAt: string;
  isPlantImageValid?: boolean;
  confidenceLevel?: 'High' | 'Moderate' | 'Low';
  uncertaintyReason?: string;
  alternativeDiagnoses?: string[];
  verifiedTreatmentId?: string | null;
  nextSteps?: string[];
  consultExpertWarning?: string;
  imagePath?: string;
}

export interface ChatAttachment {
  name: string;
  mimeType: string;
  size: number;
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  cropContext?: string;
  attachment?: ChatAttachment;
}

export interface CropPreset {
  name: string;
  category: CropCategory;
  emoji: string;
  scientificName: string;
  commonProblems: string[];
}

export type ActiveTab = 'diagnostics' | 'chat' | 'calculator' | 'history' | 'directory';


