'use strict';
const App=(()=>{
  let state, model, errors={}, undo=[], redo=[];
  let mobileChart=null;
  let startFilterState='', startFilterCityId='';

  const cities=()=>Array.isArray(window.CityData)?window.CityData:CityData;
  const cityById=id=>cities().find(c=>c.id===id)||null;
  const states=()=>[...new Set(cities().map(c=>c.state))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const fmtNumber=v=>Math.round(Number(v)||0).toLocaleString('pt-BR');
  const fmtBRL=v=>'BRL '+fmtNumber(v);

  function hydrate(){
    const saved=Storage.load();
    state=saved&&saved.scenarios ? saved : {language:'pt-BR',currency:'BRL',advanced:false,activeScenarioId:'base',selectedCityId:null,scenarios:ScenarioManager.builtIns()};
    state.currency='BRL';
    state.advanced=false;
    // Small App Brazil uses one automatic scenario only: payback target <= 7 months.
    const baseScenario=(ScenarioManager.builtIns().find(s=>s.id==='base')||ScenarioManager.builtIns()[0]);
    const savedBase=(state.scenarios||[]).find(s=>s.id==='base');
    if(savedBase&&savedBase.assumptions){
      baseScenario.assumptions={...baseScenario.assumptions,...savedBase.assumptions,autoPopulationUsingService:true,averageFare:12,commission:15};
      baseScenario.notes=savedBase.notes||'';
    }
    state.scenarios=[baseScenario];
    state.activeScenarioId='base';
    if(!['pt-BR','en'].includes(state.language))state.language='pt-BR';
    // The city selector must always start empty on a fresh app open.
    // Language and scenarios can persist, but the user explicitly chooses the city each time.
    state.selectedCityId=null;
    state.activeScenario=state.scenarios.find(s=>s.id===state.activeScenarioId)||state.scenarios[0];
    state.activeScenarioId=state.activeScenario.id;
    startFilterState='';
    startFilterCityId='';
  }
  function snapshot(){return JSON.stringify({language:state.language,currency:'BRL',advanced:false,activeScenarioId:state.activeScenarioId,selectedCityId:state.selectedCityId,scenarios:state.scenarios})}
  function pushUndo(){undo.push(snapshot());if(undo.length>100)undo.shift();redo=[]}
  function restore(snap){const parsed=JSON.parse(snap);state={...parsed,currency:'BRL'};state.activeScenario=state.scenarios.find(s=>s.id===state.activeScenarioId)||state.scenarios[0];recalc()}
  function persist(){Storage.save({language:state.language,currency:'BRL',advanced:false,activeScenarioId:state.activeScenarioId,selectedCityId:state.selectedCityId,scenarios:state.scenarios})}

  function applySelectedCity(city){
    if(!city)return;
    state.selectedCityId=city.id;
    state.selectedCitySnapshot={id:city.id,state:city.state,city:city.city,population:Number(city.population)||0,initialPayment:Number(city.initialPayment)||0};
    const population=Number(city.population)||0;
    state.activeScenario.assumptions.population=population;
    state.activeScenario.assumptions.initialInvestment=Number(city.initialPayment)||0;
    state.activeScenario.assumptions.averageFare=12;
    state.activeScenario.assumptions.commission=15;
    state.activeScenario.assumptions.advertisingPackage=FinancialEngine.advertisingPackageForPopulation(population);
    state.activeScenario.assumptions.marketingBudget=FinancialEngine.annualMarketingBudgetForPopulation(population);
    state.activeScenario.assumptions.marketingDistributionPreset='auto';
    state.activeScenario.assumptions.marketingDistribution=FinancialEngine.marketingSharesForPopulation(population);
    state.activeScenario.assumptions.autoPopulationUsingService=true;
    startFilterState=city.state;
    startFilterCityId=city.id;
  }

  function setScreen(){
    const hasCity=!!cityById(state.selectedCityId);
    document.body.classList.toggle('city-start-mode',!hasCity);
    document.getElementById('startScreen').hidden=hasCity;
    document.getElementById('dashboard').hidden=!hasCity;
    document.querySelector('.topbar').hidden=!hasCity;
    if(!hasCity){delete document.body.dataset.mobileSlide; const ma=document.getElementById('mobileApp'); if(ma)ma.dataset.page='start';}
    else if(isMobileLayout()&&!document.body.dataset.mobileSlide){document.body.dataset.mobileSlide='kpi'; const ma=document.getElementById('mobileApp'); if(ma)ma.dataset.page='kpi';}
  }

  function renderSelectedCityBanner(){
    const box=document.getElementById('selectedCityBanner');
    const topbar=document.getElementById('topbarCityMeta');
    const c=cityById(state.selectedCityId);
    const html=c ? `<div class="city-chip"><strong>${Localization.t('selectedCity')}:</strong> ${c.city}, ${c.state}</div><div class="city-chip"><strong>${Localization.t('populationHeader')}:</strong> ${fmtNumber(c.population)}</div><div class="city-chip"><strong>${Localization.t('initialPaymentHeader')}:</strong> ${fmtBRL(c.initialPayment)}</div>` : '';
    if(box) box.innerHTML=html;
    if(topbar) topbar.innerHTML='';
  }

  function renderStartScreen(){
    Localization.setLanguage(state.language);
    const lang1=document.getElementById('startLanguageSelect');
    if(lang1)lang1.value=state.language;
    const lang2=document.getElementById('mobileLanguageSelect');
    if(lang2)lang2.value=state.language;
    const flag=document.getElementById('startLangFlag');
    if(flag)flag.textContent=state.language==='pt-BR'?'🇧🇷':'🇺🇸';
    const startLangWrap=document.querySelector('.start-lang-switch');
    if(startLangWrap)startLangWrap.setAttribute('data-lang-label',state.language==='pt-BR'?'PT-BR':'EN');
    const mobileFlag=document.getElementById('mobileTopLangFlag');
    if(mobileFlag)mobileFlag.textContent=state.language==='pt-BR'?'🇧🇷':'🇺🇸';
    const stateSelect=document.getElementById('startStateSelect');
    const citySelect=document.getElementById('startCitySelect');
    if(!stateSelect||!citySelect)return;
    const st=states();
    const statePlaceholder=state.language==='pt-BR'?'Selecione um estado...':'Select a state...';
    const cityFirstPlaceholder=state.language==='pt-BR'?'Selecione primeiro um estado...':'Select a state first...';
    const cityPlaceholder=state.language==='pt-BR'?'Selecione uma cidade...':'Select a city...';
    stateSelect.innerHTML=`<option value="">${statePlaceholder}</option>`+st.map(x=>`<option value="${x}" ${x===startFilterState?'selected':''}>${x}</option>`).join('');
    const filtered=startFilterState ? cities().filter(c=>c.state===startFilterState) : cities();
    citySelect.disabled=!startFilterState;
    citySelect.innerHTML=startFilterState
      ? `<option value="">${cityPlaceholder}</option>`+filtered.map(c=>`<option value="${c.id}" ${c.id===startFilterCityId?'selected':''}>${c.city}</option>`).join('')
      : `<option value="">${cityFirstPlaceholder}</option>`;
    const calculateBtn=document.getElementById('startCalculateBtn');
    if(calculateBtn)calculateBtn.disabled=!startFilterCityId;
    const table=document.getElementById('cityTable');
    const rows=filtered.map(c=>`<tr data-city-row="${c.id}" class="${c.id===startFilterCityId?'selected':''}"><td>${c.state}</td><td>${c.city}</td><td>${fmtNumber(c.population)}</td><td>${fmtBRL(c.initialPayment)}</td></tr>`).join('');
    table.innerHTML=`<thead><tr><th>${Localization.t('state')}</th><th>${Localization.t('city')}</th><th>${Localization.t('populationHeader')}</th><th>${Localization.t('initialPaymentHeader')}</th></tr></thead><tbody>${rows}</tbody>`;
  }


  function isMobileLayout(){
    return window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
  }

  function mobileActivateSlide(target){
    if(!isMobileLayout()){
      const el=document.querySelector(target);
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    const map={
      '.hero-row':'kpi',
      '.chart-card':'chart',
      '#mobileInsightsSummary':'summary',
      '.model-column':'detail'
    };
    const slide=map[target]||target||'kpi';
    document.body.dataset.mobileSlide=slide;
    const ma=document.getElementById('mobileApp'); if(ma)ma.dataset.page=slide;
    window.scrollTo({top:0,left:0,behavior:'auto'});
    setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}},40);
  }

  function mobileScrollTo(selector){
    mobileActivateSlide(selector);
  }

  function ensureMobilePresentation(){
    const dashboard=document.getElementById('dashboard');
    const hero=dashboard?.querySelector('.hero-row');
    const chart=dashboard?.querySelector('.chart-card');
    const modelCol=dashboard?.querySelector('.model-column');
    if(!dashboard||!hero||!chart||!modelCol)return;

    if(!document.getElementById('mobileKpiNext')){
      const btn=document.createElement('button');
      btn.id='mobileKpiNext';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-bottom';
      btn.setAttribute('data-mobile-target','.chart-card');
      btn.setAttribute('aria-label','Next screen');
      btn.innerHTML='<span>↓</span>';
      hero.appendChild(btn);
    }

    if(!document.getElementById('mobileChartPrev')){
      const btn=document.createElement('button');
      btn.id='mobileChartPrev';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-top';
      btn.setAttribute('data-mobile-target','.hero-row');
      btn.setAttribute('aria-label','Previous screen');
      btn.innerHTML='<span>↑</span>';
      chart.prepend(btn);
    }
    if(!document.getElementById('mobileChartNext')){
      const btn=document.createElement('button');
      btn.id='mobileChartNext';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-bottom';
      btn.setAttribute('data-mobile-target','#mobileInsightsSummary');
      btn.setAttribute('aria-label','Next screen');
      btn.innerHTML='<span>↓</span>';
      chart.appendChild(btn);
    }

    let combined=document.getElementById('mobileInsightsSummary');
    if(!combined){
      combined=document.createElement('section');
      combined.id='mobileInsightsSummary';
      combined.className='side-card mobile-insights-summary-card';
      combined.innerHTML=`
        <button type="button" class="mobile-slide-button mobile-slide-button-top" data-mobile-target=".chart-card" aria-label="Previous screen"><span>↑</span></button>
        <div class="mobile-combined-content">
          <div class="mobile-combined-block">
            <h3 data-mobile-insights-title></h3>
            <div id="mobileInsightsList"></div>
          </div>
          <div class="mobile-combined-block">
            <h3 data-mobile-summary-title></h3>
            <div id="mobileSummaryList"></div>
          </div>
        </div>
        <button type="button" class="mobile-slide-detail-button" data-mobile-target=".model-column"></button>
      `;
      chart.insertAdjacentElement('afterend',combined);
    }
    const detailBtn=combined.querySelector('.mobile-slide-detail-button');
    if(detailBtn)detailBtn.textContent=state.language==='pt-BR'?'Mostrar detalhamento':'Show details';
    const it=combined.querySelector('[data-mobile-insights-title]');
    if(it)it.textContent=Localization.t('keyInsights');
    const st=combined.querySelector('[data-mobile-summary-title]');
    if(st)st.textContent=Localization.t('summary12');
  }

  function syncMobilePresentation(){
    ensureMobilePresentation();
    const srcInsights=document.getElementById('insightsList');
    const dstInsights=document.getElementById('mobileInsightsList');
    const srcSummary=document.getElementById('summaryList');
    const dstSummary=document.getElementById('mobileSummaryList');
    if(srcInsights&&dstInsights)dstInsights.innerHTML=srcInsights.innerHTML;
    if(srcSummary&&dstSummary)dstSummary.innerHTML=srcSummary.innerHTML;
  }



  function mobileSetPage(page){
    const app=document.getElementById('mobileApp');
    if(!app)return;
    const next=page||'kpi';
    app.dataset.page=next;
    document.body.dataset.mobileSlide=next;
    if(isMobileLayout()){
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
      window.scrollTo(0,0);
      renderMobileKpis();
      renderMobileSummaryAndDetail();
      setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}; renderMobileChart();},20);
      setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}; renderMobileChart();},160);
    }
  }

  function renderMobileStartScreen(){
    const app=document.getElementById('mobileApp');
    if(!app)return;
    const flag=document.getElementById('mobileStartLanguageFlag');
    const text=document.getElementById('mobileStartLanguageText');
    if(flag)flag.textContent=state.language==='pt-BR'?'🇧🇷':'🇺🇸';
    if(text)text.textContent=state.language==='pt-BR'?'PT-BR':'EN';
    const stateSelect=document.getElementById('mobileStateSelect');
    const citySelect=document.getElementById('mobileCitySelect');
    const btn=document.getElementById('mobileCalculateBtn');
    if(!stateSelect||!citySelect||!btn)return;
    const st=states();
    const statePlaceholder=state.language==='pt-BR'?'Selecione um estado...':'Select a state...';
    const cityFirstPlaceholder=state.language==='pt-BR'?'Selecione primeiro um estado...':'Select a state first...';
    const cityPlaceholder=state.language==='pt-BR'?'Selecione uma cidade...':'Select a city...';
    stateSelect.innerHTML=`<option value="">${statePlaceholder}</option>`+st.map(x=>`<option value="${x}" ${x===startFilterState?'selected':''}>${x}</option>`).join('');
    const filtered=startFilterState ? cities().filter(c=>c.state===startFilterState) : [];
    citySelect.disabled=!startFilterState;
    citySelect.innerHTML=startFilterState
      ? `<option value="">${cityPlaceholder}</option>`+filtered.map(c=>`<option value="${c.id}" ${c.id===startFilterCityId?'selected':''}>${c.city}</option>`).join('')
      : `<option value="">${cityFirstPlaceholder}</option>`;
    btn.disabled=!startFilterCityId;
  }

  function mobileKpiIcon(name){
    const icons={
      city:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16"/><path d="M6 20V8.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V20"/><path d="M9 10h.01M12 10h.01M15 10h.01M9 14h.01M12 14h.01M15 14h.01" stroke-linecap="round" stroke-width="2.2"/><path d="M10 20v-3.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20"/></svg>`,
      briefcase:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V6a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1"/><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M4 12h16M10 12v2h4v-2"/></svg>`,
      target:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`,
      profit:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 4 7-9"/><path d="M15 7h5v5"/><path d="M5 21h14"/></svg>`,
      roi:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/></svg>`
    };
    return `<span class="mobile-kpi-icon">${icons[name]||icons.briefcase}</span>`;
  }

  function renderMobileKpis(){
    const holder=document.getElementById('mobileKpiContent');
    if(!holder||!model)return;
    const c=cityById(state.selectedCityId);
    const cityTitle=c?`${c.city}, ${c.state}`:'—';
    const pop=c?fmtNumber(c.population):'—';
    const pay=c?fmtBRL(c.initialPayment):'—';
    const cards=[
      {cls:'city',icon:'city',label:Localization.t('selectedCity'),value:cityTitle,sub:`${Localization.t('populationHeader')}: ${pop} · ${Localization.t('initialPaymentHeader')}: ${pay}`},
      {icon:'briefcase',label:Localization.t('initialInvestment'),value:FinancialEngine.formatMoney(model.summary.totalInvestment)+' BRL'},
      {icon:'target',label:Localization.t('breakEven'),value:model.summary.paybackPeriod?`${Localization.t('month')} ${model.summary.paybackPeriod}`:'—'},
      {icon:'profit',label:Localization.t('yearProfit'),value:FinancialEngine.formatMoney(model.summary.netProfit,true)+' BRL'},
      {icon:'roi',label:Localization.t('roi12'),value:Math.round(model.summary.roi)+'%'}
    ];
    holder.innerHTML=cards.map(x=>`<div class="mobile-kpi-card ${x.cls||''}">${mobileKpiIcon(x.icon)}<div class="mobile-kpi-copy"><div class="mobile-kpi-label">${x.label}</div><div class="mobile-kpi-value">${x.value}</div>${x.sub?`<div class="mobile-kpi-sub">${x.sub}</div>`:''}</div></div>`).join('');
  }

  function mobileChartConfig(){
    if(!model)return null;
    const months=model.months.filter(x=>x.index>1);
    const labels=months.map((m,i)=>String(i+1));
    const net=months.map(x=>x.netProfit);
    const accumulated=months.map(x=>x.accumulated);
    return {
      type:'line',
      data:{labels,datasets:[
        {label:Localization.t('monthlyNetProfit'),data:net,borderColor:'#6fa053',backgroundColor:'rgba(111,160,83,.08)',tension:.32,pointRadius:2.4,pointHoverRadius:4,borderWidth:2.1,fill:false},
        {label:Localization.t('accumulatedNetProfit'),data:accumulated,borderColor:'#173b63',backgroundColor:'rgba(23,59,99,.08)',tension:.32,pointRadius:2.4,pointHoverRadius:4,borderWidth:2.2,fill:false}
      ]},
      options:{responsive:true,maintainAspectRatio:false,animation:{duration:300},interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${FinancialEngine.formatMoney(ctx.raw)} BRL`}}},scales:{x:{grid:{display:false},ticks:{font:{size:10},autoSkip:false,maxRotation:0}},y:{ticks:{callback:v=>FinancialEngine.formatMoney(v,true),font:{size:10},maxTicksLimit:5},grid:{color:'#e5e7eb'}}}}
    };
  }

  function renderMobileChart(){
    const canvas=document.getElementById('mobileCashFlowChart');
    if(!canvas||!window.Chart||!model||!isMobileLayout())return;
    const cfg=mobileChartConfig();
    if(!cfg)return;
    if(mobileChart){mobileChart.data=cfg.data;mobileChart.options=cfg.options;mobileChart.resize();mobileChart.update();}
    else mobileChart=new Chart(canvas,cfg);
    const legend=document.getElementById('mobileChartLegend');
    if(legend){
      legend.innerHTML=`<span><i class="mobile-chart-dot" style="background:#6fa053"></i>${Localization.t('monthlyNetProfit')}</span><span><i class="mobile-chart-dot" style="background:#173b63"></i>${Localization.t('accumulatedNetProfit')}</span>`;
    }
  }

  function parseMobileCellNumber(text){
    const raw=String(text||'').trim();
    if(!raw||raw==='—'||raw.includes('%'))return null;
    const normalized=raw
      .replace(/BRL|R\$|\s/g,'')
      .replace(/[^0-9,\.\-]/g,'')
      .replace(/\.(?=\d{3}(\D|$))/g,'')
      .replace(',', '.');
    const n=Number(normalized);
    return Number.isFinite(n)?n:null;
  }

  function formatMobileRowTotal(values, rowText){
    if(String(rowText||'').includes('%'))return '—';
    const nums=values.map(parseMobileCellNumber).filter(v=>v!==null);
    if(!nums.length)return '—';
    const total=nums.reduce((a,b)=>a+b,0);
    const moneyLike=values.some(v=>/BRL|R\$/.test(String(v))) || /invest|receita|revenue|profit|lucro|taxa|marketing|assistente|expense|despesa|cash|fluxo|commission|comissão/i.test(rowText||'');
    return moneyLike ? `${FinancialEngine.formatMoney(total)} BRL` : fmtNumber(total);
  }

  function mobileSectionIcon(sectionClass){
    const icons={
      investment:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/><path d="M9 13h6"/></svg>`,
      operations:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16"/><path d="M6 16l4-5 4 3 5-8"/><path d="M15 6h4v4"/></svg>`,
      revenue:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16"/></svg>`,
      expenses:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 8h6M9 12h2M13 12h2M9 16h2M13 16h2"/></svg>`,
      profit:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 4 7-9"/><path d="M15 7h5v5"/><path d="M5 21h14"/></svg>`
    };
    return icons[sectionClass]||icons.operations;
  }

  function mobileSectionLabel(text){
    const cleaned=String(text||'').replace(/\s+/g,' ').trim();
    if(state.language==='pt-BR'){
      return cleaned
        .replace('PREVISÃO DE VOLUME DE PEDIDOS','PREVISÃO\nDE VOLUME\nDE PEDIDOS')
        .replace('DISTRIBUIÇÃO DE RECEITA','DISTRIBUIÇÃO\nDE RECEITA')
        .replace('DESPESAS OPERACIONAIS','DESPESAS\nOPERACIONAIS')
        .replace('PREVISÃO DE LUCRO DO PARCEIRO','PREVISÃO\nDE LUCRO\nDO PARCEIRO');
    }
    return cleaned
      .replace('ORDER VOLUME FORECAST','ORDER\nVOLUME\nFORECAST')
      .replace('REVENUE DISTRIBUTION','REVENUE\nDISTRIBUTION')
      .replace('OPERATING EXPENSES','OPERATING\nEXPENSES')
      .replace('PARTNER PROFIT FORECAST','PARTNER\nPROFIT\nFORECAST');
  }

  function renderMobileDetailTable(){
    const host=document.querySelector('.mobile-detail-scroll');
    const srcTable=document.getElementById('modelTable');
    if(!host||!srcTable)return;
    const headerThs=Array.from(srcTable.querySelectorAll('thead tr:last-child th'));
    const headerCells=headerThs.map(th=>th.textContent.trim());
    const periodBreakEven=(headerThs.length?headerThs.slice(2).map(th=>th.classList.contains('breakeven')):[]).concat(false);
    const periodHeaders=(headerCells.length?headerCells.slice(2):[]).concat(state.language==='pt-BR'?'Total':'Total');
    const groups=[];
    let currentGroup=null;
    srcTable.querySelectorAll('tbody tr').forEach(tr=>{
      const cells=Array.from(tr.children);
      if(!cells.length)return;
      let metric='', dataCells=[];
      if(cells[0].classList.contains('section-name')){
        currentGroup={
          text:cells[0].textContent.trim(),
          sectionClass:['investment','operations','revenue','expenses','profit'].find(c=>cells[0].classList.contains(c))||'',
          rows:[]
        };
        groups.push(currentGroup);
        metric=cells[1]?.textContent.trim()||'';
        dataCells=cells.slice(2);
      }else{
        if(!currentGroup){currentGroup={text:'',sectionClass:'',rows:[]};groups.push(currentGroup)}
        metric=cells[0]?.textContent.trim()||'';
        dataCells=cells.slice(1);
      }
      const values=dataCells.map(td=>td.textContent.trim());
      const total=formatMobileRowTotal(values, `${currentGroup.text} ${metric}`);
      currentGroup.rows.push({metric,values,total,sectionClass:currentGroup.sectionClass});
    });
    let fixedItems=`<div class="mobile-fixed-header mobile-section-head">${Localization.t('section')}</div><div class="mobile-fixed-header mobile-metric-head">${Localization.t('month')}</div>`;
    let rowIndex=2;
    groups.forEach(group=>{
      const start=rowIndex;
      const span=group.rows.length;
      fixedItems+=`<div class="mobile-section-cell ${group.sectionClass}" style="grid-row:${start}/span ${span};grid-column:1;"><div class="mobile-section-stacked"><span class="mobile-section-icon">${mobileSectionIcon(group.sectionClass)}</span><span class="mobile-section-text">${mobileSectionLabel(group.text).split('\n').map(x=>`<span>${x}</span>`).join('')}</span></div></div>`;
      group.rows.forEach(row=>{
        fixedItems+=`<div class="mobile-metric-cell ${group.sectionClass}" style="grid-row:${rowIndex};grid-column:2;">${row.metric}</div>`;
        rowIndex++;
      });
    });
    const scrollHeader=`<thead><tr>${periodHeaders.map((h,i)=>`<th class="mobile-value-head ${i===periodHeaders.length-1?'mobile-total-cell':''} ${periodBreakEven[i]?'mobile-breakeven':''}">${h}</th>`).join('')}</tr></thead>`;
    const scrollBody=groups.map(group=>group.rows.map(row=>`<tr>${row.values.map((v,i)=>`<td class="mobile-value-cell ${periodBreakEven[i]?'mobile-breakeven':''}">${v}</td>`).join('')}<td class="mobile-value-cell mobile-total-cell">${row.total}</td></tr>`).join('')).join('');
    const totalRows=groups.reduce((sum,g)=>sum+g.rows.length,0);
    host.innerHTML=`<div class="mobile-detail-split"><div class="mobile-fixed-pane"><div class="mobile-fixed-grid" style="--mobile-detail-row-count:${totalRows};">${fixedItems}</div></div><div class="mobile-months-pane"><table id="mobileDetailTable" class="mobile-months-table"><colgroup>${periodHeaders.map((_,i)=>`<col class="${i===periodHeaders.length-1?'mobile-col-total':'mobile-col-period'}">`).join('')}</colgroup>${scrollHeader}<tbody>${scrollBody}</tbody></table></div></div>`;
    requestAnimationFrame(()=>{
      const screen=document.getElementById('mobileDetailScreen');
      if(screen&&totalRows){
        const available=Math.max(360, window.innerHeight - 138);
        const rowH=Math.max(26, Math.min(32, Math.floor(available / (totalRows + 1))));
        screen.style.setProperty('--mobile-detail-row-h', `${rowH}px`);
      }
    });
  }

  function renderMobileSummaryAndDetail(){
    const srcInsights=document.getElementById('insightsList');
    const srcSummary=document.getElementById('summaryList');
    const dstInsights=document.getElementById('mobileStandaloneInsights');
    const dstSummary=document.getElementById('mobileStandaloneSummary');
    if(dstInsights&&srcInsights)dstInsights.innerHTML=srcInsights.innerHTML;
    if(dstSummary&&srcSummary)dstSummary.innerHTML=srcSummary.innerHTML;
    renderMobileDetailTable();
    const detailBtn=document.querySelector('.mobile-detail-next');
    if(detailBtn)detailBtn.textContent=state.language==='pt-BR'?'Mostrar detalhamento':'Show details';
  }



  function mobilePageOrder(){return ['kpi','chart','summary','resumo','detail'];}
  function mobileNextPage(page){const a=mobilePageOrder();const i=a.indexOf(page);return i>=0&&i<a.length-1?a[i+1]:page;}
  function mobilePrevPage(page){const a=mobilePageOrder();const i=a.indexOf(page);return i>0?a[i-1]:page;}

  function bindMobileGestures(){
    const app=document.getElementById('mobileApp');
    if(!app||app.dataset.gesturesBound==='1')return;
    app.dataset.gesturesBound='1';
    let startX=0,startY=0,startTime=0;
    let pinchStartDistance=0,pinchStartZoom=1;
    const getZoom=()=>{
      const v=parseFloat(getComputedStyle(document.getElementById('mobileDetailScreen')||app).getPropertyValue('--mobile-table-zoom'));
      return Number.isFinite(v)&&v>0?v:1;
    };
    const setZoom=z=>{
      const detail=document.getElementById('mobileDetailScreen');
      if(!detail)return;
      const clamped=Math.max(.88,Math.min(1.35,z));
      detail.style.setProperty('--mobile-table-zoom',String(clamped));
    };
    const distance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);

    app.addEventListener('touchstart',e=>{
      if(!isMobileLayout())return;
      if(e.touches.length===2 && e.target.closest('#mobileDetailScreen')){
        pinchStartDistance=distance(e.touches[0],e.touches[1]);
        pinchStartZoom=getZoom();
        return;
      }
      if(e.touches.length!==1)return;
      startX=e.touches[0].clientX;
      startY=e.touches[0].clientY;
      startTime=Date.now();
    },{passive:true});

    app.addEventListener('touchmove',e=>{
      if(!isMobileLayout())return;
      if(e.touches.length===2 && e.target.closest('#mobileDetailScreen') && pinchStartDistance>0){
        e.preventDefault();
        const d=distance(e.touches[0],e.touches[1]);
        if(d>0)setZoom(pinchStartZoom*(d/pinchStartDistance));
      }
    },{passive:false});

    app.addEventListener('touchend',e=>{
      if(!isMobileLayout())return;
      if(pinchStartDistance){pinchStartDistance=0;return;}
      if(!startTime)return;
      const touch=e.changedTouches&&e.changedTouches[0];
      if(!touch)return;
      const dx=touch.clientX-startX;
      const dy=touch.clientY-startY;
      const dt=Date.now()-startTime;
      startTime=0;
      if(dt>700)return;
      if(Math.abs(dy)<55 || Math.abs(dy)<Math.abs(dx)*1.15)return;
      if(e.target.closest('.mobile-months-pane'))return;
      const page=(document.getElementById('mobileApp')?.dataset.page)||'kpi';
      if(page==='detail'||e.target.closest('#mobileDetailScreen'))return;
      if(dy<0)mobileSetPage(mobileNextPage(page));
      else mobileSetPage(mobilePrevPage(page));
    },{passive:true});
  }

  function renderMobileApp(){
    if(!document.getElementById('mobileApp'))return;
    renderMobileStartScreen();
    if(model){
      renderMobileKpis();
      renderMobileSummaryAndDetail();
      if(!document.getElementById('mobileApp').dataset.page)document.getElementById('mobileApp').dataset.page='kpi';
      if(isMobileLayout())setTimeout(renderMobileChart,50);
    }
  }

  function recalc(){
    state.activeScenario=state.scenarios.find(s=>s.id===state.activeScenarioId)||state.scenarios[0];
    state.activeScenario.assumptions=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);
    const v=Validation.validateAssumptions(state.activeScenario.assumptions);
    errors=v.errors;
    model=FinancialEngine.calculate(state.activeScenario.assumptions);
    model.currency='BRL';
    UIRenderer.renderAll(state,model,errors);
    renderSelectedCityBanner();
    renderStartScreen();
    syncMobilePresentation();
    renderMobileApp();
    setScreen();
    document.getElementById('undoBtn')?.classList.toggle('disabled',undo.length===0);
    document.getElementById('redoBtn')?.classList.toggle('disabled',redo.length===0);
    persist();
  }

  function onInput(e){
    const el=e.target;
    if(el.dataset.currencyInput!==undefined){return}
    if(el.dataset.input){
      pushUndo();
      state.activeScenario.assumptions[el.dataset.input]=Number(el.value);
      if(el.dataset.input==='operatingExpenses'){
        const rows=state.activeScenario.assumptions.expenseRows||[];
        const base=rows.find(r=>r.id==='other_costs')||rows.find(r=>r.id!=='assistente')||rows[0];
        if(base&&base.id!=='assistente')base.amount=Number(el.value);
      }
      recalc();return;
    }
    if(el.dataset.marketingPct){pushUndo();const idx=Number(el.dataset.marketingPct)-1;const a=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);a.marketingDistribution[idx]=Math.max(0,Number(el.value)||0);a.marketingDistributionPreset='manual';state.activeScenario.assumptions=a;recalc();return}
    if(el.dataset.ridesPct){pushUndo();const idx=Number(el.dataset.ridesPct)-1;const a=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);a.ridesDistribution[idx]=Math.max(0,Number(el.value)||0);a.ridesDistributionPreset='manual';state.activeScenario.assumptions=a;recalc();return}
    if(el.dataset.ruleThreshold){pushUndo();const row=(state.activeScenario.assumptions.revenueRules||[]).find(r=>r.id===el.dataset.ruleThreshold);if(row)row.threshold=Math.max(0,Number(el.value)||0);recalc();return}
    if(el.dataset.ruleShare){pushUndo();const row=(state.activeScenario.assumptions.revenueRules||[]).find(r=>r.id===el.dataset.ruleShare);if(row)row.maximShare=Math.min(100,Math.max(0,Number(el.value)||0));recalc();return}
    if(el.dataset.preset){pushUndo();state.activeScenario.assumptions=FinancialEngine.applyPreset(state.activeScenario.assumptions,el.dataset.preset,el.value);recalc();return}
    if(el.dataset.expenseVisible){pushUndo();const row=(state.activeScenario.assumptions.expenseRows||[]).find(r=>r.id===el.dataset.expenseVisible);if(row)row.showInModel=el.checked;recalc();return}
    if(el.dataset.expenseAmount){pushUndo();const row=(state.activeScenario.assumptions.expenseRows||[]).find(r=>r.id===el.dataset.expenseAmount);if(row&&row.id!=='assistente'){row.amount=Number(el.value);state.activeScenario.assumptions.operatingExpenses=Number(el.value)}recalc();return}
    if(el.dataset.expenseName){pushUndo();const row=(state.activeScenario.assumptions.expenseRows||[]).find(r=>r.id===el.dataset.expenseName);if(row&&row.id!=='assistente')row.name=el.value.trim()||'Expense';recalc();}
  }

  function bind(){
    document.body.addEventListener('change',onInput);
    const mobileNavHandler=e=>{
      const nav=e.target.closest?.('[data-mobile-page-target]');
      if(nav&&isMobileLayout()){
        e.preventDefault();
        e.stopPropagation();
        mobileSetPage(nav.dataset.mobilePageTarget);
      }
    };
    document.body.addEventListener('pointerup',mobileNavHandler,{capture:true});
    document.body.addEventListener('touchend',mobileNavHandler,{capture:true,passive:false});
    document.body.addEventListener('click',e=>{
      const mobilePageNav=e.target.closest('[data-mobile-page-target]');
      if(mobilePageNav){mobileSetPage(mobilePageNav.dataset.mobilePageTarget);return}
      const mobileNav=e.target.closest('[data-mobile-target]');
      if(mobileNav){mobileScrollTo(mobileNav.dataset.mobileTarget);return}
      const cityRow=e.target.closest('[data-city-row]');
      if(cityRow){const city=cityById(cityRow.dataset.cityRow);if(city){startFilterState=city.state;startFilterCityId=city.id;}renderStartScreen();return}
      const del=e.target.closest('[data-expense-delete]');
      if(del){pushUndo();const id=del.dataset.expenseDelete;state.activeScenario.assumptions.expenseRows=(state.activeScenario.assumptions.expenseRows||[]).filter(r=>r.id!==id || r.removable===false);recalc();return}
      const ruleDel=e.target.closest('[data-rule-delete]');
      if(ruleDel){pushUndo();const id=ruleDel.dataset.ruleDelete;state.activeScenario.assumptions.revenueRules=(state.activeScenario.assumptions.revenueRules||[]).filter(r=>r.id!==id || r.removable===false);recalc();return}
      if(e.target.id==='addRevenueRule'){pushUndo();const rules=state.activeScenario.assumptions.revenueRules||(state.activeScenario.assumptions.revenueRules=[]);rules.push(FinancialEngine.createRevenueRule(0,100));recalc();return}
      if(e.target.id==='addExpenseRow'){pushUndo();const rows=state.activeScenario.assumptions.expenseRows||(state.activeScenario.assumptions.expenseRows=[]);rows.push(FinancialEngine.createExpenseRow('New Expense',0));recalc();return}
      if(e.target.id==='startCalculateBtn'||e.target.id==='mobileCalculateBtn'){
        const city=cityById(startFilterCityId);
        if(!city)return;
        pushUndo();applySelectedCity(city);recalc();
        if(isMobileLayout())mobileSetPage('kpi');
        else window.scrollTo({top:0,behavior:'auto'});
        return;
      }
      if(e.target.closest('#changeCityBtn')||e.target.closest('#mobileChangeCityBtn')){
        state.selectedCityId=null;delete document.body.dataset.mobileSlide;renderStartScreen();setScreen();persist();return;
      }
    });
    document.body.addEventListener('dblclick',e=>{
      const cell=e.target.closest('[data-month-edit]');
      if(!cell||cell.querySelector('input.month-pct-editor'))return;
      const current=Number(cell.dataset.currentPct)||0;
      const input=document.createElement('input');input.className='month-pct-editor';input.type='number';input.step='0.1';input.min='0';input.value=current;
      cell.innerHTML='';cell.appendChild(input);input.focus();input.select();
      const commit=()=>{if(!input.isConnected)return;pushUndo();const idx=Number(cell.dataset.monthNo)-1;const a=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);if(cell.dataset.monthEdit==='marketing'){a.marketingDistribution[idx]=Math.max(0,Number(input.value)||0);a.marketingDistributionPreset='manual'}if(cell.dataset.monthEdit==='rides'){a.ridesDistribution[idx]=Math.max(0,Number(input.value)||0);a.ridesDistributionPreset='manual'}state.activeScenario.assumptions=a;recalc()};
      input.addEventListener('blur',commit,{once:true});
      input.addEventListener('keydown',ev=>{if(ev.key==='Enter')input.blur();if(ev.key==='Escape')recalc()});
    });
    document.getElementById('startLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;renderStartScreen();renderMobileApp();persist()});
    document.getElementById('mobileStartLanguageButton')?.addEventListener('click',()=>{state.language=state.language==='pt-BR'?'en':'pt-BR';Localization.setLanguage(state.language);renderStartScreen();renderMobileApp();persist()});
    document.getElementById('mobileLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;recalc();persist()});
    window.addEventListener('resize',()=>{if(isMobileLayout()&&cityById(state.selectedCityId)&&!document.body.dataset.mobileSlide)document.body.dataset.mobileSlide='kpi';});
    document.getElementById('startStateSelect').addEventListener('change',e=>{startFilterState=e.target.value;startFilterCityId='';renderStartScreen();renderMobileStartScreen()});
    document.getElementById('startCitySelect').addEventListener('change',e=>{startFilterCityId=e.target.value;renderStartScreen();renderMobileStartScreen()});
    document.getElementById('mobileStateSelect')?.addEventListener('change',e=>{startFilterState=e.target.value;startFilterCityId='';renderStartScreen();renderMobileStartScreen()});
    document.getElementById('mobileCitySelect')?.addEventListener('change',e=>{startFilterCityId=e.target.value;renderStartScreen();renderMobileStartScreen()});
    document.getElementById('mobileExportPdfBtn')?.addEventListener('click',Exporter.exportPdf);
    document.getElementById('notesArea')?.addEventListener('input',e=>{state.activeScenario.notes=e.target.value;persist()});
    document.getElementById('languageSelect')?.addEventListener('change',e=>{state.language=e.target.value;recalc()});
    document.getElementById('modeToggle')?.addEventListener('click',()=>{state.advanced=!state.advanced;recalc()});
    document.getElementById('resetBtn')?.addEventListener('click',()=>{if(!confirm(Localization.t('confirmReset')))return;pushUndo();const type=['conservative','optimistic'].includes(state.activeScenarioId)?state.activeScenarioId:'base';state.activeScenario.assumptions=FinancialEngine.defaultAssumptions(type);const c=cityById(state.selectedCityId);if(c)applySelectedCity(c);recalc()});
    document.getElementById('undoBtn')?.addEventListener('click',()=>{if(!undo.length)return;redo.push(snapshot());restore(undo.pop())});
    document.getElementById('redoBtn')?.addEventListener('click',()=>{if(!redo.length)return;undo.push(snapshot());restore(redo.pop())});
    document.getElementById('exportPdf')?.addEventListener('click',Exporter.exportPdf);
    document.getElementById('exportExcel')?.addEventListener('click',()=>Exporter.exportExcel(model));
  }
  function init(){hydrate();bind();bindMobileGestures();recalc()}
  return{init}
})();
document.addEventListener('DOMContentLoaded',App.init);

// Final interaction patch: notes popover opens only on explicit click.
document.addEventListener('DOMContentLoaded',()=>{
  const host=document.querySelector('.scenario-notes-host');
  const btn=document.querySelector('.notes-info');
  if(host&&btn){
    btn.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();host.classList.toggle('notes-open');});
    document.addEventListener('click',(e)=>{if(!host.contains(e.target))host.classList.remove('notes-open');});
    document.addEventListener('keydown',(e)=>{if(e.key==='Escape')host.classList.remove('notes-open');});
  }
});
