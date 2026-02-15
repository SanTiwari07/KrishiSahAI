
import os
import json
import firebase_admin
from firebase_admin import firestore
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Initialize Firestore (assuming firebase_admin is already initialized in app.py)
# Initialize Firestore lazily
db = None
try:
    db = firestore.client()
except Exception as e:
    print(f"[WARNING] Firestore client initialization failed in roadmap_service: {e}")


# Reusing Business Options from Chatbot for metadata
# optimally this should be in a shared config or DB, but for now we duplicate or import
# importing might be tricky due to path issues, so defining a small lookup helper
BUSINESS_OPTIONS = [
    {"id": "1", "title": "FLOWER PLANTATION (GERBERA)"},
    {"id": "2", "title": "PACKAGED DRINKING WATER BUSINESS"},
    {"id": "3", "title": "AMUL FRANCHISE BUSINESS"},
    {"id": "4", "title": "SPIRULINA FARMING (ALGAE)"},
    {"id": "5", "title": "DAIRY FARMING (6–8 COW UNIT)"},
    {"id": "6", "title": "GOAT MILK FARMING (20–25 MILCH GOATS UNIT)"},
    {"id": "7", "title": "MUSHROOM FARMING (OYSTER)"},
    {"id": "8", "title": "POULTRY FARMING (BROILER)"},
    {"id": "9", "title": "VERMICOMPOST PRODUCTION"},
    {"id": "10", "title": "PLANT NURSERY"},
    {"id": "11", "title": "COW DUNG ORGANIC MANURE & BIO-INPUTS"},
    {"id": "12", "title": "COW DUNG PRODUCTS (DHOOP, DIYAS)"},
    {"id": "13", "title": "LEAF PLATE (DONA–PATTAL) MANUFACTURING"},
    {"id": "14", "title": "AGRI-INPUT TRADING"},
    {"id": "15", "title": "INLAND FISH FARMING (POND-BASED)"}
]

class SustainabilityRoadmapGenerator:
    def __init__(self):
        self.llm = ChatOllama(
            model=os.getenv("OLLAMA_MODEL", "llama3.2"),
            temperature=0.5, # Increased for better structured output
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        )

    def get_farmer_profile(self, user_id):
        try:
            if db is None:
                 print("[WARNING] Firestore not initialized, returning None for profile")
                 return None
            doc_ref = db.collection('users').document(user_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error fetching farmer profile: {e}")
            return None

    def get_business_metadata(self, business_title_or_id):
        # normalize input
        search = business_title_or_id.lower().strip()
        for b in BUSINESS_OPTIONS:
            if b['id'] == search or b['title'].lower() == search:
                return b
        # fallback if exact match fails, try partial
        for b in BUSINESS_OPTIONS:
            if search in b['title'].lower():
                return b
        return {"title": business_title_or_id, "id": "unknown"}

    def generate_roadmap(self, user_id, business_name):
        # 1. Fetch Data
        profile = self.get_farmer_profile(user_id)
        if not profile:
            print(f"[ROADMAP] Profile not found for {user_id}. Using fallback default profile.")
            profile = {
                "name": "Guest Farmer",
                "age": 35,
                "village": "Unknown",
                "district": "Unknown",
                "state": "Unknown",
                "land_size": 5,
                "capital": 100000,
                "market_access": "Moderate",
                "risk_level": "Medium",
                "experience_years": 5,
                "family_structure": "Nuclear"
            }

        business_meta = self.get_business_metadata(business_name)

        # 2. Construct Context
        context = {
            "farmer_name": profile.get("name", "Farmer"),
            "location": f"{profile.get('village', '')}, {profile.get('district', '')}, {profile.get('state', '')}",
            "land_size": f"{profile.get('landSize', profile.get('land_size', 0))} acres",
            "capital": f"₹{profile.get('capital', 'Not specified')}",
            "business_name": business_meta['title'],
        }

        # 3. Robust Markdown Prompt
        # We ask for a structured report instead of JSON to help smaller models (Llama 3.2 1B)
        prompt = f"""You are an expert agricultural consultant. Create a 10-Year Business Roadmap for '{context['business_name']}'.
        
Context:
- Farmer: {context['farmer_name']} from {context['location']}
- Land Size: {context['land_size']}
- Starting Capital: {context['capital']}

Please write a detailed report using the exact structure below. Do NOT output JSON. Use Markdown headers.

# Title: 10-Year Roadmap for {context['business_name']}

# Overview
[Write a detailed 2-3 sentence summary of the business plan here, focusing on long-term sustainability and profitability.]

# Phase 1: Foundation (Year 0-2)
- Timeframe: Months 1-24
- Focus: Initial setup, infrastructure, and stabilization
- Actions: [List 5 detailed startup actions, be specific about equipment, licenses, or soil preparation]
- Milestones: [List 3 key milestones to track progress]
- Financial Target: Revenue ₹[Amount]
- Profit Margin: [Percentage]% (Estimates based on current market rates)

# Phase 2: Growth (Year 3-5)
- Timeframe: Months 25-60
- Focus: Expansion, scaling production, and market penetration
- Actions: [List 5 detailed growth actions, including marketing and logistics]
- Milestones: [List 3 expansion milestones]
- Financial Target: Revenue ₹[Amount]
- Profit Margin: [Percentage]%

# Phase 3: Maturity (Year 6-10)
- Timeframe: Months 61-120
- Focus: Automation, value addition, and succession planning
- Actions: [List 5 sustainability and automation actions]
- Milestones: [List 3 final milestones]
- Financial Target: Revenue ₹[Amount]
- Profit Margin: [Percentage]%

# Financial Resilience
[Write 2-3 sentences on how to handle bad years, market risks, and crop failure.]

# Final Verdict
[Highly Feasible / Feasible / Challenging] - [Reason]
"""
        
        # 4. Call LLM
        print(f"[ROADMAP] Generating roadmap for {business_name} using markdown prompt...")
        try:
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            
            # DEBUG: Show raw response
            print("=" * 40)
            print(f"[ROADMAP DEBUG] Raw response length: {len(content)} chars")
            print(content[:200] + "...")
            print("=" * 40)
            
            # 5. Parse Markdown to Dictionary
            roadmap_json = self.parse_markdown_roadmap(content, context['business_name'])
            return roadmap_json

        except Exception as e:
            print(f"[ROADMAP ERROR] Generation failed: {e}")
            # Return a safe fallback structure so the UI doesn't crash
            return {
                "title": f"Roadmap for {business_name} (Error)",
                "overview": "Could not generate detailed roadmap due to high server load.",
                "phases": [],
                "final_verdict": "Retry Later"
            }

    def parse_markdown_roadmap(self, text, business_name):
        """
        Parses the Markdown output from the LLM into the dictionary structure expected by the frontend.
        """
        import re
        
        # Initialize default structure
        roadmap = {
            "title": f"10-Year Roadmap for {business_name}",
            "overview": "Detailed business roadmap.",
            "phases": [],
            "automation_recommendations": ["Smart irrigation", "Market linkage apps"], # Defaults
            "financial_resilience_strategy": "Diversify crops and maintain emergency savings.",
            "final_verdict": "Feasible"
        }

        # Extract Title
        title_match = re.search(r'# Title:\s*(.*)', text, re.IGNORECASE)
        if title_match:
            roadmap['title'] = title_match.group(1).strip()

        # Extract Overview
        overview_match = re.search(r'# Overview\s*\n(.*?)\n#', text, re.DOTALL | re.IGNORECASE)
        if overview_match:
            roadmap['overview'] = overview_match.group(1).strip()

        # Extract Strategy
        strat_match = re.search(r'# Financial Resilience\s*\n(.*?)\n#', text, re.DOTALL | re.IGNORECASE)
        if strat_match:
            roadmap['financial_resilience_strategy'] = strat_match.group(1).strip()

        # Extract Verdict
        verdict_match = re.search(r'# Final Verdict\s*\n(.*?)$', text, re.DOTALL | re.IGNORECASE)
        if verdict_match:
            roadmap['final_verdict'] = verdict_match.group(1).strip()

        # Extract Phases
        # We manually look for Phase 1, 2, 3 blocks
        phase_patterns = [
            (r'# Phase 1:(.*?)(?=# Phase 2)', "Year 0-2"),
            (r'# Phase 2:(.*?)(?=# Phase 3)', "Year 3-5"),
            (r'# Phase 3:(.*?)(?=# Financial Resilience)', "Year 6-10")
        ]
        
        full_text_search = text + "\n# End" # Sentinel for last regex, though not strictly needed for Phase 3 if we match Resilience
        
        for i, (pattern, default_period) in enumerate(phase_patterns):
            phase_match = re.search(pattern, full_text_search, re.DOTALL | re.IGNORECASE)
            if phase_match:
                block = phase_match.group(1).strip()
                
                # Extract details from the block
                # Helper to find value after key
                def get_val(key):
                    # Matches: "- Key: Value", "## Key: Value", "* Key: Value", "Key: Value"
                    m = re.search(rf'(?:-|\*|#+)?\s*{key}:\s*(.*)', block, re.IGNORECASE)
                    return m.group(1).strip() if m else "TBD"
                
                def get_list(key):
                    # Finds content under a key until the next likely key or end of string
                    # Use a known set of keys to lookahead
                    known_keys = "Timeframe|Focus|Actions|Milestones|Financial Target"
                    pattern = rf'(?:-|\*|#+)?\s*{key}:\s*(.*?)(?=(?:-|\*|#+)\s*(?:{known_keys}):|\Z)'
                    
                    m = re.search(pattern, block, re.DOTALL | re.IGNORECASE)
                    if not m: return []
                    raw_list = m.group(1).strip()
                    
                    items = []
                    # formatted like [item1, item2]?
                    if '[' in raw_list and ']' in raw_list:
                         content = raw_list.replace('[','').replace(']','')
                         items = [x.strip() for x in content.split(',')]
                    else:
                         # formatted as bullets or numbered list?
                         lines = raw_list.split('\n')
                         for line in lines:
                             # Remove "1.", "2.", "-", "*" prefixes
                             clean = re.sub(r'^(\d+\.|-|\*)\s*', '', line.strip()).strip()
                             if clean: items.append(clean)
                    return items

                phase_data = {
                    "phase": f"Phase {i+1}",
                    "timeframe": get_val("Timeframe"),
                    "focus": get_val("Focus"),
                    "profit_margin": get_val("Profit Margin"),
                    "quarters": [
                        {
                            "period": default_period,
                            "actions": get_list("Actions"),
                            "milestones": get_list("Milestones"),
                            "financial_target": get_val("Financial Target")
                        }
                    ]
                }
                
                roadmap['phases'].append(phase_data)
        
        # Fallback if phases extraction failed completely
        if not roadmap['phases']:
            print("[ROADMAP WARNING] Regex phase extraction failed. Using fallback phase.")
            roadmap['phases'].append({
                "phase": "Phase 1: Foundation",
                "timeframe": "Year 1",
                "focus": "Setup",
                "quarters": [{"period": "Year 1", "actions": ["Secure funding", "Prepare land"], "milestones": ["Ops started"], "financial_target": "N/A"}]
            })

        return roadmap
