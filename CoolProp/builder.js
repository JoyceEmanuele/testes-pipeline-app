var cp = require('./coolprop-6.4.1.js');

/*
superAquecimento = Tsuc - (cp.PropsSI('T', 'P', Psuc * 1e5 + 101325, 'Q', 1, 'R407C') - 273.15);
subResfriamento = (cp.PropsSI('T', 'P', Pliq * 1e5 + 101325, 'Q', 1, 'R407C') - 273.15) - Tliq;

superAquecimento = Tsuc - vecInterp(createVIData('r407c'), Psuc);
subResfriamento = vecInterp(createVIData('r407c'), Pliq) - Tliq;

23.2 - (cp.PropsSI('T', 'P', 3.9 * 1e5 + 101325, 'Q', 1, 'R407C') - 273.15)
23.2 - vecInterp(createVIData('r407c'), 3.9)
*/

const ftrans = {
  'r22': 'R22',
  'r134a': 'R134a',
  'r404a': 'R404A',
  'r407c': 'R407C',
  'r410a': 'R410A',
  'r507a': 'R507A',
  'r717': 'R717',
}

function buildFluidInterpB (fluidName) {
  const { Ti: TiSH, To: ToSH } = buildFluidInterp(fluidName, 1);
  const { Ti: TiSC, To: ToSC } = buildFluidInterp(fluidName, 0);
  console.log(`  '${fluidName}': {`);
  console.log(`    ti_sh: [${TiSH.map(x => x.toFixed(1)).join(',').replace(/\.0/g, '.')}],`);
  console.log(`    to_sh: [${ToSH.map(x => x.toFixed(1)).join(',').replace(/\.0/g, '.')}],`);
  console.log(`    ti_sc: [${TiSC.map(x => x.toFixed(1)).join(',').replace(/\.0/g, '.')}],`);
  console.log(`    to_sc: [${ToSC.map(x => x.toFixed(1)).join(',').replace(/\.0/g, '.')}],`);
  console.log(`  },`);
}

function buildFluidInterp (fluid, Q = 1) {
  const Ti = [];
  const To = [];
  let p = -5;
  let LT = null;

function etapa (reais) {
  const n = reais.length;
  if (n > 200) { return false; }
  const pn = Math.round((p + (n / 10)) * 10) / 10;
  if (pn > 150) { return false; }
  const Tn = Math.round((cp.PropsSI('T', 'P', pn * 1e5 + 101325, 'Q', Q, ftrans[fluid]) - 273.15) * 10) / 10;
  if (!isFinite(Tn)) { return false; }
  for (let i = 1; i <= n; i++) {
    const Ti_n = Math.round(((i / (n + 1)) * (Tn - LT) + LT) * 10) / 10;
    if (Math.abs(Ti_n - reais[i - 1]) > 0.15) { return false; }
  }
  if (etapa([...reais, Tn])) {
    return true;
  } else {
    Ti.push(pn);
    To.push(Tn);
    p = Math.round((p + ((n + 1) / 10)) * 10) / 10;
    return true;
  }
  }

  while (!isFinite(cp.PropsSI('T', 'P', p * 1e5 + 101325, 'Q', Q, ftrans[fluid]))) {
    p = Math.round((p + 0.1) * 10) / 10;
  }
  while (p <= 150) {
    const T0 = Math.round((cp.PropsSI('T', 'P', p * 1e5 + 101325, 'Q', Q, ftrans[fluid]) - 273.15) * 10) / 10;
    if (!isFinite(T0)) break;
    if ((LT == null) || !etapa([T0])) {
      Ti.push(p);
      To.push(T0);
      p = Math.round((p + 0.1) * 10) / 10;
    }
    LT = To[To.length - 1];
  }

  return { Ti, To };
}

function buildFluidInterp2 (formula, pmin, pmax, fluidName) {
  const Ti = [];
  const To = [];
  let p = pmin;
  let LT = null;

  function etapa (reais) {
    const n = reais.length;
    if (n > 200) { return false; }
    const pn = Math.round((p + (n / 10)) * 10) / 10;
    if (pn > 150) { return false; }
    const Tn = Math.round(formula(pn) * 10) / 10;
    if (!isFinite(Tn)) { return false; }
    for (let i = 1; i <= n; i++) {
      const Ti_n = Math.round(((i / (n + 1)) * (Tn - LT) + LT) * 10) / 10;
      if (Math.abs(Ti_n - reais[i - 1]) > 0.15) { return false; }
    }
    if (etapa([...reais, Tn])) {
      return true;
    } else {
      Ti.push(pn);
      To.push(Tn);
      p = Math.round((p + ((n + 1) / 10)) * 10) / 10;
      return true;
    }
  }

  while (p <= pmax) {
    const T0 = Math.round(formula(p) * 10) / 10;
    if (!isFinite(T0)) break;
    if ((LT == null) || !etapa([T0])) {
      Ti.push(p);
      To.push(T0);
      p = Math.round((p + 0.1) * 10) / 10;
    }
    LT = To[To.length - 1];
  }

  console.log(`  '${fluidName}': {`);
  console.log(`    ti_sh: [${Ti.map(x => x.toFixed(1)).join(',').replace(/\.0/g, '.')}],`);
  console.log(`    to_sh: [${To.map(x => x.toFixed(1)).join(',').replace(/\.0/g, '.')}],`);
  console.log(`    ti_sc: [${Ti.map(x => x.toFixed(1)).join(',').replace(/\.0/g, '.')}],`);
  console.log(`    to_sc: [${To.map(x => x.toFixed(1)).join(',').replace(/\.0/g, '.')}],`);
  console.log(`  },`);
}

const fluids = {
  // 'R22': {
  //   Ti: [0,0.3,0.7,1.2,1.7,2.1,2.9,3.8,4.9,6.4,8.1,10,12,14.2,17.2,20.4,24.2,28.4,32.7,37.9,43.6,48.5,48.8],
  //   To: [-40.8,-35.1,-28.9,-22.6,-17.4,-13.6,-7.2,-1,5.4,12.9,20.1,27,33.4,39.7,47.2,54.3,61.8,69.1,75.8,83.1,90.2,95.7,96.1],
  // },
  'r22': {
    Ti: [-1.,-0.9,-0.8,-0.7,-0.6,-0.5,-0.3,-0.1,0.1,0.3,0.7,1.2,1.7,2.1,2.9,3.8,4.9,6.4,8.1,10.,12.,14.2,17.2,20.4,24.2,28.4,32.7,37.9,43.6,48.5,48.8],
    To: [-104.3,-78.8,-69.4,-63.1,-58.3,-54.3,-48.,-43.,-38.8,-35.1,-28.9,-22.6,-17.4,-13.6,-7.2,-1.,5.4,12.9,20.1,27.,33.4,39.7,47.2,54.3,61.8,69.1,75.8,83.1,90.2,95.7,96.1],
  },
  'r134a': {
    Ti: [-1.,-0.9,-0.8,-0.7,-0.6,-0.5,-0.4,-0.2,0.,0.3,0.7,1.1,1.5,2.1,2.9,3.7,4.7,6.1,7.5,8.9,10.8,13.,15.6,18.6,22.,25.8,30.3,34.9,39.3,39.4,39.5],
    To: [-91.5,-65.1,-55.4,-48.9,-44.,-40.,-36.5,-30.8,-26.1,-20.2,-13.9,-8.7,-4.1,1.7,8.3,13.9,20.,27.3,33.5,39.1,45.7,52.5,59.5,66.6,73.8,80.9,88.3,95.,100.7,82.8,101.],
  },
  'r404a': {
    Ti: [-0.9,-0.8,-0.7,-0.6,-0.5,-0.3,-0.1,0.1,0.4,0.8,1.3,1.9,2.5,3.3,4.4,5.7,7.,8.5,10.6,13.,15.7,18.6,21.5,25.4,29.5,33.6,36.3],
    To: [-83.2,-74.1,-68.,-63.3,-59.4,-53.3,-48.4,-44.2,-39.,-33.3,-27.3,-21.4,-16.3,-10.5,-3.7,3.1,8.9,14.9,22.1,29.3,36.3,42.9,48.9,56.,62.6,68.5,72.1],
  },
  'r407c': {
    Ti: [-0.8,-0.7,-0.6,-0.5,-0.4,-0.2,0.,0.2,0.5,0.9,1.3,1.9,2.5,3.3,4.3,5.7,7.3,8.9,10.7,12.6,15.1,17.8,20.8,24.,28.2,33.4,38.6,45.2,45.3],
    To: [-71.5,-65.4,-60.7,-56.8,-53.5,-48.1,-43.6,-39.8,-34.9,-29.5,-24.8,-19.,-13.9,-8.2,-2.,5.3,12.3,18.4,24.4,30.1,36.7,43.,49.3,55.4,62.5,70.3,77.3,85.6,85.8],
  },
  'r410a': {
    Ti: [-0.9,-0.8,-0.7,-0.6,-0.5,-0.4,-0.2,0.,0.3,0.7,1.2,1.8,2.5,3.4,4.4,5.7,7.4,9.3,11.7,14.4,17.3,20.2,24.3,29.,33.4,38.2,43.7,47.9],
    To: [-86.6,-77.9,-72.,-67.6,-63.9,-60.8,-55.7,-51.4,-46.2,-40.5,-34.7,-29.,-23.4,-17.4,-11.7,-5.4,1.6,8.2,15.4,22.3,28.8,34.6,41.8,49.,55.,60.9,67.,71.2],
  },
  'r507a': {
    Ti: [-1.,-0.9,-0.8,-0.7,-0.6,-0.5,-0.4,-0.2,0.,0.3,0.6,1.,1.4,2.,2.8,3.7,4.8,6.2,7.8,9.4,11.6,14.1,17.1,19.9,23.5,27.7,32.4,36.],
    To: [-108.3,-83.6,-74.5,-68.4,-63.7,-59.9,-56.6,-51.2,-46.7,-41.2,-36.6,-31.4,-26.9,-21.1,-14.7,-8.6,-2.2,4.7,11.4,17.3,24.4,31.4,38.7,44.7,51.7,58.8,65.8,70.6],
  },
  'r717': {
    Ti: [-0.9,-0.8,-0.7,-0.6,-0.5,-0.3,-0.1,0.1,0.4,0.7,1.,1.5,2.1,2.8,3.9,5.,6.4,7.8,9.8,11.9,14.4,17.2,20.7,25.3,30.1,35.2,40.6,46.4,52.9,61.6,71.5,82.1,93.4,106.1,112.3],
    To: [-69.5,-60.4,-54.4,-49.8,-46.,-40.1,-35.4,-31.4,-26.5,-22.3,-18.7,-13.5,-8.3,-3.1,3.7,9.4,15.5,20.9,27.5,33.5,39.7,45.8,52.6,60.3,67.3,73.9,80.2,86.3,92.6,100.1,107.7,115.,122.,129.1,132.2],
  },
};
function createVIData (fluid) {
  const viData = {
    ...(fluids[fluid] || { Ti:[], To: [] }),
    length: 0,
    p: 0,
  };
  viData.length = viData.Ti.length;
  viData.p = Math.round(viData.length / 2);
  return viData;
}
function vecInterp (viData, input) {
  const { Ti, To } = viData;
  while (viData.p >= 1 && viData.p < viData.length) {
    if (input > Ti[viData.p]) {
      viData.p++;
    } else if (input < Ti[viData.p - 1]) {
      viData.p--;
    } else if (input >= Ti[viData.p - 1] && input <= Ti[viData.p]) {
      return ((input - Ti[viData.p - 1]) / (Ti[viData.p] - Ti[viData.p - 1])) * (To[viData.p] - To[viData.p - 1]) + To[viData.p - 1];
    } else {
      return NaN;
    }
  }
  return NaN;
}
function validar (fluid) {
  const viData = createVIData(fluid);
  let maiorErro = 0;
  for (let p = 0; p <= 100; p = Math.round((p + 2.0) * 10) / 10) {
    const Tr = Math.round((cp.PropsSI('T', 'P', p * 1e5 + 101325, 'Q', 0, ftrans[fluid]) - 273.15) * 10) / 10;
    const Tc = Math.round(vecInterp(viData, p) * 10) / 10;
    if ((!isFinite(Tr)) && (!isFinite(Tc))) break;
    const e = Math.round(Math.abs(Tr - Tc) * 100) / 100;
    if (e > maiorErro) maiorErro = e;
    console.log(`${e}\t${Tr}\t${Tc}`);
  }
  console.log('maiorErro', maiorErro);
}

function idealEcoSafe (x) {
  return -32.7 + 14.2*x - 1.53 * Math.pow(x, 2) + 0.103 * Math.pow(x, 3) -3.44E-3 * Math.pow(x, 4) + 4.42E-5 * Math.pow(x, 5);
}

setTimeout(() => {
  buildFluidInterpB('r22');
  buildFluidInterpB('r134a');
  buildFluidInterpB('r404a');
  buildFluidInterpB('r407c');
  buildFluidInterpB('r410a');
  buildFluidInterpB('r507a');
  buildFluidInterpB('r717');
  buildFluidInterp2(idealEcoSafe, -0.5, 26, 'idealEcoSafe');
}, 5000);
