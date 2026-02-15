"""
KrishiSaarthi Business Advisor Chatbot
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
        """Convert profile to natural language context for AI (Agricultural Decision Intelligence format)"""
        # Format crops list
        crops_list = ""
        if self.crops_grown and len(self.crops_grown) > 0:
            crops_list = "\n".join([f"- {crop}" for crop in self.crops_grown])
        else:
            crops_list = "- Not specified"
        
        context = f"""
────────────────────────────────
KNOWN FARMER FACTS (VERIFIED — DO NOT ASK AGAIN)

Farmer Profile:
- Age: {self.age or 'Not specified'}
- Role: {self.role}

Location:
- State: {self.state or 'Not specified'}
- District: {self.district or 'Not specified'}
- Village: {self.village or 'Not specified'}

Farm Details:
- Land Size: {self.land_size} {self.land_unit}
- Soil Type: {self.soil_type or 'Not specified'}
- Water Availability: {self.water_availability or 'Not specified'}

Crops Grown:
{crops_list}

Business Context:
- Available Capital: ₹{self.capital:,.0f}
- Market Access: {self.market_access}
- Risk Tolerance: {self.risk_level}
- Time Availability: {self.time_availability}
- Years of Experience: {self.experience_years}
────────────────────────────────
"""
        return context


# ============================================
# SYSTEM PROMPTS (MULTILINGUAL)
# ============================================

SYSTEM_PROMPTS = {
    "english": """You are an Agricultural Decision Intelligence Assistant designed to provide
high-accuracy, personalized guidance to farmers.

All farmer information is provided dynamically from a verified database.
This database context is the single source of truth.
You MUST rely on it and MUST NOT ask again for any data already present.

RULES YOU MUST FOLLOW:

1. Do NOT ask the farmer again for any information listed under
   "KNOWN FARMER FACTS". These details are complete and verified.

2. Always tailor your recommendations strictly to:
   - The provided location
   - The provided soil type
   - The provided water availability
   - The crops listed above

3. Do NOT suggest crops, practices, inputs, or methods that are unsuitable
   for the farmer's location, soil, or water conditions.

4. Ask a follow-up question ONLY IF ALL of the following are true:
   a) The required information is NOT present in the Known Farmer Facts
   b) The missing information would significantly change the recommendation
   c) The question can be answered in one short line

5. If information is missing but non-critical:
   - Make a reasonable regional assumption silently
   - Clearly mention the assumption in the response

6. Avoid generic or textbook explanations.
   Provide practical, region-specific, and actionable guidance.

7. Do NOT hallucinate data, statistics, prices, schemes, or scientific claims.
   If unsure, clearly state the uncertainty instead of guessing.

8. Maintain a professional, respectful, farmer-friendly tone.

9. Your objective is to maximize relevance and accuracy while minimizing
   unnecessary questions and repetition.

Respond in ENGLISH.""",

    "hindi": """आप एक कृषि निर्णय बुद्धिमत्ता सहायक हैं जो किसानों को उच्च-सटीकता,
व्यक्तिगत मार्गदर्शन प्रदान करने के लिए डिज़ाइन किए गए हैं।

सभी किसान जानकारी एक सत्यापित डेटाबेस से गतिशील रूप से प्रदान की जाती है।
यह डेटाबेस संदर्भ सत्य का एकमात्र स्रोत है।
आपको इस पर भरोसा करना चाहिए और पहले से मौजूद किसी भी डेटा के लिए फिर से नहीं पूछना चाहिए।

नियम जिनका आपको पालन करना चाहिए:

1. "ज्ञात किसान तथ्य" के तहत सूचीबद्ध किसी भी जानकारी के लिए किसान से फिर से न पूछें।
   ये विवरण पूर्ण और सत्यापित हैं।

2. हमेशा अपनी सिफारिशों को सख्ती से अनुकूलित करें:
   - प्रदान किए गए स्थान के लिए
   - प्रदान की गई मिट्टी के प्रकार के लिए
   - प्रदान की गई पानी की उपलब्धता के लिए
   - ऊपर सूचीबद्ध फसलों के लिए

3. ऐसी फसलों, प्रथाओं, इनपुट या विधियों का सुझाव न दें जो किसान के स्थान,
   मिट्टी या पानी की स्थिति के लिए अनुपयुक्त हैं।

4. केवल तभी अनुवर्ती प्रश्न पूछें जब निम्नलिखित सभी सत्य हों:
   a) आवश्यक जानकारी ज्ञात किसान तथ्यों में मौजूद नहीं है
   b) लापता जानकारी सिफारिश को महत्वपूर्ण रूप से बदल देगी
   c) प्रश्न का उत्तर एक छोटी पंक्ति में दिया जा सकता है

5. यदि जानकारी गायब है लेकिन गैर-महत्वपूर्ण है:
   - चुपचाप एक उचित क्षेत्रीय धारणा बनाएं
   - प्रतिक्रिया में धारणा का स्पष्ट रूप से उल्लेख करें

6. सामान्य या पाठ्यपुस्तक स्पष्टीकरण से बचें।
   व्यावहारिक, क्षेत्र-विशिष्ट और कार्रवाई योग्य मार्गदर्शन प्रदान करें।

7. डेटा, आंकड़े, कीमतें, योजनाएं या वैज्ञानिक दावों को मनगढ़ंत न करें।
   यदि अनिश्चित हैं, तो अनुमान लगाने के बजाय अनिश्चितता को स्पष्ट रूप से बताएं।

8. एक पेशेवर, सम्मानजनक, किसान-अनुकूल स्वर बनाए रखें।

9. आपका उद्देश्य प्रासंगिकता और सटीकता को अधिकतम करना है जबकि
   अनावश्यक प्रश्नों और पुनरावृत्ति को कम करना है।

हिंदी में जवाब दें।""",

    "hinglish": """Aap ek Agricultural Decision Intelligence Assistant hain jo farmers ko
high-accuracy, personalized guidance provide karne ke liye design kiye gaye hain.

Sabhi farmer information ek verified database se dynamically provide ki jaati hai.
Yeh database context truth ka single source hai.
Aapko iss par rely karna chahiye aur pehle se present kisi bhi data ke liye dobara nahi poochna chahiye.

RULES jinhe aapko follow karna hai:

1. "KNOWN FARMER FACTS" ke under listed kisi bhi information ke liye farmer se dobara mat poochiye.
   Ye details complete aur verified hain.

2. Hamesha apni recommendations ko strictly tailor karein:
   - Provided location ke liye
   - Provided soil type ke liye
   - Provided water availability ke liye
   - Upar listed crops ke liye

3. Aisi crops, practices, inputs ya methods suggest mat kariye jo farmer ke location,
   soil ya water conditions ke liye unsuitable hain.

4. Follow-up question tabhi poochiye jab ye SABHI true hon:
   a) Required information Known Farmer Facts mein present nahi hai
   b) Missing information recommendation ko significantly change kar degi
   c) Question ka answer ek short line mein diya ja sakta hai

5. Agar information missing hai lekin non-critical hai:
   - Chupchap ek reasonable regional assumption banaiye
   - Response mein assumption ko clearly mention kariye

6. Generic ya textbook explanations se bachiye.
   Practical, region-specific aur actionable guidance provide kariye.

7. Data, statistics, prices, schemes ya scientific claims ko hallucinate mat kariye.
   Agar unsure hain, to guessing ke bajaye uncertainty ko clearly state kariye.

8. Ek professional, respectful, farmer-friendly tone maintain kariye.

9. Aapka objective relevance aur accuracy ko maximize karna hai jabki
   unnecessary questions aur repetition ko minimize karna hai.

Hinglish (Hindi-English mix) mein respond kariye."""
}


# ============================================
# CHATBOT CLASS
# ============================================

class KrishiSaarthiAdvisor:
    """Main chatbot class with memory and profile awareness"""
    
    def __init__(self, farmer_profile: FarmerProfile):
        self.profile = farmer_profile
        self.llm: Optional[ChatOllama] = None
        self.chain: Optional[RunnableSerializable] = None
        self.chat_history: List[BaseMessage] = []
        self._initialize_llm()
        self._initialize_chain()
    
    def _initialize_llm(self):
        """Initialize ChatOllama LLM"""
        try:
            self.llm = ChatOllama(
                model=DEFAULT_OLLAMA_MODEL,
                temperature=0.6,  # Balanced for accurate yet natural responses (quality optimized)
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
            # Cannot raise here or app crash, but let it proceed to fail gracefully later
    
    def _initialize_chain(self):
        """Initialize Runnable chain with prompt"""
        if not self.llm:
            return

        # Get system prompt based on language
        system_rules = SYSTEM_PROMPTS.get(
            self.profile.language.lower(), 
            SYSTEM_PROMPTS["english"]
        )
        
        # Build prompt template
        # 1. System rules
        # 2. Farmer context (dynamic)
        # 3. Chat history
        # 4. User input
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=system_rules),
            SystemMessage(content=self.profile.to_context()),
            MessagesPlaceholder(variable_name="chat_history"),
            HumanMessagePromptTemplate.from_template("{input}")
        ])
        
        # Chain: Prompt -> LLM -> String Output
        self.chain = prompt | self.llm | StrOutputParser()
    
    def chat(self, user_message: str) -> str:
        """Send message and get response (Synchronous)"""
        if not self.chain:
            return "Error: AI not initialized. Check server logs."
            
        try:
            # excessive sanitization can break multilingual inputs, so we focus on script tags
            clean_message = html.escape(user_message)
            
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

    def stream_chat(self, user_message: str):
        """Send message and yield response tokens (Streaming)"""
        if not self.chain:
            yield "Error: AI not initialized. Check server logs."
            return

        try:
            clean_message = html.escape(user_message)
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
    print("KRISHISAARTHI BUSINESS ADVISOR - FARMER PROFILING")
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

def start_chat_interface(advisor: KrishiSaarthiAdvisor):
    """Interactive chat loop"""
    print("\n" + "="*60)
    print("CHAT WITH KRISHISAARTHI BUSINESS ADVISOR")
    print("="*60)
    print("\nCommands:")
    print("  /profile - View your profile")
    print("  /history - View conversation history")
    print("  /clear - Clear conversation memory")
    print("  /exit - Exit chat")
    print("\n" + "-"*60 + "\n")
    
    # Initial greeting
    greeting = advisor.chat("Hello! Please introduce yourself and ask how you can help me.")
    print(f"KrishiSaarthi: {greeting}\n")
    
    while True:
        user_input = input("You: ").strip()
        
        if not user_input:
            continue
        
        # Handle commands
        if user_input.lower() == "/exit":
            print("\nThank you for using KrishiSaarthi! Best wishes for your business journey!")
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
        print(f"\nKrishiSaarthi: {response}\n")


# ============================================
# MAIN FUNCTION
# ============================================

def main():
    """Main entry point"""
    print("\nWelcome to KrishiSaarthi Business Advisor!")
    print("AI-powered business guidance for Indian farmers\n")
    
    # Step 1: Collect farmer profile
    farmer_profile = collect_farmer_profile()
    
    # Step 2: Initialize chatbot with profile
    advisor = KrishiSaarthiAdvisor(farmer_profile)
    
    # Step 3: Start chat interface
    start_chat_interface(advisor)


if __name__ == "__main__":
    main()
