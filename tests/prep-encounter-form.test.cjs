const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const formPath = path.join(root, 'configuration/backend_configuration/ampathforms/poc pre exposure encounter form v1.0.json');
const form = JSON.parse(fs.readFileSync(formPath, 'utf8'));

function* walk(value) {
  if (Array.isArray(value)) {
    for (const item of value) yield* walk(item);
  } else if (value && typeof value === 'object') {
    yield value;
    for (const item of Object.values(value)) yield* walk(item);
  }
}

const questions = [...walk(form)].filter(value => value.questionOptions);
const fields = Object.fromEntries(questions.map(field => [field.id, field]));
const values = id => fields[id].questionOptions.answers.map(answer => answer.concept);
const answer = (id, label) => fields[id].questionOptions.answers.find(answer => answer.label === label).concept;
const Y = answer('acuteHiv', 'Yes');
const N = answer('acuteHiv', 'No');
const INITIAL = answer('prepVisitType', 'Initial');
const FOLLOW = answer('prepVisitType', 'Follow Up');
const TRANSIT = answer('prepVisitType', 'Transit');
const TRANSFER = answer('prepVisitType', 'Transfer In');
const CONTINUE = answer('prepStatus', 'Continue');
const SWITCH = answer('prepStatus', 'Switch');
const RESTART = answer('prepStatus', 'Restart');
const STOP = answer('prepStatus', 'Discontinue');
const OUT = answer('prepStatus', 'Transfer out');
const CAB = answer('prepTypeF', 'CABOTEGRAVIR (CAB-LA)');
const RING = answer('PrepDrugsPlanLong', 'Dapivirine ring');
const DAILY = answer('doseStrategy', 'Daily oral prep');
const EVENT = answer('doseStrategy', 'Event driven');
const LONG = answer('doseStrategy', 'Long acting prep');

const isEmpty = value => value == null || value === '' || (Array.isArray(value) && value.length === 0);
const arrayContains = (array, value) => Array.isArray(value)
  ? value.every(item => array.includes(item)) : array.includes(value);

// These rules compare calendar dates only. This fixture implements that small
// moment API surface, without claiming to exercise the browser/date-picker.
function moment(value) {
  const date = new Date(value);
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return { day, isAfter: other => day > other.day };
}

function evaluate(expression, state, myValue) {
  const context = {
    ...Object.fromEntries(questions.map(question => [question.id, undefined])),
    sex: 'F', age: 30, visitTypeUuid: 'a0ee8015-3558-4ac8-9886-285f9b687c2f',
    ...state, myValue, isEmpty, arrayContains, moment,
  };
  return Function(...Object.keys(context), '"use strict"; return (' + expression + ');')(...Object.values(context));
}

const shown = (id, state) => !fields[id].hide || !evaluate(fields[id].hide.hideWhenExpression, state);
const errors = (id, state, value) => (fields[id].validators || [])
  .filter(validator => validator.type === 'js_expression' && evaluate(validator.failsWhenExpression, state, value));
const initial = {
  prepVisitType: INITIAL, encDate: '2026-09-10',
  acuteHiv: N, contraindications: N,
};
const returning = { ...initial, prepVisitType: FOLLOW, prepStatus: CONTINUE, prepPrescribed: Y };

test('unique field IDs, complete observation metadata, and existing PrEP follow-up encounter type', () => {
  assert.equal(questions.length, new Set(questions.map(question => question.id)).size);
  for (const field of questions) {
    assert.ok(field.id && field.questionOptions.rendering, field.label);
    if (['obs', 'obsGroup'].includes(field.type)) {
      assert.match(field.questionOptions.concept, /^[0-9a-f-]{36}$/, field.id);
    }
  }
  const followUp = JSON.parse(fs.readFileSync(path.join(root, 'configuration/backend_configuration/ampathforms/POC pre exposure prophylaxis follow up form v1.4.json'), 'utf8'));
  assert.equal(form.encounterType, followUp.encounterType);
  assert.equal(form.encounter, followUp.encounter);
  assert.equal(form.encounterType, 'ddd96f1c-524f-4caa-81a6-1a6f9789a4bc');
  assert.equal(form.encounter, 'PREPRETURN');
});

test('all expressions compile and evaluate without missing field references', () => {
  const expressions = [...walk(form)].flatMap(object => Object.entries(object)
    .filter(([key, value]) => key.endsWith('Expression') && typeof value === 'string')
    .map(([, value]) => value));
  for (const state of [{}, initial, returning, { ...returning, prepStatus: STOP }, { ...returning, prepVisitType: TRANSIT }]) {
    for (const expression of expressions) {
      assert.doesNotThrow(() => evaluate(expression, state), expression);
    }
  }
});

test('observation and answer concepts already exist in other schemas or existing drug metadata', () => {
  const directory = path.dirname(formPath);
  const known = new Set();
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.json'))) {
    if (path.join(directory, name) === formPath) continue;
    let schema;
    try { schema = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')); }
    catch { continue; } // Other unfinished schemas are outside this change.
    for (const value of walk(schema)) {
      if (typeof value.concept === 'string') known.add(value.concept);
    }
  }
  // Dapivirine is already registered in the repository's existing drug catalog.
  const drugs = fs.readFileSync(path.join(root, 'configuration/backend_configuration/drugs/drugs.csv'), 'utf8');
  for (const uuid of drugs.match(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/g) || []) known.add(uuid);
  for (const value of walk(form)) {
    if (typeof value.concept === 'string') assert.ok(known.has(value.concept), value.concept);
  }
  assert.equal(fs.existsSync(path.join(root, 'configuration/backend_configuration/concepts/prepencounterconcepts.csv')), false);
});


test('removed fields and dependencies are absent; population choices match the clinical form', () => {
  for (const id of ['tier', 'schoolAttend', 'maritalStatus', 'atRisk', 'baselineAss', 'partnersBehaviour', 'partnerEnrolled', 'partnerCcc', 'syst', 'dias', 'temp', 'weight', 'height', 'bmi', 'muac', 'lmpDate1', 'familyPlan', 'hivRapid', 'hivTestKit', 'selfKit', 'selfTestKit', 'htsProvider', 'linkCare', 'hepB', 'hepC', 'vaccineInitiated', 'vaccineInitiatedC', 'creatinineDone', 'creatinineTest', 'creatinineHigh', 'labresultsText', 'physical', 'emmotional', 'sexual', 'financial', 'gbvText', 'adherenceDone', 'poorAdherence', 'selfAssess', 'unsatisfactoryReasons', 'prepAdherenceCounsel', 'condomIssue', 'prescribedPrepInitial', 'doseStrategyStudy', 'pickupLocStudy', 'kitsIssued', 'reasonNotIssued', 'circumcised', 'gbvServices', 'patientReferrals', 'missedMedReasons', 'OtherDiscontReasonSpecify']) {
    assert.equal(fields[id], undefined, id);
  }
  const source = JSON.parse(fs.readFileSync(path.join(root, 'configuration/backend_configuration/ampathforms/poc clinical encounter form v1.3.json'), 'utf8'));
  const sourcePopulation = [...walk(source)].find(value => value.id === 'popType');
  assert.deepEqual(fields.popType.questionOptions.answers, sourcePopulation.questionOptions.answers);
});

test('visit-specific removals do not delete retained follow-up questions', () => {
  for (const id of ['refillPlace', 'scheduledVisit', 'stiSymptoms', 'hpiText', 'currSideEffect', 'liver', 'kidney', 'probAdded']) {
    assert.equal(shown(id, initial), false, id);
    assert.equal(shown(id, returning), true, id);
  }
  for (const id of ['sdp', 'otherSpecify', 'htsname', 'referralFacility', 'assNote', 'pickupLoc']) {
    assert.equal(shown(id, initial), true, id);
    assert.equal(shown(id, returning), false, id);
  }
  assert.deepEqual(fields.sdp.questionOptions.answers.map(answer => answer.label).sort(), ['Community', 'Facility']);
  assert.equal(values('prepVisitType').length, 4);
  assert.equal(shown('prepStatus', initial), true);
  const transferOut = fields.prepStatus.questionOptions.answers.find(option => option.concept === OUT);
  assert.equal(evaluate(transferOut.hide.hideWhenExpression, initial), true);
  assert.equal(evaluate(transferOut.hide.hideWhenExpression, returning), false);
  assert.ok(errors('prepStatus', initial, OUT).length);
  assert.equal(shown('drugsWorkspaceLauncher', { ...initial, prepStatus: STOP }), false);
});

test('transit and transfer require source facility, initiation date and PrEP type', () => {
  for (const type of [TRANSIT, TRANSFER]) {
    const state = { ...returning, prepVisitType: type };
    for (const id of ['sourceFacility', 'prepStartDate', 'prepMethodFem']) {
      assert.equal(shown(id, state), true, id);
      assert.ok(errors(id, state, '').length, id);
    }
    assert.equal(shown('sourceFacility', returning), false);
    assert.equal(errors('prepStartDate', state, '2026-09-11').length, 1);
    assert.equal(errors('prepStartDate', state, '2026-09-10').length, 0);
    assert.equal(shown('currentPrepRegimen', { ...state, prepMethodFem: DAILY }), true);
    assert.equal(shown('currentPrepRegimen', { ...state, prepMethodFem: CAB }), false);
    assert.equal(shown('currentPrepRegimen', { ...state, sex: 'M', prepMethodMale: EVENT }), true);
    assert.equal(shown('currentPrepRegimen', { ...state, sex: 'M', visitTypeUuid: '9ea74334-1e1c-4071-81ef-70a919aafa50', prepMethodMaleStudy: DAILY }), true);
  }
});



test('STI, adverse reaction and treatment details are conditional', () => {
  for (const [child, parent] of [['signsSTI', 'stiSymptoms'], ['sideEffectype', 'currSideEffect'], ['reaction', 'currSideEffect'], ['action', 'currSideEffect'], ['liverTreatment', 'liver'], ['kidneyTreatment', 'kidney']]) {
    assert.equal(shown(child, { ...returning, [parent]: N }), false, child);
    assert.equal(shown(child, { ...returning, [parent]: Y }), true, child);
    assert.ok(errors(child, { ...returning, [parent]: Y }, '').length, child);
    assert.equal(errors(child, { ...initial, [parent]: Y }, '').length, 0, child);
  }
  assert.equal(fields.action.questionOptions.rendering, 'multiCheckbox');
});

test('CABOTEGRAVIR initiation is blocked for pregnancy and breastfeeding', () => {
  for (const patch of [{ pregnancyStatus: answer('pregnancyStatus', 'Pregnant'), breastfeeding: N }, { pregnancyStatus: answer('pregnancyStatus', 'Not pregnant'), breastfeeding: Y }]) {
    const state = { ...initial, prepTypeF: CAB, ...patch };
    assert.ok(errors('prepTypeF', state, CAB).length);
    assert.equal(shown('drugsWorkspaceLauncher', state), false);
    const otherwiseHealthy = { ...state, pregnancyStatus: answer('pregnancyStatus', 'Not pregnant'), breastfeeding: N };
    assert.equal(shown('drugsWorkspaceLauncher', otherwiseHealthy), true);
  }
});

test('pregnant/breastfeeding clients may continue existing CAB only, including transfers', () => {
  const base = { ...returning, doseStrategyF: LONG, PrepDrugsPlanLong: CAB,
    pregnancyStatus: answer('pregnancyStatus', 'Pregnant'), breastfeeding: N, continuingCab: Y };
  assert.equal(shown('drugsWorkspaceLauncher', base), true);
  assert.equal(errors('PrepDrugsPlanLong', base, CAB).length, 0);
  for (const patch of [{ continuingCab: N }, { continuingCab: undefined }, { prepStatus: SWITCH }, { prepStatus: RESTART }]) {
    const state = { ...base, ...patch };
    assert.equal(shown('drugsWorkspaceLauncher', state), false);
    assert.ok(errors('PrepDrugsPlanLong', state, CAB).length);
  }
  for (const visit of [TRANSFER, TRANSIT]) {
    assert.equal(shown('drugsWorkspaceLauncher', { ...base, prepVisitType: visit, prepMethodFem: CAB }), true);
    const conflictingHistory = { ...base, prepVisitType: visit, prepMethodFem: DAILY };
    assert.equal(shown('drugsWorkspaceLauncher', conflictingHistory), false);
    assert.ok(errors('continuingCab', conflictingHistory, Y).length);
  }
});

test('Dapivirine ring is available in the female long-acting regimen list only', () => {
  assert.ok(values('PrepDrugsPlanLong').includes(RING));
  assert.ok(!values('PrepDrugsPlanLongM').includes(RING));
  const state = { ...returning, doseStrategyF: LONG, PrepDrugsPlanLong: RING };
  assert.equal(shown('PrepDrugsPlanLong', state), true);
  assert.equal(errors('PrepDrugsPlanLong', state, RING).length, 0);
  assert.equal(shown('drugsWorkspaceLauncher', state), true);
  assert.equal(shown('PrepDrugsPlanLong', { ...state, sex: 'M' }), false);
});

test('duration is a positive whole number using exactly one applicable unit', () => {
  for (const value of [-1, 0, 1.5, 'abc']) {
    assert.ok(errors('months', initial, value).length, String(value));
    assert.ok(errors('noDays', initial, value).length, String(value));
  }
  assert.equal(errors('months', initial, 1).length, 0);
  assert.equal(errors('noDays', { ...initial, months: 1 }, undefined).length, 0);
  assert.ok(errors('months', { ...initial, noDays: 28 }, 1).length);
  const event = { ...returning, sex: 'M', doseStrategy: EVENT };
  assert.equal(shown('months', event), false);
  assert.equal(shown('noDays', event), true);
  assert.ok(errors('noDays', { ...event, months: 1 }, '').length);
  const daily = { ...returning, doseStrategyF: DAILY };
  assert.equal(shown('months', daily), true);
  assert.equal(shown('noDays', daily), false);
  assert.ok(errors('months', { ...daily, noDays: 28 }, '').length);
});

test('switch, discontinuation and transfer-out paths require their own details', () => {
  assert.ok(fields.switchReason.questionOptions.answers.some(answer => answer.label === 'Stock out'));
  const state = { ...returning, prepStatus: SWITCH };
  assert.equal(shown('switchReason', state), true);
  assert.ok(errors('switchReason', state, []).length);
  for (const plan of [STOP, OUT]) {
    const state = { ...returning, prepStatus: plan };
    assert.equal(shown('prepPrescribed', state), false);
    assert.equal(shown('drugsWorkspaceLauncher', state), false);
    assert.equal(shown('tca', state), false);
    const detail = plan === STOP ? 'discontinuedReasons' : 'transferOutFacility';
    assert.equal(shown(detail, state), true);
    assert.ok(errors(detail, state, '').length);
  }
});

test('appointments require a future return date and use the project workspace', () => {
  assert.ok(errors('tca', initial, '2026-09-09').length);
  assert.ok(errors('tca', initial, '2026-09-10').length);
  assert.equal(errors('tca', initial, '2026-09-11').length, 0);
  assert.equal(shown('appointmentWorkspaceLauncher', initial), false);
  assert.equal(shown('appointmentWorkspaceLauncher', { ...initial, tca: '2026-09-09' }), false);
  assert.equal(shown('appointmentWorkspaceLauncher', { ...initial, tca: '2026-09-11' }), true);
  assert.equal(fields.appointmentWorkspaceLauncher.questionOptions.workspaceName, 'appointments-form-workspace');
  assert.equal(fields.drugsWorkspaceLauncher.questionOptions.workspaceName, 'order-basket');
});

test('switching to initial hides old returning-visit data and validators', () => {
  const stale = { ...initial, currSideEffect: Y, liver: Y, kidney: Y,
    doseStrategyF: LONG, PrepDrugsPlanLong: CAB, prepPrescribed: Y };
  for (const id of ['discontinuedReasons', 'sideEffectype', 'reaction', 'action', 'liverTreatment', 'kidneyTreatment', 'doseStrategyF', 'PrepDrugsPlanLong']) {
    assert.equal(shown(id, stale), false, id);
    assert.equal(errors(id, stale, '').length, 0, id);
  }
  assert.equal(shown('tca', stale), true);
  assert.equal(shown('tca', { ...returning, transferOutFacility: 'Old transfer destination' }), true);
});


test('eligibility criteria and their dependencies are removed for the planned sticky note', () => {
  const removed = ['confirmedHivNegative', 'highRiskExposureMonth', 'exposureLast72Hours', 'willingToTakePrep', 'medicalEligible'];
  const schema = JSON.stringify(form);
  for (const id of removed) {
    assert.equal(fields[id], undefined, id);
    assert.equal(schema.includes(id), false, id);
  }
  assert.ok(!form.pages.some(page => page.sections.some(section => section.label === 'PrEP Eligibility')));
  assert.equal(fields.acuteHiv.type, 'obs');
  assert.equal(fields.contraindications.type, 'obs');
  assert.equal(fields.continuingCab.type, 'control');
  assert.equal(fields.continuingCab.questionOptions.isTransient, true);
  assert.equal(fields.continuingCab.questionOptions.concept, undefined);
  const oral = answer('prepTypeF', 'Oral');
  assert.equal(shown('prepTypeF', { ...initial, acuteHiv: undefined, contraindications: undefined }), true);
  assert.equal(shown('drugsWorkspaceLauncher', { ...initial, prepTypeF: oral }), true);
  for (const plan of [CONTINUE, SWITCH, RESTART]) {
    const state = { ...returning, prepStatus: plan, doseStrategyF: DAILY, PrepDrugsPlanOral: values('PrepDrugsPlanOral')[0] };
    assert.equal(errors('prepPrescribed', state, Y).length, 0);
    assert.equal(shown('drugsWorkspaceLauncher', state), true);
  }
});


test('clinical population subcategories are shown and required only for their selected category', () => {
  const clinical = JSON.parse(fs.readFileSync(path.join(root, 'configuration/backend_configuration/ampathforms/poc clinical encounter form v1.3.json'), 'utf8'));
  for (const id of ['popType', 'keyPop', 'vulPop']) {
    const source = [...walk(clinical)].find(value => value.id === id);
    assert.deepEqual(fields[id].questionOptions, source.questionOptions);
  }
  for (const state of [initial, returning]) {
    for (const category of values('popType')) {
      for (const id of ['keyPop', 'vulPop']) {
        const selected = category === fields[id].questionOptions.concept;
        const scenario = { ...state, popType: category };
        assert.equal(shown(id, scenario), selected, id);
        assert.equal(errors(id, scenario, '').length > 0, selected, id);
      }
    }
  }
  for (const id of ['keyPop', 'vulPop']) {
    assert.equal(shown(id, { popType: fields[id].questionOptions.concept }), false);
  }
});
