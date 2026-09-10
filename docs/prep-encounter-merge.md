# PrEP encounter form v1.0

The merged form is `configuration/backend_configuration/ampathforms/poc pre exposure encounter form v1.0.json`. It uses the working copies of the initial and follow-up v1.4 forms and the two corrected PrEP review tables supplied on 10 September 2026. The earlier PEP tables do not apply. Neither source form was modified.

## Visit-specific review decisions

| Area | Initial | Follow Up, Transit and Transfer In |
| --- | --- | --- |
| Encounter details | Date, provider, facility, Setting (Community / Facility), population type | Date, provider, facility, population type, refill place, scheduled/unscheduled visit |
| Transfer history | Not displayed | Transit and Transfer In require source facility text, initiation date and PrEP type. County is optional. Oral regimen appears for daily/event-driven oral PrEP, including male study visits. |
| Risk assessment | Retains the free-text “Other” response in its original observation group; removes its deleted checklist dependency | No risk checklist |
| Eligibility criteria | Removed at the user’s request; to be provided in a sticky note | Removed; prescription paths do not depend on the deleted criteria |
| HTS provider | Retained | Removed |
| Clinical assessment | Removes the reviewed chronic illness fields and general clinical notes; retains the final clinical-notes field | Retains STI assessment, clinical notes, adverse reactions, liver/kidney disease and other illnesses, with conditional details |
| PrEP plan | Continue, Switch, Restart and Discontinue are available; Transfer out is replaced by optional facility text. The plan is optional on an Initial visit. | Continue, Switch, Restart, Discontinue, Transfer out. Switch requires reasons including Stock out. Transfer out requires a facility name. |
| Prescribing | PrEP method, initiation date, duration, next pickup location and prescription workspace | Prescribed today, dosing strategy, regimen, duration and prescription workspace. Next pickup location is removed. |
| Referrals / notes | Facility dropdown replaces referral free text; final clinical notes retained | Reviewed referral and final assessment fields removed; follow-up clinical notes retained in Medical Assessment |
| Appointments | Return date and appointment workspace | Return date and appointment workspace, except Discontinue / Transfer out |

Unspecified amendments retain the source choices. The initial and follow-up reviews disagree about retaining several fields; the visit selector preserves each review's intended scope. Transit and Transfer In use returning-visit assessment and planning plus their required source history. “Restart” appears in the plan, not in visit type. Transfer out stays available for all returning visits; it is not an initial-visit plan option.

The discontinuation list contains the five explicitly requested reasons. The existing **Died** reason is also retained because the follow-up comment asks to discuss how to capture death rather than instructing its removal. Selecting it records a discontinuation reason; it does not change the patient's demographic deceased status.

Population type matches `poc clinical encounter form v1.3.json`: General population, Key population and Vulnerable population. Selecting Key or Vulnerable population shows its corresponding required subcategory dropdown, using the clinical form's existing concepts and answer labels. Visibility uses the PrEP visit selector rather than the clinical form's HIV-visit fields. Pregnancy and breastfeeding restrictions continue to use their dedicated assessment fields.

## Validation and skip logic

- Transit / Transfer In source dates and initiation dates cannot be after the encounter date; same-day initiation is allowed.
- The eligibility checklist, eligibility decision field and all dependent rules are removed. The original acute HIV symptoms and contraindications questions remain as baseline clinical assessment fields. They do not gate the prescription workspace. The sticky note itself has not been added.
- STI details, reaction description/severity/actions, liver/kidney treatment, and switching/discontinuation details are required only on their applicable paths. Reaction actions allow multiple selections.
- CAB-LA labels are expanded to CABOTEGRAVIR (CAB-LA). Pregnancy and breastfeeding are checked when CABOTEGRAVIR is selected for a female client. During pregnancy or breastfeeding it is permitted only for uninterrupted existing treatment under Continue, including concordant CABOTEGRAVIR source history for Transit / Transfer In. Initiation, Switch and Restart are blocked. Pregnancy must be known before the prescription launcher is offered.
- Dapivirine ring uses the concept already referenced by `drugs.csv` and is available in the female returning-visit long-acting regimen list and female incoming history.
- Durations must be positive whole numbers. Daily oral follow-up uses months; event-driven follow-up uses days. Other paths allow either unit, but require exactly one.
- Return dates must be later than the encounter date. Old hidden values from other visit/plan paths do not make their dependent questions required.

## Supporting metadata and integrations

No new concepts are defined. The previously added concept CSV was removed at the user's request. The following mappings were verified against existing JSON schemas:

| Merged field | Existing concept UUID | Source schema and field |
| --- | --- | --- |
| `prepVisitType` | `a89ff9a6-1350-11df-a1f1-0026b9348838` | `poc ncd encounter form v1.1.json`, `visitType` |
| `breastfeeding` | `a8a18208-1350-11df-a1f1-0026b9348838` | `poc youth initial encounter form v2.1.json`, `breFeeding` (Mother breastfeeding?) |
| `sourceFacility` | `a8a06fc6-1350-11df-a1f1-0026b9348838` | `poc ncd encounter form v1.1.json`, `nonAmpathSpecify` (facility transferred from, free text) |
| `transferOutFacility` | `e8876675-76e1-4e15-a7c5-d4046ff97e3a` | `poc mental health treatment form v1.0.json`, `otherTransferFacility` (name of transfer facility, free text) |

The exposure-window, willingness, HIV-status-for-eligibility and final eligibility fields have been removed at the user's request, along with their validation and skip-logic dependencies. Only `continuingCab` remains a transient control without a concept UUID. It supports the separately requested CABOTEGRAVIR continuation restriction; its answer is not saved as an observation and must be confirmed again when editing.

As requested, all visit paths use the existing PrEP follow-up encounter type, `PREPRETURN` (`ddd96f1c-524f-4caa-81a6-1a6f9789a4bc`). The recorded PrEP visit-type observation distinguishes Initial, Follow Up, Transit and Transfer In. No new encounter type is added.

The form follows the repository's existing workspace-launcher patterns: `order-basket` for prescriptions and `appointments-form-workspace` for appointments. The appointment button opens that workspace after a valid return date is entered; it does not itself create an appointment or automatically copy the return date into the appointment workspace. The facility dropdown uses the `location` datasource, without a tag filter, and therefore depends on facilities present in the server's location catalog.

LMP already exists in **Triage → Anthropometrics** in `poc triage encounter form v1.2.json`, with a future-date restriction. Duplicate PrEP entry is removed. No triage files were modified. Displaying that observation in a separate patient-chart vitals widget is a frontend integration concern and has not been verified in a live application.

Violence questions and the separate violence-form link are omitted following the user's instruction to add them when the form is available.

## Verification

Run `node --test tests/prep-encounter-form.test.cjs` from the repository root. The 16 tests cover ID uniqueness, removed fields, existing concept provenance, transient controls, expression references, visit branches, source history, removal of eligibility dependencies, conditional details, CABOTEGRAVIR, Dapivirine, durations, transfers, appointments and stale values. Tests execute the actual JSON expressions, with small fixtures for form-engine helpers and calendar-date comparison; they are not browser integration tests.

All concept references were checked against other existing JSON schemas or the existing drug catalog. Maven was not available locally, so the package build was not run. Runtime rendering, form import, location loading, order submission and appointment creation still need verification in the deployed OpenMRS application.
