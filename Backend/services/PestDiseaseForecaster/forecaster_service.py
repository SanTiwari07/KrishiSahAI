"""
Core Pest & Disease Forecasting Engine.

Combines weather forecasts, epidemiological rules, pest calendar, and crop phase
data to generate risk predictions and IPM advisories.
"""

from __future__ import annotations

import os
import json
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

from services.PestDiseaseForecaster.disease_rules import get_diseases_for_crop, DISEASE_RULES
from services.PestDiseaseForecaster.pest_calendar import get_pest_calendar, get_current_month_threats
from services.PestDiseaseForecaster.crop_phases import get_crop_phase, CROP_PHASE_DURATIONS
from services.PestDiseaseForecaster.prompts import IPM_ADVISORY_SYSTEM_PROMPT, IPM_ADVISORY_COMPACT_PROMPT


class PestDiseaseForecaster:
    """Weather-based pest and disease risk forecaster."""

    def __init__(self):
        self.lock = threading.Lock()
        self._llm = None  # Lazy-loaded

    @property
    def llm(self):
        """Lazy-load the LLM to avoid import-time costs."""
        if self._llm is None:
            try:
                from langchain_ollama import ChatOllama
                self._llm = ChatOllama(
                    model=os.getenv("OLLAMA_MODEL", "llama3.2"),
                    temperature=0.4,
                    base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
                    num_predict=800,
                )
            except Exception as e:
                print(f"[FORECASTER] LLM init failed: {e}")
        return self._llm

    def predict_risk(
        self,
        crop_name: str,
        location: str,
        soil_type: str,
        sowing_date: Optional[str],
        weather_forecast: List[Dict[str, Any]],
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Generate pest/disease risk forecast.

        Args:
            crop_name: Name of the crop
            location: Farmer's location (district, state)
            soil_type: Soil type from farm profile
            sowing_date: Sowing date as YYYY-MM-DD or None for auto-detect
            weather_forecast: List of daily weather dicts from extended WeatherService
            language: Language code (en/hi/mr)

        Returns:
            Complete forecast response with daily risks, top alert, and IPM plan
        """
        print(f"[FORECASTER] Predicting risk for {crop_name} at {location}")

        # 1. Determine crop phase
        phase_info = get_crop_phase(crop_name, sowing_date)

        # 2. Get disease rules for this crop
        disease_rules = get_diseases_for_crop(crop_name)

        # 3. Get seasonal pest calendar
        current_month = datetime.now().month
        calendar_threats = get_current_month_threats(crop_name)

        # Also get next month's threats for forward-looking advice
        next_month = current_month + 1 if current_month < 12 else 1
        upcoming_threats = get_pest_calendar(crop_name, next_month)

        # 4. Score risks for each forecast day
        forecast_days = []
        top_risk = None
        top_risk_score = 0.0

        for day_data in weather_forecast:
            day_risks = []
            for disease_name, rule in disease_rules.items():
                risk = self._score_disease_risk(
                    disease_name, rule, day_data, phase_info
                )
                if risk["risk_score"] > 0.1:  # Only include non-trivial risks
                    day_risks.append(risk)

                # Track the top risk overall
                if risk["risk_score"] > top_risk_score:
                    top_risk_score = risk["risk_score"]
                    top_risk = risk

            # Sort by risk score descending
            day_risks.sort(key=lambda x: x["risk_score"], reverse=True)

            forecast_days.append({
                "date": day_data.get("date", ""),
                "weather": {
                    "temp_max": day_data.get("temp_max"),
                    "temp_min": day_data.get("temp_min"),
                    "temp_mean": day_data.get("temp_mean"),
                    "humidity": day_data.get("humidity"),
                    "rainfall_mm": day_data.get("rainfall_mm", 0),
                    "condition": day_data.get("condition", ""),
                },
                "risks": day_risks[:5],  # Top 5 risks per day
                "overall_risk_level": self._get_day_risk_level(day_risks),
            })

        # 5. Generate compact IPM advisory via LLM (if available)
        ipm_summary = self._generate_ipm_summary(
            crop_name, phase_info, location, soil_type,
            weather_forecast, top_risk, calendar_threats, language
        )

        result = {
            "crop": crop_name,
            "location": location,
            "soil_type": soil_type,
            "phase_info": phase_info,
            "forecast_days": forecast_days,
            "top_alert": top_risk,
            "calendar_threats": calendar_threats,
            "upcoming_threats": upcoming_threats,
            "ipm_summary": ipm_summary,
            "generated_at": datetime.now().isoformat(),
            "forecast_source": f"weather_api_{len(weather_forecast)}_day",
        }

        print(f"[FORECASTER] Prediction complete. Top risk: "
              f"{top_risk['disease'] if top_risk else 'None'} "
              f"({top_risk_score:.2f})")

        return result

    def _score_disease_risk(
        self,
        disease_name: str,
        rule: Dict[str, Any],
        weather: Dict[str, Any],
        phase_info: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Score disease risk for a single day based on weather and phase.

        Returns a risk dict with score (0-1), level, and reasoning.
        """
        scores = {}
        reasons = []
        weights = rule.get("severity_weights", {
            "temp": 0.25, "humidity": 0.35, "rainfall": 0.20, "phase": 0.20
        })

        # ----- Temperature Score -----
        temp_score = 0.0
        temp_type = rule.get("temp_type", "mean")
        temp_range = rule.get("temp_range")
        temp_min_threshold = rule.get("temp_min_threshold")
        temp_mean_min = rule.get("temp_mean_min")

        if temp_range:
            temp_val = self._get_temp_value(weather, temp_type)
            if temp_val is not None:
                low, high = temp_range
                if low <= temp_val <= high:
                    # How centered is it in the range? Perfect center = 1.0
                    mid = (low + high) / 2
                    half_range = (high - low) / 2
                    if half_range > 0:
                        temp_score = max(0, 1.0 - abs(temp_val - mid) / half_range)
                    else:
                        temp_score = 1.0
                    reasons.append(f"Temperature {temp_val:.1f}°C within risk range ({low}-{high}°C)")
                elif abs(temp_val - low) < 3 or abs(temp_val - high) < 3:
                    temp_score = 0.3  # Close to range
                    reasons.append(f"Temperature {temp_val:.1f}°C near risk range ({low}-{high}°C)")
        elif temp_min_threshold:
            temp_val = weather.get("temp_min")
            if temp_val is not None and temp_val >= temp_min_threshold:
                temp_score = min(1.0, (temp_val - temp_min_threshold + 2) / 5)
                reasons.append(f"Min temp {temp_val:.1f}°C >= {temp_min_threshold}°C threshold")
        elif temp_mean_min:
            temp_val = weather.get("temp_mean")
            if temp_val is not None and temp_val >= temp_mean_min:
                temp_score = min(1.0, (temp_val - temp_mean_min + 2) / 5)
                reasons.append(f"Mean temp {temp_val:.1f}°C >= {temp_mean_min}°C threshold")

        scores["temp"] = temp_score

        # ----- Humidity Score -----
        humidity_score = 0.0
        humidity = weather.get("humidity")

        if humidity is not None:
            humidity_min = rule.get("humidity_min")
            humidity_max = rule.get("humidity_max")
            humidity_range = rule.get("humidity_range")
            humidity_morning_min = rule.get("humidity_morning_min")

            if humidity_min and humidity >= humidity_min:
                excess = humidity - humidity_min
                humidity_score = min(1.0, 0.5 + (excess / 30))
                reasons.append(f"Humidity {humidity}% >= {humidity_min}% threshold")
            elif humidity_max and humidity <= humidity_max:
                # For pests that thrive in DRY conditions (e.g. whitefly, thrips)
                deficit = humidity_max - humidity
                humidity_score = min(1.0, 0.5 + (deficit / 30))
                reasons.append(f"Humidity {humidity}% <= {humidity_max}% (dry conditions favored)")
            elif humidity_range:
                h_low, h_high = humidity_range
                if h_low <= humidity <= h_high:
                    humidity_score = 0.8
                    reasons.append(f"Humidity {humidity}% within risk range ({h_low}-{h_high}%)")
            elif humidity_morning_min and humidity >= humidity_morning_min:
                humidity_score = min(1.0, 0.5 + (humidity - humidity_morning_min) / 30)
                reasons.append(f"Humidity {humidity}% >= {humidity_morning_min}% morning threshold")

        scores["humidity"] = humidity_score

        # ----- Rainfall Score -----
        rainfall_score = 0.0
        rainfall_mm = weather.get("rainfall_mm", 0)
        rainfall_trigger = rule.get("rainfall_trigger_mm")

        if rainfall_trigger and rainfall_mm >= rainfall_trigger:
            rainfall_score = min(1.0, rainfall_mm / (rainfall_trigger * 3))
            reasons.append(f"Rainfall {rainfall_mm}mm >= {rainfall_trigger}mm trigger")
        elif rainfall_mm > 0 and rule.get("rainfall_type") == "drizzle":
            rainfall_score = 0.5
            reasons.append(f"Light drizzle {rainfall_mm}mm (favorable for disease)")
        elif rainfall_mm > 5:
            rainfall_score = 0.3  # General moisture contribution
            reasons.append(f"Rainfall {rainfall_mm}mm adds to moisture")

        scores["rainfall"] = rainfall_score

        # ----- Phase Score -----
        phase_score = 0.0
        current_phase = phase_info.get("phase_name", "unknown")
        vulnerable_phases = rule.get("vulnerable_phases", [])

        if current_phase in vulnerable_phases:
            phase_score = 1.0
            reasons.append(f"Crop in vulnerable '{current_phase}' phase")
        elif current_phase == "unknown":
            phase_score = 0.5  # Unknown phase = moderate risk assumed

        scores["phase"] = phase_score

        # ----- Seasonal Factor (bonus) -----
        peak_months = rule.get("peak_months", [])
        month_bonus = 0.0
        current_month = datetime.now().month
        if current_month in peak_months:
            month_bonus = 0.15
            reasons.append(f"Current month is peak season for this threat")
        elif any(abs(current_month - pm) <= 1 or abs(current_month - pm) >= 11 for pm in peak_months):
            month_bonus = 0.08
            reasons.append(f"Near peak season for this threat")

        # ----- Weighted Risk Score -----
        risk_score = sum(
            scores.get(k, 0) * weights.get(k, 0.25) for k in weights
        ) + month_bonus

        risk_score = min(1.0, max(0.0, risk_score))

        # Determine risk level
        if risk_score >= 0.75:
            risk_level = "CRITICAL"
        elif risk_score >= 0.55:
            risk_level = "HIGH"
        elif risk_score >= 0.35:
            risk_level = "MEDIUM"
        elif risk_score >= 0.15:
            risk_level = "LOW"
        else:
            risk_level = "MINIMAL"

        return {
            "disease": disease_name.replace("_", " ").title(),
            "risk_score": round(risk_score, 3),
            "risk_level": risk_level,
            "weather_reasons": reasons,
            "description": rule.get("description", ""),
            "ipm_actions": rule.get("ipm_strategy", {}),
            "component_scores": {k: round(v, 2) for k, v in scores.items()},
        }

    def _get_temp_value(self, weather: Dict, temp_type: str) -> Optional[float]:
        """Extract the relevant temperature value based on rule type."""
        if temp_type == "night" or temp_type == "night_min":
            return weather.get("temp_min")
        elif temp_type == "max":
            return weather.get("temp_max")
        else:
            return weather.get("temp_mean")

    def _get_day_risk_level(self, day_risks: List[Dict]) -> str:
        """Determine the overall risk level for a day based on all disease risks."""
        if not day_risks:
            return "LOW"
        max_score = max(r["risk_score"] for r in day_risks)
        if max_score >= 0.75:
            return "CRITICAL"
        elif max_score >= 0.55:
            return "HIGH"
        elif max_score >= 0.35:
            return "MEDIUM"
        return "LOW"

    def _generate_ipm_summary(
        self,
        crop_name: str,
        phase_info: Dict,
        location: str,
        soil_type: str,
        weather_forecast: List[Dict],
        top_risk: Optional[Dict],
        calendar_threats: List[Dict],
        language: str,
    ) -> str:
        """Generate a compact IPM advisory using the LLM."""
        if not top_risk or self.llm is None:
            return self._fallback_ipm_summary(top_risk, calendar_threats, language)

        lang_map = {"en": "English", "hi": "Hindi", "mr": "Marathi"}
        lang_name = lang_map.get(language.lower(), "English")

        try:
            prompt = IPM_ADVISORY_COMPACT_PROMPT.format(
                crop_name=crop_name,
                growth_phase=phase_info.get("phase_label", "Unknown"),
                location=location,
                top_risk_disease=top_risk.get("disease", "Unknown"),
                top_risk_level=top_risk.get("risk_level", "MEDIUM"),
                weather_reason="; ".join(top_risk.get("weather_reasons", [])[:3]),
                language=lang_name,
            )

            with self.lock:
                response = self.llm.invoke(prompt)
                return response.content.strip()
        except Exception as e:
            print(f"[FORECASTER] LLM summary failed: {e}")
            return self._fallback_ipm_summary(top_risk, calendar_threats, language)

    def _fallback_ipm_summary(
        self, top_risk: Optional[Dict], calendar_threats: List[Dict], language: str
    ) -> str:
        """Generate a simple fallback summary without LLM."""
        if not top_risk:
            return "No significant pest or disease risks detected for the forecast period."

        disease = top_risk.get("disease", "Unknown")
        level = top_risk.get("risk_level", "MEDIUM")
        ipm = top_risk.get("ipm_actions", {})

        parts = [f"Alert: {level} risk of {disease} detected."]
        reasons = top_risk.get("weather_reasons", [])
        if reasons:
            parts.append(f"Weather factors: {'; '.join(reasons[:2])}.")

        # Add first biocontrol recommendation
        bio = ipm.get("biocontrol", [])
        if bio:
            parts.append(f"Recommended action: {bio[0]}.")

        cultural = ipm.get("cultural", [])
        if cultural:
            parts.append(f"Also: {cultural[0]}.")

        return " ".join(parts)

    def stream_ipm_advisory(
        self,
        crop_name: str,
        location: str,
        soil_type: str,
        sowing_date: Optional[str],
        weather_forecast: List[Dict],
        language: str = "en",
    ):
        """Stream a detailed IPM advisory via SSE."""
        phase_info = get_crop_phase(crop_name, sowing_date)
        disease_rules = get_diseases_for_crop(crop_name)
        calendar_threats = get_current_month_threats(crop_name)

        # Build risk summary
        risk_lines = []
        for day_data in weather_forecast[:3]:
            for disease_name, rule in disease_rules.items():
                risk = self._score_disease_risk(disease_name, rule, day_data, phase_info)
                if risk["risk_score"] > 0.3:
                    risk_lines.append(
                        f"- {risk['disease']}: {risk['risk_level']} "
                        f"(score: {risk['risk_score']:.2f}) — "
                        f"{'; '.join(risk['weather_reasons'][:2])}"
                    )

        weather_lines = []
        for d in weather_forecast:
            weather_lines.append(
                f"Date: {d.get('date')}, "
                f"Temp: {d.get('temp_min')}-{d.get('temp_max')}°C, "
                f"Humidity: {d.get('humidity')}%, "
                f"Rain: {d.get('rainfall_mm', 0)}mm, "
                f"Condition: {d.get('condition', 'N/A')}"
            )

        threat_lines = [f"- {t['name']} ({t['type']}): {t.get('note', '')}"
                        for t in calendar_threats]

        lang_map = {"en": "English", "hi": "Hindi", "mr": "Marathi"}
        lang_name = lang_map.get(language.lower(), "English")

        prompt = IPM_ADVISORY_SYSTEM_PROMPT.format(
            crop_name=crop_name,
            growth_phase=phase_info.get("phase_label", "Unknown"),
            location=location,
            soil_type=soil_type,
            forecast_days=len(weather_forecast),
            weather_summary="\n".join(weather_lines),
            risk_summary="\n".join(risk_lines) or "No significant risks detected.",
            calendar_threats="\n".join(threat_lines) or "No major seasonal threats for this month.",
            language=lang_name,
        )

        if self.llm is None:
            yield "IPM advisory service is currently unavailable. Please check Ollama connection."
            return

        try:
            for chunk in self.llm.stream(prompt):
                yield chunk.content
        except Exception as e:
            print(f"[FORECASTER] Stream error: {e}")
            yield f"Error generating advisory: {str(e)}"

    def get_phase_info(self, crop_name: str, sowing_date: Optional[str]) -> Dict[str, Any]:
        """Public wrapper for crop phase detection."""
        return get_crop_phase(crop_name, sowing_date)

    def get_crop_list(self) -> List[str]:
        """Return all crops that have forecasting rules."""
        return list(DISEASE_RULES.keys())
