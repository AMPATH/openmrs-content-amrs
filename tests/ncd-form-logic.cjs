const fs=require('fs'),assert=require('assert'),vm=require('vm');
const path=require('path');
const form=JSON.parse(fs.readFileSync(path.join(__dirname,'../configuration/backend_configuration/ampathforms/poc ncd encounter form v1.1.json')));
function* walk(x){if(Array.isArray(x)){for(const v of x)yield* walk(v);}else if(x&&typeof x==='object'){yield x;for(const v of Object.values(x))yield* walk(v);}}
const q=Object.fromEntries([...walk(form)].filter(x=>x.id&&x.questionOptions).map(x=>[x.id,x]));
const ids=[...walk(form)].filter(x=>x.id&&x.questionOptions).map(x=>x.id);
assert.equal(ids.length,new Set(ids).size,'Question IDs must be unique');
const expressions={ids,expressions:[...walk(form)].flatMap(x=>Object.entries(x).filter(([k,v])=>k.endsWith('Expression')&&typeof v==='string').map(([,v])=>v))};
const isEmpty=v=>v==null||v===''||(Array.isArray(v)&&v.length===0);
const contains=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.some(v=>b.includes(v));
// Date-only shim for expression logic checks; this is not a form-engine integration test.
function moment(v){if(!(this instanceof moment))return new moment(v);this.date=new Date(v);this.diff=o=>(this.date-o.date)/86400000;this.isAfter=o=>!isNaN(this.date)&&!isNaN(o.date)&&this.date.toISOString().slice(0,10)>o.date.toISOString().slice(0,10);this.isSame=o=>!isNaN(this.date)&&!isNaN(o.date)&&this.date.toISOString().slice(0,10)===o.date.toISOString().slice(0,10);}
const defaults={...Object.fromEntries(expressions.ids.map(id=>[id,undefined])),age:45,sex:'F',myValue:undefined,encDate:'2026-10-19',moment,isEmpty,arrayContainsAny:contains,_:{isEmpty},HD:{getObject:()=>({getValue:()=>undefined})}};
function run(e,values={}){return vm.runInNewContext(e,{...defaults,...values});}
function visible(id,v){return !q[id].hide||!run(q[id].hide.hideWhenExpression,v);}
function invalid(id,v){return (q[id].validators||[]).filter(x=>x.type==='js_expression').some(x=>run(x.failsWhenExpression,v));}
let checks=0;function check(value){assert(value);checks++;}
check(q.diseaseType.questionOptions.rendering === 'select');
for(const id of ['dmType','htnType','htnStage','diagnosisDate','dxYearhtn'])check(!visible(id,{diseaseType:undefined}));
for(const id of ['syst','dias','weight','height','temp','waistCircumference','muac','bmi','bmiScore','bmiCategorization'])check(!q[id]);
for(const e of expressions.expressions){new vm.Script(e);run(e);checks++;}
const yes='a899b35c-1350-11df-a1f1-0026b9348838',no='a899b42e-1350-11df-a1f1-0026b9348838',none='a899e0ac-1350-11df-a1f1-0026b9348838';
const dm='a893436e-1350-11df-a1f1-0026b9348838',htn='a8986880-1350-11df-a1f1-0026b9348838',co='0ac4af8a-1b8e-4404-b445-c0471d6f7576';
for(const visitType of ['ab202fa8-ad2b-487d-83f8-991f8fa109a1','a8a4812e-1350-11df-a1f1-0026b9348838','97772927-7aa2-4c30-be98-85183e4b0efe']){
 check(visible('diseaseType',{visitType}));
 for(const id of ['referralFacility','referralSpecification','referralReason']){check(visible(id,{visitType,referral:yes}));check(!visible(id,{visitType,referral:no}));}
 check(visible('dmType',{visitType,diseaseType:dm}));check(visible('htnType',{visitType,diseaseType:htn}));
}
for(const id of ['dmType','htnType','diaType','htnStage','diagnosisDate','dxYearhtn','footDiabeticRisk'])check(visible(id,{diseaseType:co}));
check(!visible('dmType',{diseaseType:htn}));check(!visible('htnType',{diseaseType:dm}));
check(visible('ComplaintLodgeByClient',{complaintsToday:'a899b5e6-1350-11df-a1f1-0026b9348838'}));check(!visible('ComplaintLodgeByClient',{complaintsToday:'a8a4cb8e-1350-11df-a1f1-0026b9348838'}));
check(visible('nutritionNotes',{nutAssesment:yes}));check(!visible('nutritionNotes',{nutAssesment:no}));
check(!visible('highfootRiskAccess',{diseaseType:htn,footDiabeticRisk:'4fae298d-c3c2-4483-ad31-bea9b637ae2b'}));
for(const id of ['existpecifyComplications','newComplications','tbSymptoms','genExamFindings']){
 check(invalid(id,{myValue:[none,'other']}));check(!invalid(id,{myValue:[none]}));
}
check(invalid('complaintduration',{myValue:1.5}));check(!invalid('complaintduration',{myValue:0}));
for(const id of ['diagnosisDate','dxYearhtn','lmpDate1']){check(invalid(id,{myValue:'2026-10-20'}));check(!invalid(id,{myValue:'2026-10-19'}));}
check(invalid('rtc',{myValue:'2026-10-19'}));check(invalid('rtc',{myValue:'2026-10-18'}));check(!invalid('rtc',{myValue:'2026-10-20'}));
for(const id of ['noTabs','noCaps','noMg','noMl']){check(invalid(id,{myValue:0}));check(!invalid(id,{myValue:1}));}
check(visible('occupation',{visitType:'ab202fa8-ad2b-487d-83f8-991f8fa109a1'}));
check(visible('occupation',{visitType:'97772927-7aa2-4c30-be98-85183e4b0efe'}));
check(!visible('occupation',{visitType:'a8a4812e-1350-11df-a1f1-0026b9348838'}));
check(visible('haartStats',{hivStatus:'a896f3a6-1350-11df-a1f1-0026b9348838'}));
check(!visible('haartStats',{hivStatus:undefined}));
check(!visible('lmpDate1',{sex:'M'}));check(visible('lmpDate1',{sex:'F'}));
// Disease detail fields are mandatory when their existing visibility rules apply.
for(const id of ['dmType','diaType','diagnosisDate','htnType','typeOfHypertension','htnStage','dxYearhtn'])check(q[id].required === false && q[id].validators.some(v=>v.type==='js_expression'&&v.failsWhenExpression.includes('isEmpty(myValue)')));
for(const sex of ['F','M','O']){
 for(const diseaseType of [dm,htn,co,undefined]){
  const dmVisible=diseaseType===dm||diseaseType===co;
  const htnVisible=diseaseType===htn||diseaseType===co;
  for(const id of ['dmType','diagnosisDate'])check(visible(id,{sex,diseaseType})===dmVisible);
  check(visible('diaType',{sex,diseaseType})===dmVisible);
  for(const id of ['htnType','typeOfHypertension','htnStage','dxYearhtn'])check(visible(id,{sex,diseaseType})===htnVisible);
 }
}
// Missing disease details fail only for the active branch, including Co-morbid.
for(const sex of ['F','M'])for(const diseaseType of [dm,htn,co,undefined]){
 for(const id of ['dmType','diaType','diagnosisDate','htnType','typeOfHypertension','htnStage','dxYearhtn']){
  check(invalid(id,{sex,diseaseType,myValue:undefined})===visible(id,{sex,diseaseType}));
 }
}
check(invalid('disabilityTypes',{clientDisability:yes,myValue:undefined}));
check(!invalid('disabilityTypes',{clientDisability:no,myValue:undefined}));
check(!visible('OtherSpecificComplaints',{complaintsToday:'a8a4cb8e-1350-11df-a1f1-0026b9348838',cOmplaIntField:'a8aaf3e2-1350-11df-a1f1-0026b9348838'}));
for(const id of ['frequency','noTabs','noCaps','noMg','noMl']){check(!visible(id,{currDrug:undefined}));check(visible(id,{currDrug:'drug'}));}
const supporter={visitType:'ab202fa8-ad2b-487d-83f8-991f8fa109a1',tSupporterNames:'Supporter'};
for(const phone of ['+254712345678','0712345678','+254 712 345678'])check(!invalid('treatmentSupportedNumber',{...supporter,myValue:phone}));
check(invalid('treatmentSupportedNumber',{...supporter,myValue:'not-a-number'}));
check(!invalid('treatmentSupportedNumber',{...supporter,tSupporterNames:undefined,myValue:'not-a-number'}));
check(invalid('supporterRela',{...supporter,myValue:undefined}));
check(!invalid('supporterRela',{...supporter,tSupporterNames:undefined,myValue:undefined}));
check(!invalid('pregnant',{sex:'M',lmpDate1:'2026-01-01',myValue:undefined}));
check(!invalid('pregnant',{sex:'F',lmpDate1:undefined,myValue:undefined}));
check(invalid('pregnant',{sex:'F',lmpDate1:'2026-01-01',myValue:undefined}));
check(invalid('additionalExamFindings',{genExamFindings:['a8aaf3e2-1350-11df-a1f1-0026b9348838'],myValue:undefined}));
// Conditional requiredness is implemented entirely with JavaScript validators.
check(![...walk(form)].some(x=>x.required&&typeof x.required==='object'));
for(const id of ['nhif','nhifStatus','disabilityTypes','returnVisitType','nonAmpathSpecify','nutritionNotes'])check(q[id].required===false);
for(const visitType of ['ab202fa8-ad2b-487d-83f8-991f8fa109a1','a8a4812e-1350-11df-a1f1-0026b9348838','97772927-7aa2-4c30-be98-85183e4b0efe',undefined]){
 for(const id of ['nhif','returnVisitType','nonAmpathSpecify'])check(invalid(id,{visitType,myValue:undefined})===visible(id,{visitType}));
}
for(const nhif of [yes,no,undefined])for(const visitType of ['ab202fa8-ad2b-487d-83f8-991f8fa109a1','a8a4812e-1350-11df-a1f1-0026b9348838'])check(invalid('nhifStatus',{nhif,visitType,myValue:undefined})===visible('nhifStatus',{nhif,visitType}));
// Investigations use the same lab workspace configuration as clinical encounter.
const clinical=JSON.parse(fs.readFileSync(path.join(__dirname,'../configuration/backend_configuration/ampathforms/poc clinical encounter form v1.3.json')));
const clinicalLabs=[...walk(clinical)].find(x=>x.id==='labsWorkspaceLauncher');
assert.deepStrictEqual(q.labsWorkspaceLauncher.questionOptions,clinicalLabs.questionOptions);checks++;
check(visible('labsWorkspaceLauncher',{}));
for(const id of ['testDetailed','order1','otherTestOrder','rbs_test','fbs_test','urea_test','creatinine_test','a1c_test','chol_test','urinalysisResult','uecResults'])check(!q[id]);
for(const id of ['diagnosisDate','dxYearhtn']){
 const concept=q[id].questionOptions.concept;
 for(const previous of [undefined,null,'','2024-03-10']){
  const requests=[];
  const HD={getObject:name=>{check(name==='prevEnc');return {getValue:key=>{requests.push(key);return previous;}};}};
  check(run(q[id].historicalExpression,{HD})===(isEmpty(previous)?undefined:previous));
  check(requests.every(key=>key===concept));
 }
}
// SHA questions are exclusive to new patients; status also requires coverage=yes.
for(const visitType of ['ab202fa8-ad2b-487d-83f8-991f8fa109a1','a8a4812e-1350-11df-a1f1-0026b9348838','97772927-7aa2-4c30-be98-85183e4b0efe',undefined]){
 const isNew=visitType==='ab202fa8-ad2b-487d-83f8-991f8fa109a1';
 check(visible('nhif',{visitType})===isNew);
 for(const nhif of [yes,no,undefined])check(visible('nhifStatus',{visitType,nhif})===(isNew&&nhif===yes));
}
// Screening outcome follows symptoms and clears when screening/symptoms are cleared.
const outcome=q.tbstatus.questionOptions.calculate.calculateExpression;
check(q.tbstatus.readonly===true);
check(run(outcome,{tbScreening:yes,tbSymptoms:[none]})===none);
for(const answer of q.tbSymptoms.questionOptions.answers.filter(x=>x.concept!==none)){
 check(run(outcome,{tbScreening:yes,tbSymptoms:[answer.concept]})==='260e6d24-1634-4467-a070-e8359f6827f7');
}
check(run(outcome,{tbScreening:yes,tbSymptoms:[none,'symptom']})==='260e6d24-1634-4467-a070-e8359f6827f7');
for(const tbSymptoms of [undefined,[]])check(run(outcome,{tbScreening:yes,tbSymptoms})===null);
// A filled diabetes type cannot leave a hidden duplicate required during submission.
check(!q.diaTypeMale);
check([...walk(form)].filter(x=>x.questionOptions?.concept==='2f1dd9a3-37cc-4943-b540-89b845da02c7').length===1);
for(const sex of ['F','M','O'])for(const diseaseType of [dm,co]){
 for(const value of ['163fe47a-3736-4ab1-bb7d-6e249709247d','266957f4-ec02-4754-a2f6-15449f1ddb03','5553504c-f9d7-4b9e-85b6-ff3ffb7fd8f6']){
  check(visible('diaType',{sex,diseaseType}));
  check(!invalid('diaType',{sex,diseaseType,myValue:value}));
 }
 check(invalid('diaType',{sex,diseaseType,myValue:undefined}));
}
const gestational=q.diaType.questionOptions.answers.find(a=>a.concept==='9c7f8f65-9e48-46de-9e77-61a40e5230fd');
check(!run(gestational.disableWhenExpression,{sex:'F'}));check(run(gestational.disableWhenExpression,{sex:'M'}));
// Symptoms are the direct screening question; None suppresses referral and its validator.
check(!q.tbScreening);check(visible('tbSymptoms',{}));check(q.tbSymptoms.label==='TB screening:');
check(invalid('tbSymptoms',{myValue:undefined}));check(!invalid('tbSymptoms',{myValue:[none]}));
for(const tbSymptoms of [undefined,[],[none]]){
 check(!visible('referTbScreening',{tbSymptoms}));check(!invalid('referTbScreening',{tbSymptoms,myValue:undefined}));
}
for(const a of q.tbSymptoms.questionOptions.answers.filter(a=>a.concept!==none)){
 const tbSymptoms=[a.concept];
 check(visible('referTbScreening',{tbSymptoms}));check(invalid('referTbScreening',{tbSymptoms,myValue:undefined}));
 check(!invalid('referTbScreening',{tbSymptoms,myValue:yes}));check(!invalid('referTbScreening',{tbSymptoms,myValue:no}));
}
check(!expressions.expressions.some(e=>/\btbScreening\b/.test(e)));
console.log(`PASS: ${checks} expression syntax, reference, visibility and validation checks. Date comparisons used a date-only shim; live form-engine verification remains required.`);
