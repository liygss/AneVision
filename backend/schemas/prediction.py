from pydantic import BaseModel
from typing import List, Optional


class EyeResult(BaseModel):
    hgb_predicted: Optional[float] = None
    status: Optional[str] = None
    status_ridge: Optional[str] = None
    status_cnn: Optional[str] = None
    confidence: Optional[float] = None
    threshold_used: Optional[float] = None
    margin_ke_threshold: Optional[float] = None
    cnn_probability: Optional[float] = None
    cnn_raw_probability: Optional[float] = None
    source: Optional[str] = None


class NailResult(BaseModel):
    estimated_hb: Optional[float] = None
    status: Optional[str] = None
    confidence: Optional[float] = None
    threshold_used: Optional[float] = None
    mae: Optional[float] = None
    source: Optional[str] = None
    model: Optional[str] = None
    hand_confidence: Optional[float] = None
    weight: Optional[float] = None
    error: Optional[str] = None
    nail_count: Optional[int] = None
    nail_hbs: Optional[List[float]] = None
    flags_ok: Optional[bool] = None
    issues: Optional[str] = None
    nail_condition: Optional[str] = None
    nail_condition_detail: Optional[str] = None
    nail_condition_confidence: Optional[float] = None


class FusionResult(BaseModel):
    estimated_hb: Optional[float] = None
    eye_weight: Optional[float] = None
    nail_weight: Optional[float] = None


class EstimatedRange(BaseModel):
    min: float
    max: float


class Explanation(BaseModel):
    eye_heatmap: Optional[str] = None
    nail_heatmap: Optional[str] = None


class PredictionResponse(BaseModel):
    success: bool
    estimated_hb: float
    estimated_range: Optional[EstimatedRange] = None
    risk_level: str
    confidence: float
    eye: EyeResult
    nail: Optional[NailResult] = None
    fusion: Optional[FusionResult] = None
    models_disagree: Optional[bool] = None
    explanation: Optional[Explanation] = None
    disclaimer: str
