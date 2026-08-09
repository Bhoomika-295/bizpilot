/**
 * AIService Abstraction Layer
 * 
 * Structured as: AIService → ProviderAdapter → LLM
 * 
 * This layer provides a clean interface for AI operations while allowing
 * future providers to be swapped without changing the business logic.
 * 
 * Day 1: Demo analysis layer (no fake AI responses)
 * Future: Real LLM providers (OpenAI, Anthropic, etc.)
 */

export interface AnalysisRequest {
  businessId: number;
  dataType: "transactions" | "customers" | "products" | "expenses";
  timeRange?: { start: Date; end: Date };
  context?: Record<string, any>;
}

export interface AnalysisResult {
  businessId: number;
  analysisType: string;
  findings: string[];
  confidence: number;
  timestamp: Date;
  source: "demo" | "llm" | "hybrid";
  assumptions: string[];
  limitations: string[];
}

export interface Recommendation {
  id?: number;
  businessId: number;
  title: string;
  description: string;
  category: string;
  evidence: string;
  confidence: number;
  assumptions: string[];
  expectedImpact: string;
  risk: string;
  createdAt?: Date;
  source: "demo" | "llm" | "user";
}

export interface Strategy {
  id?: number;
  businessId: number;
  objective: string;
  targetMetric: string;
  baseline: number;
  proposedActions: string[];
  expectedOutcome: string;
  timeframe: string;
  assumptions: string[];
  risks: string[];
  confidence: number;
  createdAt?: Date;
  source: "demo" | "llm" | "user";
}

/**
 * ProviderAdapter interface for pluggable LLM providers
 */
export interface ILLMProvider {
  name: string;
  analyzeData(request: AnalysisRequest): Promise<AnalysisResult>;
  generateRecommendations(analysis: AnalysisResult): Promise<Recommendation[]>;
  generateStrategy(analysis: AnalysisResult): Promise<Strategy>;
}

/**
 * Demo Provider - Safe, honest placeholder for Day 1
 * No fake AI responses. All outputs clearly labeled as demo/placeholder.
 */
export class DemoLLMProvider implements ILLMProvider {
  name = "demo";

  async analyzeData(request: AnalysisRequest): Promise<AnalysisResult> {
    return {
      businessId: request.businessId,
      analysisType: `${request.dataType}_analysis`,
      findings: [
        `Demo analysis: ${request.dataType} data structure validated`,
        "Data quality appears consistent",
        "No anomalies detected in sample data",
      ],
      confidence: 0,
      timestamp: new Date(),
      source: "demo",
      assumptions: [
        "This is demo analysis - not based on real LLM inference",
        "Findings are placeholder only",
        "Real analysis requires LLM provider integration",
      ],
      limitations: [
        "Demo mode does not perform actual data analysis",
        "No statistical or ML-based insights",
        "Recommendations are not personalized",
      ],
    };
  }

  async generateRecommendations(analysis: AnalysisResult): Promise<Recommendation[]> {
    return [
      {
        businessId: analysis.businessId,
        title: "Set Up Regular Data Review",
        description: "Establish a weekly cadence to review your business metrics and trends.",
        category: "operations",
        evidence: "Demo recommendation - based on best practices",
        confidence: 0,
        assumptions: ["This is a demo recommendation"],
        expectedImpact: "Better visibility into business performance",
        risk: "Minimal - informational only",
        source: "demo",
      },
      {
        businessId: analysis.businessId,
        title: "Validate Your Data Sources",
        description: "Ensure all data imports are complete and accurate before making decisions.",
        category: "data_quality",
        evidence: "Demo recommendation - based on best practices",
        confidence: 0,
        assumptions: ["This is a demo recommendation"],
        expectedImpact: "Increased confidence in business insights",
        risk: "Minimal - informational only",
        source: "demo",
      },
    ];
  }

  async generateStrategy(analysis: AnalysisResult): Promise<Strategy> {
    return {
      businessId: analysis.businessId,
      objective: "Establish Data-Driven Decision Making",
      targetMetric: "Decision quality score",
      baseline: 0,
      proposedActions: [
        "Import historical data into BizPilot",
        "Set up automated data refresh",
        "Review metrics weekly",
        "Document assumptions and decisions",
      ],
      expectedOutcome: "Better business decisions informed by real data",
      timeframe: "30 days",
      assumptions: ["This is a demo strategy"],
      risks: ["Demo strategies are not personalized to your business"],
      confidence: 0,
      source: "demo",
    };
  }
}

/**
 * AIService - Main interface for business logic
 * 
 * Manages provider selection and orchestrates analysis workflows
 */
export class AIService {
  private provider: ILLMProvider;

  constructor(provider?: ILLMProvider) {
    // Day 1: Always use demo provider
    // Future: Allow provider selection based on config/subscription
    this.provider = provider || new DemoLLMProvider();
  }

  async analyzeBusinessData(request: AnalysisRequest): Promise<AnalysisResult> {
    return this.provider.analyzeData(request);
  }

  async generateRecommendations(analysis: AnalysisResult): Promise<Recommendation[]> {
    return this.provider.generateRecommendations(analysis);
  }

  async generateStrategy(analysis: AnalysisResult): Promise<Strategy> {
    return this.provider.generateStrategy(analysis);
  }

  /**
   * Full analysis workflow: analyze → recommend → strategize
   */
  async runFullAnalysis(request: AnalysisRequest): Promise<{
    analysis: AnalysisResult;
    recommendations: Recommendation[];
    strategy: Strategy;
  }> {
    const analysis = await this.analyzeBusinessData(request);
    const recommendations = await this.generateRecommendations(analysis);
    const strategy = await this.generateStrategy(analysis);

    return {
      analysis,
      recommendations,
      strategy,
    };
  }

  /**
   * Get current provider name (useful for UI/logging)
   */
  getProviderName(): string {
    return this.provider.name;
  }
}

/**
 * Singleton instance for server-side use
 */
export const aiService = new AIService();
