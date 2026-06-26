'use strict';
const FinancialEngine=(()=>{
  const monthKeys=['setup','preparation',...Array.from({length:12},(_,i)=>`m${i+1}`)];
  const marketingPresets={
    balanced:[14,13,12,10,9,8,7,6,6,5,5,5],
    launchHeavy:[16,14,12,10,8,8,7,6,5,5,5,4],
    growth:[2,3,4,5,6,7,8,10,12,13,14,16],
    manual:null
  };
  const ridesPresets={
    balanced:[8,12,18,24,32,40,50,60,72,84,92,100],
    slow:[3,6,10,15,22,30,40,52,64,76,88,100],
    aggressive:[16,24,34,45,56,66,75,83,90,95,98,100],
    manual:null
  };
  function n(v){return Number(v)||0}
  function uid(){return 'ex_'+Math.random().toString(36).slice(2,9)}
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function roundTo(value, step){return Math.round(n(value)/step)*step}
  function advertisingPackageForPopulation(population){
    const p=n(population);
    if(p<10000)return 0;
    if(p<30000)return 5000;
    if(p<50000)return 12500;
    if(p<=100000)return 20000;
    return 30000;
  }
  function annualMarketingBudgetForPopulation(population){
    const p=n(population);
    const pkg=advertisingPackageForPopulation(p);
    let raw;
    if(p<10000) raw=5000;
    else if(p<20000) raw=pkg*4;
    else if(p<30000) raw=pkg*6;
    else if(p<50000) raw=pkg*4.8;
    else if(p<75000) raw=pkg*4.5;
    else if(p<=100000) raw=pkg*6;
    else raw=pkg*5;
    return p<10000 ? 5000 : roundTo(raw,500);
  }
  function marketingSharesForPopulation(population){
    const p=n(population);
    return p<20000 ? [10,10,10,9,9,8,8,8,7,7,7,7] : [14,13,12,10,9,8,7,6,6,5,5,5];
  }
  function monthlyMarketingBudgets(annualBudget,population){
    const annual=n(annualBudget);
    const shares=marketingSharesForPopulation(population);
    const budgets=shares.map(share=>roundTo(annual*share/100,100));
    const diff=annual-budgets.reduce((sum,value)=>sum+value,0);
    budgets[11]+=diff;
    return budgets;
  }
  function defaultExpenseRows(monthly=10000){return[{id:'assistente',name:'Assistente',amount:0,removable:false,showInModel:true,fixedType:'assistant'},{id:'other_costs',name:'Other Costs',amount:0,removable:false,showInModel:false,hidden:true}]}
  function normPctArray(arr,fallback){
    const src=Array.isArray(arr)&&arr.length===12?arr:fallback;
    return src.map(v=>Math.max(0,n(v)));
  }
  function normalizeAssumptions(input={}){
    const a={...defaultAssumptions(),...input};
    delete a.adminCost;
    delete a.activeUsers;
    if(!Array.isArray(a.expenseRows)||!a.expenseRows.length){a.expenseRows=defaultExpenseRows(a.otherCost||a.operatingExpenses||10000)}
    a.expenseRows=a.expenseRows.map((r,i)=>({
      id:r.id||uid(),
      name:String(r.name||`Expense ${i+1}`),
      amount:r.id==='other_costs'?0:n(r.amount),
      showInModel:r.id==='assistente'?true:(r.id==='other_costs'?false:r.showInModel!==false),
      removable:r.id==='assistente'?false:r.removable!==false,
      hidden:r.id==='other_costs'?true:!!r.hidden,
      fixedType:r.id==='assistente'?'assistant':(r.fixedType||null)
    }));
    if(!a.expenseRows.some(r=>r.id==='assistente')){a.expenseRows.unshift({id:'assistente',name:'Assistente',amount:0,removable:false,showInModel:true,fixedType:'assistant'})} 
    a.expenseRows=a.expenseRows.map(r=>r.id==='assistente'?{...r,name:'Assistente',amount:0,removable:false,showInModel:true,fixedType:'assistant'}:(r.id==='other_costs'?{...r,name:'Other Costs',amount:0,showInModel:false,hidden:true}:r));
    a.averageFare=12;
    a.commission=15;
    a.advertisingPackage=advertisingPackageForPopulation(a.population);
    a.marketingBudget=annualMarketingBudgetForPopulation(a.population);
    a.marketingDistributionPreset='auto';
    a.marketingDistribution=marketingSharesForPopulation(a.population);
    a.ridesDistributionPreset=a.ridesDistributionPreset||'balanced';
    a.ridesDistribution=normPctArray(a.ridesDistribution,ridesPresets[a.ridesDistributionPreset]||ridesPresets.balanced);
    if(!Number.isFinite(n(a.percentagePopulationUsingService))) a.percentagePopulationUsingService=1;
    a.percentagePopulationUsingService=Math.min(4,Math.max(1,n(a.percentagePopulationUsingService)||1));
    const legacyThailandRules=Array.isArray(a.revenueRules)&&a.revenueRules.some(r=>[20000,30000,40000,50000].includes(n(r.threshold)));
    if(!Array.isArray(a.revenueRules)||!a.revenueRules.length||legacyThailandRules||(a.revenueRules.length===1&&n(a.revenueRules[0].threshold)===0&&n(a.revenueRules[0].maximShare)===100)){a.revenueRules=defaultRevenueRules()}
    a.revenueRules=a.revenueRules.map((r,i)=>({id:r.id||uid(),threshold:Math.max(0,n(r.threshold)),maximShare:Math.min(100,Math.max(0,n(r.maximShare))),removable:r.removable!==false})).sort((x,y)=>x.threshold-y.threshold);
    return a;
  }
  function defaultRevenueRules(){return[
    {id:'rr_0',threshold:0,maximShare:0,removable:false},
    {id:'rr_3000',threshold:3000,maximShare:10,removable:false},
    {id:'rr_5000',threshold:5000,maximShare:15,removable:false},
    {id:'rr_7000',threshold:7000,maximShare:20,removable:false},
    {id:'rr_9000',threshold:9000,maximShare:25,removable:false},
    {id:'rr_11000',threshold:11000,maximShare:30,removable:false}
  ]}
  function defaultAssumptions(type='base'){
    const presets={
      conservative:{population:100000,averageFare:18,commission:10,rideGrowth:10,marketingBudget:25000,initialInvestment:8000,operatingExpenses:1500,percentagePopulationUsingService:1,expenseRows:defaultExpenseRows(1500),marketingDistributionPreset:'balanced',marketingDistribution:clone(marketingPresets.balanced),ridesDistributionPreset:'slow',ridesDistribution:clone(ridesPresets.slow)},
      base:{population:100000,averageFare:20,commission:10,rideGrowth:18,marketingBudget:30000,initialInvestment:10000,operatingExpenses:1500,percentagePopulationUsingService:1,expenseRows:defaultExpenseRows(1500),marketingDistributionPreset:'balanced',marketingDistribution:clone(marketingPresets.balanced),ridesDistributionPreset:'balanced',ridesDistribution:clone(ridesPresets.balanced)},
      optimistic:{population:100000,averageFare:24,commission:12,rideGrowth:25,marketingBudget:40000,initialInvestment:12000,operatingExpenses:2000,percentagePopulationUsingService:2,expenseRows:defaultExpenseRows(2000),marketingDistributionPreset:'growth',marketingDistribution:clone(marketingPresets.growth),ridesDistributionPreset:'aggressive',ridesDistribution:clone(ridesPresets.aggressive)}
    };
    return clone(presets[type]||presets.base)
  }
  function calculateCore(assumptions){
    const a=normalizeAssumptions(assumptions);
    const months=[];let accumulated=0;
    const targetRidesDay=Math.round(n(a.population)*n(a.percentagePopulationUsingService)/100);
    const autoMarketingBudgets=monthlyMarketingBudgets(a.marketingBudget,a.population);
    for(let i=0;i<14;i++){
      const isSetup=i===0,isPrep=i===1,monthNo=i-1;
      const mIndex=i-2;
      const marketingInvestment=i>1?autoMarketingBudgets[mIndex]:0;
      const investment=isSetup?n(a.initialInvestment):marketingInvestment;
      const ridesPerDay=i>1?Math.round(targetRidesDay*n(a.ridesDistribution[mIndex])/100):0;
      const ridesPerMonth=i>1?Math.round(ridesPerDay*30):0;
      const gross=ridesPerMonth*n(a.averageFare);
      const commissionFromRides=gross*n(a.commission)/100;
      const applicableRule=(a.revenueRules||[]).filter(r=>commissionFromRides>=n(r.threshold)).sort((x,y)=>n(y.threshold)-n(x.threshold))[0]||{maximShare:100};
      const maximShare=n(applicableRule.maximShare);
      const maximRevenue=commissionFromRides*maximShare/100;
      const partner=commissionFromRides-maximRevenue;
      const fixedExpenses={};
      let fixedExpenseTotal=0;
      if(i>1){
        a.expenseRows.filter(r=>r.showInModel!==false).forEach(r=>{const val=r.fixedType==='assistant'? (commissionFromRides<3000?250:500) : Math.round(n(r.amount));fixedExpenses[r.id]=val;fixedExpenseTotal+=val});
      }
      const assistantExpense=fixedExpenses.assistente||0;
      const opEx=i>1?marketingInvestment+fixedExpenseTotal:0;
      const netProfit=partner-opEx;
      const netCashFlow=i===0?-n(a.initialInvestment):(i>1?netProfit:0);
      accumulated+=netCashFlow;
      const margin=partner?netProfit/partner*100:0;
      months.push({key:monthKeys[i],index:i,monthNo,isSetup,isPrep,marketingPct:i>1?n(a.marketingDistribution[mIndex]):0,ridesPct:i>1?n(a.ridesDistribution[mIndex]):0,targetRidesDay,investment,initialPurchase:isSetup?investment:0,marketingInvestment,ridesPerDay,ridesPerMonth,averageFare:n(a.averageFare),gross,commission:n(a.commission),commissionFromRides,maximShare,revenue:maximRevenue,maximRevenue,partnerShare:100-maximShare,partner,marketingExpense:marketingInvestment,assistantExpense,fixedExpenses,opEx,netProfit,margin,netCashFlow,accumulated})
    }
    const yearMonths=months.slice(2);
    const initialPayment=n(a.initialInvestment);
    const totalMarketingInvestment=yearMonths.reduce((s,x)=>s+x.marketingInvestment,0);
    const totalAssistantExpense=yearMonths.reduce((s,x)=>s+(x.fixedExpenses?.assistente||0),0);
    const totalInvestment=initialPayment+totalMarketingInvestment+totalAssistantExpense;
    const totalRevenue=yearMonths.reduce((s,x)=>s+x.revenue,0);
    const totalCommissionFromRides=yearMonths.reduce((s,x)=>s+x.commissionFromRides,0);
    const totalPartnerRevenue=yearMonths.reduce((s,x)=>s+x.partner,0);
    const totalExpenses=yearMonths.reduce((s,x)=>s+x.opEx,0);
    const netProfit=yearMonths.reduce((s,x)=>s+x.netProfit,0);
    const roi=totalInvestment?netProfit/totalInvestment*100:0;
    const breakEven=months.find(x=>x.index>1&&x.accumulated>=0);
    return{assumptions:a,months,summary:{initialPayment,totalMarketingInvestment,totalAssistantExpense,totalInvestment,totalRevenue,totalPartnerRevenue,totalCommissionFromRides,totalExpenses,netProfit,roi,paybackPeriod:breakEven?breakEven.monthNo:null,breakEvenKey:breakEven?breakEven.key:null,targetRidesDay}}
  }
  function calculate(assumptions){
    let base=normalizeAssumptions(assumptions);
    base.averageFare=12;
    base.commission=15;
    if(base.autoPopulationUsingService===false){return calculateCore(base)}
    let selected=null;
    for(let step=10;step<=40;step++){
      const candidate={...base,percentagePopulationUsingService:step/10};
      const result=calculateCore(candidate);
      if(result.summary.paybackPeriod&&result.summary.paybackPeriod<=7){selected=result;break}
    }
    if(!selected){selected=calculateCore({...base,percentagePopulationUsingService:4})}
    return selected;
  }
  function formatMoney(v,compact=false){const abs=Math.abs(v);if(compact&&abs>=1000000)return (v/1000000).toFixed(v%1000000===0?0:2)+'M';if(compact&&abs>=1000)return Math.round(v/1000)+'K';return Math.round(v).toLocaleString('pt-BR')}
  function formatPercent(v){return `${Math.round(v)}%`}
  function createExpenseRow(name='New Expense',amount=0){return{id:uid(),name,amount,removable:true,showInModel:true}}
  function createRevenueRule(threshold=0,maximShare=100){return{id:uid(),threshold, maximShare, removable:true}}
  function applyPreset(assumptions,type,preset){
    const a=normalizeAssumptions(assumptions);
    if(type==='marketing'&&marketingPresets[preset]){a.marketingDistributionPreset=preset;a.marketingDistribution=clone(marketingPresets[preset])}
    if(type==='rides'&&ridesPresets[preset]){a.ridesDistributionPreset=preset;a.ridesDistribution=clone(ridesPresets[preset])}
    return a;
  }
  return{calculate,defaultAssumptions,normalizeAssumptions,createExpenseRow,createRevenueRule,formatMoney,formatPercent,monthKeys,marketingPresets,ridesPresets,applyPreset,advertisingPackageForPopulation,annualMarketingBudgetForPopulation,marketingSharesForPopulation,monthlyMarketingBudgets}
})();
