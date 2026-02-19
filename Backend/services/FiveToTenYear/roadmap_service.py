
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

        # 3. New Specific Roadmap Prompt
        prompt = f"""You are an expert agricultural consultant. Create a comprehensive 10-Year Business Roadmap for '{context['business_name']}'.

Farmer Details:
- Name: {context['farmer_name']}
- Location: {context['location']}
- Land Size: {context['land_size']}
- Starting Capital/Budget: {context['capital']}
- Experience: {profile.get('experience_years', profile.get('experience', 'Not specified'))} years
- Market Access: {profile.get('market_access', 'Moderate')}
- Risk Preference: {profile.get('risk_level', profile.get('risk_preference', 'Medium'))}

Please write a detailed report using the exact structure below. STRICTLY NO EMOJIS. Use Markdown headers and bold text.

# Title: 10-Year Sustainability & Profit Planner for {context['business_name']}

# Overview
[Write a 2-3 sentence summary focusing on long-term sustainability and the farmer's specific context.]

# 1. 10-Year Growth & Profit Planner
[Provide a Year-wise breakdown from Year 1 to Year 10. Format each year as a clear block like this:]

## Year 1: [Main Goal]
- **Strategic Focus**: [Primary objective]
- **Key Actions**: [2-3 specific actionable steps]
- **Expected Profit**: ₹[Amount]

... (Repeat for Years 2 through 10) ...

# 2. Labor & Aging Analysis
[How labor requirements shift as the farmer ages (current age: {profile.get('age', 35)}). Include specific automation triggers for years 4, 7, and 10.]

# 3. Sustainability & Succession
[A plan for multi-generational wealth transfer and soil/resource health.]

# 4. Financial Resilience
[How to handle 1 "bad year" (drought/pest) during Phase 1 (Years 1-3) vs Phase 3 (Years 7-10).]

# 5. Final Verdict
[Feasibility score and long-term ROI.]

DISCLAIMER: This roadmap is an AI-generated simulation based on provided data and regional averages. Actual results may vary due to market fluctuations, climate conditions, and individual management. This should not be considered financial or legal advice. Consult with local agricultural experts before major investments.
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
        Parses the multi-section Markdown output into a dictionary for the frontend.
        """
        import re
        
        roadmap = {
            "title": f"10-Year Sustainability & Profit Planner for {business_name}",
            "overview": "",
            "years": [],
            "labor_analysis": "",
            "sustainability_plan": "",
            "resilience_strategy": "",
            "verdict": "",
            "disclaimer": ""
        }

        # Helper for section extraction
        def get_section(name, next_section=None):
            pattern = rf'# {name}\n(.*?)(?=# {next_section}|\Z)' if next_section else rf'# {name}\n(.*)'
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            return match.group(1).strip() if match else ""

        roadmap['overview'] = get_section("Overview", "1. 10-Year Growth & Profit Planner")
        roadmap['labor_analysis'] = get_section("2. Labor & Aging Analysis", "3. Sustainability & Succession")
        roadmap['sustainability_plan'] = get_section("3. Sustainability & Succession", "4. Financial Resilience")
        roadmap['resilience_strategy'] = get_section("4. Financial Resilience", "5. Final Verdict")
        
        # Extract verdict and disclaimer separately
        verdict_block = get_section("5. Final Verdict")
        if "DISCLAIMER:" in verdict_block:
            parts = verdict_block.split("DISCLAIMER:")
            roadmap['verdict'] = parts[0].strip()
            roadmap['disclaimer'] = parts[1].strip()
        else:
            roadmap['verdict'] = verdict_block

        # Parse Years 1-10
        year_blocks = re.findall(r'## (Year \d+): (.*?)\n(.*?)(?=## Year \d+:|\Z|# 2.)', text, re.DOTALL | re.IGNORECASE)
        for year_label, goal, content in year_blocks:
            year_data = {
                "year": year_label.strip(),
                "goal": goal.strip(),
                "focus": "",
                "actions": [],
                "profit": ""
            }
            
            # Extract details using smaller regexes
            focus_match = re.search(r'\*\*Strategic Focus\*\*:\s*(.*)', content, re.IGNORECASE)
            year_data['focus'] = focus_match.group(1).strip() if focus_match else ""
            
            profit_match = re.search(r'\*\*Expected Profit\*\*:\s*(.*)', content, re.IGNORECASE)
            year_data['profit'] = profit_match.group(1).strip() if profit_match else ""
            
            actions_match = re.search(r'\*\*Key Actions\*\*:\s*(.*?)(?=\*\*Expected Profit\*\*|\Z)', content, re.DOTALL | re.IGNORECASE)
            if actions_match:
                raw_actions = actions_match.group(1).strip()
                lines = raw_actions.split('\n')
                year_data['actions'] = [re.sub(r'^[-*]\s*', '', l).strip() for l in lines if l.strip()]

            roadmap['years'].append(year_data)

        # Fallback if parsing failed
        if not roadmap['years']:
            print("[ROADMAP WARNING] Regex year extraction failed. Possible format mismatch.")

        return roadmap
