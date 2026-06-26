'use strict';
const UIRenderer=(()=>{
  let activeCurrency='BRL';
  const money=v=>FinancialEngine.formatMoney(v);
  const currency=()=>activeCurrency;
  const labelWithCurrency=s=>String(s).replaceAll('THB', activeCurrency).replaceAll('BRL', activeCurrency);
  const pct=v=>FinancialEngine.formatPercent(v);
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

  const ICONS={
    briefcase:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V6a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1"/><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M4 12h16M10 12v2h4v-2"/></svg>`,
    target:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`,
    profit:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 4 7-9"/><path d="M15 7h5v5"/><path d="M5 21h14"/></svg>`,
    roi:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/></svg>`,
    calendar:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`,
    growth:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16"/><path d="M6 15l4-4 3 3 5-7"/><path d="M15 7h3v3"/></svg>`,
    coin:`<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="7" rx="6" ry="3"/><path d="M6 7v7c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M6 11c0 1.7 2.7 3 6 3s6-1.3 6-3"/></svg>`,
    balance:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M5 7h14M8 7l-4 7h8L8 7zM16 7l-4 7h8l-4-7z"/></svg>`,
    pie:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none"/><path d="M12 3.5v17" stroke-linecap="round"/></svg>`,
    calculator:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="3"/><rect x="8" y="6" width="8" height="3" rx="1"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" stroke-linecap="round" stroke-width="2.2"/></svg>`,
    city:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16"/><path d="M6 20V8.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V20"/><path d="M9 10h.01M12 10h.01M15 10h.01M9 14h.01M12 14h.01M15 14h.01" stroke-linecap="round" stroke-width="2.2"/><path d="M10 20v-3.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20"/></svg>`,
    settings:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"/></svg>`
  };
  const icon=name=>ICONS[name]||'';

  function tableRows(model){
    const fixedExpenseRows=(model.assumptions.expenseRows||[]).filter(r=>r.showInModel!==false).map(r=>({section:'expenses',customExpense:true,expenseId:r.id,labelText:r.name,value:m=>m.fixedExpenses?.[r.id]||0,fmt:money,removable:r.removable!==false}));
    return [
      {section:'investment',icon:'briefcase',title:'investment',label:'initialPurchase',value:m=>m.initialPurchase,fmt:money},
      {section:'investment',label:'marketingInvestment',value:m=>m.marketingInvestment,fmt:money},
      {section:'investment',label:'totalInvestment',value:m=>m.investment,fmt:money,subtotal:true},
      {section:'operations',icon:'growth',title:'orderIndicators',label:'ridesPerDay',value:m=>m.ridesPerDay,fmt:money},
      {section:'operations',label:'ridesPerMonth',value:m=>m.ridesPerMonth,fmt:money},
      {section:'operations',label:'grossRideValue',value:m=>m.gross,fmt:money,subtotal:true},
      {section:'operations',label:'commissionFromCompletedRidesValue',value:m=>m.commissionFromRides,fmt:money,subtotal:true},
      {section:'revenue',icon:'pie',title:'revenueDistribution',label:'maximShare',value:m=>m.maximShare,fmt:pct},
      {section:'revenue',label:'maximRevenue',value:m=>m.revenue,fmt:money,subtotal:true},
      {section:'revenue',label:'partnerShare',value:m=>m.partnerShare,fmt:pct},
      {section:'revenue',label:'partnerRevenue',value:m=>m.partner,fmt:money,subtotal:true},
      {section:'expenses',icon:'calculator',title:'operatingExpenses',label:'marketingAdvertising',value:m=>m.marketingExpense,fmt:money},
      ...fixedExpenseRows,
      {section:'expenses',label:'totalOperatingExpenses',value:m=>m.opEx,fmt:money,subtotal:true},
      {section:'profit',icon:'profit',title:'profitCash',label:'netProfit',value:m=>m.netProfit,fmt:money,subtotal:true,sign:true},
      {section:'profit',label:'netProfitMargin',value:m=>m.margin,fmt:pct,sign:true},
      {section:'profit',label:'accumulatedCashFlow',value:m=>m.accumulated,fmt:money,subtotal:true,sign:true}
    ];
  }
  function getDisplayMonths(model){
    const setup=model.months[0];
    const preparation=model.months[1];
    const combined={...preparation,key:'setupPreparation',monthNo:0,isSetup:false,isPrep:true,isCombinedPreOpening:true};
    const numericKeys=['investment','initialPurchase','marketingInvestment','netProfit','netCashFlow'];
    numericKeys.forEach(k=>{combined[k]=(setup?.[k]||0)+(preparation?.[k]||0)});
    combined.accumulated=preparation?.accumulated ?? setup?.accumulated ?? 0;
    combined.marketingPct=0;
    combined.ridesPct=0;
    return [combined,...model.months.slice(2)];
  }
  function shouldBlankCombined(row,m){return m.isCombinedPreOpening&&['operations','revenue','expenses'].includes(row.section)}
  function getTableRows(model){return tableRows(model).map(r=>({label:r.labelText||Localization.t(r.label),value:m=>r.value(m)}))}
  const sectionIconFor=(section)=>({investment:'briefcase',operations:'growth',revenue:'pie',expenses:'calculator',profit:'profit'}[section]||'briefcase');
  const sectionTitleHtml=(row)=>`<div class="section-title-wrap"><span class="section-badge">${icon(sectionIconFor(row.section))}</span><span class="section-text">${Localization.t(row.title)}</span></div>`;
  function renderKpis(model,state){const grid=document.getElementById('kpiGrid');const c=currency();const cities=Array.isArray(window.CityData)?window.CityData:[];const city=cities.find(x=>x.id===state.selectedCityId)||state.selectedCitySnapshot||null;const fmtNum=v=>Math.round(Number(v)||0).toLocaleString(Localization.current==='pt-BR'?'pt-BR':'en-US');const cityName=city?`${esc(city.city)}, ${esc(city.state)}`:'—';const cityPopulation=city?fmtNum(city.population):fmtNum(model.assumptions?.population||0);const cityInitialPayment=city?fmtNum(city.initialPayment):fmtNum(model.assumptions?.initialInvestment||0);const cityCard=`<article class="kpi-card city-context-card"><div class="kpi-icon">${icon('city')}</div><div class="city-context-content"><div class="kpi-label">${Localization.t('selectedCity')}</div><div class="city-context-name">${cityName}</div><div class="city-context-meta"><span><strong>${Localization.t('populationHeader')}:</strong> ${cityPopulation}</span><span><strong>${Localization.t('initialPaymentHeader')}:</strong> BRL ${cityInitialPayment}</span></div></div></article>`;const items=[{k:'initialInvestment',color:'yellow',icon:icon('briefcase'),val:model.summary.totalInvestment,fmt:v=>`${FinancialEngine.formatMoney(v)} <span class="kpi-suffix">${c}</span>`},{k:'breakEven',color:'green',icon:icon('target'),val:model.summary.paybackPeriod||0,fmt:v=>`${model.summary.paybackPeriod?Localization.t('month')+' '+Math.round(v):'—'}`},{k:'yearProfit',color:'blue',icon:icon('profit'),val:model.summary.netProfit,fmt:v=>`${FinancialEngine.formatMoney(v,true)} <span class="kpi-suffix">${c}</span>`},{k:'roi12',color:'purple',icon:icon('roi'),val:model.summary.roi,fmt:v=>`${Math.round(v)}%`}];grid.innerHTML=cityCard+items.map(i=>`<article class="kpi-card ${i.color} kpi-${i.k}"><div class="kpi-icon">${i.icon}</div><div><div class="kpi-label">${Localization.t(i.k)}</div><div class="kpi-value" id="kpi-${i.k}"></div></div></article>`).join('');items.forEach(i=>Animation.animateNumber(document.getElementById('kpi-'+i.k),i.k,i.val,i.fmt))}
  function renderTable(model){const tbl=document.getElementById('modelTable');const displayMonths=getDisplayMonths(model);const heads=[Localization.t('setupPreparation'),...Array.from({length:12},(_,i)=>i+1)];const rows=tableRows(model);const colgroup='<colgroup><col class="col-section"><col class="col-metric">'+heads.map(()=>'<col class="col-period">').join('')+'</colgroup>';let html=`${colgroup}<thead><tr class="phase"><th colspan="2"></th><th colspan="1">${Localization.t('preOpening')}</th><th colspan="12">${Localization.t('growthPhase')}</th></tr><tr><th>${Localization.t('section')}</th><th>${Localization.t('month')}</th>${heads.map((h,i)=>`<th class="${model.summary.breakEvenKey===displayMonths[i]?.key?'breakeven':''}">${h}</th>`).join('')}</tr></thead><tbody>`;let last='';rows.forEach(row=>{const first=row.section!==last;last=row.section;html+=`<tr>${first?`<td class="row-label section-name section-title ${row.section}" rowspan="${rows.filter(r=>r.section===row.section).length}">${sectionTitleHtml(row)}</td>`:''}<td class="row-label metric-name ${row.section}">${esc(labelWithCurrency(row.labelText||Localization.t(row.label)))}</td>`;displayMonths.forEach(m=>{const val=row.value(m);const blankCombined=shouldBlankCombined(row,m);const empty=blankCombined||((m.isPrep||m.isSetup)&&val===0&&!['netCashFlow','accumulatedCashFlow'].includes(row.label));const editable=(row.marketingEditable||row.ridesEditable)&&!empty&&!m.isCombinedPreOpening;const cls=[row.subtotal?'subtotal':'',row.sign?(val<0?'negative':val>0?'positive':''):'',model.summary.breakEvenKey===m.key?'breakeven':'',empty?'muted-cell':'',editable?'editable-month-cell':''].join(' ');let data='';if(row.marketingEditable&&editable)data=` data-month-edit="marketing" data-month-no="${m.monthNo}" data-current-pct="${m.marketingPct}" title="Double click to edit % of Marketing Budget"`;if(row.ridesEditable&&editable)data=` data-month-edit="rides" data-month-no="${m.monthNo}" data-current-pct="${m.ridesPct}" title="Double click to edit % of month 12 orders"`;let content=empty?'':row.fmt(val);if(editable)content=`<div class="cell-absolute">${row.fmt(val)}</div>`;html+=`<td data-recalc class="${cls}"${data}>${content}</td>`});html+='</tr>'});html+='</tbody>';tbl.innerHTML=html}
  function renderSummary(model){const c=currency();const rows=[['totalInvestment',model.summary.totalInvestment,c],['totalPartnerRevenue',model.summary.totalPartnerRevenue,c],['totalCommissionFromRides',model.summary.totalCommissionFromRides,c],['totalOperatingExpenses',model.summary.totalExpenses,c],['netProfit',model.summary.netProfit,c],['roi12',model.summary.roi,'%'],['paybackPeriod',model.summary.paybackPeriod?Localization.t('month')+' '+model.summary.paybackPeriod:'—','']];document.getElementById('summaryList').innerHTML=rows.map(r=>`<div class="summary-row"><span>${Localization.t(r[0])}</span><span>${typeof r[1]==='number'?(r[2]==='%'?Math.round(r[1])+'%':FinancialEngine.formatMoney(r[1])+' '+r[2]):r[1]}</span></div>`).join('')}
  function renderInsights(model){const month=model.summary.paybackPeriod?Localization.t('month')+' '+model.summary.paybackPeriod:'—';document.getElementById('insightsList').innerHTML=[[icon('calendar'),'breakEvenMonth','breakEvenText'],[icon('growth'),'strongGrowth','strongGrowthText'],[icon('coin'),'highProfitability','profitText'],[icon('balance'),'positiveCashFlow','cashText']].map(([ic,t,txt])=>`<div class="insight"><div class="insight-badge">${ic}</div><div><div class="insight-title">${Localization.t(t)}</div><div class="insight-text">${Localization.t(txt,{month,profit:FinancialEngine.formatMoney(model.summary.netProfit,true)+' '+currency(),roi:Math.round(model.summary.roi)+'%'})}</div></div></div>`).join('')}
  const basic=['marketingBudget'];
  function inputLabel(k){if(k==='averageFare')return Localization.t('averageRidePrice');if(k==='commission')return Localization.t('commissionFromCompletedRidesPct');if(k==='initialInvestment')return Localization.t('initialInvestmentInput');return Localization.t(k)}
  function renderInputs(state,errors){
    const gridEl=document.getElementById('inputsGrid');
    const panel=document.getElementById('validationPanel');
    if(!gridEl){return}
    const normalized=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);state.activeScenario.assumptions=normalized;
    const currencyHtml=`<div class="input-row fixed-currency-row"><label>${Localization.t('currency')}</label><strong>BRL</strong></div>`;
    const formHtml=basic.map(k=>`<div class="input-row ${errors[k]?'invalid':''}"><label for="input-${k}">${labelWithCurrency(inputLabel(k))}</label><input id="input-${k}" data-input="${k}" type="number" step="${['commission','percentagePopulationUsingService'].includes(k)?'0.01':'1'}" value="${normalized[k]}"></div>`).join('');
    const presetManager=`<div class="preset-manager"><div class="preset-row"><label>${Localization.t('marketingDistributionPreset')}</label><select data-preset="marketing"><option value="balanced" ${normalized.marketingDistributionPreset==='balanced'?'selected':''}>Balanced</option><option value="launchHeavy" ${normalized.marketingDistributionPreset==='launchHeavy'?'selected':''}>Launch heavy</option><option value="growth" ${normalized.marketingDistributionPreset==='growth'?'selected':''}>Growth</option><option value="manual" ${normalized.marketingDistributionPreset==='manual'?'selected':''}>Manual</option></select></div><div class="preset-row"><label>${Localization.t('ridesDistributionPreset')}</label><select data-preset="rides"><option value="balanced" ${normalized.ridesDistributionPreset==='balanced'?'selected':''}>Balanced</option><option value="slow" ${normalized.ridesDistributionPreset==='slow'?'selected':''}>Slow build</option><option value="aggressive" ${normalized.ridesDistributionPreset==='aggressive'?'selected':''}>Aggressive</option><option value="manual" ${normalized.ridesDistributionPreset==='manual'?'selected':''}>Manual</option></select></div><div class="preset-hint">${Localization.t('presetHint')}</div></div>`;
    const expenseRows=(normalized.expenseRows||[]).filter(r=>!r.hidden&&r.id!=='other_costs').map(r=>{
      const fixed=r.fixedType==='assistant'||r.id==='assistente';
      return `<div class="expense-edit-row"><label class="expense-visible-toggle"><input type="checkbox" data-expense-visible="${r.id}" ${r.showInModel!==false?'checked':''} ${fixed?'disabled':''}> ${Localization.t('show')}</label><input class="expense-name" data-expense-name="${r.id}" value="${esc(fixed?Localization.t('assistente'):r.name)}" aria-label="Expense name" ${fixed?'disabled':''}><input class="expense-amount" type="${fixed?'text':'number'}" data-expense-amount="${r.id}" value="${fixed?'250 / 500':r.amount}" aria-label="Expense amount" ${fixed?'disabled':''}><button class="btn danger expense-delete" data-expense-delete="${r.id}" ${r.removable===false?'disabled':''}>×</button></div>`
    }).join('');
    const expenseManager=`<div class="expense-manager"><div class="expense-manager-head"><strong>${Localization.t('operatingExpenses')}</strong><button class="btn secondary" id="addExpenseRow" type="button">${Localization.t('addRow')}</button></div>${expenseRows}</div>`;
    const revenueRules=(normalized.revenueRules||[]).map(r=>`<div class="revenue-rule-row"><span>${Localization.t('feeFrom')}</span><input type="number" data-rule-threshold="${r.id}" value="${r.threshold}"><span>${activeCurrency}</span><span>=</span><input type="number" data-rule-share="${r.id}" value="${r.maximShare}" min="0" max="100"><span>%</span><button class="btn danger revenue-rule-delete" data-rule-delete="${r.id}" ${r.removable===false?'disabled':''}>×</button></div>`).join('');
    const ruleManager=`<div class="revenue-rule-manager"><div class="expense-manager-head"><strong>${Localization.t('revenueDistributionRules')}</strong><button class="btn secondary" id="addRevenueRule" type="button">${Localization.t('addRule')}</button></div>${revenueRules}<div class="preset-hint">${Localization.t('revenueRulesHint')}</div></div>`;
    gridEl.innerHTML=formHtml+(state.advanced?'<div class="advanced-title">'+Localization.t('advancedSettings')+'</div>'+currencyHtml+presetManager+expenseManager:'');
    const list=Object.values(errors);if(panel){panel.hidden=!list.length;panel.innerHTML=list.join('<br>')}
  }
  function renderLegend(){const legendEl=document.getElementById('legendList');if(!legendEl)return;legendEl.innerHTML=`<div class="legend-list"><div class="legend-item"><span class="swatch investment"></span>${Localization.t('investmentLegend')}</div><div class="legend-item"><span class="swatch operations"></span>${Localization.t('operationsLegend')}</div><div class="legend-item"><span class="swatch revenue"></span>${Localization.t('revenueLegend')}</div><div class="legend-item"><span class="swatch expenses"></span>${Localization.t('expensesLegend')}</div><div class="legend-item"><span class="swatch profit"></span>${Localization.t('profitLegend')}</div></div>`}
  function renderScenarioSelect(state){const sel=document.getElementById('scenarioSelect');if(!sel)return;sel.innerHTML=`<option value="base">Payback ≤ 7 months</option>`;sel.value='base';}
  function renderAll(state,model,errors={}){
    activeCurrency='BRL';
    Localization.setLanguage(state.language);
    const languageSelect=document.getElementById('languageSelect');
    if(languageSelect)languageSelect.value=state.language;
    const modeToggle=document.getElementById('modeToggle');
    if(modeToggle)modeToggle.textContent=Localization.t(state.advanced?'basicSettings':'advancedSettings');
    renderKpis(model,state);
    renderTable(model);
    renderSummary(model);
    renderInsights(model);
    renderLegend();
    const notesArea=document.getElementById('notesArea');
    if(notesArea)notesArea.value=state.activeScenario.notes||'';
    Charts.render(model);
    setTimeout(Animation.flashCells,10);
  }
  return{renderAll,getTableRows,getDisplayMonths}
})();
