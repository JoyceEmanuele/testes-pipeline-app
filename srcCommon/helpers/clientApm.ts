import sqldb from '../db'


export default async function nameClients(userId: string) {
    const clients = await sqldb.USERSCLIENTS.getUserClients({ userId: userId });
    const clientsEnd : string[] = [];
    for (let index = 0; index < clients.length; index++) {
        const client = await sqldb.CLIENTS.getClientInfo({ CLIENT_ID: clients[index].CLIENT_ID })
        clientsEnd.push(client.NAME);
    }
    return clientsEnd; 
}