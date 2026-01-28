import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('WebSocketGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-practice')
  handleJoinPractice(client: Socket, practiceId: string) {
    client.join(`practice-${practiceId}`);
    this.logger.log(`Client ${client.id} joined practice ${practiceId}`);
  }

  @SubscribeMessage('leave-practice')
  handleLeavePractice(client: Socket, practiceId: string) {
    client.leave(`practice-${practiceId}`);
  }

  // Emit events to specific practice room
  emitToPractice(practiceId: string, event: string, data: any) {
    this.server.to(`practice-${practiceId}`).emit(event, data);
  }

  // Broadcast appointment updates
  emitAppointmentUpdate(practiceId: string, appointment: any) {
    this.emitToPractice(practiceId, 'appointment-update', appointment);
  }

  // Broadcast new call
  emitNewCall(practiceId: string, callLog: any) {
    this.emitToPractice(practiceId, 'new-call', callLog);
  }

  // Broadcast call status update
  emitCallUpdate(practiceId: string, callLog: any) {
    this.emitToPractice(practiceId, 'call-update', callLog);
  }

  // Broadcast patient check-in
  emitPatientCheckIn(practiceId: string, appointment: any) {
    this.emitToPractice(practiceId, 'patient-checkin', appointment);
  }
}
