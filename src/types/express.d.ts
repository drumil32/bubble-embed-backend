declare global {
  namespace Express {
    interface Request {
      requestId: string;
      finalDomain: string;
    }
  }
}

export {};