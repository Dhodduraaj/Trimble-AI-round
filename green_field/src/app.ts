import express, { Express } from 'express';
import { PoolController } from './controllers/PoolController';
import { SeatController } from './controllers/SeatController';
import { VerificationController } from './controllers/VerificationController';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  const poolController = new PoolController();
  const seatController = new SeatController();
  const verificationController = new VerificationController();

  // Healthcheck Endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Pool Management Routes
  app.post('/api/v1/pools', poolController.createPool);
  app.get('/api/v1/pools/:poolId', poolController.getPool);

  // Seat Management Routes
  app.post('/api/v1/pools/:poolId/seats', seatController.assignSeat);
  app.post('/api/v1/pools/:poolId/seats/revoke', seatController.revokeSeat);

  // Real-time License Verification Route
  app.get('/api/v1/licenses/verify', verificationController.verifyLicense);

  // Global RFC 7807 Error Handler
  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[LMS Server] B2B License Management System running on port ${PORT}`);
  });
}
