'use strict';
const ScenarioManager=(()=>{
  function id(){return 'sc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
  function builtIns(){return[
    {id:'conservative',name:'Conservador',builtIn:true,assumptions:FinancialEngine.defaultAssumptions('conservative'),notes:'Todos os valores em BRL. Cenário conservador para o Brasil.'},
    {id:'base',name:'Base',builtIn:true,assumptions:FinancialEngine.defaultAssumptions('base'),notes:'Todos os valores em BRL. Os números são ilustrativos e podem variar conforme as condições de mercado.'},
    {id:'optimistic',name:'Otimista',builtIn:true,assumptions:FinancialEngine.defaultAssumptions('optimistic'),notes:'Todos os valores em BRL. Cenário otimista para adoção e receita.'}
  ]}
  function create(name,base){const s=base?JSON.parse(JSON.stringify(base)):{assumptions:FinancialEngine.defaultAssumptions('base'),notes:''};s.id=id();s.name=name||'Novo cenário';s.builtIn=false;return s}
  return{builtIns,create}
})();
