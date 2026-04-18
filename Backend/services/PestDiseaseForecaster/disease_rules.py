"""
Epidemiological rules for weather-based pest and disease forecasting.
Each rule maps specific weather conditions to disease/pest outbreak risk.

Sources:
- ICAR / NCIPM weather-based forewarning models
- IMD agro-meteorological advisories
- State Agricultural University research (Pune, Akola, Rahuri)
- User-provided crop_disease_epi_rules.pdf

Each disease entry contains:
- Weather thresholds (temperature, humidity, rainfall)
- Vulnerable crop growth phases
- Peak activity months
- Severity scoring weights
- IPM strategies (biocontrol → cultural → botanical → chemical last resort)
"""

from typing import Dict, Any, List

DISEASE_RULES: Dict[str, Dict[str, Dict[str, Any]]] = {
    # ─────────────────────────── RICE ───────────────────────────
    "rice": {
        "blast": {
            "temp_range": (20, 26),
            "temp_type": "night",
            "humidity_min": 90,
            "humidity_persistence_days": 3,
            "rainfall_trigger_mm": 5,
            "other_conditions": ["cloudy_weather", "leaf_wetness"],
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.40, "rainfall": 0.20, "phase": 0.15},
            "description": "Fungal disease causing diamond-shaped lesions on leaves; thrives in cool, humid, cloudy weather with prolonged leaf wetness.",
            "ipm_strategy": {
                "biocontrol": [
                    "Apply Pseudomonas fluorescens @ 10g/L as foliar spray",
                    "Seed treatment with Trichoderma viride @ 4g/kg seed",
                ],
                "cultural": [
                    "Avoid excess nitrogen fertilizer",
                    "Drain standing water from fields",
                    "Use resistant varieties (e.g., Co 47, IR 64)",
                    "Maintain proper spacing for air circulation",
                ],
                "botanical": [
                    "Neem oil spray 5ml/L at early symptom stage",
                ],
                "chemical_last_resort": [
                    "Tricyclazole 0.06% spray",
                    "Carbendazim 500g/ha at boot leaf stage",
                ],
            },
        },
        "bacterial_leaf_blight": {
            "temp_range": (30, 33),
            "temp_type": "max",
            "humidity_range": (86, 93),
            "other_conditions": ["cloudy_weather", "strong_winds"],
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.20, "phase": 0.15},
            "description": "Bacterial disease causing yellowing and drying of leaves from tips; spreads rapidly during warm, humid, windy weather.",
            "ipm_strategy": {
                "biocontrol": [
                    "Seed treatment with Pseudomonas fluorescens @ 10g/kg",
                ],
                "cultural": [
                    "Use resistant varieties",
                    "Avoid clipping seedling tips during transplanting",
                    "Balance nitrogen fertilizer application",
                ],
                "botanical": [
                    "Neem oil spray as preventive measure",
                ],
                "chemical_last_resort": [
                    "Copper Hydroxide spray",
                    "Streptocycline 500ppm as seed treatment",
                ],
            },
        },
        "sheath_blight": {
            "temp_range": (28, 32),
            "temp_type": "mean",
            "humidity_min": 85,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9, 10],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.15, "phase": 0.20},
            "description": "Fungal disease causing irregular lesions on leaf sheaths; favored by warm, humid weather and dense canopy.",
            "ipm_strategy": {
                "biocontrol": [
                    "Apply Trichoderma viride @ 2.5 kg/ha mixed with FYM",
                ],
                "cultural": [
                    "Manage nitrogen to avoid dense canopy",
                    "Ensure proper spacing",
                    "Remove weed hosts from field bunds",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Hexaconazole 1 L/ha",
                    "Validamycin 1 L/ha",
                ],
            },
        },
        "brown_planthopper": {
            "temp_range": (25, 30),
            "temp_type": "mean",
            "humidity_min": 80,
            "rainfall_trigger_mm": 10,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.25, "phase": 0.15},
            "description": "Sap-sucking pest causing 'hopper burn'; populations explode during warm, humid weather with heavy rainfall.",
            "ipm_strategy": {
                "biocontrol": [
                    "Conserve natural enemies: spiders, mirid bugs, dragonflies",
                    "Release Lycosa spider population in fields",
                ],
                "cultural": [
                    "Avoid excess nitrogen",
                    "Alternate wetting and drying irrigation",
                    "Use resistant varieties (e.g., Ratna)",
                ],
                "botanical": [
                    "Neem seed kernel extract 5% spray",
                ],
                "chemical_last_resort": [
                    "Buprofezin 25 SC @ 1.6 ml/L",
                    "Thiamethoxam 25 WG @ 0.2 g/L",
                ],
            },
        },
    },

    # ─────────────────────────── COTTON ───────────────────────────
    "cotton": {
        "jassid": {
            "temp_min_threshold": 22.4,
            "humidity_max": 72,
            "sunshine_max_hrs": 4.4,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [7, 8, 9, 10],
            "severity_weights": {"temp": 0.30, "humidity": 0.30, "rainfall": 0.20, "phase": 0.20},
            "description": "Leaf-sucking pest causing leaf curling and yellowing; favors warm weather with moderate humidity and low sunshine hours.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Chrysoperla @ 1 lakh/ha",
                ],
                "cultural": [
                    "Grow hairy leaf varieties",
                    "Intercrop with cowpea or maize as trap crop",
                ],
                "botanical": [
                    "Neem oil 1500 ppm @ 5ml/L spray",
                ],
                "chemical_last_resort": [
                    "Dimethoate 30 EC @ 1.7 ml/L",
                    "Imidacloprid 17.8 SL @ 0.3 ml/L",
                ],
            },
        },
        "thrips": {
            "temp_mean_min": 26.8,
            "humidity_max": 67,
            "sunshine_min_hrs": 6.4,
            "vulnerable_phases": ["sowing", "vegetative"],
            "peak_months": [7, 8, 9, 10],
            "severity_weights": {"temp": 0.35, "humidity": 0.30, "rainfall": 0.15, "phase": 0.20},
            "description": "Tiny rasping-sucking pest causing silvery appearance on leaves; thrives in hot, dry conditions with high sunshine.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Predatory mites",
                    "Apply Beauveria bassiana @ 5g/L",
                ],
                "cultural": [
                    "Install blue sticky traps",
                    "Avoid water stress",
                ],
                "botanical": [
                    "Neem oil spray @ 5ml/L",
                ],
                "chemical_last_resort": [
                    "Fipronil 5 SC @ 2ml/L",
                    "Spinosad 45 SC @ 0.3 ml/L",
                ],
            },
        },
        "pink_bollworm": {
            "temp_min_threshold": 20,
            "humidity_morning_min": 60,
            "rainfall_trigger_mm": 0.5,
            "other_conditions": ["cloudy_weather"],
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [10, 11, 12],
            "severity_weights": {"temp": 0.25, "humidity": 0.25, "rainfall": 0.25, "phase": 0.25},
            "description": "Bollworm attacking cotton bolls causing rosette flowers and damaged fiber; favored by warm nights, cloudy weather, and light rainfall.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Trichogramma chilonis @ 1.5 lakh/ha",
                    "Install pheromone traps @ 5/ha for monitoring",
                ],
                "cultural": [
                    "Timely picking of damaged bolls",
                    "Destroy cotton stalks after harvest",
                    "Avoid late sowing",
                ],
                "botanical": [
                    "Neem seed kernel extract 5% at square/flower stage",
                ],
                "chemical_last_resort": [
                    "Profenofos 50 EC @ 2 ml/L",
                ],
            },
        },
        "whitefly": {
            "temp_range": (28, 35),
            "temp_type": "max",
            "humidity_max": 60,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9, 10],
            "severity_weights": {"temp": 0.30, "humidity": 0.30, "rainfall": 0.15, "phase": 0.25},
            "description": "Sap-sucking pest causing leaf curl virus transmission; thrives in hot, dry conditions.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Encarsia formosa parasitoid",
                    "Apply Verticillium lecanii @ 5g/L",
                ],
                "cultural": [
                    "Install yellow sticky traps",
                    "Remove weed hosts",
                    "Avoid overlapping cotton cultivation",
                ],
                "botanical": [
                    "Neem oil 1500 ppm spray",
                ],
                "chemical_last_resort": [
                    "Spiromesifen 22.9 SC @ 0.7 ml/L",
                ],
            },
        },
        "bacterial_blight": {
            "temp_range": (28, 34),
            "temp_type": "max",
            "humidity_min": 80,
            "rainfall_trigger_mm": 15,
            "other_conditions": ["strong_winds", "storm_events"],
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [7, 8, 9],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.25, "phase": 0.15},
            "description": "Bacterial disease (Xanthomonas citri pv. malvacearum) causing angular water-soaked lesions on leaves; storm events causing leaf wounding dramatically raise infection probability.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Use disease-free certified seed",
                    "Resistant cultivars (immune lines B-2, Stoneville 213)",
                    "Remove and burn infected plant debris",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Copper oxychloride sprays at first symptoms",
                    "Streptocycline 500ppm spray",
                ],
            },
        },
        "fusarium_wilt": {
            "temp_range": (20, 32),
            "temp_type": "mean",
            "humidity_min": 60,
            "other_conditions": ["waterlogging", "soil_compaction"],
            "vulnerable_phases": ["sowing", "vegetative"],
            "peak_months": [7, 8, 9],
            "severity_weights": {"temp": 0.25, "humidity": 0.25, "rainfall": 0.20, "phase": 0.30},
            "description": "Soil-borne Fusarium oxysporum f. sp. vasinfectum causing wilting; chlamydospores persist >10 years in soil; sandy soils with low pH (<6) increase severity.",
            "ipm_strategy": {
                "biocontrol": [
                    "Seed treatment with Trichoderma viride @ 4g/kg seed",
                    "Soil application of Trichoderma-enriched FYM",
                ],
                "cultural": [
                    "Wilt-resistant varieties",
                    "Soil solarisation",
                    "Balanced potassium nutrition",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Carbendazim seed treatment",
                ],
            },
        },
        "leaf_curl_virus": {
            "temp_range": (28, 35),
            "temp_type": "max",
            "humidity_range": (40, 70),
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9, 10],
            "severity_weights": {"temp": 0.30, "humidity": 0.25, "rainfall": 0.15, "phase": 0.30},
            "description": "Cotton Leaf Curl Virus (CLCuV, Begomovirus) transmitted by whitefly Bemisia tabaci; vector population explodes when temp >30°C and rainfall <25 mm/month.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Encarsia formosa parasitoid for whitefly",
                ],
                "cultural": [
                    "Resistant hybrids (NHH-44, MRC-7351)",
                    "Remove infected plants immediately",
                    "Yellow sticky traps for whitefly monitoring",
                ],
                "botanical": [
                    "Neem oil sprays for whitefly control",
                ],
                "chemical_last_resort": [
                    "Imidacloprid seed treatment",
                ],
            },
        },
    },

    # ─────────────────────────── TOMATO ───────────────────────────
    "tomato": {
        "early_blight": {
            "temp_range": (25, 32),
            "temp_type": "max",
            "humidity_min": 70,
            "temp_deviation_above_normal": 3,
            "vulnerable_phases": ["vegetative", "flowering", "harvest"],
            "peak_months": [9, 10, 11],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.15, "phase": 0.20},
            "description": "Fungal disease causing concentric ring lesions on lower leaves; worsens when max temp exceeds normal by 3°C with high humidity.",
            "ipm_strategy": {
                "biocontrol": [
                    "Apply Trichoderma harzianum as soil drench @ 5g/L",
                ],
                "cultural": [
                    "Remove lower infected leaves",
                    "Mulch around base to prevent soil splash",
                    "Practice crop rotation",
                    "Stake plants for better air circulation",
                ],
                "botanical": [
                    "Neem oil spray at early symptom",
                ],
                "chemical_last_resort": [
                    "Mancozeb 0.25% spray",
                    "Chlorothalonil 0.2%",
                ],
            },
        },
        "late_blight": {
            "temp_range": (15, 22),
            "temp_type": "mean",
            "humidity_min": 80,
            "humidity_persistence_days": 3,
            "rainfall_trigger_mm": 10,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [11, 12, 1],
            "severity_weights": {"temp": 0.25, "humidity": 0.40, "rainfall": 0.20, "phase": 0.15},
            "description": "Devastating fungal disease causing water-soaked lesions and rapid plant death; thrives in cool, wet weather with persistent fog.",
            "ipm_strategy": {
                "biocontrol": [
                    "Apply Trichoderma viride as preventive soil treatment",
                ],
                "cultural": [
                    "Ensure good air circulation through staking and pruning",
                    "Water soil, not leaves",
                    "Remove infected plants immediately",
                    "Use resistant varieties",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Metalaxyl + Mancozeb for established infection",
                    "Preventative sprays of Chlorothalonil",
                ],
            },
        },
        "leaf_curl_virus": {
            "temp_range": (25, 35),
            "temp_type": "mean",
            "humidity_max": 70,
            "vulnerable_phases": ["sowing", "vegetative"],
            "peak_months": [3, 4, 9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.25, "rainfall": 0.20, "phase": 0.30},
            "description": "Viral disease transmitted by whitefly causing leaf curling and stunted growth; favors warm, dry conditions that promote whitefly.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Encarsia formosa for whitefly control",
                ],
                "cultural": [
                    "Install yellow sticky traps",
                    "Use reflective mulch",
                    "Use resistant hybrids",
                    "Remove infected plants immediately",
                ],
                "botanical": [
                    "Neem oil spray for whitefly control",
                ],
                "chemical_last_resort": [
                    "Imidacloprid for whitefly vector control",
                ],
            },
        },
        "bacterial_spot": {
            "temp_range": (24, 30),
            "temp_type": "mean",
            "humidity_min": 85,
            "rainfall_trigger_mm": 5,
            "vulnerable_phases": ["vegetative", "flowering", "harvest"],
            "peak_months": [7, 8, 9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.25, "phase": 0.15},
            "description": "Bacterial complex (Xanthomonas spp.) causing water-soaked spots on leaves and fruits; overhead irrigation at 28°C + high humidity creates near-ideal infection within 4h.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Drip irrigation instead of overhead",
                    "Crop rotation with non-solanaceous crops",
                    "Resistant varieties (FL 7060, Sunpride)",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Copper bactericides + mancozeb",
                    "Streptocycline 500ppm spray",
                ],
            },
        },
        "leaf_mold": {
            "temp_range": (22, 25),
            "temp_type": "mean",
            "humidity_min": 85,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [11, 12, 1, 2],
            "severity_weights": {"temp": 0.30, "humidity": 0.40, "rainfall": 0.05, "phase": 0.25},
            "description": "Passalora fulva causing yellow patches on upper leaves and olive-green mold on undersides; restricted to protected cultivation; night humidity >85% with poor ventilation = explosive spread.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Improve ventilation in greenhouses",
                    "Reduce humidity through proper spacing",
                    "Resistant varieties (Cf gene carrying hybrids)",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Chlorothalonil sprays",
                    "Mancozeb 0.25%",
                ],
            },
        },
        "mosaic_virus": {
            "temp_range": (20, 30),
            "temp_type": "mean",
            "vulnerable_phases": ["sowing", "vegetative", "flowering"],
            "peak_months": [3, 4, 5, 9, 10],
            "severity_weights": {"temp": 0.20, "humidity": 0.10, "rainfall": 0.10, "phase": 0.60},
            "description": "Tomato Mosaic Virus (ToMV/TMV, Tobamovirus); extremely stable, survives in dried plant material >50 years; spread mechanically through pruning, handling, contaminated tools.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Resistant varieties (Tm-2a gene)",
                    "Worker hygiene (soap wash, gloves)",
                    "Milk solution as tool disinfectant",
                    "No tobacco use near crop",
                ],
                "botanical": [],
                "chemical_last_resort": [],
            },
        },
        "septoria_leaf_spot": {
            "temp_range": (20, 25),
            "temp_type": "mean",
            "humidity_min": 85,
            "rainfall_trigger_mm": 10,
            "vulnerable_phases": ["vegetative", "flowering", "harvest"],
            "peak_months": [8, 9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.25, "phase": 0.15},
            "description": "Septoria lycopersici causing small circular spots with dark borders on lower leaves; spreads upward; defoliation reduces photosynthesis and exposes fruit to sunscald.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Remove infected lower leaves",
                    "Avoid overhead irrigation",
                    "Mulching to prevent soil splash",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Chlorothalonil preventive sprays",
                    "Copper fungicides",
                ],
            },
        },
        "spider_mites": {
            "temp_range": (26, 35),
            "temp_type": "max",
            "humidity_max": 50,
            "vulnerable_phases": ["vegetative", "flowering", "harvest"],
            "peak_months": [3, 4, 5, 10, 11],
            "severity_weights": {"temp": 0.30, "humidity": 0.30, "rainfall": 0.15, "phase": 0.25},
            "description": "Tetranychus urticae (Two-Spotted Spider Mite); population doubles every 5 days at 30°C + low humidity; dry, dusty conditions favor outbreaks.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release predatory mites Phytoseiulus persimilis",
                ],
                "cultural": [
                    "Overhead irrigation to raise humidity and dislodge mites",
                    "Remove weeds that harbor mites",
                ],
                "botanical": [
                    "Neem oil 1500ppm spray",
                ],
                "chemical_last_resort": [
                    "Abamectin spray",
                    "Spiromesifen 22.9 SC",
                ],
            },
        },
        "target_spot": {
            "temp_range": (24, 30),
            "temp_type": "mean",
            "humidity_min": 80,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.20, "phase": 0.20},
            "description": "Corynespora cassiicola causing lesions with concentric rings (target pattern); often confused with early blight; thrives in warm-wet conditions with long dew periods.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Canopy management for air circulation",
                    "Crop rotation",
                    "Remove infected plant material",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Azoxystrobin sprays",
                    "Fluxapyroxad",
                ],
            },
        },
    },

    # ─────────────────────────── POTATO ───────────────────────────
    "potato": {
        "late_blight": {
            "temp_range": (10, 25),
            "temp_type": "mean",
            "humidity_min": 85,
            "humidity_persistence_days": 3,
            "cumulative_check": True,
            "cumulative_window_days": 7,
            "temp_cumulative_hours": 115,
            "humidity_cumulative_hours": 90,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [12, 1, 2],
            "severity_weights": {"temp": 0.20, "humidity": 0.40, "rainfall": 0.25, "phase": 0.15},
            "description": "Highly destructive fungal disease (JHULSACAST model); triggers when 7-day cumulative humidity exceeds 85% for 90+ hours and temperature stays 7-27°C for 115+ hours.",
            "ipm_strategy": {
                "biocontrol": [
                    "Apply Trichoderma viride enriched FYM @ 2.5 kg/ha",
                ],
                "cultural": [
                    "Use certified disease-free seed tubers",
                    "Remove volunteer plants and debris",
                    "Avoid overhead irrigation",
                    "Proper hilling to prevent tuber exposure",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Prophylactic Mancozeb 0.2% spray",
                    "Metalaxyl + Mancozeb for curative action",
                ],
            },
        },
        "early_blight": {
            "temp_range": (20, 30),
            "temp_type": "mean",
            "humidity_min": 70,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [11, 12, 1],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.15, "phase": 0.20},
            "description": "Fungal disease causing concentric ring spots on leaves; favored by moderate temperatures and alternating wet/dry conditions.",
            "ipm_strategy": {
                "biocontrol": [
                    "Trichoderma harzianum application",
                ],
                "cultural": [
                    "Practice crop rotation",
                    "Remove infected foliage after harvest",
                    "Balanced nutrition",
                ],
                "botanical": [
                    "Neem oil preventive spray",
                ],
                "chemical_last_resort": [
                    "Mancozeb 0.2%",
                    "Chlorothalonil 0.2%",
                ],
            },
        },
    },

    # ─────────────────────────── WHEAT ───────────────────────────
    "wheat": {
        "black_rust": {
            "temp_range": (16, 27),
            "temp_type": "mean",
            "humidity_min": 70,
            "other_conditions": ["morning_dew"],
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [2, 3],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.15, "phase": 0.20},
            "description": "Stem rust causing reddish-brown pustules on stems; favored by warm temperatures with morning dew and moderate humidity.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Use resistant varieties",
                    "Early sowing to escape disease window",
                    "Remove volunteer wheat plants",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Mancozeb 1.5 kg/ha",
                    "Propiconazole 500 ml/ha",
                ],
            },
        },
        "yellow_rust": {
            "temp_range": (10, 15),
            "temp_type": "mean",
            "humidity_min": 80,
            "rainfall_type": "intermittent",
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [1, 2],
            "severity_weights": {"temp": 0.35, "humidity": 0.30, "rainfall": 0.20, "phase": 0.15},
            "description": "Stripe rust causing yellow pustule stripes on leaves; thrives in cool conditions with high humidity and intermittent rain.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Use resistant varieties",
                    "Proper spacing",
                    "Balanced nitrogen application",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Propiconazole 25 EC @ 500 ml/ha",
                    "Tebuconazole 250 EC @ 500 ml/ha",
                ],
            },
        },
        "powdery_mildew": {
            "temp_range": (15, 25),
            "temp_type": "mean",
            "humidity_min": 75,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [1, 2, 3],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.15, "phase": 0.20},
            "description": "White powdery growth on leaves reducing photosynthesis; thrives in moderate temperatures with high humidity.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Use resistant varieties",
                    "Avoid excess nitrogen",
                ],
                "botanical": [
                    "Milk-water spray (1:9 ratio) as preventive",
                ],
                "chemical_last_resort": [
                    "Wettable Sulphur 0.2%",
                    "Carbendazim 0.1%",
                ],
            },
        },
        "crown_root_rot": {
            "temp_range": (18, 28),
            "temp_type": "mean",
            "humidity_min": 70,
            "rainfall_trigger_mm": 15,
            "vulnerable_phases": ["sowing", "vegetative"],
            "peak_months": [11, 12],
            "severity_weights": {"temp": 0.25, "humidity": 0.30, "rainfall": 0.30, "phase": 0.15},
            "description": "Fusarium graminearum root/crown rot; warm, waterlogged soils after heavy rains during early tillering. Causes whiteheads at maturity.",
            "ipm_strategy": {
                "biocontrol": ["Trichoderma seed treatment"],
                "cultural": ["Crop rotation with non-cereals", "Avoid waterlogging", "Balanced nutrition"],
                "botanical": [],
                "chemical_last_resort": ["Carbendazim seed treatment"],
            },
        },
        "leaf_rust": {
            "temp_range": (15, 25),
            "temp_type": "mean",
            "humidity_min": 80,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [2, 3],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.15, "phase": 0.20},
            "description": "Puccinia triticina (Brown Rust); orange-brown pustules on upper leaf surfaces. Dew periods >4h at 15-22°C trigger infection.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Resistant varieties (Lr genes)", "Early sowing"],
                "botanical": [],
                "chemical_last_resort": ["Propiconazole 0.1%"],
            },
        },
        "loose_smut": {
            "temp_range": (18, 25),
            "temp_type": "mean",
            "humidity_min": 70,
            "vulnerable_phases": ["flowering"],
            "peak_months": [2, 3],
            "severity_weights": {"temp": 0.25, "humidity": 0.30, "rainfall": 0.10, "phase": 0.35},
            "description": "Ustilago tritici; seed-borne infection replacing entire ear with mass of black spores. Infection at flowering with symptoms next season.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Certified disease-free seed", "Resistant varieties"],
                "botanical": [],
                "chemical_last_resort": ["Carboxin + Thiram seed treatment", "Vitavax 200 @ 2.5g/kg seed"],
            },
        },
    },

    # ─────────────────────────── GROUNDNUT ───────────────────────────
    "groundnut": {
        "tikka_leaf_spot": {
            "temp_min_threshold": 21,
            "temp_type": "night_min",
            "leaf_wetness_hours_min": 10,
            "consecutive_nights": 2,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.20, "phase": 0.20},
            "description": "Cercospora leaf spot causing circular brown spots; requires leaf wetness ≥10 hours and min temp ≥21°C for 2 consecutive nights.",
            "ipm_strategy": {
                "biocontrol": [
                    "Apply Trichoderma viride",
                ],
                "cultural": [
                    "Remove volunteer plants before sowing",
                    "Practice crop rotation",
                    "Remove infected lower leaves",
                ],
                "botanical": [
                    "Neem oil spray",
                ],
                "chemical_last_resort": [
                    "Mancozeb 1 kg/ha",
                    "Carbendazim 250 g/ha",
                ],
            },
        },
        "stem_rot": {
            "temp_range": (28, 35),
            "temp_type": "mean",
            "humidity_min": 80,
            "rainfall_trigger_mm": 20,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [7, 8, 9],
            "severity_weights": {"temp": 0.25, "humidity": 0.30, "rainfall": 0.30, "phase": 0.15},
            "description": "Soil-borne fungal disease; triggered by high soil moisture and warm temperatures after heavy rainfall.",
            "ipm_strategy": {
                "biocontrol": [
                    "Soil application of Trichoderma viride @ 2.5 kg/ha",
                ],
                "cultural": [
                    "Deep ploughing to bury sclerotia",
                    "Improve soil drainage",
                    "Avoid soil compaction",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Tebuconazole soil drench",
                ],
            },
        },
        "alternaria_leaf_spot": {
            "temp_range": (25, 35),
            "temp_type": "mean",
            "humidity_min": 80,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.20, "phase": 0.20},
            "description": "Alternaria alternata causing irregular brown spots; risk escalates sharply after physiological leaf senescence when plant immunity declines.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Avoid late-season moisture stress", "Destroy crop debris"],
                "botanical": ["Neem oil spray"],
                "chemical_last_resort": ["Mancozeb 75 WP (2 kg/ha)"],
            },
        },
        "early_leaf_spot": {
            "temp_range": (23, 30),
            "temp_type": "mean",
            "humidity_min": 85,
            "humidity_persistence_days": 3,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9],
            "severity_weights": {"temp": 0.25, "humidity": 0.40, "rainfall": 0.20, "phase": 0.15},
            "description": "Cercospora arachidicola; infection requires 3+ consecutive days with >90% RH at 27°C. Mid-season (45-60 DAP) is peak risk.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Crop rotation with non-hosts", "Resistant varieties (ICGV 86031)"],
                "botanical": [],
                "chemical_last_resort": ["Tebuconazole 25.9 EC"],
            },
        },
        "rosette_virus": {
            "temp_range": (25, 35),
            "temp_type": "mean",
            "humidity_max": 60,
            "vulnerable_phases": ["sowing", "vegetative"],
            "peak_months": [7, 8],
            "severity_weights": {"temp": 0.25, "humidity": 0.25, "rainfall": 0.15, "phase": 0.35},
            "description": "Groundnut Rosette Virus complex transmitted by Aphis craccivora; single aphid can transmit. Early season infection causes >100% yield loss. Dry, hot conditions favour aphid vector.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Early planting (within 2 weeks of rains)",
                    "Reflective mulch to deter aphids",
                    "Resistant varieties (ICGV-IS 96894)",
                ],
                "botanical": [],
                "chemical_last_resort": ["Imidacloprid seed treatment"],
            },
        },
        "rust": {
            "temp_range": (20, 28),
            "temp_type": "mean",
            "humidity_min": 80,
            "rainfall_trigger_mm": 8,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.25, "phase": 0.15},
            "description": "Puccinia arachidis causing pustules on leaf undersides; epidemics develop when 3-day rainfall exceeds 25mm at 22-27°C.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Plant date manipulation", "Resistant cultivars (ICG 4750)"],
                "botanical": [],
                "chemical_last_resort": ["Mancozeb sprays", "Propiconazole"],
            },
        },
    },

    # ─────────────────────────── MAIZE ───────────────────────────
    "maize": {
        "fall_armyworm": {
            "temp_range": (19, 30),
            "temp_type": "mean",
            "humidity_min": 80,
            "vulnerable_phases": ["sowing", "vegetative"],
            "peak_months": [7, 8, 9],
            "severity_weights": {"temp": 0.25, "humidity": 0.30, "rainfall": 0.20, "phase": 0.25},
            "description": "Invasive pest causing severe defoliation; populations surge in warm, humid conditions during early crop stages.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Trichogramma pretiosum @ 50,000/ha",
                    "Apply Metarhizium anisopliae @ 5g/L",
                    "Apply Bacillus thuringiensis (Bt) @ 2g/L",
                ],
                "cultural": [
                    "Install pheromone traps @ 5/ha for early detection",
                    "Intercrop with legumes",
                    "Apply sand + lime in whorls to kill larvae",
                ],
                "botanical": [
                    "Neem seed kernel extract 5% spray",
                    "Neem oil 1500 ppm @ 5ml/L",
                ],
                "chemical_last_resort": [
                    "Spinetoram 11.7 SC @ 0.5 ml/L",
                    "Chlorantraniliprole 18.5 SC @ 0.4 ml/L",
                ],
            },
        },
        "turcicum_leaf_blight": {
            "temp_range": (18, 27),
            "temp_type": "mean",
            "humidity_min": 80,
            "rainfall_trigger_mm": 5,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.20, "phase": 0.15},
            "description": "Fungal disease causing long elliptical grey-green lesions on leaves; thrives in moderate temperatures with high humidity.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Use resistant hybrids",
                    "Crop rotation with non-host crops",
                    "Tillage to bury crop residue",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Mancozeb 0.25%",
                    "Propiconazole 0.1%",
                ],
            },
        },
        "cercospora_gray_leaf_spot": {
            "temp_range": (22, 30),
            "temp_type": "mean",
            "humidity_min": 90,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9],
            "severity_weights": {"temp": 0.25, "humidity": 0.40, "rainfall": 0.20, "phase": 0.15},
            "description": "Cercospora zeae-maydis causing rectangular grey-tan lesions; infection requires ≥11-13h of continuous leaf wetness at 25°C. No-till increases risk.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Resistant hybrids", "Crop rotation", "Tillage to bury crop residue"],
                "botanical": [],
                "chemical_last_resort": ["Strobilurin + triazole fungicide at tasseling"],
            },
        },
        "common_rust": {
            "temp_range": (15, 25),
            "temp_type": "mean",
            "humidity_min": 95,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.15, "phase": 0.20},
            "description": "Puccinia sorghi; epidemic risk highest when dew period >8h at 15-22°C during vegetative-to-tassel stage. Wind-borne urediniospores from southern/tropical regions.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Resistant hybrids (Rp gene)", "Early planting"],
                "botanical": [],
                "chemical_last_resort": ["Propiconazole if infection before silking"],
            },
        },
        "northern_leaf_blight": {
            "temp_range": (18, 27),
            "temp_type": "mean",
            "humidity_min": 90,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [8, 9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.25, "phase": 0.15},
            "description": "Exserohilum turcicum causing long elliptical grey-green lesions; critical window: >12h wetness at 18-22°C from tasseling to grain fill.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Resistant hybrids (Ht1, Ht2 genes)", "Crop rotation", "Bury crop residues"],
                "botanical": [],
                "chemical_last_resort": ["Foliar fungicides at tasseling"],
            },
        },
    },

    # ─────────────────────────── CHICKPEA ───────────────────────────
    "chickpea": {
        "fusarium_wilt": {
            "temp_range": (20, 30),
            "temp_type": "mean",
            "humidity_min": 60,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [12, 1, 2],
            "severity_weights": {"temp": 0.30, "humidity": 0.25, "rainfall": 0.15, "phase": 0.30},
            "description": "Soil-borne fungal disease causing yellowing and wilting; worse in warm soils with moderate moisture during flowering.",
            "ipm_strategy": {
                "biocontrol": [
                    "Seed treatment with Trichoderma viride @ 4g/kg seed",
                    "Soil application of Trichoderma-enriched FYM",
                ],
                "cultural": [
                    "Use resistant varieties",
                    "Deep summer ploughing",
                    "3-4 year crop rotation",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Seed treatment with Thiram + Carbendazim",
                ],
            },
        },
        "pod_borer": {
            "temp_range": (20, 28),
            "temp_type": "mean",
            "humidity_min": 60,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [12, 1, 2],
            "severity_weights": {"temp": 0.25, "humidity": 0.25, "rainfall": 0.20, "phase": 0.30},
            "description": "Helicoverpa armigera boring into pods; active in moderate temperatures during flowering and pod formation.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Trichogramma chilonis @ 1.5 lakh/ha",
                    "HaNPV @ 250 LE/ha spray",
                    "Bacillus thuringiensis @ 2g/L",
                ],
                "cultural": [
                    "Install pheromone traps @ 5/ha",
                    "Bird perches @ 20/ha for predatory birds",
                    "Grow trap crops (marigold, sunflower) around border",
                ],
                "botanical": [
                    "Neem seed kernel extract 5% spray at 50% flowering",
                ],
                "chemical_last_resort": [
                    "Indoxacarb 14.5 SC @ 0.7 ml/L",
                ],
            },
        },
    },

    # ─────────────────────────── SOYBEAN ───────────────────────────
    "soybean": {
        "rust": {
            "temp_range": (18, 26),
            "temp_type": "mean",
            "humidity_min": 80,
            "leaf_wetness_hours_min": 6,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.40, "rainfall": 0.20, "phase": 0.15},
            "description": "Fungal rust causing tan to reddish-brown pustules on undersides of leaves; favored by prolonged leaf wetness and moderate temperatures.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Use tolerant varieties",
                    "Early sowing",
                    "Avoid late-planted soybean",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Propiconazole 25 EC @ 1 ml/L at R3 stage",
                    "Hexaconazole 5 EC @ 2 ml/L",
                ],
            },
        },
        "girdle_beetle": {
            "temp_range": (25, 30),
            "temp_type": "mean",
            "humidity_min": 75,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9],
            "severity_weights": {"temp": 0.25, "humidity": 0.30, "rainfall": 0.25, "phase": 0.20},
            "description": "Beetle girdling stems causing wilting; active in warm, humid Kharif weather.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Intercrop with red gram or sorghum",
                    "Timely sowing",
                    "Destroy crop residue",
                ],
                "botanical": [
                    "Neem oil spray",
                ],
                "chemical_last_resort": [
                    "Triazophos 40 EC @ 2 ml/L",
                ],
            },
        },
        "powdery_mildew": {
            "temp_range": (17, 28),
            "temp_type": "mean",
            "humidity_range": (50, 80),
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [9, 10],
            "severity_weights": {"temp": 0.30, "humidity": 0.25, "rainfall": 0.10, "phase": 0.35},
            "description": "Erysiphe diffusa; high N levels increase susceptibility; epidemic accelerates at canopy closure. Dry periods, no rain needed.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Balanced N fertilization", "Resistant varieties (Hartwig)"],
                "botanical": ["Sulfur dust applications"],
                "chemical_last_resort": ["Tebuconazole spray"],
            },
        },
        "sudden_death_syndrome": {
            "temp_range": (10, 25),
            "temp_type": "mean",
            "humidity_min": 80,
            "rainfall_trigger_mm": 20,
            "vulnerable_phases": ["sowing", "vegetative"],
            "peak_months": [7, 8],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.25, "phase": 0.15},
            "description": "Fusarium virguliforme; root infection at germination in cold (<15°C) wet soils; foliar symptoms appear later during pod fill. High rainfall + waterlogging triggers.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Improved drainage", "Delayed planting until soils warm", "Resistant varieties"],
                "botanical": [],
                "chemical_last_resort": ["Fluopyram seed treatment (IleVO)"],
            },
        },
        "yellow_mosaic": {
            "temp_range": (25, 35),
            "temp_type": "mean",
            "humidity_max": 60,
            "vulnerable_phases": ["sowing", "vegetative"],
            "peak_months": [8, 9],
            "severity_weights": {"temp": 0.25, "humidity": 0.25, "rainfall": 0.15, "phase": 0.35},
            "description": "MYMIV/BYMV (Begomovirus) transmitted by whitefly Bemisia tabaci; early season infection (before V3) causes >80% yield loss. Low rainfall increases whitefly populations.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Resistant varieties (MACS 450, JS 20-29)",
                    "Yellow sticky traps",
                    "Roguing infected plants",
                ],
                "botanical": ["Neem oil sprays"],
                "chemical_last_resort": ["Imidacloprid seed treatment"],
            },
        },
    },

    # ─────────────────────────── CHILLI ───────────────────────────
    "chilli": {
        "anthracnose": {
            "temp_range": (25, 30),
            "temp_type": "mean",
            "humidity_min": 80,
            "rainfall_trigger_mm": 10,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [8, 9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.25, "phase": 0.15},
            "description": "Fruit rot caused by Colletotrichum; favored by warm, humid weather with frequent rain during fruiting.",
            "ipm_strategy": {
                "biocontrol": [
                    "Seed treatment with Trichoderma viride",
                ],
                "cultural": [
                    "Use disease-free seeds",
                    "Proper spacing for air circulation",
                    "Remove and destroy infected fruits",
                ],
                "botanical": [
                    "Neem oil spray",
                ],
                "chemical_last_resort": [
                    "Mancozeb 0.25%",
                    "Captan 0.2%",
                ],
            },
        },
        "thrips": {
            "temp_range": (25, 35),
            "temp_type": "mean",
            "humidity_max": 60,
            "vulnerable_phases": ["sowing", "vegetative", "flowering"],
            "peak_months": [3, 4, 5, 9, 10],
            "severity_weights": {"temp": 0.30, "humidity": 0.30, "rainfall": 0.15, "phase": 0.25},
            "description": "Tiny sucking pests causing leaf curl and upward cupping; thrive in hot, dry weather.",
            "ipm_strategy": {
                "biocontrol": [
                    "Apply Beauveria bassiana @ 5g/L",
                ],
                "cultural": [
                    "Install blue sticky traps",
                    "Intercrop with maize",
                    "Avoid water stress",
                ],
                "botanical": [
                    "Neem oil 1500 ppm spray",
                    "Garlic-chilli extract spray",
                ],
                "chemical_last_resort": [
                    "Fipronil 5 SC @ 2ml/L",
                    "Spinosad 45 SC @ 0.3 ml/L",
                ],
            },
        },
    },

    # ─────────────────────────── ONION ───────────────────────────
    "onion": {
        "purple_blotch": {
            "temp_range": (21, 30),
            "temp_type": "mean",
            "humidity_min": 80,
            "leaf_wetness_hours_min": 12,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [1, 2, 9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.40, "rainfall": 0.20, "phase": 0.15},
            "description": "Fungal disease causing purple lesions on leaves; requires prolonged leaf wetness and high humidity.",
            "ipm_strategy": {
                "biocontrol": [
                    "Apply Trichoderma viride",
                ],
                "cultural": [
                    "Proper drainage",
                    "Avoid overhead irrigation",
                    "Wide spacing for air circulation",
                ],
                "botanical": [
                    "Neem oil spray",
                ],
                "chemical_last_resort": [
                    "Mancozeb 0.25%",
                    "Chlorothalonil 0.2%",
                ],
            },
        },
        "thrips": {
            "temp_range": (25, 35),
            "temp_type": "mean",
            "humidity_max": 65,
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [1, 2, 3, 10, 11],
            "severity_weights": {"temp": 0.30, "humidity": 0.30, "rainfall": 0.15, "phase": 0.25},
            "description": "Major sucking pest of onion causing silvery white patches on leaves; thrives in hot, dry conditions.",
            "ipm_strategy": {
                "biocontrol": [
                    "Apply Beauveria bassiana @ 5g/L",
                    "Release predatory thrips Aeolothrips spp.",
                ],
                "cultural": [
                    "Install blue sticky traps",
                    "Overhead sprinkler irrigation to dislodge",
                    "Intercrop with coriander",
                ],
                "botanical": [
                    "Neem seed kernel extract 5%",
                ],
                "chemical_last_resort": [
                    "Fipronil 5 SC @ 2ml/L",
                    "Lambda-cyhalothrin 5 EC @ 0.6 ml/L",
                ],
            },
        },
    },

    # ─────────────────────────── MUSTARD ───────────────────────────
    "mustard": {
        "alternaria_blight": {
            "temp_range": (10, 25),
            "temp_type": "mean",
            "humidity_morning_min": 70,
            "sunshine_low": True,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [1, 2],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.15, "phase": 0.20},
            "description": "Fungal blight causing dark spots on leaves and pods; favored by moderate temperatures with high morning humidity and low sunshine.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Use certified disease-free seed",
                    "Maintain proper spacing",
                    "Remove and destroy infected debris",
                ],
                "botanical": [
                    "Neem oil spray",
                ],
                "chemical_last_resort": [
                    "Mancozeb 0.2%",
                    "Iprodione 0.2%",
                ],
            },
        },
        "aphid": {
            "temp_range": (10, 20),
            "temp_type": "mean",
            "humidity_min": 60,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [1, 2, 3],
            "severity_weights": {"temp": 0.35, "humidity": 0.25, "rainfall": 0.15, "phase": 0.25},
            "description": "Sucking pest forming dense colonies on inflorescences; thrives in cool winter conditions.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Coccinellid predators (Ladybird beetles)",
                    "Apply Verticillium lecanii @ 5g/L",
                ],
                "cultural": [
                    "Install yellow sticky traps",
                    "Timely sowing to avoid peak aphid period",
                ],
                "botanical": [
                    "Neem oil 1500 ppm spray",
                ],
                "chemical_last_resort": [
                    "Dimethoate 30 EC @ 1 ml/L",
                ],
            },
        },
    },

    # ─────────────────────────── GRAPES (PUNE/MAHARASHTRA) ───────────────────────────
    "grapes": {
        "downy_mildew": {
            "temp_range": (20, 25),
            "temp_type": "mean",
            "humidity_min": 85,
            "rainfall_trigger_mm": 10,
            "other_conditions": ["leaf_wetness_24h"],
            "vulnerable_phases": ["flowering", "berry_development"],
            "peak_months": [8, 9, 10, 11],
            "severity_weights": {"temp": 0.25, "humidity": 0.40, "rainfall": 0.25, "phase": 0.10},
            "description": "Devastating fungal disease in grapevines showing yellowish oily spots on upper leaves and white fluffy growth on lower sides. High risk during monsoon and post-monsoon rains.",
            "ipm_strategy": {
                "biocontrol": [
                    "Apply Trichoderma viride preventive sprays",
                ],
                "cultural": [
                    "Proper canopy management to improve aeration",
                    "Burn infected leaves and pruned vines",
                    "Avoid waterlogging",
                ],
                "botanical": [
                    "Potassium salt of fatty acids",
                ],
                "chemical_last_resort": [
                    "Bordeaux mixture (1%) preventive",
                    "Metalaxyl + Mancozeb 0.2% spray",
                ],
            },
        },
        "powdery_mildew": {
            "temp_range": (25, 30),
            "temp_type": "mean",
            "humidity_range": (40, 70),
            "vulnerable_phases": ["vegetative", "flowering", "berry_development"],
            "peak_months": [12, 1, 2, 3],
            "severity_weights": {"temp": 0.35, "humidity": 0.25, "rainfall": 0.10, "phase": 0.30},
            "description": "White powdery fungal growth on leaves and berries. Thrives in dry, warm weather. It drastically reduces market value of table grapes in Maharashtra.",
            "ipm_strategy": {
                "biocontrol": [
                    "Ampelomyces quisqualis (mycoparasite) spray",
                ],
                "cultural": [
                    "Expose bunches to filtered sunlight via shoot thinning",
                    "Avoid excess nitrogen",
                ],
                "botanical": [
                    "Milk-water (1:10) spray",
                ],
                "chemical_last_resort": [
                    "Wettable Sulphur 80 WP @ 2g/L",
                    "Azoxystrobin 23.6 SC",
                ],
            },
        },
        "mealybug": {
            "temp_range": (25, 33),
            "temp_type": "mean",
            "humidity_range": (60, 80),
            "vulnerable_phases": ["berry_development", "harvest"],
            "peak_months": [1, 2, 3, 4],
            "severity_weights": {"temp": 0.35, "humidity": 0.35, "rainfall": 0.10, "phase": 0.20},
            "description": "Sap-sucking insect covered in white wax. Excretes honeydew leading to sooty mold, destroying bunch quality. Favors warm weather.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release predatory beetle Cryptolaemus montrouzieri @ 1500/ha",
                ],
                "cultural": [
                    "Stem banding with sticky grease",
                    "Ant control (ants protect mealybugs)",
                ],
                "botanical": [
                    "Neem oil 1500ppm + soap solution spray",
                ],
                "chemical_last_resort": [
                    "Buprofezin 25 SC @ 1.25 ml/L",
                ],
            },
        },
    },

    # ─────────────────────────── POMEGRANATE (MAHARASHTRA) ───────────────────────────
    "pomegranate": {
        "bacterial_blight": {
            "temp_range": (25, 35),
            "temp_type": "max",
            "humidity_min": 60,
            "rainfall_trigger_mm": 5,
            "vulnerable_phases": ["flowering", "fruiting"],
            "peak_months": [7, 8, 9, 10],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.25, "phase": 0.15},
            "description": "Bacterial Blight ('Telya'): The most devastating pomegranate disease in Maharashtra causing water-soaked 'oily' spots on fruits and sudden wilting. Flourishes in warm, humid, rainy conditions.",
            "ipm_strategy": {
                "biocontrol": [
                    "Bacillus subtilis foliar sprays",
                ],
                "cultural": [
                    "Strict field sanitation (burn infected parts)",
                    "Select disease-free resting period (Bahar)",
                    "Maintain proper spacing (15x10 ft)",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Streptocycline 500ppm + Copper Oxychloride",
                    "Bordeaux mixture (1%) paste on pruned cuts",
                ],
            },
        },
        "fruit_borer": {
            "temp_range": (25, 32),
            "temp_type": "mean",
            "humidity_min": 50,
            "vulnerable_phases": ["fruiting", "harvest"],
            "peak_months": [2, 3, 4, 8, 9],
            "severity_weights": {"temp": 0.30, "humidity": 0.20, "rainfall": 0.10, "phase": 0.40},
            "description": "Larvae bore into developing fruits and feed on seeds. Causes heavy economic loss as fruits rot and fall prematurely.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Trichogramma chilonis",
                ],
                "cultural": [
                    "Bagging of fruits locally",
                    "Install light traps",
                    "Collect and destroy dropped fruits",
                ],
                "botanical": [
                    "Neem seed kernel extract 5% at early fruit setting",
                ],
                "chemical_last_resort": [
                    "Chlorantraniliprole 18.5 SC",
                    "Spinosad 45 SC",
                ],
            },
        },
    },

    # ─────────────────────────── PIGEON PEA ───────────────────────────
    "pigeon pea": {
        "pod_borer": {
            "temp_range": (20, 28),
            "temp_type": "mean",
            "humidity_min": 60,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [10, 11, 12],
            "severity_weights": {"temp": 0.25, "humidity": 0.25, "rainfall": 0.20, "phase": 0.30},
            "description": "Helicoverpa armigera boring into pods causing major yield loss; active during flowering and pod stage.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Trichogramma chilonis @ 1.5 lakh/ha",
                    "HaNPV @ 250 LE/ha",
                    "Bacillus thuringiensis @ 2g/L",
                ],
                "cultural": [
                    "Install pheromone traps @ 5/ha",
                    "Bird perches @ 20/ha",
                    "Shake plants to dislodge early-instar larvae",
                ],
                "botanical": [
                    "Neem seed kernel extract 5%",
                ],
                "chemical_last_resort": [
                    "Indoxacarb 14.5 SC @ 0.7 ml/L",
                ],
            },
        },
        "fusarium_wilt": {
            "temp_range": (25, 33),
            "temp_type": "mean",
            "humidity_min": 70,
            "vulnerable_phases": ["flowering"],
            "peak_months": [10, 11],
            "severity_weights": {"temp": 0.30, "humidity": 0.25, "rainfall": 0.15, "phase": 0.30},
            "description": "Soil-borne wilt disease; worse in warm, moist soil conditions during reproductive stage.",
            "ipm_strategy": {
                "biocontrol": [
                    "Seed treatment with Trichoderma viride @ 4g/kg",
                ],
                "cultural": [
                    "Intercrop with sorghum",
                    "Use resistant varieties",
                    "Deep summer ploughing",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Seed treatment with Thiram",
                ],
            },
        },
    },

    # ─────────────────────────── SUGARCANE ───────────────────────────
    "sugarcane": {
        "early_shoot_borer": {
            "temp_range": (25, 35),
            "temp_type": "mean",
            "humidity_min": 70,
            "vulnerable_phases": ["sowing", "vegetative"],
            "peak_months": [3, 4, 5, 6],
            "severity_weights": {"temp": 0.25, "humidity": 0.30, "rainfall": 0.20, "phase": 0.25},
            "description": "Causes 'dead heart' symptoms in early tillers; active in hot, humid pre-monsoon and early monsoon conditions.",
            "ipm_strategy": {
                "biocontrol": [
                    "Release Trichogramma chilonis @ 50,000/ha at 30-day intervals",
                ],
                "cultural": [
                    "Remove and destroy dead hearts",
                    "Avoid late planting",
                    "Earthing up operations help",
                    "Trash mulching to conserve predators",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Chlorantraniliprole 18.5 SC in soil drench",
                ],
            },
        },
        "red_rot": {
            "temp_range": (25, 32),
            "temp_type": "mean",
            "humidity_min": 85,
            "rainfall_trigger_mm": 15,
            "vulnerable_phases": ["flowering", "harvest"],
            "peak_months": [7, 8, 9],
            "severity_weights": {"temp": 0.25, "humidity": 0.35, "rainfall": 0.25, "phase": 0.15},
            "description": "Stalk disease causing reddening of internal tissues; favored by warm, wet monsoon conditions.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": [
                    "Use disease-resistant varieties",
                    "Hot water treatment of setts (52°C for 30 min)",
                    "Remove and destroy infected clumps",
                ],
                "botanical": [],
                "chemical_last_resort": [
                    "Sett treatment with Carbendazim",
                    "Thiophanate-methyl",
                ],
            },
        },
        "bacterial_blight_sugarcane": {
            "temp_range": (30, 35),
            "temp_type": "max",
            "humidity_min": 85,
            "vulnerable_phases": ["vegetative"],
            "peak_months": [5, 6, 7],
            "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.15, "phase": 0.20},
            "description": "Pseudomonas rubrilineans causing red stripes on leaves; high temp and high RH >85% drives rapid spread.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Resistant varieties", "Healthy seed material", "Avoid excessive nitrogen"],
                "botanical": [],
                "chemical_last_resort": ["Copper-based fungicides"],
            },
        },
        "mosaic": {
            "temp_range": (20, 30),
            "temp_type": "mean",
            "vulnerable_phases": ["sowing", "vegetative"],
            "peak_months": [4, 5, 6],
            "severity_weights": {"temp": 0.25, "humidity": 0.15, "rainfall": 0.10, "phase": 0.50},
            "description": "Sugarcane Mosaic Virus (SCMV) transmitted by aphids; spread is determined by vector population dynamics (favored by dry spells).",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Use virus-free setts", "Heat therapy of setts", "Rogue infected clumps"],
                "botanical": [],
                "chemical_last_resort": ["Systemic insecticides to control aphid vectors"],
            },
        },
        "rust_orange": {
            "temp_range": (15, 25),
            "temp_type": "mean",
            "humidity_min": 90,
            "vulnerable_phases": ["vegetative"],
            "peak_months": [11, 12, 1],
            "severity_weights": {"temp": 0.35, "humidity": 0.40, "rainfall": 0.05, "phase": 0.20},
            "description": "Puccinia kuehnii (Orange Rust); cool nights + warm days with dew favored; >8h leaf wetness required.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Resistant varieties", "Ensure balanced nutrition"],
                "botanical": [],
                "chemical_last_resort": ["Tebuconazole + Trifloxystrobin"],
            },
        },
        "yellow_leaf_disease": {
            "temp_range": (25, 30),
            "temp_type": "mean",
            "vulnerable_phases": ["vegetative", "flowering"],
            "peak_months": [8, 9, 10],
            "severity_weights": {"temp": 0.20, "humidity": 0.20, "rainfall": 0.10, "phase": 0.50},
            "description": "Sugarcane Yellow Leaf Virus (SCYLV) transmitted by aphids (Melanaphis sacchari); dramatic yield impact; stress worsens symptoms.",
            "ipm_strategy": {
                "biocontrol": [],
                "cultural": ["Meristem culture derived setts", "Proper irrigation to reduce stress"],
                "botanical": [],
                "chemical_last_resort": ["Imidacloprid for aphid control"],
            },
        },
    },

    # ─────────────────────────── BEAN ───────────────────────────
    "bean": {
        "angular_leaf_spot": {
             "temp_range": (20, 25),
             "temp_type": "mean",
             "humidity_min": 90,
             "vulnerable_phases": ["vegetative", "flowering"],
             "peak_months": [8, 9],
             "severity_weights": {"temp": 0.30, "humidity": 0.40, "rainfall": 0.15, "phase": 0.15},
             "description": "Pseudocercospora griseola; requires extended periods of high humidity (>90%) and moderate temperatures. Lesions are angular, restricted by leaf veins.",
             "ipm_strategy": {
                 "biocontrol": [],
                 "cultural": ["Use certified seed", "Crop rotation (2-3 years)", "Deep plow debris"],
                 "botanical": [],
                 "chemical_last_resort": ["Azoxystrobin", "Chlorothalonil"],
             },
        },
        "rust": {
             "temp_range": (17, 27),
             "temp_type": "mean",
             "humidity_min": 95,
             "vulnerable_phases": ["flowering", "harvest"],
             "peak_months": [9, 10],
             "severity_weights": {"temp": 0.25, "humidity": 0.45, "rainfall": 0.10, "phase": 0.20},
             "description": "Uromyces appendiculatus; favored by cloudy, humid weather with 10-18h of dew and cool/moderate temperatures.",
             "ipm_strategy": {
                 "biocontrol": [],
                 "cultural": ["Resistant varieties", "Avoid excess nitrogen"],
                 "botanical": [],
                 "chemical_last_resort": ["Tebuconazole", "Propiconazole"],
             },
        },
    },

    # ─────────────────────────── MILLET ───────────────────────────
    "millet": {
        "blast": {
             "temp_range": (25, 30),
             "temp_type": "mean",
             "humidity_min": 90,
             "vulnerable_phases": ["vegetative", "flowering"],
             "peak_months": [8, 9],
             "severity_weights": {"temp": 0.25, "humidity": 0.40, "rainfall": 0.20, "phase": 0.15},
             "description": "Pyricularia grisea; severe under high humidity, cloudy weather, and frequent rains. Causes diamond-shaped lesions.",
             "ipm_strategy": {
                 "biocontrol": ["Pseudomonas fluorescens seed treatment"],
                 "cultural": ["Resistant varieties", "Avoid late sowing", "Optimal plant spacing"],
                 "botanical": [],
                 "chemical_last_resort": ["Tricyclazole", "Carbendazim"],
             },
        },
        "rust": {
             "temp_range": (20, 25),
             "temp_type": "mean",
             "humidity_min": 85,
             "vulnerable_phases": ["flowering", "harvest"],
             "peak_months": [10, 11],
             "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.15, "phase": 0.20},
             "description": "Puccinia penniseti; development favored by cooler temperatures and high humidity/dew in late season.",
             "ipm_strategy": {
                 "biocontrol": [],
                 "cultural": ["Destruction of collateral hosts (brinjal)", "Resistant varieties"],
                 "botanical": [],
                 "chemical_last_resort": ["Mancozeb (0.2%)"],
             },
        },
    },

    # ─────────────────────────── SORGHUM ───────────────────────────
    "sorghum": {
        "anthracnose": {
             "temp_range": (25, 30),
             "temp_type": "max",
             "humidity_min": 85,
             "rainfall_trigger_mm": 10,
             "vulnerable_phases": ["vegetative", "flowering"],
             "peak_months": [8, 9],
             "severity_weights": {"temp": 0.25, "humidity": 0.40, "rainfall": 0.25, "phase": 0.10},
             "description": "Colletotrichum sublineolum; rapid spread during warm, humid, wet weather with frequent rainfall.",
             "ipm_strategy": {
                 "biocontrol": [],
                 "cultural": ["Resistant hybrids", "Crop rotation", "Clean cultivation"],
                 "botanical": [],
                 "chemical_last_resort": ["Mancozeb"],
             },
        },
        "smut": {
             "temp_range": (20, 30),
             "temp_type": "mean",
             "humidity_min": 60,
             "vulnerable_phases": ["flowering"],
             "peak_months": [9, 10],
             "severity_weights": {"temp": 0.30, "humidity": 0.10, "rainfall": 0.10, "phase": 0.50},
             "description": "Includes Head Smut, Kernel Smut, Loose Smut combined. Soil and seed-borne; infection occurs early but symptoms show at heading.",
             "ipm_strategy": {
                 "biocontrol": [],
                 "cultural": ["Use certified, treated seed", "Crop rotation", "Rogue smutted heads early"],
                 "botanical": [],
                 "chemical_last_resort": ["Seed treatment with Thiram or Carboxin"],
             },
        },
        "rust": {
             "temp_range": (15, 25),
             "temp_type": "mean",
             "humidity_min": 85,
             "vulnerable_phases": ["flowering", "harvest"],
             "peak_months": [10, 11, 12],
             "severity_weights": {"temp": 0.30, "humidity": 0.35, "rainfall": 0.10, "phase": 0.25},
             "description": "Puccinia purpurea; develops primarily during cooler, humid post-monsoon or Rabi season periods.",
             "ipm_strategy": {
                 "biocontrol": [],
                 "cultural": ["Resistant varieties", "Timely planting"],
                 "botanical": [],
                 "chemical_last_resort": ["Mancozeb"],
             },
        },
    },
}


def get_diseases_for_crop(crop_name: str) -> Dict[str, Any]:
    """Get all disease rules for a crop (case-insensitive, partial match)."""
    crop_key = crop_name.lower().strip()
    if crop_key in DISEASE_RULES:
        return DISEASE_RULES[crop_key]
    for key in DISEASE_RULES:
        if key in crop_key or crop_key in key:
            return DISEASE_RULES[key]
    return {}


def get_all_crops() -> List[str]:
    """Return all crop names that have disease rules."""
    return list(DISEASE_RULES.keys())
