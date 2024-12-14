type TDutsList = {
    DEV_ID: string;
    ISVISIBLE?: number,
    ROOM_NAME?: string
};
export function alphabeticOrderVisibilityDEV_ID(array: {
    DEV_ID: string;
    ISVISIBLE: number,
    ROOM_NAME: string
}[]) {
    return array.sort((a, b) => (
        a.DEV_ID < b.DEV_ID ? -1 : a.DEV_ID > b.DEV_ID ? 1 : 0
    ))
} 