import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseCropSymptoms } from './diagnostics.ts';
import { DiseaseRule } from '../types/index.ts';

const mockDiseases: DiseaseRule[] = [
  {
    id: 'tom-early-blight',
    crop: 'Tomato',
    name: 'Early Blight',
    scientificName: 'Alternaria solani',
    pathogenType: 'Fungal',
    severity: 'High',
    affectedParts: ['Leaves', 'Stem'],
    symptoms: [
      'Concentric target-board rings on older leaves',
      'Yellow chlorotic halos surrounding lesions',
      'Stem collar rot near soil level'
    ],
    keyIndicators: ['Concentric target-board rings on older leaves'],
    weatherConditions: {
      temperature: '24-29°C',
      humidity: '>80%',
      trigger: 'Warm humid days with frequent showers'
    },
    chemicalPrescription: {
      name: 'Mancozeb 75% WP',
      activeIngredient: 'Mancozeb 75% WP',
      tradeNames: ['Dithane M-45', 'Indofil M-45'],
      formulation: '75% WP',
      dosePerLiter: 2.5,
      unit: 'g',
      dosePer16LTank: 40,
      applicationMethod: 'Foliar spray coverage',
      sprayIntervalDays: 7,
      maxApplicationsPerSeason: 3,
      modeOfAction: 'Contact multisite protective fungicide',
      targetStage: 'Early foliage or first symptom'
    },
    organicControl: {
      name: 'Trichoderma harzianum + Neem 10000ppm',
      activeBioAgent: 'Trichoderma harzianum 2% WP',
      formulation: 'WP',
      dosePerLiter: 5,
      unit: 'g',
      dosePer16LTank: 80,
      preparationInstructions: 'Mix 80g in 16L spray water with 0.5% jaggery sticker solution',
      applicationMethod: 'Foliar spray evening',
      mechanism: 'Hyperparasitism of fungal mycelium'
    },
    phiDays: 14,
    reiHours: 24,
    safetyWarnings: ['Wear nitrile gloves and N95 mask'],
    culturalPractices: ['Stake plants to prevent soil contact']
  },
  {
    id: 'tom-late-blight',
    crop: 'Tomato',
    name: 'Late Blight',
    scientificName: 'Phytophthora infestans',
    pathogenType: 'Oomycete',
    severity: 'Critical',
    affectedParts: ['Leaves', 'Stem', 'Fruit/Pod'],
    symptoms: [
      'Water-soaked dark lesions on leaf tips',
      'White cottony fungal growth on underside in humid mornings',
      'Brown greasy rot on green fruit'
    ],
    keyIndicators: ['White cottony fungal growth on underside in humid mornings'],
    weatherConditions: {
      temperature: '15-20°C',
      humidity: '>90%',
      trigger: 'Cool wet conditions with morning dew'
    },
    chemicalPrescription: {
      name: 'Metalaxyl-M + Mancozeb (Ridomil Gold)',
      activeIngredient: 'Metalaxyl-M 4% + Mancozeb 64% WP',
      tradeNames: ['Ridomil Gold', 'Master WP', 'Matco'],
      formulation: '68% WP',
      dosePerLiter: 2.5,
      unit: 'g',
      dosePer16LTank: 40,
      applicationMethod: 'Thorough canopy drench',
      sprayIntervalDays: 10,
      maxApplicationsPerSeason: 2,
      modeOfAction: 'Systemic RNA polymerase inhibition + contact',
      targetStage: 'Curative on onset'
    },
    organicControl: {
      name: 'Copper Hydroxide + Bacillus subtilis',
      activeBioAgent: 'Bacillus subtilis QST 713',
      formulation: 'SC',
      dosePerLiter: 3,
      unit: 'ml',
      dosePer16LTank: 48,
      preparationInstructions: 'Shake well, mix in clean pH 6-7 water',
      applicationMethod: 'Foliar spray',
      mechanism: 'Bio-film colonization preventing spore germination'
    },
    phiDays: 7,
    reiHours: 48,
    safetyWarnings: ['Highly toxic to aquatic life'],
    culturalPractices: ['Destroy and burn infected crop residue immediately']
  }
];

test('diagnoseCropSymptoms returns empty array when no symptoms provided', () => {
  const result = diagnoseCropSymptoms('Tomato', [], mockDiseases);
  assert.equal(result.length, 0);
});

test('diagnoseCropSymptoms matches Early Blight with target rings symptom', () => {
  const result = diagnoseCropSymptoms(
    'Tomato',
    ['Concentric target-board rings on older leaves'],
    mockDiseases
  );

  assert.equal(result.length > 0, true);
  assert.equal(result[0].disease.name, 'Early Blight');
  assert.equal(result[0].hasKeyIndicatorMatch, true);
  assert.equal(result[0].confidenceScore >= 70, true);
});

test('diagnoseCropSymptoms distinguishes Early Blight vs Late Blight based on distinctive symptoms', () => {
  const resultLate = diagnoseCropSymptoms(
    'Tomato',
    ['White cottony fungal growth on underside in humid mornings', 'Brown greasy rot on green fruit'],
    mockDiseases
  );

  assert.equal(resultLate[0].disease.name, 'Late Blight');
  assert.equal(resultLate[0].confidenceScore >= 85, true);
});
