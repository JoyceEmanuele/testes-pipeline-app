export interface ServedEnvironmentOrMachine {
    id: string;
    type: 'Máquina' | 'Ambiente';
    tag: string;
    signalQuality: string;
    apDistance: string;
    comments: string;
}
