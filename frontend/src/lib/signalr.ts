import * as signalR from '@microsoft/signalr';

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || 'http://localhost:5000/hubs/execution-stream';

let connection: signalR.HubConnection | null = null;

export function getSignalRConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();
  }
  return connection;
}

export async function startSignalR(): Promise<signalR.HubConnection> {
  const conn = getSignalRConnection();
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    try {
      await conn.start();
      console.log('[SignalR] Connected to execution stream hub');
    } catch (err) {
      console.warn('[SignalR] Connection error:', err);
    }
  }
  return conn;
}

export async function joinRunStream(runId: string) {
  const conn = await startSignalR();
  if (conn.state === signalR.HubConnectionState.Connected) {
    await conn.invoke('JoinRun', runId);
  }
}

export async function leaveRunStream(runId: string) {
  const conn = getSignalRConnection();
  if (conn.state === signalR.HubConnectionState.Connected) {
    await conn.invoke('LeaveRun', runId);
  }
}

export async function joinGlobalNoc() {
  const conn = await startSignalR();
  if (conn.state === signalR.HubConnectionState.Connected) {
    await conn.invoke('JoinGlobal');
  }
}
