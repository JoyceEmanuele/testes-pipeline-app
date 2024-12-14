const healthIndex = [
    { name: 'red', value: 25},
    { name: 'orange', value: 50},
    { name: 'yellow', value: 75},
    { name: 'green', value: 100}
]

export default function transformHealth(color: string): number {
    const health = healthIndex.find(({ name }) => name === color.toLowerCase());
    return health.value;
}