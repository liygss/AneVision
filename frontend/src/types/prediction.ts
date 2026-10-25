export interface PredictionResult {
  success: boolean;
  estimated_hb: number;
  estimated_range?: {
    min: number;
    max: number;
  };
  risk_level: "low" | "moderate" | "high";
  confidence: number;
  headline_source?: string;
  eye: {
    hgb_predicted?: number;
    status?: string;
    status_ridge?: string;
    status_cnn?: string;
    confidence?: number;
    threshold_used?: number;
    margin_ke_threshold?: number;
    cnn_probability?: number;
    cnn_raw_probability?: number;
    source?: string;
    gender?: string;
    estimated_hb?: number;
  };
  nail?: {
    estimated_hb?: number;
    estimated_hb_raw?: number;
    status?: string;
    confidence?: number;
    threshold_used?: number;
    mae?: number;
    source?: string;
    model?: string;
    hand_confidence?: number;
    weight?: number;
    nail_count?: number;
    nail_hbs?: number[];
    bias_correction?: number;
    flags_ok?: boolean;
    issues?: string;
    nail_condition?: string;
    nail_condition_detail?: string;
    nail_condition_confidence?: number;
    error?: string;
  };
  fusion?: {
    estimated_hb?: number;
    eye_weight?: number;
    nail_weight?: number;
    confidence?: number;
  };
  models_disagree?: boolean;
  explanation?: {
    eye_heatmap?: string | null;
    nail_heatmap?: string | null;
  };
  disclaimer: string;
}
