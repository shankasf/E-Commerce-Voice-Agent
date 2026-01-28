import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinPractice(client: Socket, practiceId: string): void;
    handleLeavePractice(client: Socket, practiceId: string): void;
    emitToPractice(practiceId: string, event: string, data: any): void;
    emitAppointmentUpdate(practiceId: string, appointment: any): void;
    emitNewCall(practiceId: string, callLog: any): void;
    emitCallUpdate(practiceId: string, callLog: any): void;
    emitPatientCheckIn(practiceId: string, appointment: any): void;
}
