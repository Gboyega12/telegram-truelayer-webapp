// Bocy Enrichment Engine — financial analysis core
// Ported from web app, adapted for React Native (no browser deps)
import MERCHANT_DB from './merchant-db';
import ARCHETYPES, { SUB_TRAITS, STRENGTH_RULES, BLINDSPOT_RULES } from './archetypes';
import { ESSENTIAL_CATEGORIES, UK_BENCHMARKS } from './constants';

class EnrichmentEngine {
async enrich(rawCSV, onStatus) {
const allTx=[];

// Step 1: Parse CSV
onStatus?.('Parsing your files...');
const txs=this.parseCSV(rawCSV);
allTx.push(...txs);

allTx.sort((a,b)=>(a.date||0)-(b.date||0));

// Filter to last 4 months for accurate behavioral analysis
const _datedAll=allTx.filter(tx=>tx.date);
if(_datedAll.length>=2){const _latest=new Date(Math.max(..._datedAll.map(tx=>tx.date.getTime())));const _cutoff=new Date(_latest);_cutoff.setMonth(_cutoff.getMonth()-4);const _keep=allTx.filter(tx=>!tx.date||tx.date>=_cutoff);if(_keep.length>=5){allTx.length=0;allTx.push(..._keep)}}

// Step 2: Local merchant identification
onStatus?.('Identifying merchants...');
const enriched=allTx.map(tx=>this.enrichTransaction(tx));

// Step 4: Build profile
onStatus?.('Building your profile...');
const recurring=this.detectRecurring(enriched);
const profile=this.buildProfile(enriched,recurring);
const archetype=this.determineArchetype(profile);
const traits=SUB_TRAITS.filter(t=>{try{return t.check(profile)}catch{return false}}).slice(0,4);
const strengths=STRENGTH_RULES.filter(r=>{try{return r.check(profile)}catch{return false}}).slice(0,3).map(r=>r.text);
const blindSpots=BLINDSPOT_RULES.filter(r=>{try{return r.check(profile)}catch{return false}}).slice(0,3);
const peerComparison=this.calcPeerComparison(profile);
const insights=this.genInsights(profile);
const potentialSavings=this.calcSavings(profile);

// Step 5: Decision intelligence
onStatus?.('Analysing your decisions...');
const behavioralPatterns=this.detectBehavioralPatterns(enriched);
const decisionScore=this.calcDecisionScore(profile);
const decisionStack=this.genDecisionStack(profile,recurring,behavioralPatterns);
const compoundCosts=this.calcCompoundCost(profile);
const playbook=archetype.genPlaybook?archetype.genPlaybook(profile):null;

return{profile,archetype,traits,strengths,blindSpots,peerComparison,insights,potentialSavings,decisionScore,decisionStack,behavioralPatterns,compoundCosts,playbook,subscriptions:profile.subscriptions,enrichedTransactions:enriched};
}

parseCSV(raw){
const lines=raw.trim().split('\n'),txs=[];
let headers=[],start=0;
for(let i=0;i<Math.min(10,lines.length);i++){
const l=lines[i].toLowerCase();
if(['date','description','amount','debit','credit'].some(k=>l.includes(k))){
headers=lines[i].split(',').map(h=>h.toLowerCase().replace(/"/g,'').trim());
start=i+1;break;
}}
const di=headers.findIndex(h=>h.includes('date'));
const desc=headers.findIndex(h=>['description','transaction','details','narrative','merchant','name'].some(k=>h.includes(k)));
const ai=headers.findIndex(h=>h.includes('amount'));
const deb=headers.findIndex(h=>['debit','out','money out'].some(k=>h.includes(k)));
const cred=headers.findIndex(h=>['credit','in','money in'].some(k=>h.includes(k)));

for(let i=start;i<lines.length;i++){
if(!lines[i].trim())continue;
const cols=this.parseLine(lines[i]);
if(cols.length<2)continue;
let amt=0;
if(ai>=0&&cols[ai])amt=parseFloat(cols[ai].replace(/[^0-9.-]/g,''))||0;
else{
const db=deb>=0?parseFloat((cols[deb]||'').replace(/[^0-9.-]/g,''))||0:0;
const cr=cred>=0?parseFloat((cols[cred]||'').replace(/[^0-9.-]/g,''))||0:0;
amt=cr-db;if(db>0&&cr===0)amt=-db;
}
const d=cols[di>=0?di:0]||'';
const tx={date:this.parseDate(d),description:cols[desc>=0?desc:1]||'',descNorm:this.norm(cols[desc>=0?desc:1]||''),amount:amt};
if(tx.description.length>1)txs.push(tx);
}
return txs;
}

parseLine(line){const cols=[];let cur='',inQ=false;for(const c of line){if(c==='"')inQ=!inQ;else if(c===','&&!inQ){cols.push(cur.trim());cur=''}else cur+=c}cols.push(cur.trim());return cols.map(c=>c.replace(/^"|"$/g,''))}
parseDate(s){if(!s)return null;
// DD/MM/YYYY or DD-MM-YYYY
let m=s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);if(m)return new Date(m[3],m[2]-1,m[1]);
// YYYY-MM-DD or YYYY/MM/DD
m=s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);if(m)return new Date(m[1],m[2]-1,m[3]);
// DD Mon YYYY (e.g. "15 Jan 2025")
m=s.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i);if(m){const months={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};return new Date(m[3],months[m[2].toLowerCase().slice(0,3)],m[1])}
const d=new Date(s);return isNaN(d)?null:d}
norm(d){return d.toLowerCase().replace(/[^\w\s]/g,' ').replace(/\d{4,}/g,'').replace(/\s+/g,' ').trim()}

// Detect likely person-to-person transfers (names like "JOHN SMITH", "J SMITH") that aren't merchants
_isLikelyPersonName(merchant){
if(!merchant||merchant.length<3)return false;
const m=merchant.toLowerCase();
// Skip known merchant names
if(this._sortedPatterns&&this._sortedPatterns.some(([,data])=>data.name.toLowerCase()===m))return false;
// Common transfer indicators
if(m.includes('transfer')||m.includes('faster payment')||m.includes('standing order'))return true;
// Pattern: 1-2 short words, all letters, no known brand indicators
const words=m.split(/\s+/).filter(w=>w.length>0);
if(words.length>=1&&words.length<=3&&words.every(w=>/^[a-z'-]+$/.test(w))&&!words.some(w=>w.length>12)){
// Likely a person name if it's short alphabetic words with no numbers or special chars
const brandIndicators=['ltd','inc','plc','limited','corp','llp','store','shop','market','cafe','restaurant','gym','club','online','digital','mobile','energy','water','insurance','finance','payroll','services','solutions','group','holdings','accounts','consulting','associates','partners','recruitment','staffing','agency','council','government','bacs','pension'];
if(!words.some(w=>brandIndicators.includes(w)))return true;
}
return false;
}

enrichTransaction(tx){
const n=tx.descNorm;
let lookup=null;let confidence='low';
// Sort patterns by length descending so "uber eats" matches before "uber", "amazon prime video" before "amazon"
if(!this._sortedPatterns)this._sortedPatterns=Object.entries(MERCHANT_DB).sort((a,b)=>b[0].length-a[0].length);
for(const[pattern,data]of this._sortedPatterns){if(data._wordBound){const p=pattern.trim();const idx=n.indexOf(p);if(idx>=0&&(idx===0||n[idx-1]===' ')&&(idx+p.length>=n.length||n[idx+p.length]===' ')){lookup=data;confidence='high';break}}else if(n.includes(pattern)){lookup=data;confidence='high';break}}
if(!lookup){
const companyPattern=/\b(ltd|plc|limited|inc|corp|llp|group|holdings)\b/;
const isCompany=companyPattern.test(n);
const words=isCompany?n.split(' ').filter(w=>w.length>0):n.split(' ').filter(w=>w.length>2);
lookup={name:words.slice(0,4).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')||'Unknown',category:'Other',isSubscription:false};
}
const isIncomeCategory=lookup.category==='Income';
const isRefund=lookup.category==='Refund';
const isSavings=lookup.category==='Savings';
const isLargeCredit=tx.amount>1000&&lookup.category==='Other';
const isCompanyCredit=tx.amount>0&&lookup.category==='Other'&&/\b(ltd|plc|limited|inc|corp|llp|group|holdings)\b/.test(n);
return{...tx,merchant:lookup.name,category:(isLargeCredit||isCompanyCredit)?'Income':lookup.category,subcategory:lookup.subcategory||'',isSubscription:lookup.isSubscription,isIncome:isIncomeCategory||isLargeCredit||isCompanyCredit,isRefund,isSavings,isTransfer:lookup.category==='Transfers'||isSavings,isDebt:lookup.category==='Debt Payments',confidence};
}

detectRecurring(txs){
const byM={};
txs.forEach(tx=>{if(!tx.merchant||tx.isIncome||tx.isTransfer||tx.isRefund)return;if(this._isLikelyPersonName(tx.merchant))return;if(!byM[tx.merchant])byM[tx.merchant]=[];byM[tx.merchant].push(tx)});
const recurring=[];
for(const[merchant,list]of Object.entries(byM)){
if(list.length<2)continue;
list.sort((a,b)=>(a.date||0)-(b.date||0));
const intervals=[];
for(let i=1;i<list.length;i++){if(list[i].date&&list[i-1].date){const days=Math.round((list[i].date-list[i-1].date)/(1000*60*60*24));if(days>0)intervals.push(days)}}
if(!intervals.length)continue;
const avg=intervals.reduce((a,b)=>a+b,0)/intervals.length;
const variance=intervals.reduce((s,i)=>s+Math.pow(i-avg,2),0)/intervals.length;
if(Math.sqrt(variance)<avg*0.4&&avg>5){
const freq=avg<10?'weekly':avg<45?'monthly':'annual';
const amounts=list.map(t=>Math.abs(t.amount));
const avgAmt=amounts.reduce((a,b)=>a+b,0)/amounts.length;
recurring.push({merchant,frequency:freq,averageAmount:Math.round(avgAmt*100)/100,category:list[0].category,subcategory:list[0].subcategory,isSubscription:list[0].isSubscription,isDebt:list[0].isDebt});
list.forEach(tx=>tx.isRecurring=true);
}}
return recurring.sort((a,b)=>b.averageAmount-a.averageAmount);
}

buildProfile(txs,recurring){
const income=txs.filter(tx=>tx.isIncome&&!tx.isRefund&&tx.amount>0);
const spending=txs.filter(tx=>tx.amount<0&&!tx.isTransfer&&!tx.isRefund);
const byCat={};
spending.forEach(tx=>{const k=tx.category||'Other';if(!byCat[k])byCat[k]={total:0,count:0,txs:[]};byCat[k].total+=Math.abs(tx.amount);byCat[k].count++;byCat[k].txs.push(tx)});
const totalIncome=income.reduce((s,tx)=>s+tx.amount,0);
const totalSpending=spending.reduce((s,tx)=>s+Math.abs(tx.amount),0);
const surplus=totalIncome-totalSpending;

// Calculate month span from transaction dates for accurate monthly averages
const dated=txs.filter(tx=>tx.date);
let months=1;
if(dated.length>=2){const dates=dated.map(tx=>tx.date.getTime());const earliest=Math.min(...dates);const latest=Math.max(...dates);months=Math.max(1,(latest-earliest)/(1000*60*60*24*30.44))||1}
const mo=m=>Math.round(m/months);

const subs=recurring.filter(r=>r.isSubscription);
const subTotal=subs.reduce((s,r)=>s+r.averageAmount,0);
const debtPay=recurring.filter(r=>r.isDebt);
const debtTotal=debtPay.reduce((s,r)=>s+r.averageAmount,0);
const creditCards=debtPay.filter(r=>r.subcategory==='Credit Card');
const bnpl=debtPay.filter(r=>r.subcategory==='BNPL');
const streaming=subs.filter(r=>['Netflix','Spotify','Disney+','Prime Video','Apple TV+','NOW TV','YouTube Premium'].includes(r.merchant));

const categories=Object.entries(byCat).map(([name,data])=>({name,total:mo(data.total),count:data.count})).sort((a,b)=>b.total-a.total);
const byMerch={};
spending.forEach(tx=>{if(!tx.merchant)return;if(this._isLikelyPersonName(tx.merchant))return;if(!byMerch[tx.merchant])byMerch[tx.merchant]={total:0,count:0};byMerch[tx.merchant].total+=Math.abs(tx.amount);byMerch[tx.merchant].count++});
const topMerchants=Object.entries(byMerch).map(([merchant,d])=>({merchant,total:Math.round(d.total),count:d.count})).sort((a,b)=>b.total-a.total).slice(0,10);

// Income analysis — find primary income source carefully
const incomeBySource={};
const salaryKeywords=['salary','wages','payroll','pay from','monthly pay','net pay','direct deposit'];
income.forEach(tx=>{const n=tx.descNorm||'';if(this._isLikelyPersonName(tx.merchant))return;
const isSalary=salaryKeywords.some(p=>n.includes(p));
const key=isSalary?'_salary_':n.split(' ').filter(w=>w.length>2).slice(0,2).join(' ')||'unknown';
if(!incomeBySource[key])incomeBySource[key]={total:0,count:0,amounts:[],dates:[],merchant:isSalary?'Salary/Wages':(tx.merchant||key),isSalary};
incomeBySource[key].total+=tx.amount;incomeBySource[key].count++;incomeBySource[key].amounts.push(tx.amount);if(tx.date)incomeBySource[key].dates.push(tx.date)});
// Also detect large regular credits (>£500, appearing 2+ times monthly) as missed income
const largeCreds=txs.filter(tx=>tx.amount>500&&!tx.isIncome&&!tx.isRefund&&!tx.isTransfer&&tx.date);
const credByKey={};
largeCreds.forEach(tx=>{const key=tx.descNorm?.split(' ').filter(w=>w.length>2).slice(0,2).join(' ')||'unknown';if(!credByKey[key])credByKey[key]={total:0,count:0,dates:[],merchant:tx.merchant||key};credByKey[key].total+=tx.amount;credByKey[key].count++;credByKey[key].dates.push(tx.date)});
for(const[key,src] of Object.entries(credByKey)){
if(src.count>=2&&!incomeBySource[key]){src.dates.sort((a,b)=>a-b);const ints=[];for(let i=1;i<src.dates.length;i++){const d=Math.round((src.dates[i]-src.dates[i-1])/(1000*60*60*24));if(d>0)ints.push(d)}
if(ints.length>0){const avg=ints.reduce((a,b)=>a+b,0)/ints.length;if(avg>20&&avg<45){incomeBySource[key]={...src,amounts:largeCreds.filter(tx=>(tx.descNorm?.split(' ').filter(w=>w.length>2).slice(0,2).join(' ')||'unknown')===key).map(tx=>tx.amount),isSalary:false}}}}}
const _calcFreq=(dates)=>{if(dates.length<2)return'irregular';dates.sort((a,b)=>a-b);const ints=[];for(let i=1;i<dates.length;i++){const d=Math.round((dates[i]-dates[i-1])/(1000*60*60*24));if(d>0)ints.push(d)};if(!ints.length)return'irregular';const avg=ints.reduce((a,b)=>a+b,0)/ints.length;return avg<10?'weekly':avg<18?'fortnightly':avg<45?'monthly':'irregular'};
const incomeSources=Object.values(incomeBySource).map(src=>{
const frequency=_calcFreq(src.dates);
const avgAmount=Math.round(src.total/src.count);
return{source:src.merchant,frequency,avgAmount,total:Math.round(src.total),count:src.count,monthly:mo(src.total),isPrimary:false,isSalary:src.isSalary||false}
}).sort((a,b)=>b.total-a.total);
// Mark primary income source — salary first, then largest regular source
if(incomeSources.length>0){const primary=incomeSources.find(s=>s.isSalary)||incomeSources.find(s=>s.frequency==='monthly'&&s.monthly>500)||incomeSources[0];if(primary){primary.isPrimary=true;primary.source=primary.isSalary?'Primary Income (Salary)':primary.source+' (Primary)'}}
const incomeStreams=incomeSources.length;

// Non-discretionary vs discretionary split
const nonDiscretionaryCats=['Bills','Groceries','Transport','Debt Payments','Education','Health'];
const nonDiscretionary={total:0,items:[]};
const discretionary={total:0,items:[]};
for(const[cat,data]of Object.entries(byCat)){
const monthly=mo(data.total);
if(nonDiscretionaryCats.includes(cat)||(cat==='Subscriptions')){nonDiscretionary.total+=monthly;nonDiscretionary.items.push({category:cat,monthly,txs:data.txs||[]})}
else if(cat!=='Other'&&cat!=='Transfers'&&cat!=='Savings'&&cat!=='Refund'){discretionary.total+=monthly;discretionary.items.push({category:cat,monthly,txs:data.txs||[]})}
}
// Add subscription + debt from recurring (more accurate than category totals)
const subMo=Math.round(subTotal);const debtMo=Math.round(debtTotal);
nonDiscretionary.items.sort((a,b)=>b.monthly-a.monthly);
discretionary.items.sort((a,b)=>b.monthly-a.monthly);
const leftToDecide=mo(totalIncome)-nonDiscretionary.total;

// Financial advisor suggestions for people in debt distress
const totalMonthlyNeeds=nonDiscretionary.total+discretionary.total;
const monthlyInc=mo(totalIncome);
const financialAdvisorTips=[];
if(debtPay.length>0&&monthlyInc>0&&monthlyInc<totalMonthlyNeeds){
const shortfall=totalMonthlyNeeds-monthlyInc;
financialAdvisorTips.push({type:'shortfall',title:'Your expenses exceed your income',text:'You are spending £'+shortfall+' more per month than you earn. This is unsustainable and will deepen debt over time.'});
if(discretionary.total>100)financialAdvisorTips.push({type:'cut',title:'Reduce lifestyle spending first',text:'Your lifestyle spending is £'+discretionary.total+'/mo. Cutting this by 50% frees up £'+Math.round(discretionary.total*0.5)+'/mo toward essentials and debt.'});
if(debtPay.length>=2)financialAdvisorTips.push({type:'consolidate',title:'Consider debt consolidation',text:'You have '+debtPay.length+' debt payments totalling £'+Math.round(debtTotal)+'/mo. A consolidation loan at a lower rate could reduce monthly payments and simplify repayment.'});
financialAdvisorTips.push({type:'help',title:'Speak to a free debt advisor',text:'StepChange (0800 138 1111) and Citizens Advice offer free, confidential debt advice. They can negotiate with creditors and set up manageable repayment plans.'});
if(monthlyInc<nonDiscretionary.total)financialAdvisorTips.push({type:'crisis',title:'Priority bills first',text:'Your income doesn\'t cover non-negotiable costs. Focus on rent/mortgage, council tax, and energy first — these have the most serious consequences if missed. Contact creditors proactively.'});
}

return{
transactionCount:txs.length,monthSpan:months,
monthly:{income:mo(totalIncome),spending:mo(totalSpending),surplus:mo(surplus),subscriptions:Math.round(subTotal),debtPayments:Math.round(debtTotal),foodDelivery:mo(byCat['Food Delivery']?.total||0),shopping:mo(byCat['Shopping']?.total||0),entertainment:mo(byCat['Entertainment']?.total||0),groceries:mo(byCat['Groceries']?.total||0),transport:mo(byCat['Transport']?.total||0),eatingOut:mo(byCat['Eating Out']?.total||0),health:mo(byCat['Health']?.total||0),travel:mo(byCat['Travel']?.total||0),charity:mo(byCat['Charity']?.total||0),education:mo(byCat['Education']?.total||0)},
metrics:{savingsRate:totalIncome>0?Math.round((surplus/totalIncome)*100):(totalSpending>0?-100:0),subscriptionCount:subs.length,debtAccountCount:debtPay.length,creditCardCount:creditCards.length,bnplCount:bnpl.length,streamingCount:streaming.length},
// Spending trend: compare last 30 days vs overall monthly average
spendingTrend:this.calcSpendingTrend(spending,months),
// Income analysis
incomeSources,
// Non-discretionary vs discretionary
budgetReality:{nonDiscretionary,discretionary,leftToDecide},
financialAdvisorTips,
categories,topMerchants,recurring,subscriptions:subs,debtPayments:debtPay,incomeStreams
};
}

determineArchetype(p){
const order=['debt_juggler','quiet_builder','edge_walker','subscription_collector','impulse_surfer','convenience_seeker','comfort_spender','lifestyle_investor','side_hustler','balanced_realist'];
for(const k of order){try{if(ARCHETYPES[k].triggers(p))return{key:k,...ARCHETYPES[k]}}catch{}}
return{key:'balanced_realist',...ARCHETYPES.balanced_realist};
}

calcPeerComparison(p){
const m=p.monthly,mt=p.metrics,comps=[];
if(mt.subscriptionCount>0){const d=Math.round(((mt.subscriptionCount-UK_BENCHMARKS.subscriptions.count)/UK_BENCHMARKS.subscriptions.count)*100);comps.push({label:'Subscriptions',value:mt.subscriptionCount,unit:'',diff:d,isHigher:d>0})}
if(m.foodDelivery>0){const d=Math.round(((m.foodDelivery-UK_BENCHMARKS.foodDelivery)/UK_BENCHMARKS.foodDelivery)*100);comps.push({label:'Food Delivery',value:m.foodDelivery,unit:'£/mo',diff:d,isHigher:d>0})}
comps.push({label:'Savings Rate',value:mt.savingsRate,unit:'%',diff:mt.savingsRate-UK_BENCHMARKS.savingsRate,isHigher:mt.savingsRate>UK_BENCHMARKS.savingsRate,higherIsGood:true});
return comps.slice(0,4);
}

genInsights(p){
const ins=[],m=p.monthly;
if(p.subscriptions.length>0){ins.push({type:'subscriptions',text:'You have '+p.subscriptions.length+' active subscriptions totalling £'+m.subscriptions+'/mo (£'+(m.subscriptions*12)+'/yr): '+p.subscriptions.slice(0,4).map(s=>s.merchant+' £'+s.averageAmount).join(', ')+(p.subscriptions.length>4?' and '+(p.subscriptions.length-4)+' more':'')+'.'});}
if(p.debtPayments.length>0){ins.push({type:'debt',text:'You have '+p.debtPayments.length+' debt payment'+(p.debtPayments.length>1?'s':'')+' totalling £'+m.debtPayments+'/mo (£'+(m.debtPayments*12)+'/yr): '+p.debtPayments.slice(0,3).map(d=>d.merchant).join(', ')+'.'+(m.income>0?' That is '+Math.round((m.debtPayments/m.income)*100)+'% of your income.':'')});}
if(m.foodDelivery>50){ins.push({type:'delivery',text:'Food delivery is costing you £'+m.foodDelivery+'/month (£'+(m.foodDelivery*12)+'/yr). Cooking at home for just 2-3 of those orders per week would save roughly £'+Math.round(m.foodDelivery*0.4*12)+'/year.'});}
if((m.eatingOut||0)>80){ins.push({type:'eatingout',text:'You are spending £'+(m.eatingOut||0)+'/month eating out and on coffee (£'+((m.eatingOut||0)*12)+'/yr). Small daily purchases add up faster than most people realise.'});}
if((m.groceries||0)>0&&m.foodDelivery>0){const ratio=m.foodDelivery/(m.groceries||1);if(ratio>0.5){ins.push({type:'food',text:'Your food delivery spend (£'+m.foodDelivery+'/mo) is '+Math.round(ratio*100)+'% of your grocery spend (£'+(m.groceries||0)+'/mo). A healthier ratio would be under 25%.'})}}
if((m.shopping||0)>100){ins.push({type:'shopping',text:'Shopping accounts for £'+(m.shopping||0)+'/month (£'+((m.shopping||0)*12)+'/yr). '+(p.topMerchants?.find(m=>['Amazon','ASOS','Zara','IKEA','H&M','Primark','Shein','Boohoo'].includes(m.merchant))?'Your top retailer is '+p.topMerchants.find(m=>['Amazon','ASOS','Zara','IKEA','H&M','Primark','Shein','Boohoo'].includes(m.merchant)).merchant+'.':'')});}
if(p.spendingTrend){const t=p.spendingTrend;if(t.direction==='up'){ins.push({type:'trend',text:'Your spending in the last 30 days (£'+t.recentMonthTotal+') is '+t.pctChange+'% higher than your monthly average (£'+t.averageMonthly+'). Top categories this month: '+t.topRecentCategories.map(c=>c.name+' £'+c.total).join(', ')+'.'});}else if(t.direction==='down'){ins.push({type:'trend',text:'Good news — your spending in the last 30 days (£'+t.recentMonthTotal+') is '+Math.abs(t.pctChange)+'% lower than your monthly average (£'+t.averageMonthly+'). You are trending in the right direction.'});}}
return ins;
}

calcSpendingTrend(spending,months){
if(months<2||spending.length<10)return null;
// Anchor on the latest transaction date, not wall-clock time
const datedSpending=spending.filter(tx=>tx.date);
if(datedSpending.length<10)return null;
const latestDate=new Date(Math.max(...datedSpending.map(tx=>tx.date.getTime())));
const thirtyDaysAgo=new Date(latestDate.getTime()-30*24*60*60*1000);
const recent=datedSpending.filter(tx=>tx.date>=thirtyDaysAgo);
const recentTotal=recent.reduce((s,tx)=>s+Math.abs(tx.amount),0);
// Exclude the recent period from the baseline to get a true comparison
const olderTotal=datedSpending.filter(tx=>tx.date<thirtyDaysAgo).reduce((s,tx)=>s+Math.abs(tx.amount),0);
const olderMonths=Math.max(1,months-1);
const overallMonthly=olderTotal>0?olderTotal/olderMonths:spending.reduce((s,tx)=>s+Math.abs(tx.amount),0)/months;
if(overallMonthly===0)return null;
const pctChange=Math.round(((recentTotal-overallMonthly)/overallMonthly)*100);
// Categorise recent spending
const recentByCat={};
recent.forEach(tx=>{const k=tx.category||'Other';if(!recentByCat[k])recentByCat[k]=0;recentByCat[k]+=Math.abs(tx.amount)});
const topRecent=Object.entries(recentByCat).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([name,total])=>({name,total:Math.round(total)}));
return{recentMonthTotal:Math.round(recentTotal),averageMonthly:Math.round(overallMonthly),pctChange,direction:pctChange>10?'up':pctChange<-10?'down':'stable',topRecentCategories:topRecent};
}

calcSavings(p){
const m=p.monthly;const items=[];
const add=(cat,monthly,pct,tip)=>{const yearly=monthly*12;const saving=Math.round(yearly*pct);if(saving>0)items.push({category:cat,monthlySpend:monthly,yearlySpend:yearly,savingAmount:saving,savingPct:Math.round(pct*100),tip})};
add('Subscriptions',m.subscriptions,0.3,'cancel unused, downgrade plans');
add('Food Delivery',m.foodDelivery,0.4,'cook 2-3 more meals per week');
add('Debt Payments',m.debtPayments,0.15,'consolidate or accelerate repayment');
add('Eating Out',m.eatingOut||0,0.25,'1-2 fewer meals out per week');
add('Shopping',m.shopping||0,0.2,'try the 30-day rule');
const total=items.reduce((s,i)=>s+i.savingAmount,0);
return{total:Math.max(total,0),items};
}

// BEHAVIORAL PATTERNS — temporal intelligence from transaction timing
detectBehavioralPatterns(txs){
const patterns=[];
const spending=txs.filter(tx=>tx.amount<0&&!tx.isTransfer&&!tx.isRefund&&tx.date);
const income=txs.filter(tx=>tx.isIncome&&tx.amount>0&&tx.date);
if(spending.length<10)return patterns;

// 1. Payday splurge — spending spike in first 3 days after income
if(income.length>=2){
const payDays=income.map(tx=>tx.date.getDate());
const payDayMode=payDays.sort((a,b)=>payDays.filter(v=>v===a).length-payDays.filter(v=>v===b).length).pop();
const postPayday=spending.filter(tx=>{const d=tx.date.getDate();const diff=d>=payDayMode?d-payDayMode:d+(30-payDayMode);return diff>=0&&diff<=3});
const restDays=spending.filter(tx=>{const d=tx.date.getDate();const diff=d>=payDayMode?d-payDayMode:d+(30-payDayMode);return diff>3});
if(postPayday.length>0&&restDays.length>0){
const postAvgDaily=postPayday.reduce((s,tx)=>s+Math.abs(tx.amount),0)/Math.max(1,3);
const restAvgDaily=restDays.reduce((s,tx)=>s+Math.abs(tx.amount),0)/Math.max(1,27);
const ratio=Math.round((postAvgDaily/restAvgDaily)*10)/10;
if(ratio>1.5){const premium=Math.round((postAvgDaily-restAvgDaily)*3);patterns.push({pattern:'payday_splurge',text:'You spend '+ratio+'x more in the 3 days after payday',detail:'That is roughly \u00a3'+premium+' above your daily average each pay cycle',severity:ratio>2?'high':'medium'})}
}}

// 2. Weekend premium — Sat+Sun daily spend vs Mon-Fri
const weekend=spending.filter(tx=>{const d=tx.date.getDay();return d===0||d===6});
const weekday=spending.filter(tx=>{const d=tx.date.getDay();return d>=1&&d<=5});
if(weekend.length>3&&weekday.length>5){
const wkndTotal=weekend.reduce((s,tx)=>s+Math.abs(tx.amount),0);
const wkdyTotal=weekday.reduce((s,tx)=>s+Math.abs(tx.amount),0);
const wkndDaily=wkndTotal/Math.max(1,new Set(weekend.map(tx=>tx.date.toDateString())).size);
const wkdyDaily=wkdyTotal/Math.max(1,new Set(weekday.map(tx=>tx.date.toDateString())).size);
const ratio=Math.round((wkndDaily/wkdyDaily)*10)/10;
if(ratio>1.3){patterns.push({pattern:'weekend_premium',text:'Your weekend spending is '+ratio+'x your weekday average',detail:'\u00a3'+Math.round(wkndDaily)+'/day on weekends vs \u00a3'+Math.round(wkdyDaily)+'/day on weekdays',severity:ratio>1.8?'high':'medium'})}
}

// 3. Hidden subscriptions — merchants appearing 8+ times, excluding person-to-person transfers
const byMerch={};
spending.forEach(tx=>{if(!tx.merchant||tx.isSubscription||tx.category==='Transfers'||tx.category==='Debt Payments')return;if(this._isLikelyPersonName(tx.merchant))return;if(!byMerch[tx.merchant])byMerch[tx.merchant]={count:0,total:0,category:tx.category};byMerch[tx.merchant].count++;byMerch[tx.merchant].total+=Math.abs(tx.amount)});
const months=Math.max(1,txs.filter(tx=>tx.date).length>=2?((Math.max(...txs.filter(tx=>tx.date).map(tx=>tx.date.getTime()))-Math.min(...txs.filter(tx=>tx.date).map(tx=>tx.date.getTime())))/(1000*60*60*24*30.44)):1);
for(const[merchant,data]of Object.entries(byMerch)){
if(data.count>=8){const monthly=Math.round(data.total/months);
const isEssential=ESSENTIAL_CATEGORIES.has(data.category);
if(isEssential){
// Essential spending (transport, groceries, bills) — suggest review only if very high, lower severity
if(monthly>100){patterns.push({pattern:'essential_review',text:merchant+': £'+monthly+'/mo on '+data.category.toLowerCase()+' (essential)',detail:'This is a necessary expense but worth reviewing if the amount seems high. Consider if there are more cost-effective alternatives.',severity:'low',merchant,monthlyAmount:monthly,isEssential:true})}
}else{
patterns.push({pattern:'hidden_subscription',text:merchant+' appears '+data.count+' times \u2014 a hidden \u00a3'+monthly+'/mo habit',detail:'That is \u00a3'+(monthly*12)+'/yr on what is effectively a regular commitment',severity:monthly>50?'high':'medium',merchant,monthlyAmount:monthly,isEssential:false})}
}}

// 4. Late-month squeeze — spending drops in last 5 days before typical payday
if(income.length>=2){
const payDays=income.map(tx=>tx.date.getDate());
const payDayMode=payDays.sort((a,b)=>payDays.filter(v=>v===a).length-payDays.filter(v=>v===b).length).pop();
const lateMonth=spending.filter(tx=>{const d=tx.date.getDate();const daysBeforePay=payDayMode>=d?payDayMode-d:(30-d)+payDayMode;return daysBeforePay>=1&&daysBeforePay<=5});
const midMonth=spending.filter(tx=>{const d=tx.date.getDate();const daysAfterPay=d>=payDayMode?d-payDayMode:d+(30-payDayMode);return daysAfterPay>3&&daysAfterPay<25});
if(lateMonth.length>2&&midMonth.length>5){
const lateDaily=lateMonth.reduce((s,tx)=>s+Math.abs(tx.amount),0)/Math.max(1,5);
const midDaily=midMonth.reduce((s,tx)=>s+Math.abs(tx.amount),0)/Math.max(1,21);
const dropPct=Math.round((1-lateDaily/midDaily)*100);
if(dropPct>30){patterns.push({pattern:'late_month_squeeze',text:'Your spending drops '+dropPct+'% in the last 5 days before payday',detail:'This suggests cash flow pressure at end of month',severity:dropPct>50?'high':'medium'})}
}}

// 5. Impulse clusters — 3+ shopping transactions within same day
const byDay={};
spending.filter(tx=>tx.category==='Shopping').forEach(tx=>{const key=tx.date.toDateString();if(!byDay[key])byDay[key]=[];byDay[key].push(tx)});
const clusters=Object.values(byDay).filter(d=>d.length>=3);
if(clusters.length>=2){const avgCluster=Math.round(clusters.reduce((s,c)=>s+c.reduce((t,tx)=>t+Math.abs(tx.amount),0),0)/clusters.length);patterns.push({pattern:'impulse_cluster',text:clusters.length+' shopping spree days detected',detail:'You average \u00a3'+avgCluster+' on days with 3+ shopping transactions',severity:avgCluster>100?'high':'medium'})}

// Sort: non-essentials first by severity, essentials last (suggest review last)
return patterns.sort((a,b)=>{if(a.isEssential&&!b.isEssential)return 1;if(!a.isEssential&&b.isEssential)return -1;const sev={high:3,medium:2,low:1};return(sev[b.severity]||0)-(sev[a.severity]||0)}).slice(0,5);
}

// DECISION QUALITY SCORE — 0-100 composite measure
calcDecisionScore(profile){
const m=profile.monthly;const mt=profile.metrics;
const scores={};

// Intentionality (25%) — how much spending is habitual vs intentional
const recurringSpend=(m.subscriptions||0)+(m.debtPayments||0);
const totalSpend=m.spending||1;
const recurringPct=Math.min(100,Math.round((recurringSpend/totalSpend)*100));
scores.intentionality={score:Math.max(0,Math.min(100,100-recurringPct*1.5)),weight:25,label:'Intentionality',detail:recurringPct+'% of spending is recurring commitments'};

// Debt efficiency (20%) — debt payments as % of income (use category totals as primary, recurring as fallback)
const debtFromCat=profile.categories.find(c=>c.name==='Debt Payments');
const debtMonthly=debtFromCat?debtFromCat.total:m.debtPayments;
const debtPct=m.income>0?Math.round((debtMonthly/m.income)*100):0;
scores.debtEfficiency={score:debtPct===0?100:Math.max(0,100-debtPct*3),weight:20,label:'Debt Efficiency',detail:debtPct>0?debtPct+'% of income goes to debt (\u00a3'+debtMonthly+'/mo)':'No debt payments detected'};

// Savings capacity (25%) — savings rate vs 20% target
const sr=mt.savingsRate||0;
scores.savingsCapacity={score:Math.min(100,Math.max(0,Math.round((sr/20)*100))),weight:25,label:'Savings Capacity',detail:sr+'% savings rate'+(sr>=20?' (on target)':' (target: 20%)')};

// Subscription utilisation (15%) — account for count + refund signals
const subCount=mt.subscriptionCount||0;
// Count subscription-related refunds as a signal of forgotten/unused subs
const subRefunds=profile.categories.find(c=>c.name==='Refund');
const hasSubRefunds=subRefunds&&subRefunds.count>0;
let subScore=subCount===0?100:subCount<=3?85:subCount<=5?65:subCount<=8?45:25;
if(hasSubRefunds)subScore=Math.max(0,subScore-15);// Refunds suggest forgotten subs
scores.subscriptionHealth={score:subScore,weight:15,label:'Subscription Health',detail:subCount+' active subscription'+(subCount!==1?'s':'')+(hasSubRefunds?' (refunds suggest forgotten services)':'')};

// Convenience premium (15%) — delivery + eating out as % of total
const convenienceSpend=(m.foodDelivery||0)+(m.eatingOut||0);
const convPct=totalSpend>0?Math.round((convenienceSpend/totalSpend)*100):0;
scores.conveniencePremium={score:Math.max(0,100-convPct*2.5),weight:15,label:'Convenience Premium',detail:convPct>0?convPct+'% of spending on convenience':'No convenience premium'};

const totalScore=Math.round(Object.values(scores).reduce((s,d)=>s+d.score*(d.weight/100),0));
const breakdown=Object.values(scores);

// Generate verdict
let verdict='';
if(totalScore>=80)verdict='Strong financial discipline \u2014 you are making your money work for you';
else if(totalScore>=65)verdict='Solid foundation with clear opportunities to optimise';
else if(totalScore>=50){const weakest=breakdown.sort((a,b)=>a.score-b.score)[0];verdict='Room to improve \u2014 your biggest lever is '+weakest.label.toLowerCase()}
else{const leaked=Math.round(totalSpend*0.2);verdict='\u00a3'+leaked+'/mo is going to habits you may not be actively choosing'}

return{score:totalScore,verdict,breakdown:breakdown.sort((a,b)=>a.score-b.score)};
}

// DECISION STACK — ranked specific actions with quantified impact
genDecisionStack(profile,recurring,behavioralPatterns){
const moves=[];
const m=profile.monthly;

// 1. Dormant/low-value subscriptions — identify subs with lowest avg amount (likely forgotten)
const subs=profile.subscriptions||[];
if(subs.length>3){const cheapest=subs.filter(s=>s.averageAmount<15).slice(0,3);if(cheapest.length>0){const total=Math.round(cheapest.reduce((s,r)=>s+r.averageAmount,0));moves.push({action:'Review '+cheapest.length+' low-cost subscriptions: '+cheapest.map(s=>s.merchant+' (\u00a3'+s.averageAmount+')').join(', '),annualImpact:total*12,effort:'low',unlocks:'Quick wins \u2014 often forgotten services that add up',type:'subscription',details:{strategy:'Subscription audit',items:cheapest.map(s=>({name:s.merchant,amount:s.averageAmount,frequency:'monthly'})),monthlyAmount:total,reasoning:'These '+cheapest.length+' subscriptions total \u00a3'+total+'/mo. Low-cost subscriptions often go unnoticed but compound over time. Cancelling unused ones frees up \u00a3'+(total*12)+'/yr with zero lifestyle impact.',steps:['Review each subscription for recent usage','Cancel any you haven\u2019t used in 30+ days','Set a calendar reminder to audit subscriptions quarterly']}})}}

// 2. Food delivery reduction — specific based on actual order value
if(m.foodDelivery>40){const deliveryMerchants=profile.topMerchants?.filter(tm=>['Deliveroo','Uber Eats','Just Eat'].includes(tm.merchant))||[];const totalOrders=deliveryMerchants.reduce((s,tm)=>s+tm.count,0)/Math.max(1,profile.monthSpan)||4;const avgOrder=m.foodDelivery/totalOrders;const cutOrders=Math.ceil(m.foodDelivery*0.3/avgOrder);const monthlySave=Math.round(m.foodDelivery*0.3);moves.push({action:'Swap '+cutOrders+' delivery orders per month for home cooking',annualImpact:Math.round(monthlySave*12),effort:'medium',unlocks:m.groceries>0?'Your grocery spend shows you already cook \u2014 just shift the balance':'Redirects \u00a3'+monthlySave+'/mo to other goals',type:'convenience',details:{strategy:'Delivery-to-cooking swap',items:deliveryMerchants.map(tm=>({name:tm.merchant,amount:Math.round(tm.total/profile.monthSpan),frequency:'monthly'})),monthlyAmount:m.foodDelivery,targetReduction:monthlySave,reasoning:'You\u2019re spending \u00a3'+m.foodDelivery+'/mo on delivery across '+deliveryMerchants.length+' service'+(deliveryMerchants.length>1?'s':'')+'. The average order is \u00a3'+Math.round(avgOrder)+'. Swapping just '+cutOrders+' orders/mo for home cooking saves \u00a3'+monthlySave+'/mo (\u00a3'+(monthlySave*12)+'/yr) while still enjoying delivery '+(Math.round(totalOrders)-cutOrders)+'x/mo.'+(m.groceries>0?' Your existing grocery spend of \u00a3'+m.groceries+'/mo shows you already cook \u2014 this just shifts the balance.':''),steps:['Identify your most frequent delivery days','Prep easy meals for those specific days','Keep delivery for social occasions or genuine treats','Track progress weekly for the first month']}})}

// 3. Debt acceleration — smallest debt first
const debts=profile.debtPayments||[];
if(debts.length>=2){const sortedDebts=[...debts].sort((a,b)=>a.averageAmount-b.averageAmount);const smallest=sortedDebts[0];const totalDebtMo=Math.round(debts.reduce((s,d)=>s+d.averageAmount,0));const secondDebt=sortedDebts.length>1?sortedDebts[1]:null;moves.push({action:'Focus on clearing '+smallest.merchant+' first (\u00a3'+smallest.averageAmount+'/mo)',annualImpact:Math.round(smallest.averageAmount*12),effort:'medium',unlocks:'Once cleared, redirect \u00a3'+smallest.averageAmount+'/mo to the next debt or savings',type:'debt',details:{strategy:'Debt Snowball Method',items:sortedDebts.map(d=>({name:d.merchant,amount:d.averageAmount,frequency:'monthly'})),monthlyAmount:totalDebtMo,targetDebt:smallest.merchant,targetAmount:smallest.averageAmount,reasoning:'You have '+debts.length+' active debts totalling \u00a3'+totalDebtMo+'/mo. The snowball method targets your smallest payment first (\u00a3'+smallest.averageAmount+'/mo to '+smallest.merchant+'). Once cleared, that \u00a3'+smallest.averageAmount+' rolls into '+(secondDebt?secondDebt.merchant+' (\u00a3'+secondDebt.averageAmount+'/mo)':'your next debt')+', accelerating payoff. This creates momentum and frees up cashflow progressively.',steps:['Continue minimum payments on all debts','Put any extra funds toward '+smallest.merchant+' (\u00a3'+smallest.averageAmount+'/mo)','Once '+smallest.merchant+' is cleared, add its payment to '+(secondDebt?secondDebt.merchant:'the next debt'),'Repeat until all debts are cleared'],effect:'Clearing '+smallest.merchant+' first frees \u00a3'+smallest.averageAmount+'/mo. Over 12 months, that\u2019s \u00a3'+(smallest.averageAmount*12)+' redirected to accelerate remaining debt payoff or build savings.'}})}


// 4. Hidden subscriptions from behavioral patterns
const hidden=behavioralPatterns.filter(p=>p.pattern==='hidden_subscription');
if(hidden.length>0){const top=hidden[0];const save30=Math.round(top.monthlyAmount*0.3);moves.push({action:'Your '+top.merchant+' habit is a hidden \u00a3'+top.monthlyAmount+'/mo subscription',annualImpact:Math.round(save30*12),effort:'medium',unlocks:'Reducing by 30% saves \u00a3'+save30+'/mo without eliminating it',type:'behavioral',details:{strategy:'Habitual spending reduction',items:[{name:top.merchant,amount:top.monthlyAmount,frequency:'monthly'}],monthlyAmount:top.monthlyAmount,targetReduction:save30,reasoning:'Your '+top.merchant+' spending of \u00a3'+top.monthlyAmount+'/mo behaves like a subscription \u2014 consistent, recurring, and often automatic. A 30% reduction saves \u00a3'+save30+'/mo (\u00a3'+(save30*12)+'/yr) while keeping the habit at a sustainable level.',steps:['Set a weekly budget of \u00a3'+Math.round(top.monthlyAmount*0.7/4)+' for '+top.merchant,'Track each purchase for 2 weeks to build awareness','Replace 1-2 visits per week with a free or cheaper alternative','Review progress after 30 days']}})}

// 5. Payday splurge mitigation
const splurge=behavioralPatterns.find(p=>p.pattern==='payday_splurge');
if(splurge){const premium=parseInt(splurge.detail.match(/\d+/)?.[0]||'0');if(premium>30){const save50=Math.round(premium*0.5);moves.push({action:'Delay non-essential purchases 48 hours after payday',annualImpact:Math.round(save50*12),effort:'low',unlocks:'Your post-payday spike adds \u00a3'+premium+'/mo \u2014 a short delay cuts impulse buys in half',type:'behavioral',details:{strategy:'48-hour payday rule',items:[{name:'Post-payday premium spending',amount:premium,frequency:'monthly'}],monthlyAmount:premium,targetReduction:save50,reasoning:'Your spending spikes significantly in the days after payday, costing an extra \u00a3'+premium+'/mo compared to your baseline. Research shows a simple 48-hour delay eliminates roughly half of impulse purchases. This saves \u00a3'+save50+'/mo (\u00a3'+(save50*12)+'/yr) with minimal effort.',steps:['When payday hits, move discretionary funds to a separate pot','Wait 48 hours before any non-essential purchase over \u00a320','After 48 hours, buy only items you still want','Track how many purchases you skip \u2014 most won\u2019t feel like sacrifices']}})}}



// 6. Eating out reduction
if((m.eatingOut||0)>80){const coffeeShops=profile.topMerchants?.filter(tm=>['Starbucks','Costa','Pret','Greggs','Caffe Nero'].includes(tm.merchant))||[];const coffeeMonthly=coffeeShops.reduce((s,tm)=>s+Math.round(tm.total/profile.monthSpan),0);if(coffeeMonthly>20){const coffeeSave=Math.round(coffeeMonthly*0.5);moves.push({action:'Your coffee habit: \u00a3'+coffeeMonthly+'/mo across '+coffeeShops.length+' shop'+(coffeeShops.length>1?'s':''),annualImpact:Math.round(coffeeSave*12),effort:'low',unlocks:'Making coffee 3x/week instead saves \u00a3'+coffeeSave+'/mo',type:'convenience',details:{strategy:'Coffee spend optimisation',items:coffeeShops.map(tm=>({name:tm.merchant,amount:Math.round(tm.total/profile.monthSpan),frequency:'monthly'})),monthlyAmount:coffeeMonthly,targetReduction:coffeeSave,reasoning:'You\u2019re spending \u00a3'+coffeeMonthly+'/mo across '+coffeeShops.length+' coffee shop'+(coffeeShops.length>1?'s':'')+'. Making coffee at home 3 days per week saves roughly 50%, or \u00a3'+coffeeSave+'/mo (\u00a3'+(coffeeSave*12)+'/yr). You still get to enjoy coffee out on the days that matter.',steps:['Get a good travel mug and coffee you enjoy at home','Choose 3 specific days per week to make coffee at home','Keep your coffee-out days for social or treat occasions','A \u00a320 bag of quality beans makes ~30 cups vs \u00a33-4 each out']}})}
}

// 7. Shopping impulse control
if((m.shopping||0)>120){const impulsePattern=behavioralPatterns.find(p=>p.pattern==='impulse_cluster');const shopSave=Math.round((m.shopping||0)*0.2);moves.push({action:'Apply a 24-hour rule to purchases over \u00a330',annualImpact:Math.round(shopSave*12),effort:'low',unlocks:impulsePattern?impulsePattern.detail:'Reduces impulse purchases by roughly 20%',type:'behavioral',details:{strategy:'24-hour impulse rule',items:[{name:'Shopping spend',amount:m.shopping,frequency:'monthly'}],monthlyAmount:m.shopping,targetReduction:shopSave,reasoning:'Your shopping spend of \u00a3'+m.shopping+'/mo is above average. '+(impulsePattern?impulsePattern.detail+' ':'')+'Research shows that waiting 24 hours before purchases over \u00a330 eliminates about 20% of impulse buys. This saves \u00a3'+shopSave+'/mo (\u00a3'+(shopSave*12)+'/yr) without any real sacrifice \u2014 you\u2019ll only skip things you didn\u2019t truly want.',steps:['When you find something over \u00a330, add it to a wishlist instead of buying','Wait 24 hours before revisiting','If you still want it after 24 hours, buy it guilt-free','Track how many items you skip \u2014 most won\u2019t feel like losses']}})}

// Rank by impact/effort ratio and return top 3
const effortMultiplier={low:1,medium:2,high:3};
return moves.sort((a,b)=>(b.annualImpact/(effortMultiplier[b.effort]||2))-(a.annualImpact/(effortMultiplier[a.effort]||2))).slice(0,3);
}

// COMPOUND COST — opportunity cost of top discretionary categories at 7% returns
calcCompoundCost(profile){
const m=profile.monthly;
const discretionary=[
{category:'Food Delivery',monthly:m.foodDelivery||0},
{category:'Eating Out',monthly:m.eatingOut||0},
{category:'Shopping',monthly:m.shopping||0},
{category:'Subscriptions',monthly:m.subscriptions||0},
{category:'Entertainment',monthly:m.entertainment||0}
].filter(c=>c.monthly>20).sort((a,b)=>b.monthly-a.monthly).slice(0,3);

const r=0.07/12;// monthly rate
return discretionary.map(c=>{
const pmt=c.monthly;
const fv=(n)=>Math.round(pmt*((Math.pow(1+r,n)-1)/r));
return{category:c.category,monthly:Math.round(pmt),annual:Math.round(pmt*12),fiveYear:fv(60),tenYear:fv(120)};
});
}
}

export default EnrichmentEngine;
