// From gradstop

export default function stopsGenerator(numStops: number) {
  const colorArray = consumptionColorArray();
  const increment = 1.0 / (numStops - 1);
  const outputArray = [];
  for (let i = 0; i < numStops; i++) {
    outputArray.push(rgbBezierInterpolation(colorArray, increment * i));
  }
  return outputArray;
};

export function consumptionColorArray () {
  return ['#63BE7B', '#FFE683', '#FEDA81', '#F8696B'].map(hexToRgb);
}

export function rgbBezierInterpolation(colArr: number[][], x: number) {
  const y = 1 - x;
  return 'rgb(' + [
    Math.trunc(Math.pow(y, 3) * colArr[0][0] + 3 * Math.pow(y, 2) * x * colArr[1][0] + 3 * y * Math.pow(x, 2) * colArr[2][0] + Math.pow(x, 3) * colArr[3][0]),
    Math.trunc(Math.pow(y, 3) * colArr[0][1] + 3 * Math.pow(y, 2) * x * colArr[1][1] + 3 * y * Math.pow(x, 2) * colArr[2][1] + Math.pow(x, 3) * colArr[3][1]),
    Math.trunc(Math.pow(y, 3) * colArr[0][2] + 3 * Math.pow(y, 2) * x * colArr[1][2] + 3 * y * Math.pow(x, 2) * colArr[2][2] + Math.pow(x, 3) * colArr[3][2]),
  ].join(', ') + ')';
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ]
};
