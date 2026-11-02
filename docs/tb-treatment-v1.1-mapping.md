# TB treatment v1.1: TB 5 card mapping

Reference: the attached February 2025 TB 5 Patient Record Card (MOH/DNTLDP/PRC/01), pages 1–3.

The form preserves the supplied v1.1 metadata and reuses concepts from repository forms and the live AMPATH concept dictionary. No concept definitions were created or changed. Patient demographics and identifiers remain part of patient registration rather than being duplicated as clinical observations.

## Changes supported by existing concepts

- TB card/register serial number, using the dictionary's Text concept REGISTER SERIAL NUMBER.
- Separate supporter address and telephone concepts, correcting the supplied form's use of the address concept for the telephone field.
- County and sub-county, using the existing county answer list; the legacy district field remains available.
- Other occupation text, shown when Other is selected.
- Recurrent patient labels retain the existing smear-positive and smear-negative relapse concepts; these are not merged into an invented recurrent concept.
- Severity is available for both pulmonary and extra-pulmonary disease, with the card's lymphadenitis guidance. Severity remains a clinician-entered classification.
- Xpert MTB and LF LAM results with dates. The Xpert field does not represent TruNat or XDR testing.
- Repeatable dated sputum microscopy and culture/sensitivity entries. Existing serial number and quantity concepts are retained.
- Dated chest X-ray findings, recorded at the corresponding encounter.
- BMI, BMI-for-age Z-score and MUAC (mm), alongside existing height, weight and random blood sugar. Nutrition interventions allow multiple selections.
- Dated viral load and CD4 count; separate patient and partner HIV question IDs, with a date for partner HIV status.
- Opportunistic infection prophylaxis using the existing drug/strength answer set and the observation date for its start date.
- Current TB drug combination, using the existing regimen concept and answers.
- Per-visit clinical notes, including the card's initial/follow-up documentation prompts. The vitals section was removed at the user's request.
- Required visit type (New or Follow-up), using the existing visit-type question and initial/return encounter answer concepts.
- Existing outcome, adverse effect, comorbidity, ART and return visit fields remain available.

## Card fields without a verified exact mapping

These fields have not been assigned an unrelated concept or given fabricated UUIDs:

- Sub-county TB registration number/date, school/employer address and card-specific registration identifiers.
- Prisoner/refugee occupation categories and a single unsplit Recurrent answer.
- TruNat, XDR, TB LAMP, and line probe assay 1/2 results, including fluoroquinolone susceptibility.
- An explicit treatment-month field. Follow-up microscopy is repeatable and dated; monthly nutrition, X-rays and regimen changes are recorded in their corresponding encounters. There are no separate month 0–12 columns or automatic month calculations.
- Complete duration-based regimen answers: 2RHZE/2RH, 2RHZE/4RH and 2RHZE/10RH. Current RHZE/RH drug combinations do not encode these complete schedules.
- Separate modified ART regimen/date fields and the full range of unspecified other prophylaxis drugs.
- A dedicated TB differentiated-care Yes/No field. The existing HIV differentiated-care plan is not used as a substitute.
- Discrete pediatric classification checklist items. The form does not automatically classify disease or prescribe a regimen from these criteria.

The existing county answer list covers six counties; it has not been expanded with unverified county concepts.

## Validation

Checked JSON parsing, unique/trimmed question IDs, mappings on every observation/group, shown-date validators, unchanged top-level metadata, and that every concept reference already exists in another repository form, the supplied v1.1 form, or the verified live dictionary records below. No live OpenMRS form-rendering or submission test was available in this repository.

## Live dictionary verification

Read-only searches were performed in the [AMPATH dictionary](https://kibana.ampath.or.ke/openmrs/dictionary/index.htm). No dictionary records were edited.

| Field | Existing concept | UUID | Datatype | Verification |
| --- | --- | --- | --- | --- |
| Supporter address | ADDRESS OF TREATMENT SUPPORTER (10872) | `82f3f1dd-a5ba-4be8-9c26-44683043317f` | Text | [Concept record](https://kibana.ampath.or.ke/openmrs/dictionary/concept.htm?conceptId=10872) |
| Supporter phone | TELEPHONE NUMBER OF TREATMENT SUPPORTER (10873) | `f3b6f1ed-3686-4ac3-b0d7-cb00c52ebdb1` | Text | [Concept record](https://kibana.ampath.or.ke/openmrs/dictionary/concept.htm?conceptId=10873) |
| Card/register serial | REGISTER SERIAL NUMBER (10941) | `566967a6-f4e6-437f-91a5-9bbf00005049` | Text | [Concept record](https://kibana.ampath.or.ke/openmrs/dictionary/concept.htm?conceptId=10941); description explicitly uses encounter type to distinguish registry serial numbers |

Searches included TRUNAT, TRUENAT, LAMP, LINE PROBE, XDR, RHZE, TREATMENT MONTH, TUBERCULOSIS REGISTRATION, REGISTRATION, OCCUPATION, DIFFERENTIATED, SERIAL and TB. No exact suitable mappings were identified for the outstanding fields listed above. Search results do not prove that a concept does not exist under a different name.

The downloaded dictionary CSV contains only 1,376 records, ending at concept ID 1864, and has no UUID column. It was supplemented with live searches and concept detail pages rather than treated as a complete export.

ON TUBERCULOSIS TREATMENT, MONTHS (1645; `a89eaa88-1350-11df-a1f1-0026b9348838`) was inspected and excluded: it asks retrospectively how many months the patient took TB medicine and only offers months 3–8. It cannot accurately represent the card's baseline/month 1–12 visit columns. XDR-TB was a diagnosis match, not an XDR assay result, so it was not used for the card's test field. The live OCCUPATION answer list does not include prisoner/refugee categories.

## Four-page workflow and validation

The schema is saved at `configuration/backend_configuration/ampathforms/poc tb treatment form v1.1.json` with four pages:

1. Patient Details: visit type/date/provider/location, intake details, supporter information, patient type and conditional transfer-in details.
2. Patient History: clinical-form complaints/history, follow-up progress and mental health review, comorbidities, HIV/ART review and prophylaxis.
3. Patient Examination: general/physical examination, initial TB classification, investigations and nutrition assessment/support.
4. Patient Management: ADR assessment, follow-up adherence/counselling, TB regimen, assessment/management, referrals, treatment outcome and return date.

The repeating complaints block and history question come from `poc clinical encounter form v1.4.json` (Complaints and History of complaints). Their existing concepts and complaint answer set are reused. A duplicate swallowing-pain answer concept is listed once. HIV/refill-specific visibility rules and the source's undefined `complaintsToday` reference are replaced with TB-specific conditions. No concepts or answers were created.

Visit type is required. Intake sections and TB classification appear for New; progress review and adherence/counselling appear for Follow-up. Complaints/history and the shared clinical assessments remain available for both types; history is required for New, and follow-up progress review is required for Follow-up. Other clinical sections remain hidden until a visit type is selected. Vitals remain removed.

Validations cover:

- Complaint selection (including None); Other text required only for Other; duration/onset shown and required only for an actual complaint; duration must be a nonnegative whole number of days.
- Required initial treatment start/patient type/TB classification; conditional pulmonary classification, extra-pulmonary site and pediatric severity; transfer-in date/facility only for New transfer-in patients; conditional other occupation/site/comorbidity text.
- HIV result dates for Positive/Negative; ART details only for HIV-positive patients on ART; viral load/CD4 fields only for HIV-positive patients; no prophylaxis date for None or partner test date for No partner/Unknown/Declined.
- ADR drug rows only when ADRs are present; comorbidity None cannot coexist with another selection.
- Complete microscopy method/result/date for entered specimen rows; dated culture results; colony/susceptibility fields only when there is growth; a drug cannot be both resistant and sensitive.
- Non-future encounter and clinical dates; result dates on or before the encounter; outcome date on/after a supplied treatment start date; transfer-in date on/after supplied enrollment date; outcome date required only after selecting an outcome; RTC after the encounter and hidden for Death.
- Follow-up adherence assessment and counselling notes for Fair/Poor adherence; examination and assessment/management documentation.

Verification checked JSON, four-page structure, unique IDs, preserved metadata, existing concept provenance and absence of copied clinical-form dependencies. All 127 skip/validation expressions were compiled and evaluated using form-helper equivalents, with scenarios for visit switching, None/Other complaints, transfer-in, HIV/ART, ADRs, culture contradictions, dates, outcomes and adherence. Date-expression checks used a day-comparison implementation of the moment methods in the schema. These checks do not replace live OpenMRS rendering/submission testing.

## Order entry

Clinical-form workspace launchers are available for both New and Follow-up visits: Lab Order (`add-lab-order`) and Radiology & Imaging Order (`order-basket`, existing radiology order-type UUID) under Patient Examination > Investigations and Results; Prescribe Drug(s) (`order-basket`) under Patient Management > TB Treatment. They remain hidden until a visit type is selected. No order is created merely by opening or completing the TB schema; orders are entered through the existing workspaces. No concepts were added. Workspace configuration and visit-type expressions were checked; live order entry was not tested.
