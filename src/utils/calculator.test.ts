import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTankDosage, evaluatePhiSafety } from './calculator.ts';

test('calculateTankDosage calculates accurate dosage for standard 16L tank', () => {
  // Mancozeb 2.5g/L -> 40g per 16L tank
  const result = calculateTankDosage(2.5, 16, 'g');
  assert.equal(result.totalDose, 40);
  assert.equal(result.formattedDose, '40 g');
  assert.equal(result.tanksRequiredPerAcre, 13); // ceil(200 / 16) = 13
});

test('calculateTankDosage scales with custom 20L power sprayer', () => {
  // Azoxystrobin 1ml/L -> 20ml per 20L tank
  const result = calculateTankDosage(1, 20, 'ml');
  assert.equal(result.totalDose, 20);
  assert.equal(result.formattedDose, '20 ml');
  assert.equal(result.tanksRequiredPerAcre, 10); // ceil(200 / 20) = 10
});

test('calculateTankDosage formats kilograms and liters for large volumes', () => {
  const resultKg = calculateTankDosage(2.5, 500, 'g');
  assert.equal(resultKg.totalDose, 1250);
  assert.equal(resultKg.formattedDose, '1.25 kg');

  const resultL = calculateTankDosage(5, 400, 'ml');
  assert.equal(resultL.totalDose, 2000);
  assert.equal(resultL.formattedDose, '2.00 L');
});

test('evaluatePhiSafety flags safe, caution and danger correctly', () => {
  const zeroPhi = evaluatePhiSafety(0);
  assert.equal(zeroPhi.riskLevel, 'safe');

  const lowPhi = evaluatePhiSafety(3);
  assert.equal(lowPhi.riskLevel, 'safe');

  const moderatePhi = evaluatePhiSafety(10);
  assert.equal(moderatePhi.riskLevel, 'caution');

  const highPhi = evaluatePhiSafety(21);
  assert.equal(highPhi.riskLevel, 'danger');
});

test('evaluatePhiSafety with planned harvest date detects safety violations', () => {
  // PHI 14 days, harvest planned in 7 days -> violation!
  const violation = evaluatePhiSafety(14, 7);
  assert.equal(violation.riskLevel, 'danger');
  assert.match(violation.badgeLabel, /VIOLATION/);

  // PHI 14 days, harvest planned in 20 days -> safe!
  const safe = evaluatePhiSafety(14, 20);
  assert.equal(safe.riskLevel, 'safe');
});
