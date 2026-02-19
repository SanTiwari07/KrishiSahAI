from datetime import datetime

def get_demo_notifications(user_id):
    try:
        return [
            {
                "id": 1,
                "title": "Severe weather alert",
                "message": "Heavy rainfall expected in your area.",
                "type": "weather",
                "priority": "high",
                "action": "Cover harvested crops immediately.",
                "source": "Weather API",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "read": False
            },
            {
                "id": 2,
                "title": "MSP Update",
                "message": "Wheat prices increased by 150/quintal.",
                "type": "market",
                "priority": "medium",
                "action": "Check local mandi prices.",
                "source": "Market News",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "read": False
            },
            {
                "id": 3,
                "title": "Crop Advisory",
                "message": "Ideal time to sow Rabi crops.",
                "type": "advisory",
                "priority": "low",
                "action": "Prepare soil for sowing.",
                "source": "KrishiSahAI",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "read": False
            },
            {
                "id": 4,
                "title": "Pest Alert",
                "message": "Brown planthopper activity reported nearby.",
                "type": "pest",
                "priority": "high",
                "action": "Monitor fields for hopper burn.",
                "source": "Pest Control",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "read": False
            }
        ]
    except Exception:
        return []
