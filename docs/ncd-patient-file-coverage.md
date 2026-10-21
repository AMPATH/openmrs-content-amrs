# NCD encounter form and July 2022 patient file

Source: Ministry of Health Diabetes and Hypertension Patient File, revised July 2022, supplied as `Patient file 2022 .pdf` (22 pages). Pages 1-4 contain the enrollment and visit variables; pages 5-14 repeat the visit template; pages 16-20 provide continuation notes. Pages 21-22 are reference material, not additional encounter questions.

The combined form was updated in place. No concept definitions, concept CSVs, encounter types or form identity metadata were created or changed. Existing unrelated working-tree edits were preserved.

## Coverage

| Paper variables | Form representation |
| --- | --- |
| Patient file number, name, sex, DOB, patient mobile, county, subcounty, ward, village/landmark | Patient registration/demographics; not duplicated as clinical observations. Verify these are populated in the patient chart. |
| Enrollment date | First enrollment encounter date when identical; a different historical enrollment date must be explicitly recorded in continuation notes. No suitable NCD-specific date concept was found locally. |
| Occupation, education, disability | Existing coded concepts; occupation and education shown for new/transfer-in enrollment. |
| Treatment supporter name, contact, relationship | Existing supporter name/contact observations and existing relationship person attribute. Contact and relationship appear after entering a supporter name. |
| Facility name, MFL code, facility level | Encounter location supplies the facility identity; MFL/level remain location metadata. Continuation notes can record missing paper details. |
| NHIF enrollment | Existing NCD enrollment form uses SHIF/SHA coverage/status concepts and labels. These appear only for New patients; coverage status additionally requires coverage Yes. They do not establish historical NHIF enrollment. An exact historical NHIF field remains unmapped. |
| New, transfer in, return visit category | Existing visit type and return visit type; transfer facility required only for transfer-in. |
| Referral, source, facility, reason | Referral yes/no available for every visit; details only on yes. Existing coded reason retained, with existing free-text referral reason added. |
| Current treatment | Existing repeating drug/dose/frequency entries plus existing current-treatment narrative for other therapies. |
| Diabetes, hypertension, co-morbidity, new/known status, diagnosis date, DM type, HTN stage | Disease type is single-select and available on every visit; co-morbidity enables both DM and HTN details. Visible DM/HTN status, disease subtype, hypertension stage and diagnosis dates are required, including the user-added hypertension-type question. Dates retain full dates rather than introducing numeric-year concepts. DM and HTN diagnosis dates show the previous encounter value through the existing historical-expression mechanism; absent history stays blank. |
| HIV status, HAART | Existing status; HAART only for HIV-positive patients. |
| BP readings, weight, height, BMI, BMI-for-age, nutritional status, temperature, waist and MUAC | Supplied by the triage workflow per user instruction. No duplicate vitals/anthropometry entry fields or second-BP narrative prompt in this NCD form. |
| Complaints/history | Missing complaint controller restored using the original enrollment form's actual coded yes/no answers; complaint details only on yes. History available on every visit. |
| TB screening, features, status, referral | The TB screening question directly lists symptoms and None; the separate done yes/no question is removed. Referral is shown and required through JavaScript only when a symptom other than None is selected. Outcome is read-only and calculated: None alone yields Not presumed TB; any symptom yields Presumed TB; no symptoms selected leaves the outcome blank. None remains mutually exclusive with symptoms. |
| TB investigations requested and results | The Lab Order launcher provides access to the configured laboratory test catalog. Requests and results are handled through the laboratory workflow. |
| Tobacco, alcohol, activity, diet | Existing lifestyle fields retained. Additional diet history can be documented in nutrition assessment. |
| Pregnancy/LMP | Existing pregnancy field retained; LMP restored using its existing concept. Both limited to female patients; LMP cannot follow the encounter date. |
| Existing/new complications | Existing distinct concepts retained; none is exclusive. Other complications require explanation in continuation notes. |
| General and system examination | Existing coded findings retained; existing additional-examination text concept records labelled comments for each system and other findings. Single-select exam options allow changing an initial normal answer. |
| Foot risk criteria, diabetic foot/type | Existing high/low risk and criteria; restricted to DM/co-morbidity; diabetic foot description required in examination comments when yes. |
| All laboratory investigations | Use the clinical encounter form's Lab Order workspace launcher (`add-lab-order`). Embedded test-order lists and all investigation result-entry fields are removed. Results are handled by the laboratory workflow. |
| Diagnoses | Existing primary and secondary diagnosis controls retained. |
| Lifestyle advice and remarks | Existing advice choices retained; tobacco/herbal/alternative therapy and other advice remarks in continuation notes. |
| Nutrition assessment, meal planning, calorie calculation, nutrient distribution, monitoring/evaluation, nutrition notes | Existing nutrition-assessment text concept with explicit prompts for each item, shown and required when assessment done is yes. These remain narrative items, not independently coded yes/no variables. |
| Prescriptions, dose/frequency/duration | Existing prescribing workspace retained; medication order details are recorded there. |
| TCA, provider name/designation/signature | Existing return-to-clinic date, appointment launcher and encounter provider. Provider designation/signature remain authenticated encounter/workflow metadata; no handwritten-signature field added. |
| Continuation notes/date | Existing clinical-notes text concept, encounter date and instructions to date additional narrative entries. |

## Validation and limitations

- Positive dose quantities; non-negative whole complaint duration. Vitals and anthropometry are captured in triage.
- Diagnosis/LMP/result dates cannot follow the encounter; visit cannot be in the future; return date must be after the encounter.
- None/normal cannot accompany other multi-select findings; disabling works in both selection directions.
- Nested foot criteria also check disease selection, so a stale risk value cannot expose them after changing disease.
- Active DM/HTN details use only visibility-aware `js_expression` missing-value validators tied to diseaseType; Co-morbid requires both pathways. Disability types and supporter relationship are required only in their visible branches. Other complaints check the complaints parent; medication frequency/doses appear only after drug selection.
- Supporter phone validation accepts an optional country-code plus sign; hidden supporter contacts and LMP-dependent pregnancy checks are guarded against inactive branches. Other general examination findings require an explanation. Numeric entries reject non-numeric values.
- Laboratory result entry and its validation belong to the laboratory workflow; no result-entry controls remain in the NCD form.
- Existing repository UUIDs establish local reuse, not presence or datatype compatibility on a running server.
- No live OpenMRS/form-engine session was available. Preview/save/reopen checks, hidden-value clearing, person-attribute persistence, previous diagnosis values and order/prescription launchers still need runtime verification.

## Verification

Run `node tests/ncd-form-logic.cjs` with Node.js. The check exercises expression syntax/references, referral and visit branches, co-morbidity, complaints, TB, pregnancy/LMP, foot criteria, nutrition visibility, exclusivity, dose quantities, date boundaries, previous diagnosis values, laboratory launcher configuration, absence of result fields and absence of duplicate triage fields. Date comparisons use a small date-only shim; these are logic checks, not an integration test of Moment or the form engine.

A separate comparison against the pre-edit snapshot and the repository confirmed that all referenced concept UUIDs already existed, all question IDs are unique, and form/encounter identity metadata is unchanged.

Exact separate coded capture for historical NHIF, historical NCD enrollment date, each nutrition-process checkbox still needs suitable **existing** server mappings. No new concepts were generated to fill those gaps.

## Diabetes-type submission fix

Use a single diabetes-type question for all patients, sharing the original concept and retaining disease-based requiredness through JavaScript validation. The previous sex-specific duplicate could require an invisible unanswered control. Gestational diabetes remains disabled for non-female patients, preserving the previous answer availability. Regression checks cover empty and completed values for DM/co-morbid patients of each sex.

All conditional required fields use `required: false` and a visibility-aware `js_expression` validator. This includes disease details, nested complaint details, referrals, enrollment/SHA details, foot assessment and nutrition notes. Unconditional required fields retain their standard required flag.
