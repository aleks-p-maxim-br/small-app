'use strict';
const Charts=(()=>{
  let chart=null;
  let largeChart=null;
  let lastModel=null;

  function buildIntersectionDataset(net, accumulated){
    let bestIndex=-1;
    let bestGap=Number.POSITIVE_INFINITY;
    for(let i=0;i<net.length;i++){
      const gap=Math.abs(net[i]-accumulated[i]);
      if(gap<bestGap){bestGap=gap;bestIndex=i;}
      if(i>0){
        const prev=net[i-1]-accumulated[i-1];
        const curr=net[i]-accumulated[i];
        if(prev===0){bestIndex=i-1;break;}
        if(curr===0){bestIndex=i;break;}
        if(prev*curr<0){
          bestIndex=Math.abs(prev)<Math.abs(curr)?i-1:i;
          break;
        }
      }
    }
    const data=net.map(()=>null);
    if(bestIndex>=0 && Number.isFinite(bestGap)) data[bestIndex]=(net[bestIndex]+accumulated[bestIndex])/2;
    return {
      label:Localization.t('intersectionPoint')||'Intersection',
      data,
      borderColor:'#d92d20',
      backgroundColor:'#d92d20',
      pointRadius:0,
      pointHoverRadius:0,
      borderWidth:0,
      showLine:false,
      hitRadius:0,
      metaOnly:true
    };
  }

  function buildConfig(model){
    const c='BRL';
    const months=model.months.filter(x=>x.index>1);
    const labels=months.map((m,i)=>String(i+1));
    const net=months.map(x=>x.netProfit);
    const accumulated=months.map(x=>x.accumulated);
    return {
      type:'line',
      data:{labels,datasets:[
        {label:Localization.t('monthlyNetProfit'),data:net,borderColor:'#6fa053',backgroundColor:'rgba(111,160,83,.10)',tension:.32,pointRadius:2.8,pointHoverRadius:5,borderWidth:2.2,fill:false},
        {label:Localization.t('accumulatedNetProfit'),data:accumulated,borderColor:'#173b63',backgroundColor:'rgba(23,59,99,.10)',tension:.32,pointRadius:2.8,pointHoverRadius:5,borderWidth:2.4,fill:false}
      ]},
      options:{
        responsive:true,
        maintainAspectRatio:false,
        resizeDelay:80,
        animation:{duration:420},
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{display:false,position:'bottom',align:'center',labels:{filter:item=>item.datasetIndex<2,boxWidth:8,boxHeight:8,padding:12,usePointStyle:true,pointStyle:'circle',font:{size:10,weight:'600'}}},
          tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${FinancialEngine.formatMoney(ctx.raw)} ${c}`}}
        },
        scales:{
          x:{grid:{display:false},ticks:{font:{size:9},maxRotation:0,autoSkip:false}},
          y:{beginAtZero:false,ticks:{callback:v=>FinancialEngine.formatMoney(v,true),font:{size:10},maxTicksLimit:5},grid:{color:'#e5e7eb'}}
        }
      }
    };
  }

  function render(model){
    lastModel=model;
    const canvas=document.getElementById('cashFlowChart');
    if(!canvas||!window.Chart)return;
    const config=buildConfig(model);
    config.options.plugins.legend.display=false;
    if(chart){
      chart.data=config.data;
      chart.options=config.options;
      chart.resize();
      chart.update();
    }else{
      chart=new Chart(canvas,config);
    }
    renderInlineLegend();
    if(!Charts._bound){bindModal();Charts._bound=true;}
  }

  function renderInlineLegend(){
    const holder=document.getElementById('chartLegendInline');
    if(!holder||!chart)return;
    holder.innerHTML=chart.data.datasets.slice(0,2).map((dataset,index)=>{
      const visible=chart.isDatasetVisible(index);
      const color=dataset.borderColor||'#344054';
      return `<button class="chart-legend-chip${visible?'':' is-muted'}" type="button" data-dataset-index="${index}" title="Toggle ${dataset.label}"><span class="chart-legend-dot" style="background:${color}"></span><span>${dataset.label}</span></button>`;
    }).join('');
  }

  function renderLarge(){
    const canvas=document.getElementById('cashFlowChartLarge');
    if(!canvas||!lastModel||!window.Chart)return;
    const config=buildConfig(lastModel);
    config.options.plugins.legend.display=true;
    config.options.plugins.legend.position='bottom';
    config.options.plugins.legend.align='center';
    config.options.plugins.legend.labels.font.size=12;
    config.options.plugins.legend.labels.boxWidth=8;
    config.options.plugins.legend.labels.boxHeight=8;
    config.options.plugins.legend.labels.padding=16;
    config.options.scales.x.ticks.font.size=12;
    config.options.scales.y.ticks.font.size=12;
    config.options.scales.y.ticks.maxTicksLimit=7;
    if(largeChart)largeChart.destroy();
    largeChart=new Chart(canvas,config);
  }

  function openModal(){
    const modal=document.getElementById('chartModal');
    if(!modal)return;
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('chart-modal-open');
    requestAnimationFrame(renderLarge);
  }

  function closeModal(){
    const modal=document.getElementById('chartModal');
    if(!modal)return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('chart-modal-open');
    if(largeChart){largeChart.destroy();largeChart=null;}
  }

  function bindModal(){
    document.getElementById('openChartModal')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openModal();});
    document.getElementById('chartLegendInline')?.addEventListener('click',e=>{
      const btn=e.target.closest('[data-dataset-index]');
      if(!btn||!chart)return;
      e.preventDefault();
      e.stopPropagation();
      const index=Number(btn.dataset.datasetIndex);
      chart.setDatasetVisibility(index,!chart.isDatasetVisible(index));
      chart.update();
      renderInlineLegend();
    });
    document.body.addEventListener('click',e=>{if(e.target.closest('[data-close-chart-modal]'))closeModal();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  }

  return{render,openModal,closeModal};
})();
