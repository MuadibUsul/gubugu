/** P2 extension boundaries. No external provider is wired in V1. */
export interface PushProvider {
  send(input: { userId: string; title: string; body: string }): Promise<void>;
}

export interface LogisticsProvider {
  track(input: {
    carrier: string;
    trackingNo: string;
  }): Promise<{ status: string }>;
}

export interface AuthenticityProvider {
  request(input: {
    goodsId: string;
    imageUrls: string[];
  }): Promise<{ reference: string }>;
}

export interface SubscriptionProvider {
  getEntitlements(userId: string): Promise<readonly string[]>;
}

export interface RecommendationProvider {
  recommend(input: {
    userId: string;
    limit: number;
  }): Promise<readonly string[]>;
}
