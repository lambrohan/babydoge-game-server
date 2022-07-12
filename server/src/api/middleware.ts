import { NextFunction, Request, Response } from 'express';
import * as Web3Token from 'web3-token';
import { ApiService } from '.';
const apiService = new ApiService();
export async function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.params.token;

  if (!token) {
    res.status(400).send('unauthorized');
    return;
  }

  try {
    const { address } = await Web3Token.verify(token);
    if (!address) {
      res.status(400).send('unauthorized');
      return;
    }
    const { is_admin } = await apiService.getUser(address);
    if (is_admin) {
      next();
    } else {
      res.status(400).send('unauthorized');
    }
  } catch (error) {
    res.status(400).send('unauthorized');
  }
}
