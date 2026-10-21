const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const form = JSON.parse(fs.readFileSync(path.join(__dirname,
  '../configuration/backend_configuration/ampathforms/poc mnch immnunization form v1.1.json')));
const sections = form.pages[0].sections;
const group = sections[0].questions.find(q => q.id === 'immunizations');
const sequence = group.questions.find(q => q.id === 'sequenceNumber');
const vaccines = group.questions.find(q => q.id === 'previousimmAdministered').questionOptions.answers;
const isEmpty = value => value == null || value === '';
const run = (expression, vaccine, value) => vm.runInNewContext(expression, {
  isEmpty, previousimmAdministered: vaccine, myValue: value,
});
const invalid = (vaccine, value) => sequence.validators.some(v =>
  run(v.failsWhenExpression, vaccine, value));

// Exercise the actual form expressions; this does not run the form engine UI.
const limits = [
  ['BCG vaccine', 1, 1],
  ['Oral polio vaccine (OPV)', 0, 4],
  ['Inactivated polio vaccine (IPV)', 1, 2],
  ['DPT/Hep B/Hib', 1, 3],
  ['Pneumococcal conjugate vaccine (PCV 10)', 1, 3],
  ['Rotavirus', 1, 3],
  ['Measles/Rubella', 1, 2],
  ['Measles at 6 months', 1, 1],
  ['Typhoid conjuvate vaccine', 1, 1],
];
for (const [label, min, max] of limits) {
  const vaccine = vaccines.find(v => v.label.trim() === label).concept;
  assert.equal(run(sequence.hide.hideWhenExpression, vaccine), false, label);
  for (let value = min; value <= max; value++) {
    assert.equal(invalid(vaccine, value), false, `${label}: ${value}`);
  }
  for (const value of [min - 1, max + 1, 1.5, -1, 'invalid']) {
    assert.equal(invalid(vaccine, value), true, `${label}: reject ${value}`);
  }
  for (const value of [undefined, null, '']) {
    assert.equal(invalid(vaccine, value), true, `${label}: required blank`);
  }
}
const concept = label => vaccines.find(v => v.label === label).concept;
for (const id of ['sequenceNumber', 'lotNumber', 'expiryDate']) {
  const question = group.questions.find(q => q.id === id);
  const missing = (vaccine, value) => question.validators.some(v =>
    run(v.failsWhenExpression, vaccine, value));
  for (const vaccine of vaccines) {
    for (const blank of [undefined, null, '']) {
      assert.equal(missing(vaccine.concept, blank), true, `${vaccine.label}: ${id} required`);
      assert.equal(missing(undefined, blank), false, `${id}: optional without vaccine`);
    }
    if (question.hide) assert.equal(run(question.hide.hideWhenExpression, vaccine.concept), false);
    if (id !== 'sequenceNumber') {
      assert.equal(missing(vaccine.concept, id === 'expiryDate' ? '2027-01-01' : 123), false);
    }
  }
}
assert.equal(invalid(concept('Oral polio vaccine (OPV)'), 0), false, 'Birth dose 0 is present');
// An existing value must fail when the vaccine changes to one with fewer doses.
assert.equal(invalid(concept('DPT/Hep B/Hib'), 3), false);
assert.equal(invalid(concept('BCG vaccine'), 3), true);
const vitaminA = sections[1].questions.find(q => q.label === 'Vitamin A capsules:');
assert(vitaminA.questions.some(q => q.id === 'vitaminASequenceNumber'));
assert(!vitaminA.questions.some(q => q.id === sequence.id));
console.log('Immunization sequence checks passed for all 9 configured vaccines.');
