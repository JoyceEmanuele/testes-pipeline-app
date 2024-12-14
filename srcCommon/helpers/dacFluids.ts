// import * as path from 'path';
// const coolprop: any = require(path.resolve('./CoolProp/coolprop-6.4.1.js'));

// export function coolpropIsReady () {
//   return new Promise((resolve, reject) => {
//     function checkCoolProp () {
//       if (coolprop && coolprop.PropsSI) {
//         resolve(null);
//       } else {
//         setTimeout(checkCoolProp, 300);
//       }
//     }
//     setTimeout(checkCoolProp, 300);
//   });
// }

// logger.info(coolprop.PropsSI('D', 'P', 5000, 'T', 300, 'Nitrogen'))
// coolprop.PropsSI('T', 'P', 8 * 1e5 + 101325, 'Q', 1, 'R22') - 273.15
// Pamb = 101325
// const coolPropFluidNames: {[k: string]: string} = {
//   'r22': 'R22',
//   'r402b': <string>null,
//   'r134a': 'R134a',
//   'r404a': 'R404A',
//   'r407c': 'R407C',
//   'r410a': 'R410A',
//   'r507a': 'R507A',
//   'r717': 'R717',
// }

const fluids: { [fluid: string]: { Ti: number[], To: number[] } } = {
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
    Ti: [-0.8,-0.7,-0.6,-0.5,-0.4,-0.2,0.,0.3,0.6,1.,1.6,2.2,3.,3.9,5.2,6.8,8.4,10.2,12.1,14.8,17.4,20.2,24.2,28.3,33.1,38.1,42.7,45.2,45.3],
    To: [-64.1,-58.,-53.4,-49.6,-46.4,-41.,-36.6,-31.2,-26.6,-21.5,-15.2,-9.9,-3.9,1.9,8.9,16.1,22.3,28.3,34.,41.,46.9,52.7,59.9,66.4,73.1,79.2,84.1,86.2,86.2],
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
  'idealEcoSafe': {
    Ti: [-0.5,0.,0.6,1.2,1.8,2.4,3.2,4.1,5.,6.1,7.5,9.4,12.3,15.7,18.3,20.5,24.4,25.7,26.8],
    To: [-40.2,-32.7,-24.7,-17.7,-11.5,-6.1,0.1,6.,10.9,16.,21.4,27.5,35.9,44.9,50.9,55.3,62.1,64.9,68.1],
  },
};

export function calculateSubResf (FLUID_TYPE: string, Pliq: number, Tliq: number): number {
  if ((Pliq == null) || (Tliq == null)) return null;
  const viData = fluids[FLUID_TYPE];
  if (viData) {
    // const viData = createVIData(FLUID_TYPE);
    const Tc = vecInterp(viData, Pliq);
    // const coolPropFluid = coolPropFluidNames[FLUID_TYPE];
    // const Tc = coolprop.PropsSI('T', 'P', Pliq * 1e5 + 101325, 'Q', 0, coolPropFluid) - 273.15;
    return Math.round((Tc - Tliq) * 10) / 10
  }
  if (FLUID_TYPE === 'r402b') {
    const Tc = R402B_P2T(Pliq)
    return Math.round((Tc - Tliq) * 10) / 10
  }
  return null
}

export function calculateSupAq (FLUID_TYPE: string, Psuc: number, Tsuc: number): number {
  if ((Psuc == null) || (Tsuc == null)) return null;
  const viData = fluids[FLUID_TYPE];
  if (viData) {
    // const viData = createVIData(FLUID_TYPE);
    const Te = vecInterp(viData, Psuc);
    // const coolPropFluid = coolPropFluidNames[FLUID_TYPE];
    // const Te = coolprop.PropsSI('T', 'P', Psuc * 1e5 + 101325, 'Q', 1, coolPropFluid) - 273.15
    return Math.round((Tsuc - Te) * 10) / 10
  }
  if (FLUID_TYPE === 'r402b') {
    const Te = R402B_P2T(Psuc)
    return Math.round((Tsuc - Te) * 10) / 10
  }
  return null
}

interface VecInterpData {
  Ti: number[]
  To: number[]
  // length: number
  // p: number
}
function createVIData (fluid: string) {
  const viData: VecInterpData = {
    ...(fluids[fluid] || { Ti:[], To: [] }),
    // length: 0,
    // p: 0,
  };
  // viData.length = viData.Ti.length;
  // viData.p = Math.floor(viData.length / 2);
  return viData;
}
function vecInterp (viData: VecInterpData, input: number) {
  const { Ti, To } = viData;
  const length = Ti.length;
  let p = Math.floor(length / 2);
  while (p >= 1 && p < length) {
    if (input > Ti[p]) {
      p++;
    } else if (input < Ti[p - 1]) {
      p--;
    } else if (input >= Ti[p - 1] && input <= Ti[p]) {
      return ((input - Ti[p - 1]) / (Ti[p] - Ti[p - 1])) * (To[p] - To[p - 1]) + To[p - 1];
      // const SuperHeating = Math.round((T1suc - TempEvap) * 100) / 100
      // const Subcooling = Math.round((TempCond - T2cond) * 100) / 100
    } else {
      return NaN;
    }
  }
  // if (!(viData.p >= 1)) viData.p = 1;
  // if (!(viData.p < viData.length)) viData.p = viData.length - 1;
  return NaN;
}

function R402B_P2T (x_in: number): number {
  const a = 5.7821083889145121E+07
  const b = 5.7011648987046339E+07
  const c = 2.4684848309409441E-01
  const Offset = -1.2705009241709168E+02

  return Math.pow(a + b * x_in, c) + Offset
}
