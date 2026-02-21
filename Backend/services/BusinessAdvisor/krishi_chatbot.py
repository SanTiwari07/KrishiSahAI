"""
KrishiSahAI Business Advisor Chatbot
AI-powered business advisor for Indian farmers using LangChain + Ollama
"""

import os
from typing import Optional, List
import json
import re
import html

# --- LANGCHAIN IMPORTS (Refactored for correctness) ---
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableSerializable
from pydantic import BaseModel, field_validator

# ============================================
# BUSINESS OPTIONS (STRICT LIST)
# ============================================

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

# ============================================
# GLOBAL CONFIGURATION
# ============================================

DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
DEFAULT_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

force_cpu = os.getenv("OLLAMA_FORCE_CPU", "1").lower() not in {"0", "false"}
if force_cpu and "OLLAMA_NUM_GPU" not in os.environ:
    # Force Ollama to run the model on CPU to avoid CUDA dependency on machines without GPUs
    os.environ["OLLAMA_NUM_GPU"] = "0"


# ============================================
# FARMER PROFILE MODEL
# ============================================

class FarmerProfile(BaseModel):
    """Structured farmer profile data"""
    name: str
    land_size: float  # in acres
    capital: float  # in rupees
    market_access: str  # good/moderate/poor
    skills: List[str]  # farming, dairy, business, solar, etc.
    risk_level: str  # low/medium/high
    time_availability: str  # full-time/part-time
    experience_years: Optional[int] = 0
    language: str = "english"  # english/hindi/hinglish
    selling_preference: Optional[str] = None
    recovery_timeline: Optional[str] = None
    loss_tolerance: Optional[str] = None
    risk_preference: Optional[str] = None
    
    # New fields for Agricultural Decision Intelligence
    age: Optional[int] = None
    role: str = "farmer"
    state: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    soil_type: Optional[str] = None
    water_availability: Optional[str] = None
    crops_grown: Optional[List[str]] = None
    land_unit: str = "acres"

    # Business Advisory Specific Fields
    current_profit: Optional[str] = None
    running_plan: Optional[str] = None
    space_type: Optional[str] = None
    covered_space: Optional[str] = None
    infra_type: Optional[str] = None
    electricity: Optional[str] = None
    animal_handling: Optional[str] = None
    daily_labor: Optional[str] = None
    hands_on_work: Optional[str] = None
    income_comfort: Optional[str] = None
    main_goal: Optional[str] = None
    interests: Optional[List[str]] = None
    total_land: float = 0.0
    farm_name: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not re.match(r"^[a-zA-Z\s\-.']+$", v):
            raise ValueError('Name contains invalid characters')
        return v
        
    @field_validator('land_size', 'capital', 'experience_years')
    @classmethod
    def validate_positive(cls, v):
        if v is not None and v < 0:
            raise ValueError('Value must be non-negative')
        return v
    
    def to_context(self) -> str:
        """Convert profile to natural language context for AI"""
        lang = self.language.lower()
        interests_str = ", ".join(self.interests) if self.interests else "None"
        
        # Localized Content
        if lang in ["marathi", "mr"]:
            crops_str = ", ".join(self.crops_grown) if self.crops_grown else "नोंद नाही"
            context = f"""
[शेतकऱ्याची पार्श्वभूमी]
नाव: {self.name}
सक्रिय शेत (Active Farm): {self.farm_name or 'निवडलेले नाही'}
वय: {self.age or 'माहित नाही'}, भूमिका: {self.role}
स्थान: {self.village or 'माहित नाही'}, {self.district or 'माहित नाही'}, {self.state or 'माहित नाही'}
एकूण जमीन: {self.total_land} {self.land_unit}, जमिनीचा प्रकार: {self.space_type or 'Agri'}
व्यवसायासाठी जमीन: {self.land_size} {self.land_unit}, माती: {self.soil_type or 'माहित नाही'}, पाणी: {self.water_availability or 'माहित नाही'}
सध्याची पिके: {crops_str}
भांडवल: ₹{self.capital:,.0f}, अनुभव: {self.experience_years} वर्षे
प्राणी हाताळणीत सोयीस्कर: {self.animal_handling or 'माहित नाही'}
कामगारांची उपलब्धता: {self.daily_labor or 'स्वतः'}
व्यवसायाचे ध्येय: {self.main_goal or 'माहित नाही'}
आवड असलेले क्षेत्र: {interests_str}
"""
        elif lang in ["hindi", "hi"]:
            crops_str = ", ".join(self.crops_grown) if self.crops_grown else "नहीं बताया"
            context = f"""
[किसान की पृष्ठभूमि]
नाम: {self.name}
सक्रिय फार्म (Active Farm): {self.farm_name or 'चुना नहीं गया'}
आयु: {self.age or 'पता नहीं'}, भूमिका: {self.role}
गाँव: {self.village or 'पता नहीं'}, ज़िला: {self.district or 'पता नहीं'}, राज्य: {self.state or 'पता नहीं'}
कुल ज़मीन: {self.total_land} {self.land_unit}, ज़मीन का प्रकार: {self.space_type or 'Agri'}
व्यवसाय के लिए ज़मीन: {self.land_size} {self.land_unit}, मिट्टी: {self.soil_type or 'पता नहीं'}, पानी: {self.water_availability or 'पता नहीं'}
वर्तमान फसलें: {crops_str}
पूंजी: ₹{self.capital:,.0f}, अनुभव: {self.experience_years} वर्ष
पशु प्रबंधन में सहजता: {self.animal_handling or 'पता नहीं'}
श्रम स्रोत: {self.daily_labor or 'स्वयं'}
व्यापारिक लक्ष्य: {self.main_goal or 'पता नहीं'}
रुचि के क्षेत्र: {interests_str}
"""
        else:
            crops_str = ", ".join(self.crops_grown) if self.crops_grown else "Not specified"
            context = f"""
[ACTIVE FARM DATA - MANDATORY]
Active Farm Identity: {self.farm_name or 'None Selected'}
Specific Land Size: {self.land_size} {self.land_unit}
Soil Quality: {self.soil_type or 'Unknown'}
Water Availability: {self.water_availability or 'Unknown'}
Crops Currently Growing: {crops_str}

[USER OVERVIEW]
Name: {self.name}, Age: {self.age or 'Unknown'}, Role: {self.role}
Location: {self.village}, {self.district}, {self.state}
Total Farm Portfolio: {self.total_land} {self.land_unit} (Across all farms)
Space Type: {self.space_type or 'Agricultural'}
Capital: ₹{self.capital:,.0f}, Experience: {self.experience_years} yrs
Workforce: {self.daily_labor or 'Self-managed'}, Hands-on: {self.hands_on_work or 'Yes'}
Livestock Comfort: {self.animal_handling or 'Limited'}
Financial Strategy: Risk {self.risk_level}, Goal: {self.main_goal or 'Stability'}, Loss Tolerance: {self.loss_tolerance or 'Conservative'}
Economic Context: Current Profit: {self.current_profit or '0'}, Recovery Expectation: {self.recovery_timeline or 'Medium term'}
Interests: {interests_str}, Market Access: {self.market_access}, Preference: {self.selling_preference or 'Wholesale'}
"""
        return context


# ============================================
# SYSTEM PROMPTS (MULTILINGUAL)
# ============================================

SYSTEM_PROMPTS = {
    "english": """You are an Agricultural Decision Intelligence Assistant designed to provide
high-accuracy, personalized guidance to farmers.

All farmer information is provided dynamically from a verified database.
The [ACTIVE FARM DATA] section contains the primary data for the farm the user is currently focused on. 
This database context is the ONLY source of truth.
You MUST acknowledge the Active Farm name and its specific crops, soil, and land size in your greeting or summary. 
NEVER claim you don't know the farm details if they are provided in the [ACTIVE FARM DATA] section.
You MUST NOT ask again for any data already present.

CRITICAL LANGUAGE RULES — READ CAREFULLY:

1. **YOU MUST ALWAYS RESPOND IN ENGLISH.**
   - The user's interface language is set to ENGLISH. This is your ONLY instruction for language.
   - Do NOT auto-detect the language of the user's input.
   - Do NOT switch to Hindi, Marathi, or any other language — EVER.
   - Even if the user writes in Hindi, Marathi, or any other language, your response MUST be in ENGLISH only.
   - NO language mixing. No Devanagari script. Pure English only.

2. Always tailor your recommendations strictly to the provided location, soil type, and water availability.

3. Avoid generic or textbook explanations. Provide practical, region-specific, and actionable guidance.

4. Maintain a professional, respectful, farmer-friendly tone.

5. Use simple, easy-to-understand English suitable for farmers.""" ,


    "hindi": """आप 'कृषि-सहायक' हैं।

**कठोर नियम**:
1. केवल **हिंदी (देवनागरी)** का प्रयोग करें। 
2. यदि यूजर अंग्रेजी में पूछे, तो भी उत्तर हिंदी में ही होना चाहिए।
3. 'Farmer' के लिए 'किसान' शब्द का प्रयोग करें।

**उदाहरण**:
प्रश्न: "How are you?"
उत्तर: "मैं आपकी सहायता के लिए तैयार हूँ। आप कैसे हैं?" (शुद्ध हिंदी)

किसान की जानकारी:""",

    "hinglish": """Aap ek Agricultural Decision Intelligence Assistant hain. 

RULES:
1. Respond ONLY in Hinglish (Mixed Hindi/English).
2. Follow all farmer facts from the database.
3. Tailor recommendations to location and soil.
4. Don't ask for already known info.""" ,

    "marathi": """तुम्ही 'कृषी-मार्गदर्शक' आहात. 

**कठोर नियम (Strict Rules)**:
1. फक्त **मराठी (देवनागरी)** भाषेतच उत्तर द्या. 
2. एकही इंग्रजी शब्द वापरू नका. 'Farmer' साठी 'शेतकरी' वापरा.
3. जर वापरकर्त्याने इंग्रजीत प्रश्न विचारला (उदा. "what is farmer"), तरीही तुमचे उत्तर १००% मराठीतच असावे.

**उदाहरण (Few-Shot)**:
प्रश्न: "what is farmer in marathi explain in detail"
उत्तर: "मराठीत 'Farmer' ला 'शेतकरी' असे म्हणतात. शेतकरी म्हणजे तो जो अहोरात्र शेतात कष्ट करतो, पिके पिकवतो आणि जगाला अन्न मिळवून देतो..." (पूर्ण मराठीत)

शेतकऱ्याची माहिती:""",
}



# ============================================
# CHATBOT CLASS
# ============================================

class KrishiSahAIAdvisor:
    """Main chatbot class with memory and profile awareness"""
    
    def __init__(self, farmer_profile: FarmerProfile):
        self.profile = farmer_profile
        self.llm: Optional[ChatOllama] = None
        self.chain: Optional[RunnableSerializable] = None
        self.chat_history: List[BaseMessage] = []
        # Track the last language received from the API/UI toggle
        self.last_api_language = farmer_profile.language.lower()
        self._initialize_llm()
        self._initialize_chain()
    
    def _initialize_llm(self):
        """Initialize ChatOllama LLM"""
        try:
            self.llm = ChatOllama(
                model=DEFAULT_OLLAMA_MODEL,
                temperature=0.1,  # Lower temperature for stricter language adherence
                num_ctx=4096,     # Full context window for complete conversation memory
                num_predict=1200, # Balanced response length for streaming
                base_url=DEFAULT_OLLAMA_BASE_URL,
            )
        except Exception as e:
            print(f"Error initializing ChatOllama: {e}")
            print(
                "Make sure Ollama is running, the model is pulled,"
                " and set OLLAMA_FORCE_CPU=0 if you want to try GPU mode."
            )
    def _check_language_request(self, message: str) -> Optional[str]:
        """DEPRECATED: Language is now always controlled by the UI toggle.
        This method is kept for logging/debugging only and is NOT used to override the active language."""
        msg = message.lower()
        if any(x in msg for x in ["in marathi", "मराठी", "marathi madhe"]):
            return "marathi"
        if any(x in msg for x in ["in hindi", "हिंदी", "hindi mein"]):
            return "hindi"
        if any(x in msg for x in ["in english", "इंग्रजी", "अंग्रेजी"]):
            return "english"
        return None

    def _initialize_chain(self, language: str = None):
        """Build the LangChain workflow for processing queries"""
        if not self.llm:
            print("Warning: LLM not available, chain will not be initialized")
            return

        if language:
            self.profile.language = language

        # Get system prompt based on language
        lang_input = self.profile.language.lower()
        
        # Map language codes to supported prompt keys
        lang_map = {
            "en": "english",
            "hi": "hindi",
            "mr": "marathi",
            "hindi": "hindi",
            "marathi": "marathi",
            "english": "english",
            "hinglish": "hinglish"
        }
        
        prompt_key = lang_map.get(lang_input, "english")
        system_rules = SYSTEM_PROMPTS.get(prompt_key, SYSTEM_PROMPTS["english"])
        
        full_system_context = f"{system_rules}\n\n{self.profile.to_context()}"
        print(f"[ADVISOR] Priming chain for {lang_input} with Rules (len: {len(system_rules)})")
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=full_system_context),
            MessagesPlaceholder(variable_name="chat_history"),
            HumanMessagePromptTemplate.from_template("{input}")
        ])
        
        # Chain: Prompt -> LLM -> String Output
        self.chain = prompt | self.llm | StrOutputParser()
    
    def chat(self, user_message: str, language: str = None) -> str:
        """Send message and get response (Synchronous)"""
        print(f"[ADVISOR] Chat request: '{user_message[:30]}...' (Req Lang: {language})")
        
        # STRICT RULE: UI Toggle is the SOLE source of truth for language.
        # We NEVER auto-detect language from user input.
        api_lang = language.lower() if language else self.profile.language.lower()
        
        # Log if user typed in a different language (for debugging only — we DO NOT switch)
        detected_lang = self._check_language_request(user_message)
        if detected_lang and detected_lang != api_lang:
            print(f"[ADVISOR] User typed in '{detected_lang}' but UI toggle is '{api_lang}' — enforcing toggle language.")
        
        # Re-initialize chain ONLY if UI toggle language changed
        if api_lang != self.last_api_language:
            print(f"[ADVISOR] UI Toggle changed: {self.last_api_language} → {api_lang}")
            self._initialize_chain(api_lang)
            self.last_api_language = api_lang
            self.chat_history = []  # Clear history for clean language context
        
        print(f"[ADVISOR] Active Language (from UI toggle): {self.profile.language}")

        if not self.chain:
            return "Error: AI not initialized. Check server logs."
            
        try:
            # Iron Curtain Wrapper: Prepend a strict language instruction to every message
            # to reinforce the LLM to respond only in the selected language.
            lang_key = self.profile.language.lower()
            if lang_key in ["marathi", "mr"]:
                if not self.chat_history:
                    self.chat_history.append(HumanMessage(content="तुम्ही कोण आहात?"))
                    self.chat_history.append(AIMessage(content="मी तुमचा कृषी-मार्गदर्शक आहे. मी फक्त मराठीतच बोलणार आहे."))
                clean_message = f"(MANDATORY: RESPOND IN MARATHI DEVANAGARI ONLY — IGNORE INPUT LANGUAGE) {user_message}"
            elif lang_key in ["hindi", "hi"]:
                if not self.chat_history:
                    self.chat_history.append(HumanMessage(content="आप कौन हैं?"))
                    self.chat_history.append(AIMessage(content="मैं आपका कृषि-सहायक हूँ। मैं केवल हिंदी में बात करूँगा।"))
                clean_message = f"(MANDATORY: RESPOND IN HINDI DEVANAGARI ONLY — IGNORE INPUT LANGUAGE) {user_message}"
            else:
                clean_message = f"(MANDATORY: RESPOND IN ENGLISH ONLY — IGNORE INPUT LANGUAGE) {user_message}"
            
            # Invoke chain with current history
            response = self.chain.invoke({
                "chat_history": self.chat_history,
                "input": clean_message
            })
            
            # Update history manually
            self.chat_history.append(HumanMessage(content=clean_message))
            self.chat_history.append(AIMessage(content=response))
            
            return response.strip()
        except Exception as e:
            print(f"Chat Error: {e}")
            return f"Error: {str(e)}"

    def stream_chat(self, user_message: str, language: str = None):
        """Send message and yield response tokens (Streaming)"""
        # STRICT RULE: UI Toggle is the SOLE source of truth for language.
        # We NEVER auto-detect language from user input.
        api_lang = language.lower() if language else self.profile.language.lower()

        # Log if user typed in a different language (for debugging only — we DO NOT switch)
        detected_lang = self._check_language_request(user_message)
        if detected_lang and detected_lang != api_lang:
            print(f"[ADVISOR] User typed in '{detected_lang}' but UI toggle is '{api_lang}' — enforcing toggle language.")

        # Re-initialize chain ONLY if UI toggle language changed
        if api_lang != self.last_api_language:
            print(f"[ADVISOR] UI Toggle changed: {self.last_api_language} → {api_lang}")
            self._initialize_chain(api_lang)
            self.last_api_language = api_lang
            self.chat_history = []  # Clear history for clean language context

        if not self.chain:
            yield "Error: AI not initialized. Check server logs."
            return

        try:
            # Iron Curtain Wrapper: Prepend a strict language instruction to every message
            # to reinforce the LLM to respond only in the selected language.
            lang_key = self.profile.language.lower()
            if lang_key in ["marathi", "mr"]:
                if not self.chat_history:
                    self.chat_history.append(HumanMessage(content="तुम्ही कोण आहात?"))
                    self.chat_history.append(AIMessage(content="मी तुमचा कृषी-मार्गदर्शक आहे. मी फक्त मराठीतच बोलणार आहे."))
                clean_message = f"(MANDATORY: RESPOND IN MARATHI DEVANAGARI ONLY — IGNORE INPUT LANGUAGE) {user_message}"
            elif lang_key in ["hindi", "hi"]:
                if not self.chat_history:
                    self.chat_history.append(HumanMessage(content="आप कौन हैं?"))
                    self.chat_history.append(AIMessage(content="मैं आपका कृषि-सहायक हूँ। मैं केवल हिंदी में बात करूँगा।"))
                clean_message = f"(MANDATORY: RESPOND IN HINDI DEVANAGARI ONLY — IGNORE INPUT LANGUAGE) {user_message}"
            else:
                clean_message = f"(MANDATORY: RESPOND IN ENGLISH ONLY — IGNORE INPUT LANGUAGE) {user_message}"
            
            full_response = ""

            # Use the .stream() method of the chain
            for chunk in self.chain.stream({
                "chat_history": self.chat_history,
                "input": clean_message
            }):
                full_response += chunk
                yield chunk
            
            # Update history after full response is generated
            self.chat_history.append(HumanMessage(content=clean_message))
            self.chat_history.append(AIMessage(content=full_response))
            
        except Exception as e:
            print(f"Stream Chat Error: {e}")
            yield f"Error: {str(e)}"
    
    def get_chat_history(self) -> str:
        """Get conversation history as a formatted string (for debugging/display)"""
        formatted = ""
        for msg in self.chat_history:
            role = "AI" if isinstance(msg, AIMessage) else "User"
            formatted += f"{role}: {msg.content}\n"
        return formatted
    
    def clear_memory(self):
        """Clear conversation history"""
        self.chat_history = []
        print("Conversation memory cleared")

    def generate_recommendations(self) -> List[dict]:
        """Generate top 3 business recommendations based on profile"""
        if not self.llm:
             # Fallback immediately if LLM is down
             return self._get_fallback_recommendations()

        prompt_text = f"""
        Analyze this farmer's profile:
        {self.profile.to_context()}
        
        Available Business Options:
        {json.dumps(BUSINESS_OPTIONS, indent=2)}
        
        Task:
        Select exactly 3 business options from the list above that best match the farmer's land, capital, skills, and risk profile.
        
        Return ONLY a JSON array with this format:
        [
            {{
                "id": "business_id_1",
                "title": "Title 1",
                "reason": "Brief reason why it matches",
                "detailed_description": "A comprehensive 5-6 sentence overview of the business. Explain the daily operations, why it is profitable in the long run, and how it scales. Include specific details about the product and value addition.",
                "match_score": 95,
                "estimated_cost": "Cost range (e.g., ₹2-5 Lakhs)",
                "profit_potential": "Profit range (e.g., ₹30-50k/month)",
                "timeline": "Time to first harvest/profit (e.g., 3-4 months)",
                "requirements": ["Requirement 1 (Land/Water)", "Requirement 2 (Equipment)", "Requirement 3 (Labor)", "Requirement 4 (Skill)", "Requirement 5 (License/Compliance)"],
                "risk_factors": ["Risk 1 - Mitigation Strategy", "Risk 2 - Mitigation Strategy", "Risk 3 - Mitigation Strategy"],
                "market_demand": "High/Moderate/Low",
                "market_demand_analysis": "3-4 sentences explaining WHO buys this product (local/export), seasonal demand peaks, and pricing trends.",
                "implementation_steps": [
                    "Step 1: Planning and Sourcing (Detailed)", 
                    "Step 2: Infrastructure Setup (Detailed)", 
                    "Step 3: Planting/Production Start",
                    "Step 4: Maintenance and Quality Control",
                    "Step 5: Harvesting and Marketing"
                ]
            }}
        ]
        
        Do not add any markdown formatting (like ```json). Just the raw JSON string.
        """
        
        try:
            # Use LLM directly for one-off generation
            response_msg = self.llm.invoke(prompt_text)
            response = response_msg.content
            
            # Robust JSON extraction
            cleaned_response = response.strip()
            
            # Remove markdown code fences
            cleaned_response = re.sub(r'```json\s*|\s*```', '', cleaned_response)
            
            # Try to extract JSON array from text (in case LLM added explanation)
            json_match = re.search(r'\[\s*\{.*\}\s*\]', cleaned_response, re.DOTALL)
            if json_match:
                cleaned_response = json_match.group(0)
            
            # Remove trailing commas before closing braces/brackets (common LLM error)
            cleaned_response = re.sub(r',(\s*[}\]])', r'\1', cleaned_response)
            
            try:
                recommendations = json.loads(cleaned_response)
            except json.JSONDecodeError as json_err:
                print(f"Warning: JSON parse error: {json_err}")
                print(f"Raw response (first 500 chars): {response[:500]}")
                print(f"Cleaned response (first 500 chars): {cleaned_response[:500]}")
                raise  # Re-raise to trigger fallback
            
            # Ensure we strictly have 3 items and they match our ID list
            valid_ids = {b['id'] for b in BUSINESS_OPTIONS}
            valid_recs = [r for r in recommendations if r.get('id') in valid_ids]
            
            # Return top 3, or fallback if empty
            if not valid_recs:
                raise ValueError("No valid recommendations generated")
            
            return valid_recs[:3]
        except Exception as e:
            print(f"Error generating recommendations: {e}")
            return self._get_fallback_recommendations()

    def generate_title(self) -> str:
        """Generate a short 3-5 word summary title for the chat session"""
        if not self.llm or not self.chat_history:
            return "New Chat"

        # Get the first user message
        first_user_msg = next((msg.content for msg in self.chat_history if isinstance(msg, HumanMessage)), None)
        if not first_user_msg:
            return "New Chat"

        prompt_text = f"Summarize the following user request into a short 3-5 word title. Return ONLY the title without quotes or punctuation: {first_user_msg[:200]}"
        
        try:
            response = self.llm.invoke(prompt_text)
            title = response.content.strip().strip('"').strip("'")
            # Remove trailing ellipsis or punctuation if LLM added them
            title = re.sub(r'[.\s]+$', '', title)
            return title if title else "New Chat"
        except Exception as e:
            print(f"Error generating title: {e}")
            return "New Chat"

    def _get_fallback_recommendations(self):
        """Return hardcoded fallback recommendations"""
        return [
            {
                "id": "1", "title": "FLOWER PLANTATION (GERBERA)",
                "reason": "High-value crop suitable for modern farming.",
                "detailed_description": "Gerbera cultivation in polyhouses is a highly profitable venture. It requires controlled climate conditions but yields flowers year-round with high demand in wedding and decoration markets.",
                "match_score": 90,
                "estimated_cost": "₹1 Cr+",
                "profit_potential": "₹20L+",
                "timeline": "3-4 months to first flowering",
                "requirements": ["1 Acre Land", "Greenhouse"],
                "risk_factors": ["Pest Management", "Market fluctuation"],
                "market_demand": "High demand in urban areas and for events",
                "implementation_steps": ["Construct Polyhouse", "Prepare Soil Beds", "Install Drip Irrigation", "Plant Tissue Culture Seedlings"]
            },
            {
                "id": "5", "title": "DAIRY FARMING",
                "reason": "Stable daily income source.",
                "detailed_description": "Dairy farming involves rearing cattle for milk production. It ensures a daily cash flow and the organic waste (dung) can be sold or used as manure, adding a secondary income stream.",
                "match_score": 85,
                "estimated_cost": "₹10-12 Lakh",
                "profit_potential": "₹20-40k/month",
                "timeline": "Immediate (if buying milking cows)",
                "requirements": ["Fodder Land", "Cattle Shed"],
                "risk_factors": ["Disease management", "High feed costs"],
                "market_demand": "Consistent daily demand for milk",
                "implementation_steps": ["Build Shed", "Secure Fodder Source", "Purchase High-Yield Cows", "Setup Milk Supply Chain"]
            },
            {
                "id": "7", "title": "MUSHROOM FARMING",
                "reason": "Low land requirement and quick returns.",
                "detailed_description": "Oyster mushroom farming is an indoor, low-investment agriculture business. It grows on agricultural waste like straw and requires very little space, making it ideal for small farmers.",
                "match_score": 80,
                "estimated_cost": "₹1.5-3 Lakh",
                "profit_potential": "₹15-35k/month",
                "timeline": "25-30 days per cycle",
                "requirements": ["Small Shed", "Humidity Control"],
                "risk_factors": ["Contamination risk", "Short shelf life"],
                "market_demand": "Growing demand in restaurants and health-conscious markets",
                "implementation_steps": ["Prepare Substrate (Straw)", "Sterilization", "Spawning (Seeding)", "Incubation & Harvesting"]
            }
        ]


# ============================================
# PROFILE COLLECTION FUNCTIONS
# ============================================

def collect_farmer_profile() -> FarmerProfile:
    """Interactive questionnaire to collect farmer data"""
    print("\n" + "="*60)
    print("KRISHISAHAI BUSINESS ADVISOR - FARMER PROFILING")
    print("="*60)
    print("\nPlease answer the following questions to help us assist you better:\n")
    
    # Language preference
    print("1. Language Preference / भाषा चुनें:")
    print("   1. English")
    print("   2. Hindi (हिंदी)")
    print("   3. Hinglish (Hindi-English Mix)")
    lang_choice = input("   Enter choice (1/2/3): ").strip()
    language_map = {"1": "english", "2": "hindi", "3": "hinglish"}
    language = language_map.get(lang_choice, "english")
    
    # Basic info
    name = input("\n2. Your name / आपका नाम: ").strip()
    
    land_size = float(input("\n3. Total land (in acres) / कुल जमीन (एकड़ में): "))
    
    capital = float(input("\n4. Available capital to invest (₹) / निवेश के लिए उपलब्ध पूंजी (₹): "))
    
    print("\n5. Market access / बाजार पहुंच:")
    print("   1. Good (within 10km)")
    print("   2. Moderate (10-30km)")
    print("   3. Poor (30km+)")
    market_choice = input("   Enter choice (1/2/3): ").strip()
    market_map = {"1": "good", "2": "moderate", "3": "poor"}
    market_access = market_map.get(market_choice, "moderate")
    
    print("\n6. Your skills/experience (select all that apply):")
    print("   Enter comma-separated: farming, dairy, poultry, business, solar, compost, horticulture")
    skills_input = input("   Skills / कौशल: ").strip()
    skills = [s.strip() for s in skills_input.split(",")]
    
    print("\n7. Risk tolerance / जोखिम सहनशीलता:")
    print("   1. Low (safe investments)")
    print("   2. Medium (balanced)")
    print("   3. High (willing to take risks)")
    risk_choice = input("   Enter choice (1/2/3): ").strip()
    risk_map = {"1": "low", "2": "medium", "3": "high"}
    risk_level = risk_map.get(risk_choice, "low")
    
    print("\n8. Time availability / समय उपलब्धता:")
    print("   1. Full-time")
    print("   2. Part-time")
    time_choice = input("   Enter choice (1/2): ").strip()
    time_availability = "full-time" if time_choice == "1" else "part-time"
    
    experience_years = int(input("\n9. Years of experience in agriculture/business (0 if none): "))
    
    profile = FarmerProfile(
        name=name,
        land_size=land_size,
        capital=capital,
        market_access=market_access,
        skills=skills,
        risk_level=risk_level,
        time_availability=time_availability,
        experience_years=experience_years,
        language=language
    )
    
    print("\nProfile created successfully!\n")
    return profile


# ============================================
# MAIN CHAT INTERFACE
# ============================================

def start_chat_interface(advisor: KrishiSahAIAdvisor):
    """Interactive chat loop"""
    print("\n" + "="*60)
    print("CHAT WITH KRISHISAHAI BUSINESS ADVISOR")
    print("="*60)
    print("\nCommands:")
    print("  /profile - View your profile")
    print("  /history - View conversation history")
    print("  /clear - Clear conversation memory")
    print("  /exit - Exit chat")
    print("\n" + "-"*60 + "\n")
    
    # Initial greeting
    greeting = advisor.chat("Hello! Please introduce yourself and ask how you can help me.")
    print(f"KrishiSahAI: {greeting}\n")
    
    while True:
        user_input = input("You: ").strip()
        
        if not user_input:
            continue
        
        # Handle commands
        if user_input.lower() == "/exit":
            print("\nThank you for using KrishiSahAI! Best wishes for your business journey!")
            break
        
        elif user_input.lower() == "/profile":
            print("\n" + advisor.profile.to_context())
            continue
        
        elif user_input.lower() == "/history":
            history = advisor.get_chat_history()
            print(f"\nChat History:\n{history}\n")
            continue
        
        elif user_input.lower() == "/clear":
            advisor.clear_memory()
            continue
        
        # Get AI response
        response = advisor.chat(user_input)
        print(f"\nKrishiSahAI: {response}\n")


# ============================================
# MAIN FUNCTION
# ============================================

def main():
    """Main entry point"""
    print("\nWelcome to KrishiSahAI Business Advisor!")
    print("AI-powered business guidance for Indian farmers\n")
    
    # Step 1: Collect farmer profile
    farmer_profile = collect_farmer_profile()
    
    # Step 2: Initialize chatbot with profile
    advisor = KrishiSahAIAdvisor(farmer_profile)
    
    # Step 3: Start chat interface
    start_chat_interface(advisor)


if __name__ == "__main__":
    main()
