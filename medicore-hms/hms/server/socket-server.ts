/**
 * Standalone Socket.IO server for real-time features:
 *   - New appointment booked -> notify doctor's dashboard live
 *   - Appointment status changes -> notify patient
 *   - Low-stock medicine alert -> notify pharmacist
 *   - Lab result ready -> notify requesting doctor
 *
 * Run alongside Next.js: `npm run socket` (separate process/port).
 * The Next.js API routes emit events here via a small HTTP-triggered
 * emit endpoint or a shared Redis pub/sub adapter in multi-instance deploys.
 */
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000", credentials: true },
});

// Authenticate socket connections using the same JWT the app issues
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("UNAUTHENTICATED"));
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string; role: string };
    (socket as any).userId = payload.sub;
    (socket as any).role = payload.role;
    next();
  } catch {
    next(new Error("INVALID_TOKEN"));
  }
});

io.on("connection", (socket) => {
  const userId = (socket as any).userId as string;
  const role = (socket as any).role as string;

  // Personal room — targeted notifications
  socket.join(`user:${userId}`);
  // Role rooms — broadcast to all pharmacists, all lab techs, etc.
  socket.join(`role:${role}`);

  socket.on("disconnect", () => {
    // no-op; rooms are cleaned up automatically
  });
});

// Helper other services can call (e.g. via internal HTTP bridge or direct import
// if run in the same process) to push events out.
export function notifyUser(userId: string, event: string, payload: unknown) {
  io.to(`user:${userId}`).emit(event, payload);
}
export function notifyRole(role: string, event: string, payload: unknown) {
  io.to(`role:${role}`).emit(event, payload);
}

const PORT = Number(process.env.SOCKET_PORT ?? 4001);
httpServer.listen(PORT, () => console.log(`Socket.IO server listening on :${PORT}`));
