"""
India-specific pest and disease activity calendar.
Maps crop × month to expected pest/disease pressure for each major Indian crop.

Source: ICAR, NCIPM, State Agricultural Universities, user's india_pest_calendar.pdf
"""

from typing import Dict, List, Any
from datetime import datetime

# Structure: PEST_CALENDAR[crop][month_number] = list of expected pests/diseases
PEST_CALENDAR: Dict[str, Dict[int, List[Dict[str, Any]]]] = {
    "rice": {
        6: [
            {"name": "Stem Borer", "type": "pest", "severity": "medium", "note": "Early season attack on seedlings (Asiatic & Yellow)"},
            {"name": "Rice Water Weevil", "type": "pest", "severity": "medium", "note": "Adults feed on leaves, larvae attack roots early season"},
        ],
        7: [
            {"name": "Stem Borer", "type": "pest", "severity": "medium", "note": "Attacks tillers"},
            {"name": "Leaf Folder", "type": "pest", "severity": "low", "note": "Rolls leaves, early instar (Leaf Roller/Caterpillar)"},
            {"name": "Gall Midge", "type": "pest", "severity": "medium", "note": "Causes 'silver shoot' or 'onion leaf' symptom"},
            {"name": "Stemfly", "type": "pest", "severity": "low", "note": "Maggots tunnel into stems"},
        ],
        8: [
            {"name": "Blast", "type": "disease", "severity": "high", "note": "Peak during cloudy, humid monsoon weather"},
            {"name": "Brown Planthopper", "type": "pest", "severity": "high", "note": "Populations build up with heavy rains"},
            {"name": "White Backed Planthopper", "type": "pest", "severity": "high", "note": "Often occurs with BPH, prefers early growth stages"},
            {"name": "Small Brown Planthopper", "type": "pest", "severity": "medium", "note": "Transmits rice stripe virus"},
            {"name": "Bacterial Leaf Blight", "type": "disease", "severity": "medium", "note": "Spread by wind-driven rain"},
            {"name": "Stem Borer", "type": "pest", "severity": "medium", "note": "Continued attack"},
            {"name": "Rice Leafhopper", "type": "pest", "severity": "medium", "note": "Green leafhopper peaks in late kharif"},
        ],
        9: [
            {"name": "Blast", "type": "disease", "severity": "high", "note": "Neck blast at panicle stage"},
            {"name": "Sheath Blight", "type": "disease", "severity": "high", "note": "Warm humid canopy conditions"},
            {"name": "Brown Planthopper", "type": "pest", "severity": "high", "note": "Peak population causing 'hopper burn'"},
            {"name": "Bacterial Leaf Blight", "type": "disease", "severity": "medium", "note": "Active in warm wet weather"},
            {"name": "Grain Spreader Thrips", "type": "pest", "severity": "medium", "note": "Damage at panicle emergence"},
        ],
        10: [
            {"name": "Sheath Blight", "type": "disease", "severity": "medium", "note": "Continues post-monsoon"},
            {"name": "Brown Planthopper", "type": "pest", "severity": "medium", "note": "Late season migration"},
            {"name": "Tungro Virus", "type": "disease", "severity": "low", "note": "Transmitted by green leafhopper"},
            {"name": "Rice Shell Pest", "type": "pest", "severity": "low", "note": "Late season grain feeding"},
        ],
    },

    "wheat": {
        11: [
            {"name": "Termites", "type": "pest", "severity": "medium", "note": "Attack seed and roots at sowing"},
            {"name": "Wheat Sawfly", "type": "pest", "severity": "low", "note": "Larvae feed on early leaves"},
        ],
        12: [
            {"name": "Aphids", "type": "pest", "severity": "low", "note": "Early colonization begins (Bird Cherry Oat Aphid, Green Bug)"},
            {"name": "Powdery Mildew", "type": "disease", "severity": "low", "note": "Appears on lower leaves in cool weather"},
            {"name": "Winter Grain Mite", "type": "pest", "severity": "low", "note": "Active in cool, moist conditions"},
        ],
        1: [
            {"name": "Yellow Rust", "type": "disease", "severity": "high", "note": "Peak in cool, humid N. India plains"},
            {"name": "Aphids", "type": "pest", "severity": "medium", "note": "Colonies on ear heads (Green Bug, English Grain Aphid)"},
            {"name": "Winter Grain Mite", "type": "pest", "severity": "medium", "note": "Causes silvery/grey leaves"},
            {"name": "Powdery Mildew", "type": "disease", "severity": "medium", "note": "Spreads in moderate temps"},
        ],
        2: [
            {"name": "Black Rust", "type": "disease", "severity": "high", "note": "Peak during warm days with morning dew"},
            {"name": "Yellow Rust", "type": "disease", "severity": "medium", "note": "Continues in cooler regions"},
            {"name": "Aphids", "type": "pest", "severity": "high", "note": "Peak population on ear heads (English Grain Aphid)"},
            {"name": "Wheat Blossom Midge", "type": "pest", "severity": "medium", "note": "Attacks developing grain at anthesis"},
            {"name": "Wheat Phloeothrips", "type": "pest", "severity": "low", "note": "Feeds on spikelets causing sterility"},
            {"name": "Alternaria Blight", "type": "disease", "severity": "medium", "note": "Leaf and ear head infection"},
        ],
        3: [
            {"name": "Black Rust", "type": "disease", "severity": "medium", "note": "Late-season infection"},
            {"name": "Aphids", "type": "pest", "severity": "medium", "note": "Declining with rising temperatures"},
        ],
    },

    "cotton": {
        6: [
            {"name": "Thrips", "type": "pest", "severity": "medium", "note": "Early seedling stage attack"},
            {"name": "Tarnished Plant Bug", "type": "pest", "severity": "low", "note": "Early square damage"},
        ],
        7: [
            {"name": "Jassid", "type": "pest", "severity": "medium", "note": "Start of population build-up"},
            {"name": "Thrips", "type": "pest", "severity": "medium", "note": "Continues on young plants"},
            {"name": "Whitefly", "type": "pest", "severity": "low", "note": "Initial colonization"},
        ],
        8: [
            {"name": "Jassid", "type": "pest", "severity": "high", "note": "Peak during monsoon humidity"},
            {"name": "Whitefly", "type": "pest", "severity": "medium", "note": "Builds up in dry spells"},
            {"name": "Tobacco Caterpillar", "type": "pest", "severity": "medium", "note": "Larval feeding on leaves and squares (Spodoptera)"},
            {"name": "Bacterial Blight", "type": "disease", "severity": "medium", "note": "Spread by rain splash"},
        ],
        9: [
            {"name": "Jassid", "type": "pest", "severity": "high", "note": "Continued peak"},
            {"name": "Whitefly", "type": "pest", "severity": "high", "note": "Peak during dry-hot spells"},
            {"name": "Thrips", "type": "pest", "severity": "medium", "note": "On flowers"},
            {"name": "Tobacco Caterpillar", "type": "pest", "severity": "high", "note": "Peak defoliation and boll damage"},
        ],
        10: [
            {"name": "Pink Bollworm", "type": "pest", "severity": "high", "note": "Peak on open bolls"},
            {"name": "American Bollworm", "type": "pest", "severity": "medium", "note": "Boll damage begins"},
            {"name": "Jassid", "type": "pest", "severity": "medium", "note": "Declining"},
            {"name": "Tobacco Caterpillar", "type": "pest", "severity": "medium", "note": "Continued boll damage"},
        ],
        11: [
            {"name": "Pink Bollworm", "type": "pest", "severity": "high", "note": "Major economic damage phase"},
            {"name": "American Bollworm", "type": "pest", "severity": "medium", "note": "Late-season damage"},
        ],
        12: [
            {"name": "Pink Bollworm", "type": "pest", "severity": "medium", "note": "Late picking damage"},
        ],
    },

    "tomato": {
        7: [
            {"name": "Early Blight", "type": "disease", "severity": "low", "note": "Begins on lower leaves"},
            {"name": "Leaf Miner", "type": "pest", "severity": "medium", "note": "Serpentine mines on leaves"},
        ],
        8: [
            {"name": "Early Blight", "type": "disease", "severity": "medium", "note": "Spreads with monsoon humidity"},
            {"name": "Fruit Borer", "type": "pest", "severity": "medium", "note": "Attacks developing fruits"},
        ],
        9: [
            {"name": "Early Blight", "type": "disease", "severity": "high", "note": "Peak during warm humid weather"},
            {"name": "Fruit Borer", "type": "pest", "severity": "high", "note": "Peak damage to fruits"},
            {"name": "Whitefly", "type": "pest", "severity": "medium", "note": "Leaf curl virus vector"},
        ],
        10: [
            {"name": "Early Blight", "type": "disease", "severity": "high", "note": "Continued damage"},
            {"name": "Leaf Curl Virus", "type": "disease", "severity": "medium", "note": "Transmitted by whitefly"},
        ],
        11: [
            {"name": "Late Blight", "type": "disease", "severity": "high", "note": "Cool nights trigger outbreaks"},
            {"name": "Early Blight", "type": "disease", "severity": "medium", "note": "Continues to spread"},
        ],
        12: [
            {"name": "Late Blight", "type": "disease", "severity": "high", "note": "Peak in cool, foggy conditions"},
        ],
        1: [
            {"name": "Late Blight", "type": "disease", "severity": "medium", "note": "Persistent in cool regions"},
        ],
    },

    "potato": {
        10: [
            {"name": "Cutworm", "type": "pest", "severity": "medium", "note": "Attacks freshly planted tubers"},
        ],
        11: [
            {"name": "Aphids", "type": "pest", "severity": "medium", "note": "Vector for potato viruses"},
            {"name": "Early Blight", "type": "disease", "severity": "low", "note": "Initial foliar spots"},
        ],
        12: [
            {"name": "Late Blight", "type": "disease", "severity": "high", "note": "Major threat during cool, humid weather"},
            {"name": "Aphids", "type": "pest", "severity": "medium", "note": "Continued viral transmission risk"},
        ],
        1: [
            {"name": "Late Blight", "type": "disease", "severity": "high", "note": "Peak destruction in foggy conditions"},
            {"name": "Early Blight", "type": "disease", "severity": "medium", "note": "Alternating wet/dry triggers"},
        ],
        2: [
            {"name": "Late Blight", "type": "disease", "severity": "medium", "note": "Declining with warming temps"},
        ],
    },

    "maize": {
        6: [
            {"name": "Fall Armyworm", "type": "pest", "severity": "medium", "note": "Attacks seedlings and young whorls"},
            {"name": "Black Cutworm", "type": "pest", "severity": "medium", "note": "Cuts seedlings at soil level"},
            {"name": "Large Cutworm", "type": "pest", "severity": "low", "note": "Early seedling damage"},
        ],
        7: [
            {"name": "Fall Armyworm", "type": "pest", "severity": "high", "note": "Peak during early monsoon"},
            {"name": "Stem Borer", "type": "pest", "severity": "medium", "note": "Damages growing points"},
            {"name": "Corn Borer", "type": "pest", "severity": "low", "note": "Initial whorl feeding"},
        ],
        8: [
            {"name": "Fall Armyworm", "type": "pest", "severity": "high", "note": "Severe whorl damage"},
            {"name": "Turcicum Leaf Blight", "type": "disease", "severity": "medium", "note": "Humid monsoon conditions"},
            {"name": "Stem Borer", "type": "pest", "severity": "medium", "note": "Continued stem tunneling"},
            {"name": "Corn Borer", "type": "pest", "severity": "medium", "note": "Stem and ear tunneling"},
        ],
        9: [
            {"name": "Turcicum Leaf Blight", "type": "disease", "severity": "high", "note": "Peak disease pressure"},
            {"name": "Fall Armyworm", "type": "pest", "severity": "medium", "note": "Late whorl/ear damage"},
            {"name": "Corn Borer", "type": "pest", "severity": "high", "note": "Maximum ear damage"},
        ],
    },

    "soybean": {
        7: [
            {"name": "Girdle Beetle", "type": "pest", "severity": "low", "note": "Early stem girdling"},
            {"name": "Stem Fly", "type": "pest", "severity": "medium", "note": "Tunnels into seedling stems"},
        ],
        8: [
            {"name": "Girdle Beetle", "type": "pest", "severity": "high", "note": "Peak girdling damage"},
            {"name": "Defoliators", "type": "pest", "severity": "medium", "note": "Spodoptera, Semilooper attack"},
        ],
        9: [
            {"name": "Rust", "type": "disease", "severity": "high", "note": "Peak in humid late-monsoon"},
            {"name": "Defoliators", "type": "pest", "severity": "medium", "note": "Continued leaf feeding"},
            {"name": "Girdle Beetle", "type": "pest", "severity": "medium", "note": "Continues"},
        ],
        10: [
            {"name": "Rust", "type": "disease", "severity": "medium", "note": "Declines with dry weather"},
        ],
    },

    "chickpea": {
        11: [
            {"name": "Wilt", "type": "disease", "severity": "low", "note": "Soil-borne infection begins"},
        ],
        12: [
            {"name": "Pod Borer", "type": "pest", "severity": "medium", "note": "Helicoverpa larvae on flowers"},
            {"name": "Wilt", "type": "disease", "severity": "medium", "note": "Progresses with soil moisture"},
        ],
        1: [
            {"name": "Pod Borer", "type": "pest", "severity": "high", "note": "Peak damage during pod formation"},
            {"name": "Dry Root Rot", "type": "disease", "severity": "medium", "note": "Under moisture stress"},
        ],
        2: [
            {"name": "Pod Borer", "type": "pest", "severity": "high", "note": "Continued pod damage"},
            {"name": "Wilt", "type": "disease", "severity": "medium", "note": "Late-season expression"},
        ],
    },

    "groundnut": {
        7: [
            {"name": "White Grub", "type": "pest", "severity": "medium", "note": "Root damage during monsoon"},
        ],
        8: [
            {"name": "Tikka Leaf Spot", "type": "disease", "severity": "high", "note": "Peak with leaf wetness"},
            {"name": "Spodoptera", "type": "pest", "severity": "medium", "note": "Defoliation"},
            {"name": "White Grub", "type": "pest", "severity": "high", "note": "Peak root damage"},
        ],
        9: [
            {"name": "Tikka Leaf Spot", "type": "disease", "severity": "high", "note": "Severe defoliation risk"},
            {"name": "Rust", "type": "disease", "severity": "medium", "note": "Pustules on leaf undersides"},
            {"name": "Stem Rot", "type": "disease", "severity": "medium", "note": "Waterlogged conditions"},
        ],
    },

    "chilli": {
        3: [
            {"name": "Thrips", "type": "pest", "severity": "high", "note": "Peak in hot, dry weather"},
        ],
        4: [
            {"name": "Thrips", "type": "pest", "severity": "high", "note": "Severe leaf curl symptoms"},
            {"name": "Mites", "type": "pest", "severity": "medium", "note": "Leaf curling and distortion"},
        ],
        8: [
            {"name": "Anthracnose", "type": "disease", "severity": "medium", "note": "Fruit rot begins with monsoon"},
        ],
        9: [
            {"name": "Anthracnose", "type": "disease", "severity": "high", "note": "Peak fruit rot with heavy rains"},
            {"name": "Thrips", "type": "pest", "severity": "medium", "note": "Post-monsoon resurgence"},
        ],
        10: [
            {"name": "Anthracnose", "type": "disease", "severity": "high", "note": "Continued in humid conditions"},
            {"name": "Thrips", "type": "pest", "severity": "medium", "note": "Autumn resurgence"},
        ],
    },

    "onion": {
        11: [
            {"name": "Thrips", "type": "pest", "severity": "medium", "note": "Early colonization of Rabi crop"},
        ],
        12: [
            {"name": "Thrips", "type": "pest", "severity": "medium", "note": "Building up"},
            {"name": "Purple Blotch", "type": "disease", "severity": "low", "note": "Initial spots appear"},
        ],
        1: [
            {"name": "Thrips", "type": "pest", "severity": "high", "note": "Peak population in dry weather"},
            {"name": "Purple Blotch", "type": "disease", "severity": "medium", "note": "Spreads with dew and fog"},
            {"name": "Downy Mildew", "type": "disease", "severity": "medium", "note": "Cool, humid mornings"},
        ],
        2: [
            {"name": "Thrips", "type": "pest", "severity": "high", "note": "Continued peak"},
            {"name": "Purple Blotch", "type": "disease", "severity": "high", "note": "Peak with rising temperatures and humidity"},
        ],
        3: [
            {"name": "Thrips", "type": "pest", "severity": "medium", "note": "Declining towards harvest"},
        ],
    },

    "grapes": {
        3: [
            {"name": "Flea Beetle", "type": "pest", "severity": "medium", "note": "Attacks sprouting buds after spring pruning"},
            {"name": "Grape Beetle", "type": "pest", "severity": "low", "note": "Early foliage feeding"},
            {"name": "Leafhopper", "type": "pest", "severity": "medium", "note": "Population starts building on new flush"},
        ],
        4: [
            {"name": "Thrips", "type": "pest", "severity": "high", "note": "Peak damage to new shoots and inflorescence"},
            {"name": "Leafhopper", "type": "pest", "severity": "high", "note": "Peak population causing stippling"},
            {"name": "False Spider Mite", "type": "pest", "severity": "medium", "note": "Builds up in dry heat"},
        ],
        5: [
            {"name": "Erineum Mite", "type": "pest", "severity": "medium", "note": "Causes blister-like galls on leaves"},
            {"name": "Hawk Moth", "type": "pest", "severity": "low", "note": "Large caterpillars feed on leaves"},
            {"name": "Phylloxera", "type": "pest", "severity": "low", "note": "Root feeding starts (where prevalent)"},
        ],
        8: [
            {"name": "Downy Mildew", "type": "disease", "severity": "medium", "note": "Early monsoon showers trigger primary infection"},
            {"name": "Flea Beetle", "type": "pest", "severity": "high", "note": "Severe damage after October pruning"},
            {"name": "Clearwing Moth", "type": "pest", "severity": "medium", "note": "Borer damage in canes"},
        ],
        9: [
            {"name": "Downy Mildew", "type": "disease", "severity": "high", "note": "Major threat during flowering and berry set"},
            {"name": "Spotted Lanternfly", "type": "pest", "severity": "medium", "note": "Sooty mold development from honeydew"},
            {"name": "Thrips", "type": "pest", "severity": "high", "note": "Scabbing on young berries"},
        ],
        10: [
            {"name": "Downy Mildew", "type": "disease", "severity": "high", "note": "Continues with post-monsoon rains"},
            {"name": "Mealybug", "type": "pest", "severity": "low", "note": "Starts moving to bunches"},
        ],
        12: [
            {"name": "Powdery Mildew", "type": "disease", "severity": "medium", "note": "Appears with dry winter start"},
            {"name": "Mealybug", "type": "pest", "severity": "low", "note": "Initial crawler stage"},
        ],
        1: [
            {"name": "Powdery Mildew", "type": "disease", "severity": "high", "note": "Peak threat for developing berries"},
            {"name": "Mealybug", "type": "pest", "severity": "medium", "note": "Colonies start forming on bunches"},
        ],
        2: [
            {"name": "Powdery Mildew", "type": "disease", "severity": "high", "note": "Severe threat before harvest"},
            {"name": "Mealybug", "type": "pest", "severity": "high", "note": "Peak damage to bunches before harvest"},
        ],
    },

    "pomegranate": {
        7: [
            {"name": "Bacterial Blight", "type": "disease", "severity": "medium", "note": "Oily spots appear with first rains"},
        ],
        8: [
            {"name": "Bacterial Blight", "type": "disease", "severity": "high", "note": "Rapid spread in monsoon humidity"},
            {"name": "Fruit Borer", "type": "pest", "severity": "medium", "note": "Eggs laid on developing fruits"},
        ],
        9: [
            {"name": "Bacterial Blight", "type": "disease", "severity": "high", "note": "Major threat causing fruit cracking and drop"},
            {"name": "Fruit Borer", "type": "pest", "severity": "high", "note": "Peak internal fruit damage"},
        ],
        10: [
            {"name": "Bacterial Blight", "type": "disease", "severity": "medium", "note": "Declines as rains stop"},
        ],
        2: [
            {"name": "Fruit Borer", "type": "pest", "severity": "medium", "note": "Affects Ambia bahar crop"},
        ],
        3: [
            {"name": "Fruit Borer", "type": "pest", "severity": "high", "note": "Peak damage in spring"},
        ],
    },

    "pigeon pea": {
        9: [
            {"name": "Pod Fly", "type": "pest", "severity": "low", "note": "Initial oviposition on pods"},
        ],
        10: [
            {"name": "Pod Borer", "type": "pest", "severity": "medium", "note": "Helicoverpa on flowers"},
            {"name": "Wilt", "type": "disease", "severity": "medium", "note": "Fusarium infection visible"},
        ],
        11: [
            {"name": "Pod Borer", "type": "pest", "severity": "high", "note": "Peak pod damage"},
            {"name": "Pod Fly", "type": "pest", "severity": "medium", "note": "Larval damage inside pods"},
        ],
        12: [
            {"name": "Pod Borer", "type": "pest", "severity": "high", "note": "Major yield loss period"},
            {"name": "Wilt", "type": "disease", "severity": "medium", "note": "Late-stage expression"},
        ],
    },

    "mustard": {
        12: [
            {"name": "Aphids", "type": "pest", "severity": "low", "note": "Initial small colonies"},
        ],
        1: [
            {"name": "Aphids", "type": "pest", "severity": "high", "note": "Peak in cool weather on inflorescences"},
            {"name": "Alternaria Blight", "type": "disease", "severity": "medium", "note": "Spots on leaves and pods"},
        ],
        2: [
            {"name": "Aphids", "type": "pest", "severity": "high", "note": "Severe honey-dew deposition"},
            {"name": "Alternaria Blight", "type": "disease", "severity": "high", "note": "Peak damage on siliquae"},
            {"name": "White Rust", "type": "disease", "severity": "medium", "note": "Pustules on undersides"},
        ],
        3: [
            {"name": "Aphids", "type": "pest", "severity": "medium", "note": "Declining with warmth"},
        ],
    },

    "sugarcane": {
        2: [
            {"name": "Early Shoot Borer", "type": "pest", "severity": "low", "note": "Begins after planting"},
        ],
        3: [
            {"name": "Early Shoot Borer", "type": "pest", "severity": "high", "note": "Peak dead heart formation"},
        ],
        4: [
            {"name": "Early Shoot Borer", "type": "pest", "severity": "high", "note": "Continued damage to tillers"},
        ],
        5: [
            {"name": "Early Shoot Borer", "type": "pest", "severity": "medium", "note": "Declining with growth"},
            {"name": "Top Borer", "type": "pest", "severity": "low", "note": "Begins egg laying"},
        ],
        7: [
            {"name": "Top Borer", "type": "pest", "severity": "medium", "note": "Larval damage to growing point"},
            {"name": "Pyrilla", "type": "pest", "severity": "low", "note": "Initial population"},
        ],
        8: [
            {"name": "Top Borer", "type": "pest", "severity": "high", "note": "Peak damage to top shoots"},
            {"name": "Red Rot", "type": "disease", "severity": "medium", "note": "Monsoon moisture triggers infection"},
            {"name": "Pyrilla", "type": "pest", "severity": "medium", "note": "Builds up"},
        ],
        9: [
            {"name": "Red Rot", "type": "disease", "severity": "high", "note": "Peak in warm, wet conditions"},
            {"name": "Pyrilla", "type": "pest", "severity": "high", "note": "Peak population"},
        ],
    },

    "citrus": {
        1: [
            {"name": "Citrus Psylla", "type": "pest", "severity": "medium", "note": "Vectors greening disease, active on new flush"},
            {"name": "Leafminer", "type": "pest", "severity": "low", "note": "Starts attacking tender leaves"},
        ],
        3: [
            {"name": "Citrus Psylla", "type": "pest", "severity": "high", "note": "Peak damage to spring flush"},
            {"name": "Leafminer", "type": "pest", "severity": "high", "note": "Severe leaf distortion"},
            {"name": "Brown Citrus Aphid", "type": "pest", "severity": "medium", "note": "Vector of Tristeza virus"},
        ],
        4: [
            {"name": "Swallowtail Butterfly", "type": "pest", "severity": "medium", "note": "Lemon butterfly caterpillars defoliate young plants"},
            {"name": "Red Mite", "type": "pest", "severity": "medium", "note": "Hot dry weather favors population"},
        ],
        7: [
            {"name": "Leafminer", "type": "pest", "severity": "medium", "note": "Attacks monsoon flush"},
            {"name": "Cottony Cushion Scale", "type": "pest", "severity": "medium", "note": "Sooty mold development"},
        ],
        9: [
            {"name": "Fruit Fly", "type": "pest", "severity": "high", "note": "Attacks ripening fruits"},
        ],
        10: [
            {"name": "Rust Mite", "type": "pest", "severity": "medium", "note": "Causes fruit blemishing (russeting)"},
            {"name": "Fruit Fly", "type": "pest", "severity": "high", "note": "Peak fruit damage and drop"},
        ],
    },

    "mango": {
        12: [
            {"name": "Mango Hopper", "type": "pest", "severity": "low", "note": "Nymphs emerge on early inflorescence"},
            {"name": "Powdery Mildew", "type": "disease", "severity": "low", "note": "Appears on panicles"},
        ],
        1: [
            {"name": "Mango Hopper", "type": "pest", "severity": "high", "note": "Causes blossom blight and sooty mold"},
            {"name": "Powdery Mildew", "type": "disease", "severity": "high", "note": "White powder on flowers"},
            {"name": "Mango Thrips", "type": "pest", "severity": "medium", "note": "Scabbing on flowers and tiny fruits"},
        ],
        2: [
            {"name": "Mango Hopper", "type": "pest", "severity": "high", "note": "Continued peak damage"},
            {"name": "Flat-headed Leafhopper", "type": "pest", "severity": "medium", "note": "Damage to leaves and panicles"},
        ],
        3: [
            {"name": "Pea-sized Fruit Borer", "type": "pest", "severity": "medium", "note": "Boring into young fruits"},
            {"name": "Leaf Gall Midge", "type": "pest", "severity": "low", "note": "Galls on new flush"},
        ],
        4: [
            {"name": "Fruit Fly", "type": "pest", "severity": "medium", "note": "Starts attacking early maturing varieties"},
            {"name": "Seed Weevil", "type": "pest", "severity": "medium", "note": "Adults lay eggs on developing fruits (hidden damage)"},
        ],
        5: [
            {"name": "Fruit Fly", "type": "pest", "severity": "high", "note": "Peak damage to ripening fruits"},
            {"name": "Shoot Borer", "type": "pest", "severity": "medium", "note": "Bores into new shoots"},
        ],
        7: [
            {"name": "Longicorn Beetle", "type": "pest", "severity": "medium", "note": "Stem borer active during monsoons"},
        ]
    },

    "vegetables": {
        3: [
            {"name": "Flea Beetle", "type": "pest", "severity": "high", "note": "Shot-holing of young leaves (Cole crops, Brinjal)"},
            {"name": "Aphids", "type": "pest", "severity": "medium", "note": "Vector for viruses"},
        ],
        5: [
            {"name": "Greenhouse Whitefly", "type": "pest", "severity": "high", "note": "Severe in polyhouses, transmits viruses"},
            {"name": "Spider Mites", "type": "pest", "severity": "high", "note": "Webbing and stippling in hot/dry conditions"},
        ],
        8: [
            {"name": "Cabbage Armyworm", "type": "pest", "severity": "high", "note": "Defoliation of brassicas"},
            {"name": "Beet Armyworm", "type": "pest", "severity": "medium", "note": "Attacks multiple vegetable types"},
        ],
        9: [
            {"name": "Diamondback Moth", "type": "pest", "severity": "high", "note": "Severe damage to cabbage/cauliflower"},
            {"name": "Fruit and Shoot Borer", "type": "pest", "severity": "high", "note": "Brinjal and Okra damage"},
        ],
        10: [
            {"name": "Root-knot Nematodes", "type": "pest", "severity": "medium", "note": "Stunting and yellowing visible"},
        ]
    },

    "general": {
        5: [
             {"name": "White Grub", "type": "pest", "severity": "low", "note": "Adult beetles emerge after first pre-monsoon showers"},
        ],
        6: [
             {"name": "Locusts", "type": "pest", "severity": "medium", "note": "Migration swarms possible in NW India"},
             {"name": "Mole Cricket", "type": "pest", "severity": "medium", "note": "Nursery damage to multi-crops"},
        ],
        7: [
             {"name": "White Grub", "type": "pest", "severity": "high", "note": "Larvae cause severe root damage across many crops"},
             {"name": "Wireworm", "type": "pest", "severity": "medium", "note": "Soil pest feeding on roots and seeds"},
        ],
        8: [
             {"name": "Blister Beetles", "type": "pest", "severity": "medium", "note": "Adults feed on flowers of pulses and cereals"},
        ],
        9: [
             {"name": "Cutworms", "type": "pest", "severity": "high", "note": "Nocturnal feeding on early Rabi crops"},
        ]
    }
}


def get_pest_calendar(crop_name: str, month: int = None) -> List[Dict[str, Any]]:
    """
    Get pest calendar entries for a crop.

    Args:
        crop_name: Crop name (case-insensitive)
        month: Specific month (1-12), or None for all months

    Returns: List of pest/disease entries
    """
    crop_key = crop_name.lower().strip()

    # Try exact then partial match
    calendar = PEST_CALENDAR.get(crop_key)
    if not calendar:
        for key in PEST_CALENDAR:
            if key in crop_key or crop_key in key:
                calendar = PEST_CALENDAR[key]
                break

    if not calendar:
        return []

    if month is not None:
        return calendar.get(month, [])

    # Return all months sorted
    result = []
    for m in sorted(calendar.keys()):
        for entry in calendar[m]:
            result.append({**entry, "month": m})
    return result


def get_current_month_threats(crop_name: str) -> List[Dict[str, Any]]:
    """Get pest/disease threats for the current month."""
    return get_pest_calendar(crop_name, datetime.now().month)
