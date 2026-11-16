/**
 * Pure calculation utilities for agricultural spraying and dosage
 */

export interface TankDosageResult {
  tankSizeLiters: number;
  dosePerLiter: number;
  totalDose: number;
  unit: 'g' | 'ml';
  formattedDose: string;
  waterRequiredForOneAcreLiters: number;
  tanksRequiredPerAcre: number;
}

export function calculateTankDosage(
  dosePerLiter: number,
  tankSizeLiters: number,
  unit: 'g' | 'ml',
  recommendedAcreSprayVolumeLiters: number = 200
): TankDosageResult {
  const safeTankSize = Math.max(1, tankSizeLiters);
  const totalDose = Math.round(dosePerLiter * safeTankSize * 100) / 100;
  
  const tanksRequiredPerAcre = Math.ceil(recommendedAcreSprayVolumeLiters / safeTankSize);

  let formattedDose = `${totalDose} ${unit}`;
  if (unit === 'g' && totalDose >= 1000) {
    formattedDose = `${(totalDose / 1000).toFixed(2)} kg`;
  } else if (unit === 'ml' && totalDose >= 1000) {
    formattedDose = `${(totalDose / 1000).toFixed(2)} L`;
  }

  return {
    tankSizeLiters: safeTankSize,
    dosePerLiter,
    totalDose,
    unit,
    formattedDose,
    waterRequiredForOneAcreLiters: recommendedAcreSprayVolumeLiters,
    tanksRequiredPerAcre,
  };
}

export type PhiRiskLevel = 'safe' | 'caution' | 'warning' | 'danger';

export interface PhiEvaluation {
  riskLevel: PhiRiskLevel;
  badgeLabel: string;
  badgeColor: string;
  description: string;
}

export function evaluatePhiSafety(phiDays: number, plannedHarvestInDays?: number): PhiEvaluation {
  if (plannedHarvestInDays === undefined) {
    if (phiDays === 0) {
      return {
        riskLevel: 'safe',
        badgeLabel: '0 Days PHI (Exempt)',
        badgeColor: 'emerald',
        description: 'Safe to harvest immediately after spray drying. Ideal for organic bio-controls.',
      };
    }
    if (phiDays <= 3) {
      return {
        riskLevel: 'safe',
        badgeLabel: `${phiDays} Days PHI (Low)`,
        badgeColor: 'emerald',
        description: `Short interval: wait ${phiDays} day(s) before harvesting fresh produce.`,
      };
    }
    if (phiDays <= 14) {
      return {
        riskLevel: 'caution',
        badgeLabel: `${phiDays} Days PHI (Moderate)`,
        badgeColor: 'amber',
        description: `Moderate interval: plan harvest carefully. Keep a strict ${phiDays}-day waiting buffer.`,
      };
    }
    return {
      riskLevel: 'danger',
      badgeLabel: `${phiDays} Days PHI (High Warning)`,
      badgeColor: 'rose',
      description: `Long persistence: DO NOT harvest produce within ${phiDays} days of chemical application.`,
    };
  }

  const daysBuffer = plannedHarvestInDays - phiDays;
  if (daysBuffer < 0) {
    return {
      riskLevel: 'danger',
      badgeLabel: `VIOLATION: Exceeds by ${Math.abs(daysBuffer)} days`,
      badgeColor: 'rose',
      description: `Hazardous! Planned harvest in ${plannedHarvestInDays} days is inside the mandatory ${phiDays}-day safety period. Chemical residues will be toxic.`,
    };
  } else if (daysBuffer <= 2) {
    return {
      riskLevel: 'warning',
      badgeLabel: `Close Margin: ${daysBuffer} days buffer`,
      badgeColor: 'amber',
      description: `Close margin! Exactly ${plannedHarvestInDays} days to harvest with a ${phiDays}-day PHI requirement. Delay harvest if weather is cold or dry.`,
    };
  } else {
    return {
      riskLevel: 'safe',
      badgeLabel: `Safe: +${daysBuffer} days clear`,
      badgeColor: 'emerald',
      description: `Safe margin. Planned harvest (${plannedHarvestInDays} days) safely exceeds the ${phiDays}-day PHI requirement.`,
    };
  }
}
