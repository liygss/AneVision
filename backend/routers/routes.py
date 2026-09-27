from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from utils.image_validation import validate_image
from services.inference import predict_eye, predict_nail
from schemas.prediction import PredictionResponse, EyeResult, NailResult, FusionResult, EstimatedRange, Explanation
from services.fusion import combine_predictions
from services.calibration import calibrate_eye

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok"}


@router.post("/predict", response_model=PredictionResponse)
async def predict(
    eye_image: UploadFile = File(..., description="Conjunctiva / eye image"),
    nail_image: UploadFile = File(None, description="Full-hand photo (optional, for nail Hb estimation)"),
    gender: str = Form("F", description="Gender: F/Female/Perempuan or M/Male/Laki-laki"),
    nail_box: str = Form(None, description="Optional normalized l,t,r,b (0-1) box around the nail, from a manual crop"),
):
    await validate_image(eye_image)

    eye_contents = await eye_image.read()

    eye_result_raw = predict_eye(eye_contents, gender)

    if "error" in eye_result_raw:
        raise HTTPException(status_code=400, detail=eye_result_raw["error"])

    # Nail prediction (optional)
    nail_result = None
    nail_error = None
    if nail_image is not None:
        try:
            await validate_image(nail_image)
            nail_contents = await nail_image.read()
            nail_result_raw = predict_nail(nail_contents, gender, nail_box=nail_box)
            if nail_result_raw is not None:
                if "error" in nail_result_raw:
                    nail_error = nail_result_raw["error"]
                else:
                    nail_result = nail_result_raw
        except Exception:
            pass

    # Eye fields
    eye_hgb_raw = eye_result_raw.get("hgb_predicted", 12.0)
    eye_hgb = calibrate_eye(eye_hgb_raw)
    if eye_hgb is None:
        eye_hgb = round(float(eye_hgb_raw), 2)
    eye_confidence = eye_result_raw.get("confidence", 0.5)
    eye_status = eye_result_raw.get("status", "Normal")
    threshold_used = eye_result_raw.get("threshold_used", 12.0)
    margin = eye_result_raw.get("margin_ke_threshold", 0.0)

    # A nail result is excluded from the combined estimate only when there is
    # genuinely no nail estimate (the worker errored / nothing detected). A
    # deviating nail — features outside the training distribution, Hb outside
    # the credible band, or a large difference from the eye — is still shown
    # and still used in the fusion: we prefer a nail card that always has
    # content over dropping the modality. A large eye-nail gap is surfaced via
    # the "models_disagree" flag instead of excluding the nail.
    nail_hgb_raw = nail_result.get("estimated_hb", eye_hgb) if nail_result else None
    nail_unreliable = bool(nail_result is not None and nail_result.get("estimated_hb") is None)

    nail_weight = 0.0
    eye_weight = 1.0
    models_disagree_flag = False

    if nail_result is not None and not nail_unreliable:
        nail_hgb = nail_result.get("estimated_hb", eye_hgb)
        fusion = combine_predictions(eye_hgb, nail_hgb)
        estimated_hb = fusion.estimated_hb
        eye_weight = fusion.eye_weight
        nail_weight = fusion.nail_weight
        models_disagree_flag = fusion.disagree
    else:
        estimated_hb = round(eye_hgb, 1)

    combined_confidence = round(eye_confidence, 3)
    if nail_result is not None and not nail_unreliable:
        nail_conf = nail_result.get("confidence", 0.5)
        combined_confidence = round(eye_weight * eye_confidence + nail_weight * nail_conf, 3)

    # Risk level from fused/eye Hb vs threshold
    if estimated_hb < 11.0:
        risk_level = "high"
    elif estimated_hb < threshold_used:
        risk_level = "moderate"
    else:
        risk_level = "low"

    range_buffer = round(0.5 + (1 - combined_confidence) * 1.0, 1)
    estimated_range = EstimatedRange(
        min=round(estimated_hb - range_buffer, 1),
        max=round(estimated_hb + range_buffer, 1),
    )

    eye_result = EyeResult(
        hgb_predicted=eye_hgb,
        status=eye_status,
        status_ridge=eye_result_raw.get("status_ridge"),
        status_cnn=eye_result_raw.get("status_cnn"),
        confidence=eye_confidence,
        threshold_used=threshold_used,
        margin_ke_threshold=margin,
        cnn_probability=eye_result_raw.get("cnn_probability"),
        cnn_raw_probability=eye_result_raw.get("cnn_raw_probability"),
        source=eye_result_raw.get("source"),
    )

    nail_out = None
    if nail_result is not None:
        nail_out = NailResult(
            estimated_hb=nail_result.get("estimated_hb"),
            status=nail_result.get("status"),
            confidence=nail_result.get("confidence"),
            threshold_used=nail_result.get("threshold_used"),
            mae=nail_result.get("mae"),
            source=nail_result.get("source"),
            model=nail_result.get("model"),
            hand_confidence=nail_result.get("hand_confidence"),
            weight=round(nail_weight, 3),
            nail_count=nail_result.get("nail_count"),
            nail_hbs=nail_result.get("nail_hbs"),
            flags_ok=nail_result.get("flags_ok"),
            issues=nail_result.get("issues"),
            nail_condition=nail_result.get("nail_condition"),
            nail_condition_detail=nail_result.get("nail_condition_detail"),
            nail_condition_confidence=nail_result.get("nail_condition_confidence"),
        )
        if nail_unreliable:
            nail_out.error = nail_result.get("issues") or (
                "Estimasi kuku tidak tersedia untuk foto ini."
            )
    elif nail_error is not None:
        nail_out = NailResult(error=nail_error)

    fusion_out = None
    if nail_result is not None and not nail_unreliable:
        fusion_out = FusionResult(
            estimated_hb=estimated_hb,
            eye_weight=round(eye_weight, 3),
            nail_weight=round(nail_weight, 3),
        )

    return PredictionResponse(
        success=True,
        estimated_hb=estimated_hb,
        estimated_range=estimated_range,
        risk_level=risk_level,
        confidence=combined_confidence,
        eye=eye_result,
        nail=nail_out,
        fusion=fusion_out,
        models_disagree=models_disagree_flag,
        explanation=Explanation(
            eye_heatmap=eye_result_raw.get("eye_heatmap"),
            nail_heatmap=nail_result.get("heatmap") if nail_result else None,
        ),
        disclaimer=eye_result_raw.get("disclaimer", "Hasil ini untuk skrining edukatif, bukan pengganti diagnosis medis"),
    )
