// Particiona lista muito grandes em blocos menores para executar alguma tarefa em partes

export async function processarArrayEmBlocos<T>(tamanhoMaximoBloco: number, lista: T[], callback: (bloco: T[]) => Promise<void>) {
  let i = 0;
  while(i < lista.length) {
    const bloco = lista.slice(i, i + tamanhoMaximoBloco);
    await callback(bloco);
    i += tamanhoMaximoBloco;
  }
}

export function splitChunks<T>(array: T[], chunkSize: number): T[][] {
  if (array.length <= chunkSize) {
    return [array];
  }
  let i = 0;
  const chunks = [];
  while((i * chunkSize) < array.length) {
    const chunk = array.slice(i * chunkSize, (i + 1) * chunkSize);
    chunks.push(chunk);
    i += 1;
  }
  return chunks;
}
