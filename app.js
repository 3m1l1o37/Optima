'use strict';

const paths = {
  mpl:'<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
  grafico:'<path d="M4 4v16h16M7 16l4-7 5 3 4-7M7 16l7 1 2-5"/><circle cx="16" cy="12" r="1.4" fill="currentColor"/>',
  simplex:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 9v11m5-11v11M4 14h16"/>',
  transporte:'<path d="M3 6h11v11H3zm11 4h4l3 4v3h-7"/><circle cx="7" cy="18" r="2" fill="#e2f7f1"/><circle cx="17" cy="18" r="2" fill="#e2f7f1"/>',
  asignacion:'<path d="M9 4h11m-11 8h11M9 20h11M3 4l1.5 1.5L7 3m-4 9 1.5 1.5L7 11m-4 9 1.5 1.5L7 19"/>',
  transbordo:'<path d="M7 11l7-5M7 13l7 5M17 8v8"/><circle cx="5" cy="12" r="2.5"/><circle cx="17" cy="5" r="3"/><circle cx="17" cy="19" r="3"/>'
};

const methods = {
  mpl:{title:'Planteamiento de MPL',desc:'Traduce un enunciado a variables, función objetivo y restricciones.',guide:[
    'Identifica qué decisiones se pueden tomar y en qué unidades se expresan.',
    'Define si se busca maximizar o minimizar. Escribe la contribución de cada variable.',
    'Traduce cada límite a una desigualdad o igualdad. En esta app las variables son continuas y no negativas.',
    'Lee el modelo generado y comprueba que cada restricción conserva el sentido del enunciado.'
  ]},
  grafico:{title:'Método gráfico',desc:'Visualiza la región factible y evalúa sus vértices en dos variables.',guide:[
    'Dibuja la recta asociada a cada restricción y conserva el lado permitido.',
    'Cruza los semiplanos con el primer cuadrante para hallar la región factible.',
    'Evalúa la función objetivo en los vértices. También comprueba si puede mejorar indefinidamente.',
    'Si la recta óptima coincide con una arista, todo el tramo o rayo factible sobre ella es óptimo.'
  ]},
  simplex:{title:'Método simplex',desc:'Resuelve modelos lineales con tablas de pivote y dos fases.',guide:[
    'Añade holgura a las desigualdades ≤ y restas de exceso a las ≥.',
    'Cuando hacen falta variables artificiales, la fase I busca una base factible.',
    'La fase II mejora el objetivo mediante pivotes hasta que ya no hay un costo reducido favorable.',
    'Revisa el valor óptimo, las variables y los rangos que pueden tomar manteniendo ese valor.'
  ]},
  transporte:{title:'Transporte',desc:'Distribuye la oferta entre destinos con el menor costo total.',guide:[
    'Captura el costo unitario de cada envío, la oferta por origen y la demanda por destino.',
    'Escribe una igualdad por origen y otra por destino. Si los totales difieren, agrega una fila o columna ficticia de costo cero.',
    'Minimiza el costo total de los envíos y revisa los flujos elegidos y sus alternativas.'
  ]},
  asignacion:{title:'Asignación',desc:'Empareja personas y tareas con costo mínimo o beneficio máximo.',guide:[
    'Escribe los costos o beneficios de cada pareja persona–tarea.',
    'Asigna exactamente una tarea a cada persona y una persona a cada tarea.',
    'La app compara las permutaciones posibles y destaca todas las asignaciones que empatan en el mejor valor.'
  ]},
  transbordo:{title:'Transbordo',desc:'Optimiza flujos entre nodos de origen, destino y transferencia.',guide:[
    'Define el saldo de cada nodo: positivo para oferta, negativo para demanda y cero para transferencia.',
    'Indica los arcos dirigidos disponibles y su costo unitario. Una capacidad vacía representa un arco sin límite.',
    'Iguala las salidas menos las entradas al saldo de cada nodo y minimiza el costo del flujo.',
    'Revisa los balances y los arcos que pueden variar conservando el costo óptimo.'
  ]}
};

const examples = {
  mpl:{sense:'max',context:'Un taller produce mesas y sillas. Cada mesa aporta 40 pesos y cada silla 30 pesos. Una mesa consume 2 horas de carpintería y una silla consume 1. Ambas requieren 1 hora de acabado. El taller dispone de 40 horas de carpintería y 30 de acabado, y puede fabricar hasta 16 sillas.', labels:['Mesas','Sillas'], c:[40,30], rows:[
    {name:'Carpintería',a:[2,1],op:'≤',b:40},{name:'Acabado',a:[1,1],op:'≤',b:30},{name:'Capacidad de sillas',a:[0,1],op:'≤',b:16}
  ]},
  grafico:{sense:'max', labels:['x₁','x₂'], c:[3,2], rows:[
    {a:[1,1],op:'≤',b:4},{a:[1,0],op:'≤',b:2},{a:[0,1],op:'≤',b:3}
  ]},
  simplex:{sense:'max', labels:['x₁','x₂','x₃'], c:[5,4,3], rows:[
    {a:[2,3,1],op:'≤',b:5},{a:[4,1,2],op:'≤',b:11},{a:[3,4,2],op:'≥',b:8}
  ]},
  transporte:{cost:[[4,8,8],[6,4,3]],offer:[35,45],demand:[20,30,30]},
  asignacion:{sense:'min',cost:[[4,4,8],[4,4,9],[7,8,2]]},
  transbordo:{nodes:['Planta A','Planta B','Centro','Tienda A','Tienda B'],balance:[30,20,0,-25,-25],
    arcs:[[0,2,2,30],[1,2,3,20],[2,3,2,25],[2,4,1,25],[0,3,7,''],[1,4,6,''],[2,1,4,'']]}
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fm = new Intl.NumberFormat('es-MX',{maximumSignificantDigits:9});
const fmt = value => value === Infinity ? '∞' : !Number.isFinite(value) ? '—' : fm.format(Math.abs(value) < EPS ? 0 : value);
const icon = id => `<span class="icon ${['transporte','asignacion','transbordo'].includes(id) ? 'teal' : ''}"><svg viewBox="0 0 24 24" aria-hidden="true">${paths[id]}</svg></span>`;
const table = (columns, rows, cls = '') => `<div class="scroll"><table class="${cls}"><thead><tr>${columns.map(x => `<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row => '<tr>' + row.map((x,i) => i === 0 ? `<th scope="row">${x}</th>` : `<td>${x}</td>`).join('') + '</tr>').join('')}</tbody></table></div>`;
const input = (id, label, value, type='number', extra='') => `<input name="${id}" aria-label="${esc(label)}" type="${type}" ${type === 'number' ? 'step="any"' : 'maxlength="32"'} value="${esc(value)}" ${extra}>`;
const select = (id, label, options, value) => `<select name="${id}" aria-label="${esc(label)}">${options.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
const field = (label, entry, fill = false) => `<label class="field${fill ? ' fill' : ''}">${label}${entry}</label>`;
const count = (id,label,min,max,value) => field(label, select(id,label,Array.from({length:max-min+1},(_,i) => [i+min,i+min]),value));
const senseSelect = value => field('Objetivo',select('sense','Objetivo',[['max','Maximizar'],['min','Minimizar']],value));
const variable = i => 'x' + String.fromCharCode(8321+i);
const costsRow = (a, key, prefix) => a.map((x,j) => input(key+j,prefix + ' · ' + variable(j),x,'number','required'));
const set = (n,fn) => Array.from({length:n},(_,i) => fn(i));
const form = () => document.querySelector('#exercise');
const valueOf = id => form().elements.namedItem(id)?.value ?? '';
const readNum = (id, must, fallback = '') => {
  const raw = valueOf(id);
  const value = Number(raw);
  if (must && (raw === '' || !Number.isFinite(value) || Math.abs(value) > 1e9 || (value !== 0 && Math.abs(value) < 1e-8))) {
    throw new Error('Usa valores finitos con magnitud entre 0.00000001 y 1,000,000,000, o cero.');
  }
  return raw === '' ? fallback : must ? value : raw;
};

const workspace = document.querySelector('#workspace');
const drafts = {};
let current = null;
let dimensions;

function defaults(id) {
  if (id === 'transbordo') return {n:5,m:7};
  if (id === 'transporte') return {n:2,m:3};
  if (id === 'asignacion') return {n:3};
  return {n:id === 'simplex' ? 3 : 2,m:3};
}

function exampleSize(id,data) {
  if (id === 'transbordo') return {n:data.nodes.length,m:data.arcs.length};
  if (id === 'transporte') return {n:data.offer.length,m:data.demand.length};
  if (id === 'asignacion') return {n:data.cost.length};
  return {n:data.c.length,m:data.rows.length};
}

function renderForm(id, data={}) {
  const {n,m} = dimensions;
  if (id === 'transporte' || id === 'asignacion') {
    const assign = id === 'asignacion';
    const cols = assign ? n : m;
    const rowLabel = assign ? 'Persona' : 'Origen';
    const columnLabel = assign ? 'Tarea' : 'Destino';
    const header = [rowLabel,...set(cols,j => columnLabel+' '+(j+1)),...(assign ? [] : ['Oferta'])];
    const rows = set(n,i => [rowLabel+' '+(i+1),...set(cols,j => input(`c${i}_${j}`,`${rowLabel} ${i+1}, ${columnLabel} ${j+1}`,data.cost?.[i]?.[j],'number','required')),
      ...(assign ? [] : [input('o'+i,'Oferta del origen '+(i+1),data.offer?.[i],'number','required min="0"')])]);
    if (!assign) rows.push(['Demanda',...set(cols,j => input('d'+j,'Demanda del destino '+(j+1),data.demand?.[j],'number','required min="0"')),'']);
    return `<div class="config">${assign ? count('n','Personas y tareas',2,7,n) + senseSelect(data.sense ?? 'min') : count('n','Orígenes',1,7,n) + count('m','Destinos',1,7,m)}</div>
      <p class="hint">${assign ? 'Cada celda contiene el costo o beneficio de asignar una persona a una tarea.' : 'Captura el costo por unidad y las cantidades de oferta y demanda.'}</p>${table(header,rows,'matrix')}`;
  }
  if (id === 'transbordo') {
    const nodes = set(n,i => data.nodes?.[i] ?? 'Nodo '+(i+1));
    const options = nodes.map((x,i) => [i,x || 'Nodo '+(i+1)]);
    const arcRows = set(m,i => {
      const [from,to,c,cap] = data.arcs?.[i] ?? [0,1,'',''];
      return ['A'+(i+1),select('s'+i,'Origen del arco '+(i+1),options,Math.min(n-1,+from)),
        select('t'+i,'Destino del arco '+(i+1),options,Math.min(n-1,+to)),
        input('c'+i,'Costo del arco '+(i+1),c,'number','required'),input('k'+i,'Capacidad del arco '+(i+1),cap,'number','min="0" placeholder="∞"')];
    });
    return `<div class="config">${count('n','Nodos',2,10,n)}${count('m','Arcos',1,20,m)}</div>
      <h3>Nodos y saldos</h3><p class="hint">Oferta positiva, demanda negativa y cero en nodos de transferencia. La suma debe ser cero.</p>
      ${table(['Nodo','Nombre','Saldo'],set(n,i => [i+1,input('name'+i,'Nombre del nodo '+(i+1),nodes[i],'text'),input('b'+i,'Saldo del nodo '+(i+1),data.balance?.[i],'number','required')]),'matrix')}
      <h3>Arcos dirigidos</h3><p class="hint">Deja la capacidad vacía cuando el arco no tenga límite.</p>
      ${table(['Arco','Desde','Hasta','Costo unitario','Capacidad'],arcRows,'matrix')}`;
  }

  const names = set(n,i => variable(i));
  const modelColumns = ['Fila',...names,'Relación','Límite'];
  const modelRows = [['Objetivo',...costsRow(set(n,i => data.c?.[i]),'c','Coeficiente objetivo'),'','']];
  for (let i = 0; i < m; i++) {
    const row = data.rows?.[i] ?? {};
    const title = id === 'mpl' ? input('rname'+i,'Descripción de la restricción '+(i+1),row.name,'text','class="name" placeholder="R'+(i+1)+'"') : 'R'+(i+1);
    modelRows.push([title,...costsRow(set(n,j => row.a?.[j]),`a${i}_`,'Restricción '+(i+1)),
      select('op'+i,'Relación de la restricción '+(i+1),[['≤','≤'],['≥','≥'],['=','=']],row.op ?? '≤'),
      input('b'+i,'Límite de la restricción '+(i+1),row.b,'number','required')]);
  }
  const context = id === 'mpl' ? `<div class="form-grid">${field('Enunciado o contexto (opcional)',`<textarea name="context" rows="3" maxlength="1800" placeholder="Describe las decisiones, los recursos y el objetivo.">${esc(data.context)}</textarea>`,true)}</div>` : '';
  const variableNames = id === 'mpl' ? `<h3>Variables de decisión</h3><div class="form-grid">${names.map((name,i) => field(name,input('name'+i,'Nombre de '+name,data.labels?.[i],'text','placeholder="Qué representa"'),true)).join('')}</div>` : '';
  return `${context}<div class="config">${id === 'grafico' ? '' : count('n','Variables',1,8,n)}${count('m','Restricciones',0,14,m)}${senseSelect(data.sense ?? 'max')}</div>
    ${variableNames}<h3>Coeficientes del modelo</h3><p class="hint">${id === 'grafico' ? 'El método gráfico usa dos variables no negativas.' : 'Incluye un 0 cuando una variable no aparezca en una fila.'}</p>${table(modelColumns,modelRows,'matrix')}`;
}

function capture(id, must) {
  const {n,m} = dimensions;
  if (id === 'transporte' || id === 'asignacion') {
    const assign = id === 'asignacion';
    const cost = set(n,i => set(assign ? n : m,j => readNum(`c${i}_${j}`,must)));
    return assign ? {cost,sense:valueOf('sense')} : {cost,offer:set(n,i => readNum('o'+i,must)),demand:set(m,j => readNum('d'+j,must))};
  }
  if (id === 'transbordo') return {
    nodes:set(n,i => valueOf('name'+i).trim() || 'Nodo '+(i+1)),
    balance:set(n,i => readNum('b'+i,must)),
    arcs:set(m,i => [+valueOf('s'+i),+valueOf('t'+i),readNum('c'+i,must),valueOf('k'+i) === '' ? '' : readNum('k'+i,must)])
  };
  const labels = set(n,i => valueOf('name'+i).trim() || (must || id !== 'mpl' ? variable(i) : ''));
  return {labels,context:valueOf('context').trim(),sense:valueOf('sense'),c:set(n,i => readNum('c'+i,must)),
    rows:set(m,i => ({name:valueOf('rname'+i).trim(),a:set(n,j => readNum(`a${i}_${j}`,must)),op:valueOf('op'+i),b:readNum('b'+i,must)}))};
}

function mount(id, data) {
  const item = methods[id];
  workspace.innerHTML = `<a class="button quiet" href="#inicio">Volver a inicio</a>
    <div class="workspace-head">${icon(id)}<div><h1 tabindex="-1">${item.title}</h1><p>${item.desc}</p></div></div>
    <div class="layout"><div class="panel"><div class="form-head"><h2>Datos del ejercicio</h2><button type="button" class="button secondary" id="example">Cargar ejemplo</button></div>
      <form id="exercise"><div id="fields">${renderForm(id,data)}</div>
      <div class="actions"><button class="button primary" type="submit">${id === 'mpl' ? 'Plantear y resolver' : 'Resolver ejercicio'}</button><button class="button secondary" type="button" id="reset">Reiniciar</button></div>
      <div class="error" id="error" role="alert"></div></form></div>
    <aside class="panel guide"><h2>Cómo funciona</h2><ol>${item.guide.map(x => '<li>'+x+'</li>').join('')}</ol></aside></div>
    <div id="results" class="results" aria-live="polite"></div>`;
  document.querySelector('#example').onclick = () => {
    dimensions = exampleSize(id,examples[id]);
    updateFields(examples[id]);
  };
  document.querySelector('#reset').onclick = () => {
    dimensions = defaults(id);
    updateFields();
  };
  form().addEventListener('change', event => {
    if (['n','m'].includes(event.target.name)) {
      const data = capture(id,false);
      const name = event.target.name;
      dimensions[name] = Number(event.target.value);
      updateFields(data);
      form().elements.namedItem(name)?.focus();
    } else if (id === 'transbordo' && event.target.name.startsWith('name')) {
      const nodes = capture(id,false).nodes;
      for (const selectElement of form().querySelectorAll('select[name^="s"],select[name^="t"]')) {
        Array.from(selectElement.options).forEach((option,i) => { option.textContent = nodes[i]; });
      }
    }
  });
  form().addEventListener('submit', event => {
    event.preventDefault();
    document.querySelector('#error').textContent = '';
    document.querySelector('#results').replaceChildren();
    try {
      const data = capture(id,true);
      const html = id === 'asignacion' ? assignment(data) :
        id === 'transporte' || id === 'transbordo' ? network(id,data) : linear(id,data);
      const out = document.querySelector('#results');
      out.innerHTML = html;
      if (id === 'asignacion') bindAssignmentPages();
      const title = out.querySelector('h2');
      title.setAttribute('tabindex','-1');
      title.focus({preventScroll:true});
      out.scrollIntoView({block:'start'});
    } catch (error) {
      console.error(error);
      document.querySelector('#error').textContent = error.message;
    }
  });
}

function updateFields(data) {
  document.querySelector('#fields').innerHTML = renderForm(current,data);
  document.querySelector('#results').replaceChildren();
  document.querySelector('#error').textContent = '';
}

function route() {
  const id = location.hash.slice(1);
  if (id === current) return;
  if (current && form()) drafts[current] = {dimensions:{...dimensions},data:capture(current,false)};
  const home = document.querySelector('#home');
  if (Object.hasOwn(methods,id)) {
    current = id;
    dimensions = drafts[id]?.dimensions ?? defaults(id);
    home.hidden = true;
    workspace.hidden = false;
    mount(id,drafts[id]?.data);
    window.scrollTo({top:0,behavior:'instant'});
    workspace.querySelector('h1').focus({preventScroll:true});
    document.title = methods[id].title + ' · Óptima';
  } else {
    current = null;
    workspace.hidden = true;
    home.hidden = false;
    document.title = 'Óptima · Investigación de operaciones';
    if (id === 'metodos') document.querySelector('#metodos').scrollIntoView();
    else window.scrollTo({top:0,behavior:'instant'});
  }
}

document.querySelector('#cards').innerHTML = Object.entries(methods).map(([id,m]) =>
  `<a class="card" href="#${id}">${icon(id)}<div class="card-content"><h3>${m.title}</h3><p>${m.desc}</p><span class="open">Abrir método</span></div></a>`).join('');
addEventListener('hashchange',route);
route();

const panel = (heading,content) => `<section class="panel"><h2>${heading}</h2>${content}</section>`;
const steps = items => `<ol class="steps">${items.map(item=>'<li>'+item+'</li>').join('')}</ol>`;
const showPoint = p => '('+p.map(fmt).join(', ')+')';

function expression(a, labels) {
  const terms = a.flatMap((value,j) => {
    if (!value) return [];
    const magnitude = Math.abs(value);
    return [[value < 0 ? '−' : '+', (magnitude === 1 ? '' : fmt(magnitude) + '·') + esc(labels[j])]];
  });
  return terms.map(([sign,t],i) => (i ? ' '+sign+' ' : sign === '−' ? '−' : '') + t).join('') || '0';
}

function modelEquations(model) {
  return `<div class="formula"><strong>${model.sense === 'max' ? 'Maximizar' : 'Minimizar'} Z = ${expression(model.c,model.labels)}</strong><br>
    ${model.rows.map(({a,b,op,name}) => `${expression(a,model.labels)} ${op} ${fmt(b)}${name ? ' <span class="fine">· '+esc(name)+'</span>' : ''}<br>`).join('')}
    ${model.labels.map(esc).join(', ')} ≥ 0</div>`;
}

function solutionSummary(model, result) {
  if (result.status === 'optimal') {
    return `<section class="panel"><div class="result-head"><h2>Solución</h2><span class="status">Óptimo encontrado</span></div>
      <p class="value">${model.valueName ?? 'Z'} = ${fmt(result.z)}</p>
      <div class="chips">${model.labels.map((label,i) => `<span class="chip">${esc(label)} = ${fmt(result.x[i])}</span>`).join('')}</div></section>`;
  }
  const messages = {
    infeasible:['Sin solución factible','Las restricciones son incompatibles. Ningún punto satisface todas al mismo tiempo.'],
    unbounded:['Objetivo no acotado','La función objetivo puede mejorar indefinidamente dentro de la región factible.'],
    limit:['Cálculo inconcluso','El algoritmo alcanzó su límite de iteraciones o precisión.']
  };
  const [heading, explanation] = messages[result.status];
  const ray = result.direction ? `<div class="formula">Rayo de mejora: x = ${showPoint(result.x)} + t·${showPoint(result.direction)}, con t ≥ 0.</div>` : '';
  return panel('Resultado',`<p><span class="status warn">${heading}</span></p><p>${explanation}</p>${ray}`);
}

function optimalPanel(model, result, ranges) {
  const unknown = ranges.some(range => range.some(Number.isNaN));
  const multiple = ranges.some(([min,max])=>max === Infinity || Number.isFinite(min) && Number.isFinite(max) && !close(min,max));
  return panel('Conjunto de soluciones óptimas',`<p>${multiple ?
    'Hay infinitas soluciones óptimas. El conjunto completo se obtiene intersectando las restricciones originales con la igualdad siguiente.' :
    unknown ? 'Las restricciones originales y la igualdad siguiente caracterizan todas las soluciones óptimas.' :
    'La solución óptima es única dentro de la precisión numérica del cálculo.'}</p>
    <div class="formula">${expression(model.c,model.labels)} = ${fmt(result.z)}</div>
    ${multiple ? '<p class="fine">Los extremos de los intervalos se calculan por separado. Las variables deben seguir cumpliendo juntas todas las restricciones.</p>' : ''}
    ${unknown ? '<p class="fine">Algunos extremos de los intervalos no pudieron calcularse.</p>' : ''}`);
}

function rangeChart(model, ranges, point) {
  const scale = Math.max(1, ...point, ...ranges.flat().filter(Number.isFinite)) * (ranges.some(r => r[1] === Infinity) ? 1.18 : 1);
  return `<p class="fine">Cada barra marca los valores posibles de una variable en el óptimo. La marca oscura indica la solución mostrada.</p>
    <div role="group" aria-label="Rangos óptimos por variable">${ranges.map(([min,max],i) => {
      const left = Number.isFinite(min) ? Math.max(0,min/scale*100) : 0;
      const end = max === Infinity ? 100 : Number.isFinite(max) ? Math.max(left,max/scale*100) : left;
      return `<div class="chart-row"><strong>${esc(model.labels[i])}</strong><div class="range-track" aria-hidden="true">
        <div class="range-fill" style="left:${left}%;width:${end-left}%"></div><div class="range-dot" style="left:calc(${point[i]/scale*100}% - 2px)"></div></div>
        <span>[${fmt(min)}, ${fmt(max)}]</span></div>`;
    }).join('')}</div>`;
}

function simplexSteps(result, model) {
  const grouped = new Set(result.history.map(s=>s.phase));
  const intro = ['Lleva las restricciones a igualdades y conserva la no negatividad.'];
  if (grouped.has(1)) intro.push('Minimiza la suma de las variables artificiales en la fase I. Las tablas muestran el objetivo auxiliar como el negativo de esa suma.');
  if (grouped.has(2)) intro.push('Aplica la prueba del cociente mínimo para elegir la fila saliente y pivota hasta terminar la fase II.');
  if (model.sense === 'min' && grouped.has(2)) intro.push('Para la fase II, las tablas maximizan −Z. El resultado final se muestra con el signo original.');
  if (result.status === 'optimal') intro.push('Recupera las variables básicas y evalúa la función objetivo original.');
  let counters = {};
  return steps(intro) + `<h3>Tablas de pivote</h3><p class="fine">LD es el lado derecho y Cj − Zj es el costo reducido. Las tablas desplazan horizontalmente si hace falta.</p>
    <div class="steps">${result.history.map(s => {
      counters[s.phase] = (counters[s.phase] ?? -1) + 1;
      return `<details><summary>Fase ${s.phase} · Iteración ${counters[s.phase]} · ${esc(s.description)}</summary>
        ${table(['Base',...s.columns.map(esc),'LD'],[...s.matrix.map((row,i)=>[esc(s.basis[i]),...row.map(fmt)]),['Cj − Zj',...s.reduced.map(fmt),fmt(s.value)]])}</details>`;
    }).join('')}</div>${result.history.length === 80 ? '<p class="fine">Se muestran las primeras 80 tablas.</p>' : ''}`;
}

function graph2d(model,result,points) {
  const pset = [...points, ...(result.x ? [result.x] : [])];
  const extents = [0,1].map(j => {
    const vals = pset.map(p => p[j]).filter(p => Number.isFinite(p) && p > EPS);
    if (!vals.length && !pset.length) model.rows.forEach(({a,b}) => {
      if (a[j] && b / a[j] > EPS) vals.push(b/a[j]);
    });
    const extent = vals.length ? Math.max(...vals)*1.28 : 5;
    const magnitude = 10 ** Math.floor(Math.log10(extent/5));
    const step = [1,2,2.5,5,10].map(k=>k*magnitude).find(s=>s>=extent/5) ?? magnitude*10;
    return {max:step*5,step};
  });
  const [ex,ey] = extents;
  const W=650,H=367,L=71,R=610,T=25,B=309;
  const px = x => L+x/ex.max*(R-L);
  const py = y => B-y/ey.max*(B-T);
  const xy = ([x,y]) => px(x)+','+py(y);
  const bounds = [[0,0],[ex.max,0],[ex.max,ey.max],[0,ey.max]];
  const planes = halfPlanes(model.rows);
  const feasible = ['infeasible','limit'].includes(result.status) ? [] : clipPolygon(bounds, planes);
  const optimum = result.status === 'optimal' ? clipPolygon(feasible,halfPlanes([{a:model.c,op:'=',b:result.z}])) : [];
  const colors = ['#8971d1','#3e86a7','#ba6b91','#7c883a','#b97020','#5174c1'];
  const lines = model.rows.map(({a,b,op},i) => {
    if (!a.some(Boolean)) return '';
    const segment = clipPolygon(bounds,halfPlanes([{a,op:'=',b}]));
    return `<polyline points="${segment.map(xy).join(' ')}" stroke="${colors[i%colors.length]}" stroke-width="1.6" fill="none" stroke-dasharray="${op === '=' ? 'none' : '5 4'}"><title>R${i+1}: ${expression(a,model.labels)} ${op} ${fmt(b)}</title></polyline>`;
  });
  const rayStart = result.x;
  const rayEnd = result.direction ? (() => {
    const limits = result.direction.map((d,j) => d > EPS ? (extents[j].max-rayStart[j])/d : Infinity);
    const length = Math.min(...limits)*.95;
    return Number.isFinite(length) && length > 0 ? rayStart.map((v,j)=>v+result.direction[j]*length) : null;
  })() : null;
  const feasibleStroke = '#916be4';
  const optimalStroke = '#087d68';
  const tickLines = set(6,i => `<path d="M${px(i*ex.step)} ${T}V${B} M${L} ${py(i*ey.step)}H${R}" stroke="#e6dff2"/>`);
  const tickText = set(6,i => `<text x="${px(i*ex.step)}" y="${B+21}" text-anchor="middle">${fmt(i*ex.step)}</text>${i ? `<text x="${L-10}" y="${py(i*ey.step)+4}" text-anchor="end">${fmt(i*ey.step)}</text>` : ''}`);
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Región factible, vértices y solución en el primer cuadrante">
    ${tickLines.join('')}<path d="M${L} ${T}V${B}H${R}" fill="none" stroke="#52496e" stroke-width="1.5"/>
    <g font-size="12" fill="#514968">${tickText.join('')}<text x="${R}" y="${H-12}" text-anchor="end">${esc(model.labels[0])}</text><text x="${L}" y="17">${esc(model.labels[1])}</text></g>
    <polygon points="${feasible.map(xy).join(' ')}" fill="#e5d8ff" fill-opacity=".87" stroke="${feasibleStroke}" stroke-width="2"/>
    ${lines.join('')}
    <polygon points="${optimum.map(xy).join(' ')}" fill="#b6eadc" fill-opacity=".72" stroke="${optimalStroke}" stroke-width="4"/>
    ${points.map((p,i)=>`<circle cx="${px(p[0])}" cy="${py(p[1])}" r="4" fill="#6940c5"><title>V${i+1} ${esc(showPoint(p))}</title></circle>`).join('')}
    ${rayEnd ? `<line x1="${px(rayStart[0])}" y1="${py(rayStart[1])}" x2="${px(rayEnd[0])}" y2="${py(rayEnd[1])}" stroke="${optimalStroke}" stroke-width="4" stroke-dasharray="7 4"><title>Rayo de mejora</title></line>` : ''}
    ${result.status === 'optimal' ? `<circle cx="${px(result.x[0])}" cy="${py(result.x[1])}" r="6" fill="${optimalStroke}" stroke="white" stroke-width="1.5"><title>Óptimo ${esc(showPoint(result.x))}</title></circle>` : ''}
    </svg></div><div class="legend">
    <span><i class="swatch" style="background:#d9c6ff"></i> Región factible</span><span><i class="swatch" style="background:#6940c5"></i> Vértices</span>
    ${result.status === 'optimal' ? '<span><i class="swatch" style="background:#087d68"></i> Conjunto óptimo</span>' : rayEnd ? '<span><i class="swatch" style="background:#087d68"></i> Rayo de mejora</span>' : ''}</div>
    <p class="fine">La gráfica muestra la parte visible en los ejes. Si la región se prolonga, el borde de la ventana limita la vista.</p>`;
}

function linear(id, data) {
  const model = {...data, labels:set(data.c.length,variable)};
  const points = model.c.length === 2 ? vertices(model) : [];
  let result = simplex(model,id === 'simplex' || (id === 'mpl' && model.c.length !== 2));
  if (id === 'grafico' && result.status === 'optimal' && points.length) {
    const best = points.reduce((x,p) => (dot(model.c,p)-dot(model.c,x))*(model.sense === 'max' ? 1 : -1)>0 ? p : x);
    result = {...result,x:best,z:dot(model.c,best)};
  }
  const ranges = result.status === 'optimal' ? optimalRanges(model,result) : [];
  const dictionary = id === 'mpl' ? '<div class="chips">' + model.labels.map((label,i)=>`<span class="chip">${label} · ${esc(data.labels[i])}</span>`).join('') + '</div>' : '';
  const modelPanel = panel(id === 'mpl' ? 'Modelo de programación lineal' : 'Modelo',dictionary + (data.context ? '<p>'+esc(data.context)+'</p>' : '') + modelEquations(model));
  const geometric = [
    'Escribe cada frontera sustituyendo la relación por una igualdad.',
    'Calcula las intersecciones de las fronteras entre sí y con los ejes. Conserva los puntos que cumplen todas las restricciones.',
    'Evalúa el objetivo en cada vértice y comprueba si existe una dirección factible de mejora sin límite.',
    'Si existe un óptimo, intersecta la región factible con la recta de nivel que pasa por el mejor vértice.'
  ];
  const modeling = [
    'Define las variables no negativas y asocia su significado con el enunciado.',
    'Usa los coeficientes capturados para construir la función objetivo y decide el sentido de optimización.',
    'Expresa cada recurso, requisito o balance con su relación y su límite.'
  ];
  let walkthrough = id === 'mpl' ? steps(modeling) + '<h3>Resolución del modelo</h3>' : '';
  if (id === 'simplex' || (id === 'mpl' && model.c.length !== 2)) walkthrough += simplexSteps(result, model);
  else walkthrough += steps(geometric);
  let chart = '';
  if (model.c.length === 2) {
    chart = panel('Gráfica de la solución',graph2d(model,result,points) +
      (points.length ? '<h3>Evaluación de vértices</h3>'+table(['Vértice',...model.labels,'Z'],points.map((p,i)=>['V'+(i+1),...p.map(fmt),fmt(dot(model.c,p))])) : ''));
  } else if (result.status === 'optimal') chart = panel('Gráfica de rangos óptimos',rangeChart(model,ranges,result.x));
  return (id === 'mpl' ? modelPanel + solutionSummary(model,result) : solutionSummary(model,result) + modelPanel) +
    chart + (ranges.length ? optimalPanel(model,result,ranges) : '') + panel('Procedimiento paso a paso',walkthrough);
}

function transportation(data) {
  const offer = data.offer.slice();
  const demand = data.demand.slice();
  const cost = data.cost.map(row=>row.slice());
  const origins = offer.map((_,i) => 'Origen '+(i+1));
  const destinations = demand.map((_,i) => 'Destino '+(i+1));
  const sum = a => a.reduce((x,y)=>x+y,0);
  const diff = sum(offer)-sum(demand);
  let balance = 'La oferta total coincide con la demanda total.';
  if (!close(diff,0) && diff > 0) {
    demand.push(diff);
    destinations.push('Destino ficticio');
    cost.forEach(row=>row.push(0));
    balance = `Se agregó un destino ficticio con demanda ${fmt(diff)} y costo cero para representar la oferta sobrante.`;
  } else if (!close(diff,0)) {
    offer.push(-diff);
    origins.push('Origen ficticio');
    cost.push(demand.map(()=>0));
    balance = `Se agregó un origen ficticio con oferta ${fmt(-diff)} y costo cero para representar la demanda sin cubrir físicamente.`;
  }
  const cols = demand.length;
  const c = cost.flat();
  const labels = cost.flatMap((row,i)=>row.map((_,j)=>'x'+(i+1)+','+(j+1)));
  const rows = [
    ...offer.map((b,i)=>({name:origins[i],a:c.map((_,j)=>Number(Math.floor(j/cols) === i)),op:'=',b})),
    ...demand.map((b,j)=>({name:destinations[j],a:c.map((_,k)=>Number(k % cols === j)),op:'=',b}))
  ];
  return {model:{labels,c,rows,sense:'min',valueName:'Costo total'},balance,offer,demand,origins,destinations};
}

function transshipment(data) {
  const sum = data.balance.reduce((x,y)=>x+y,0);
  if (!close(sum,0)) throw new Error('La suma de los saldos debe ser cero. El saldo actual es '+fmt(sum)+'.');
  if (data.arcs.some(([u,v])=>u===v)) throw new Error('El origen y el destino deben ser distintos en cada arco.');
  const routes = data.arcs.map(([u,v])=>data.nodes[u]+' → '+data.nodes[v]);
  const labels = data.arcs.map((_,i)=>'A'+(i+1));
  const c = data.arcs.map(arc=>arc[2]);
  const rows = data.balance.map((b,i)=>({name:data.nodes[i],a:data.arcs.map(([u,v])=>Number(u===i)-Number(v===i)),op:'=',b}));
  data.arcs.forEach((arc,i) => {
    if (arc[3] !== '') rows.push({a:unit(c.length,i),op:'≤',b:arc[3],name:'Capacidad de '+labels[i]});
  });
  return {model:{labels,c,rows,sense:'min',valueName:'Costo total'},routes};
}

function arcGraph(data, point) {
  const positions = data.nodes.map((_,i) => {
    const angle = Math.PI - 2*Math.PI*i/data.nodes.length;
    return [325+216*Math.cos(angle),168+116*Math.sin(angle)];
  });
  const edges = data.arcs.map(([u,v],i)=>{
    const start = positions[u];
    const end = positions[v];
    const d = end.map((x,j)=>x-start[j]);
    const length = Math.hypot(...d);
    const direction = d.map(x=>x/length);
    const norm = [-direction[1],direction[0]];
    const parallel = data.arcs.slice(0,i).filter(([a,b])=>a===u && b===v).length;
    const bend = 15+parallel*15;
    const [sx,sy] = start.map((p,j)=>p+direction[j]*22+norm[j]*7);
    const [ex,ey] = end.map((p,j)=>p-direction[j]*24+norm[j]*7);
    const [mx,my] = start.map((p,j)=>(p+end[j])/2+norm[j]*bend);
    const active = point[i] > EPS;
    const color = active ? '#087d68' : '#9c91b6';
    return `<path d="M${sx},${sy} Q${mx},${my} ${ex},${ey}" stroke="${color}" stroke-width="${active ? 3 : 1.5}" fill="none" marker-end="url(#${active?'edge-on':'edge-off'})"><title>A${i+1}: ${esc(data.nodes[u])} → ${esc(data.nodes[v])}, flujo ${fmt(point[i])}</title></path>
      ${active ? `<text x="${mx}" y="${my}" text-anchor="middle" fill="#065e4e" stroke="#faf9fe" stroke-width="4" paint-order="stroke" font-size="12" font-weight="800">A${i+1} · ${fmt(point[i])}</text>` : ''}`;
  });
  return `<div class="chart"><svg viewBox="0 0 650 338" role="img" aria-label="Diagrama dirigido del flujo óptimo">
    <defs>${[['edge-on','#087d68'],['edge-off','#9c91b6']].map(([id,color])=>`<marker id="${id}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="${color}"/></marker>`).join('')}</defs>
    ${edges.join('')}${positions.map(([x,y],i)=>`<g><circle cx="${x}" cy="${y}" r="19" fill="#efe8ff" stroke="#9070db" stroke-width="1.5"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="#472295" font-size="12" font-weight="800">${i+1}</text><text x="${x}" y="${y+35}" text-anchor="middle" fill="#312649" stroke="#faf9fe" stroke-width="4" paint-order="stroke" font-size="12">${esc(data.nodes[i].length > 19 ? data.nodes[i].slice(0,17)+'…' : data.nodes[i])}</text></g>`).join('')}
    </svg></div><p class="fine">Los arcos verdes transportan flujo en la solución mostrada. La tabla conserva los nombres completos.</p>`;
}

function network(id,data) {
  const transport = id === 'transporte';
  const info = transport ? transportation(data) : transshipment(data);
  const {model} = info;
  const result = simplex(model, true);
  const equations = panel('Modelo de la red', (info.balance ? '<p>'+info.balance+'</p>' : '') + modelEquations(model));
  const approach = transport ? ['Revisa la oferta y la demanda totales. '+info.balance,'Introduce una variable no negativa para cada ruta y expresa la oferta y la demanda como igualdades.'] :
    ['Identifica nodos de oferta, nodos de demanda y nodos de transferencia.','Para cada nodo, resta el flujo entrante del saliente y conserva las capacidades capturadas.'];
  const procedure = panel('Procedimiento paso a paso',steps([...approach,'Construye el costo total multiplicando cada flujo por su costo unitario.','Optimiza el modelo de flujo con simplex de dos fases.']) +
    '<details><summary>Ver tablas de la optimización</summary>'+simplexSteps(result,model)+'</details>');
  if (result.status !== 'optimal') return solutionSummary(model,result)+equations+procedure;
  const ranges = optimalRanges(model,result);
  const outputRows = transport ? table(['Origen',...info.destinations,'Oferta'],[
    ...info.origins.map((label,i)=>[esc(label),...info.destinations.map((_,j)=>{
      const x = result.x[i*info.destinations.length+j];
      return x > EPS ? '<span class="chip">'+fmt(x)+'</span>' : fmt(x);
    }),fmt(info.offer[i])]),
    ['Demanda',...info.demand.map(fmt),'']
  ]) : arcGraph(data,result.x) + table(['Arco','Ruta','Costo unitario','Capacidad','Flujo'],data.arcs.map((arc,i)=>[
    model.labels[i],esc(info.routes[i]),fmt(arc[2]),arc[3] === '' ? '∞' : fmt(arc[3]),fmt(result.x[i])
  ]));
  const flows = panel(transport ? 'Matriz de envíos óptimos' : 'Gráfica de la red',outputRows);
  return solutionSummary(model,result)+flows+panel('Gráfica de rangos óptimos',rangeChart(model,ranges,result.x))+
    optimalPanel(model,result,ranges)+equations+procedure;
}

let assignmentSolutions = [];

function assignment({cost,sense}) {
  const n = cost.length;
  const multiplier = sense === 'min' ? 1 : -1;
  let optimum = Infinity;
  let visited = 0;
  assignmentSolutions = [];
  function visit(chosen, mask, total) {
    const i = chosen.length;
    if (i === n) {
      visited++;
      const better = total*multiplier < optimum*multiplier || !Number.isFinite(optimum);
      if (better && !close(total,optimum)) {
        optimum = total;
        assignmentSolutions = [];
      }
      if (close(total,optimum)) assignmentSolutions.push(chosen);
      return;
    }
    for (let j=0;j<n;j++) {
      if (!(mask & (1<<j))) visit([...chosen,j],mask | (1<<j),total+cost[i][j]);
    }
  }
  visit([],0,0);
  const count = assignmentSolutions.length;
  const frequencies = set(n,()=>zeroes(n));
  assignmentSolutions.forEach(p=>p.forEach((j,i)=>{ frequencies[i][j]++; }));
  const chosen = assignmentSolutions[0];
  const summary = `<section class="panel"><div class="result-head"><h2>Solución</h2><span class="status">Óptimo encontrado</span></div>
    <p class="value">${sense==='min'?'Costo mínimo':'Beneficio máximo'} = ${fmt(optimum)}</p>
    <p>${count===1 ? 'Hay una asignación óptima.' : 'Hay '+fmt(count)+' asignaciones óptimas.'}</p>
    <div class="chips">${chosen.map((j,i)=>`<span class="chip">Persona ${i+1} → Tarea ${j+1}</span>`).join('')}</div></section>`;
  const columns = ['Persona',...set(n,j=>'Tarea '+(j+1))];
  const rows = frequencies.map((row,i)=>['Persona '+(i+1),...row.map(f => f ?
    `<span class="freq" style="--strength:${.15+.68*f/count}">${fmt(f)} de ${fmt(count)}</span>` : '0')]);
  const graph = panel('Mapa de asignaciones óptimas','<p>Cada celda muestra cuántas asignaciones óptimas incluyen esa pareja. El color aumenta con la frecuencia.</p>'+table(columns,rows));
  const list = panel('Todas las asignaciones óptimas',`<div id="assignment-page"></div><div class="pager">
    <button type="button" id="prev-page" class="button secondary">Anterior</button><span id="page-status" aria-live="polite"></span><button type="button" id="next-page" class="button secondary">Siguiente</button></div>`);
  return summary+graph+list+panel('Procedimiento paso a paso',steps([
    'Forma asignaciones completas en las que cada persona usa una tarea distinta.',
    'Suma el valor de las celdas seleccionadas. Para la solución mostrada, '+chosen.map((j,i)=>fmt(cost[i][j])).join(' + ')+' = '+fmt(optimum)+'.',
    'Compara las '+fmt(visited)+' asignaciones completas y conserva las que alcanzan el mejor valor.'
  ]));
}

function bindAssignmentPages() {
  const pageSize = 12;
  const totalPages = Math.ceil(assignmentSolutions.length/pageSize);
  const prev = document.querySelector('#prev-page');
  const next = document.querySelector('#next-page');
  let page = 0;
  function draw() {
    const start = page * pageSize;
    const n = assignmentSolutions[0].length;
    document.querySelector('#assignment-page').innerHTML = table(['Solución',...set(n,i=>'Persona '+(i+1))],
      assignmentSolutions.slice(start,start+pageSize).map((row,i)=>[fmt(start+i+1),...row.map(j=>'Tarea '+(j+1))]));
    document.querySelector('#page-status').textContent = 'Página '+(page+1)+' de '+totalPages;
    prev.disabled = page===0;
    next.disabled = page===totalPages-1;
  }
  prev.onclick=()=>{ page--; draw(); };
  next.onclick=()=>{ page++; draw(); };
  draw();
}
