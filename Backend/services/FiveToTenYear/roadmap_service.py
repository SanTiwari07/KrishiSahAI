
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

    def generate_roadmap(self, user_id, business_name, language='en'):
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
        lang_upper = str(language).upper()
        if lang_upper not in ['EN', 'HI', 'MR']:
            lang_upper = 'EN'

        # 2. Construct Context
        context = {
            "farmer_name": profile.get("name", "Farmer"),
            "location": f"{profile.get('village', 'Unknown Village')}, {profile.get('district', 'Unknown District')}, {profile.get('state', 'Unknown State')}",
            "land_size": f"{profile.get('landSize', profile.get('land_size', 0))} {profile.get('land_unit', 'acres')}",
            "capital": f"₹{profile.get('capital', 'Not specified')}",
            "business_name": business_meta['title'],
            "age": profile.get('age', 35),
            "experience": profile.get('experience_years', profile.get('experience', 'Not specified')),
            "soil_type": profile.get('soil_type', 'Not specified'),
            "water_availability": profile.get('water_availability', 'Not specified'),
            "crops_grown": ", ".join(profile.get('crops_grown', [])) if profile.get('crops_grown') else "None specified",
            "market_access": profile.get('market_access', 'Moderate'),
            "risk_preference": profile.get('risk_level', profile.get('risk_preference', 'Medium')),
            "language_name": {"EN": "English", "HI": "Hindi", "MR": "Marathi"}[lang_upper]
        }

        # Language-specific labels/headers for the prompt
        LANG_CONFIG = {
            "EN": {
                "milestone": "Strategic Milestone Name",
                "focus": "Strategic Focus",
                "actions": "Key Actions",
                "profit": "Expected Profit",
                "year_term": "Year",
                "headers": ["Overview", "1. 10-Year Growth & Profit Planner", "2. Labor & Aging Analysis", "3. Sustainability & Succession", "4. Financial Resilience", "5. Final Verdict"]
            },
            "HI": {
                "milestone": "रणनीतिक उपलब्धि का नाम",
                "focus": "रणनीतिक फोकस",
                "actions": "मुख्य कार्य",
                "profit": "अपेक्षित लाभ",
                "year_term": "वर्ष",
                "headers": ["अवलोकन", "1. 10-वर्षीय विकास और लाभ योजनाकार", "2. श्रम और उम्र बढ़ने का विश्लेषण", "3. स्थिरता और उत्तराधिकार", "4. वित्तीय लचीलापन", "5. अंतिम निर्णय"]
            },
            "MR": {
                "milestone": "धोरणात्मक मैलाचा दगड",
                "focus": "धोरणात्मक लक्ष",
                "actions": "मुख्य कृती",
                "profit": "अपेक्षित नफा",
                "year_term": "वर्ष",
                "headers": ["आढावा", "1. 10-वर्षांचे विकास आणि नफा नियोजक", "2. श्रम आणि वृद्धत्व विश्लेषण", "3. शाश्वतता आणि उत्तराधिकार", "4. आर्थिक लवचिकता", "5. अंतिम निकाल"]
            }
        }
        
        cfg = LANG_CONFIG[lang_upper]

        # 3. New Specific Roadmap Prompt
        prompt = f"""You are an expert Agricultural Decision Intelligence Consultant. 
Create a HIGHLY DETAILED and professional 10-Year Business Roadmap for '{context['business_name']}'.
STRICTLY generate the ENTIRE response in {context['language_name']} language. EVERY SINGLE WORD must be in {context['language_name']}.

Farmer Profile:
- Name: {context['farmer_name']}
- Age: {context['age']} (Crucial for labor/aging analysis)
- Location: {context['location']}
- Land: {context['land_size']} (Soil: {context['soil_type']}, Water: {context['water_availability']})
- Current Crops: {context['crops_grown']}
- Starting Capital: {context['capital']}
- Experience: {context['experience']} years
- Market Access: {context['market_access']}
- Risk Tolerance: {context['risk_preference']}

Guidelines:
1. Provide granular, actionable advice tailored to the specific context (soil, water, experience).
2. For each year, explain WHY these actions are chosen and HOW they lead to the profit goals.
3. STRICTLY NO EMOJIS. Use professional Markdown formatting.
4. Ensure the 10-year timeline shows clear progression (Scale-up, Diversification, Automation).
5. Output the response in {context['language_name']}.

Structure (Use these exact Headers in {context['language_name']}):

# {cfg['headers'][0]}
[A comprehensive 3-5 sentence summary in {context['language_name']}. Analyze how {context['business_name']} integrated with current farm resources and the farmer's experience can lead to long-term success.]

# {cfg['headers'][1]}
[Provide a meticulous Year-wise breakdown ({cfg['year_term']} 1 to {cfg['year_term']} 10). Each year must be a clear block:]

## {cfg['year_term']} 1: [{cfg['milestone']}]
- **{cfg['focus']}**: [Detailed objective for the year]
- **{cfg['actions']}**: [3-5 highly specific, numbered steps in {context['language_name']}.]
- **{cfg['profit']}**: ₹[Amount]

... (Repeat for {cfg['year_term']} 2 through 10, showing scale-up and reinvestment) ...

# {cfg['headers'][2]}
[Explain how labor needs will be managed as the farmer ages from {context['age']} to {context['age']+10} in {context['language_name']}. Specify hardware/automation triggers for Year 4, 7, and 10 to reduce physical strain.]

# {cfg['headers'][3]}
[Document soil health management, resource recycling (e.g., waste-to-value), and a legacy plan for multi-generational wealth in {context['language_name']}.]

# {cfg['headers'][4]}
[Compare risk mitigation strategies for a 'Bad Year' in the early stage (Years 1-3) vs. the mature stage (Years 7-10) in {context['language_name']}. Focus on cash reserves and insurance.]

# {cfg['headers'][5]}
[Detailed feasibility score (0-100) and analysis of long-term Return on Investment (ROI) in {context['language_name']}.]

DISCLAIMER: This roadmap is an AI-generated simulation based on provided data and regional averages. Actual results may vary due to market fluctuations, climate conditions, and individual management. This should not be considered financial or legal advice. Consult with local agricultural experts before major investments.
"""
        
        # 4. Call LLM
        print(f"[ROADMAP] Generating roadmap for {business_name} in {lang_upper} using markdown prompt...")
        try:
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            
            # DEBUG: Show raw response
            print("=" * 40)
            print(f"[ROADMAP DEBUG] Raw response length: {len(content)} chars")
            print(content[:200] + "...")
            print("=" * 40)
            
            # 5. Parse Markdown to Dictionary
            roadmap_json = self.parse_markdown_roadmap(content, context['business_name'], lang_upper)
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

    def generate_crop_roadmap(self, user_id, crop_name, language='en'):
        # 1. Fetch Data
        profile = self.get_farmer_profile(user_id)
        if not profile:
            profile = {
                "name": "Guest Farmer",
                "age": 35,
                "land_size": 5,
                "experience_years": 5,
            }

        lang_upper = str(language).upper()
        if lang_upper not in ['EN', 'HI', 'MR']:
            lang_upper = 'EN'

        # 2. Construct Context
        context = {
            "farmer_name": profile.get("name", "Farmer"),
            "location": f"{profile.get('village', 'Unknown Village')}, {profile.get('district', 'Unknown District')}, {profile.get('state', 'Unknown State')}",
            "land_size": f"{profile.get('landSize', profile.get('land_size', 0))} {profile.get('land_unit', 'acres')}",
            "crop_name": crop_name,
            "age": profile.get('age', 35),
            "experience": profile.get('experience_years', profile.get('experience', 'Not specified')),
            "soil_type": profile.get('soil_type', 'Not specified'),
            "water_availability": profile.get('water_availability', 'Not specified'),
            "market_access": profile.get('market_access', 'Moderate'),
            "risk_preference": profile.get('risk_level', profile.get('risk_preference', 'Medium')),
            "language_name": {"EN": "English", "HI": "Hindi", "MR": "Marathi"}[lang_upper]
        }

        # Language-specific labels/headers for the crop prompt
        CROP_LANG_CONFIG = {
            "EN": {
                "milestone": "Lifecycle Milestone",
                "focus": "Critical Focus",
                "actions": "Required Actions",
                "profit": "Projected Value/Yield",
                "time_term": "Week/Month",
                "headers": ["Crop Overview", "1. Crop Lifecycle Planner", "2. Resource & Labor Management", "3. Quality & Harvest Sustainability", "4. Market & Risk Management", "5. Final Harvest Verdict"]
            },
            "HI": {
                "milestone": "जीवनचक्र उपलब्धि",
                "focus": "महत्वपूर्ण फोकस",
                "actions": "आवश्यक कार्य",
                "profit": "अनुमानित मूल्य/उपज",
                "time_term": "सप्ताह/महीना",
                "headers": ["फसल अवलोकन", "1. फसल जीवनचक्र योजनाकार", "2. संसाधन और श्रम प्रबंधन", "3. गुणवत्ता और फसल स्थिरता", "4. बाजार और जोखिम प्रबंधन", "5. अंतिम फसल निर्णय"]
            },
            "MR": {
                "milestone": "जीवनचक्र मैलाचा दगड",
                "focus": "गंभीर लक्ष",
                "actions": "आवश्यक कृती",
                "profit": "अपेक्षित मूल्य/उत्पन्न",
                "time_term": "आठवडा/महिना",
                "headers": ["पीक आढावा", "1. पीक जीवनचक्र नियोजक", "2. संसाधन आणि श्रम व्यवस्थापन", "3. गुणवत्ता आणि पीक शाश्वतता", "4. बाजार आणि जोखीम व्यवस्थापन", "5. अंतिम पीक निकाल"]
            }
        }
        
        cfg = CROP_LANG_CONFIG[lang_upper]

        # 3. Crop Roadmap Prompt
        prompt = f"""You are an expert Agricultural Agronomist and Crop Success Consultant. 
Create a HIGHLY DETAILED and professional Lifecycle Roadmap for the crop '{context['crop_name']}'.
STRICTLY generate the ENTIRE response in {context['language_name']} language. EVERY SINGLE WORD must be in {context['language_name']}.

Farmer Profile:
- Name: {context['farmer_name']}
- Location: {context['location']}
- Land: {context['land_size']} (Soil: {context['soil_type']}, Water: {context['water_availability']})
- Crop to Grow: {context['crop_name']}
- Experience: {context['experience']} years
- Market Access: {context['market_access']}

Guidelines:
1. Provide a step-by-step advisor from sowing to harvest.
2. Break the timeline into logical phases (e.g., Sowing, Vegetative, Flowering, Fruiting, Harvest).
3. For each phase, provide specific actions regarding irrigation, fertilization, and pest control.
4. STRICTLY NO EMOJIS. Use professional Markdown formatting.
5. Output the response in {context['language_name']}.

Structure (Use these exact Headers in {context['language_name']}):

# {cfg['headers'][0]}
[A 3-5 sentence summary of the {context['crop_name']} lifecycle on this specific farm.]

# {cfg['headers'][1]}
[Provide a meticulous Phase-wise breakdown. Each phase must be a clear block:]

## Phase 1: [{cfg['milestone']}]
- **{cfg['focus']}**: [Detailed objective for this phase]
- **{cfg['actions']}**: [3-5 highly specific, numbered steps in {context['language_name']}.]
- **{cfg['profit']}**: [Expected weight or value]

... (Repeat for all phases until harvest) ...

# {cfg['headers'][2]}
[Explain how resources (water, fertilizer) and labor should be allocated in {context['language_name']}.]

# {cfg['headers'][3]}
[Focus on post-harvest handling and maintaining soil health for the next cycle in {context['language_name']}.]

# {cfg['headers'][4]}
[Identify common pests/diseases for {context['crop_name']} and how to mitigate them in {context['language_name']}.]

# {cfg['headers'][5]}
[Final feasibility score and harvest success probability in {context['language_name']}.]

DISCLAIMER: This roadmap is an AI-generated simulation based on provided data and regional averages. Actual results may vary due to climate conditions and management.
"""
        
        print(f"[CROP-ROADMAP] Generating for {crop_name} in {lang_upper}...")
        try:
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            roadmap_json = self.parse_markdown_roadmap(content, context['crop_name'], lang_upper, is_crop=True)
            return roadmap_json
        except Exception as e:
            print(f"[CROP-ROADMAP ERROR] {e}")
            return {"title": f"Roadmap for {crop_name} (Error)", "overview": str(e), "years": [], "verdict": "Error"}

    def parse_markdown_roadmap(self, text, business_name, language='EN', is_crop=False):
        """
        Parses the multi-section Markdown output into a dictionary for the frontend.
        """
        import re
        
        title_prefix = "Crop Lifecycle" if is_crop else "10-Year Sustainability & Profit"
        roadmap = {
            "title": f"{title_prefix} Planner for {business_name}",
            "overview": "",
            "years": [],
            "labor_analysis": "",
            "sustainability_plan": "",
            "resilience_strategy": "",
            "verdict": "",
            "disclaimer": ""
        }

        # Multi-language header mapping for the parser
        # We look for ANY of these patterns to demarcate sections
        HEADERS = {
            "overview": r'# (?:Overview|अवलोकन|आढावा|Crop Overview|फसल अवलोकन|पीक आढावा)',
            "planner": r'# (?:1\. 10-Year Growth & Profit Planner|1\. 10-वर्षीय विकास और लाभ योजनाकार|1\. 10-वर्षांचे विकास आणि नफा नियोजक|1\. Crop Lifecycle Planner|1\. फसल जीवनचक्र योजनाकार|1\. पीक जीवनचक्र नियोजक)',
            "labor": r'# (?:2\. Labor & Aging Analysis|2\. श्रम और उम्र बढ़ने का विश्लेषण|2\. श्रम आणि वृद्धत्व विश्लेषण|2\. Resource & Labor Management|2\. संसाधन और श्रम प्रबंधन|2\. संसाधन आणि श्रम व्यवस्थापन)',
            "sustainability": r'# (?:3\. Sustainability & Succession|3\. स्थिरता और उत्तराधिकार|3\. शाश्वतता आणि उत्तराधिकार|3\. Quality & Harvest Sustainability|3\. गुणवत्ता और फसल स्थिरता|3\. गुणवत्ता आणि पीक शाश्वतता)',
            "resilience": r'# (?:4\. Financial Resilience|4\. वित्तीय लचीलापन|4\. आर्थिक लवचिकता|4\. Market & Risk Management|4\. बाजार और जोखिम प्रबंधन|4\. बाजार आणि जोखीम व्यवस्थापन)',
            "verdict": r'# (?:5\. Final Verdict|5\. अंतिम निर्णय|5\. अंतिम निकाल|5\. Final Harvest Verdict|5\. अंतिम फसल निर्णय|5\. अंतिम पीक निकाल)'
        }

        def extract_between(start_regex, end_regex=None):
            if end_regex:
                pattern = rf'{start_regex}\n(.*?)(?={end_regex}|\Z)'
            else:
                pattern = rf'{start_regex}\n(.*)'
            match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
            return match.group(1).strip() if match else ""

        roadmap['overview'] = extract_between(HEADERS['overview'], HEADERS['planner'])
        roadmap['labor_analysis'] = extract_between(HEADERS['labor'], HEADERS['sustainability'])
        roadmap['sustainability_plan'] = extract_between(HEADERS['sustainability'], HEADERS['resilience'])
        roadmap['resilience_strategy'] = extract_between(HEADERS['resilience'], HEADERS['verdict'])
        
        # Extract verdict and disclaimer
        verdict_block = extract_between(HEADERS['verdict'])
        if "DISCLAIMER:" in verdict_block or "अस्वीकरण:" in verdict_block:
            parts = re.split(r'(?:DISCLAIMER:|अस्वीकरण:)', verdict_block, flags=re.IGNORECASE)
            roadmap['verdict'] = parts[0].strip()
            roadmap['disclaimer'] = parts[1].strip()
        else:
            roadmap['verdict'] = verdict_block

        # Parse Years/Phases (Flexible for "Year", "वर्ष", "Phase", etc.)
        year_pattern = r'## (?:Year|वर्ष|Phase) (\d+): (.*?)\n(.*?)(?=## (?:Year|वर्ष|Phase) \d+:|\Z|# [2345])'
        year_blocks = re.findall(year_pattern, text, re.DOTALL | re.IGNORECASE)
        
        # Labels for inner fields can also be translated
        focus_labels = r'(?:\*\*Strategic Focus\*\*|\*\*रणनीतिक फोकस\*\*|\*\*धोरणात्मक लक्ष\*\*|\*\*Critical Focus\*\*|\*\*महत्वपूर्ण फोकस\*\*|\*\*गंभीर लक्ष\*\*)'
        profit_labels = r'(?:\*\*Expected Profit\*\*|\*\*अपेक्षित लाभ\*\*|\*\*अपेक्षित नफा\*\*|\*\*Projected Value/Yield\*\*|\*\*अनुमानित मूल्य/उपज\*\*|\*\*अपेक्षित मूल्य/उत्पन्न\*\*)'
        actions_labels = r'(?:\*\*Key Actions\*\*|\*\*मुख्य कार्य\*\*|\*\*मुख्य कृती\*\*|\*\*Required Actions\*\*|\*\*आवश्यक कार्य\*\*|\*\*आवश्यक कृती\*\*)'

        for year_num, goal, content in year_blocks:
            year_data = {
                "year": f"{'Phase' if is_crop else ('Year' if language=='EN' else 'वर्ष')} {year_num}",
                "goal": goal.strip(),
                "focus": "",
                "actions": [],
                "profit": ""
            }
            
            focus_match = re.search(rf'{focus_labels}:\s*(.*)', content, re.IGNORECASE)
            year_data['focus'] = focus_match.group(1).strip() if focus_match else ""
            
            profit_match = re.search(rf'{profit_labels}:\s*(.*)', content, re.IGNORECASE)
            year_data['profit'] = profit_match.group(1).strip() if profit_match else ""
            
            actions_match = re.search(rf'{actions_labels}:\s*(.*?)(?={profit_labels}|\Z)', content, re.DOTALL | re.IGNORECASE)
            if actions_match:
                raw_actions = actions_match.group(1).strip()
                lines = raw_actions.split('\n')
                year_data['actions'] = [re.sub(r'^[-*]\s*', '', l).strip() for l in lines if l.strip()]

            roadmap['years'].append(year_data)

        if not roadmap['years']:
            print("[ROADMAP WARNING] Regex year/phase extraction failed. Possible format mismatch.")

        return roadmap
