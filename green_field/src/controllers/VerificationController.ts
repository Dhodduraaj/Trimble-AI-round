import { Request, Response, NextFunction } from 'express';
import { VerificationService } from '../services/VerificationService';

export class VerificationController {
  constructor(private verificationService: VerificationService = new VerificationService()) {}

  /**
   * GET /api/v1/licenses/verify?tenant_id=...&product_code=...&email=...
   */
  verifyLicense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.verificationService.verifyLicense({
        tenantId: req.query.tenant_id as string,
        productCode: req.query.product_code as string,
        email: req.query.email as string,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
