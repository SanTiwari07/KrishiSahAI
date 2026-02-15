import streamlit as st
import sys
import os
import json

# Ensure src is in path so we can import from app, memory_manager, etc.
# Also add parent directory to path to import BusinessAdvisor
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
sys.path.append(os.path.abspath(os.path.join(current_dir, "../../")))

from app import get_decision_chain
from langchain_core.messages import HumanMessage, AIMessage

# Import Business Advisor modules
try:
    from BusinessAdvisor.krishi_chatbot import KrishiSahAIAdvisor, FarmerProfile, BUSINESS_OPTIONS
except ImportError as e:
    st.error(f"Error importing Business Advisor: {e}. Please ensure directory structure is correct.")

def render_waste_to_value():
    st.header("Agricultural Waste-to-Value Decision Engine")
    st.markdown("""
    **Expert System for Indian Farmers**  
    *Converts crop name into ranked, actionable waste-to-value recommendations.*
    """)

    # Initialize Session State for History
    if "wtv_messages" not in st.session_state:
        st.session_state.wtv_messages = []
    
    # Initialize history for chain
    if "wtv_history" not in st.session_state:
        st.session_state.wtv_history = []

    # Chat Interface
    for message in st.session_state.wtv_messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    # React to user input
    if prompt := st.chat_input("Enter Crop Name (e.g., Banana, Rice, Sugarcane)"):
        # Display user message
        with st.chat_message("user"):
            st.markdown(prompt)
        st.session_state.wtv_messages.append({"role": "user", "content": prompt})

        # Process with Engine
        with st.chat_message("assistant"):
            message_placeholder = st.empty()
            message_placeholder.markdown("*Analyzing crop decomposition and market pathways...*")
            
            try:
                chain = get_decision_chain()
                
                # Invoke
                response = chain.invoke({"input": prompt, "history": st.session_state.wtv_history})
                
                # Update UI
                message_placeholder.markdown(response)
                
                # Update History
                st.session_state.wtv_messages.append({"role": "assistant", "content": response})
                
                st.session_state.wtv_history.append(HumanMessage(content=prompt))
                st.session_state.wtv_history.append(AIMessage(content=response))
                
            except Exception as e:
                message_placeholder.error(f"Error: {e}. (Ensure Ollama is running locally)")

def render_business_advisor():
    st.header("KrishiSahAI Business Advisor")
    st.markdown("*AI-powered business guidance for Indian farmers*")

    # Check if profile exists
    if "advisor_profile" not in st.session_state:
        st.subheader("tell us about your resources")
        
        with st.form("profile_form"):
            # Resources
            st.markdown("### Tell us about your resources")
            col1, col2 = st.columns(2)
            with col1:
                budget = st.number_input("Budget (₹)", min_value=0.0, step=1000.0, placeholder="e.g. 100000")
                water_source = st.selectbox("Water Source", ["Rainfed", "Canal", "Borewell", "Drip Irrigation", "No Water Source"])
            with col2:
                land_size = st.number_input("Land (Acres)", min_value=0.0, step=0.1, placeholder="e.g. 5")
                experience_years = st.number_input("Experience (Years)", min_value=0, step=1, placeholder="e.g. 5")
            
            # Interests
            st.markdown("### Interests")
            interest_options = [
                "Dairy Farming", "Poultry", "Greenhouse Farming", "Goat Farming",
                "Shop Handling", "Factory Business", "Fishery", "Mushroom Cultivation",
                "Organic Farming", "Agro-Tourism"
            ]
            interests = st.multiselect("Select your interests", interest_options)
            
            # Market & Strategy
            st.markdown("### Market & Strategy")
            
            st.markdown("**How close are you to a market or buyers?**")
            market_distance = st.radio(
                "Market Distance",
                ["Village only", "Small town within 10 km", "City within 30 km", "Direct buyers already available"],
                label_visibility="collapsed"
            )
            
            st.markdown("**Are you willing to sell directly to customers (B2C)?**")
            b2c_willingness = st.radio(
                "B2C Willingness",
                ["Yes, I can handle customers", "Maybe, with guidance", "No, I prefer bulk buyers only"],
                label_visibility="collapsed"
            )
            
            st.markdown("**If income fluctuates month to month, how comfortable are you?**")
            income_fluctuation_tolerance = st.radio(
                "Income Fluctuation",
                ["Very comfortable", "Somewhat okay", "Not comfortable at all"],
                label_visibility="collapsed"
            )
            
            st.markdown("**How long can you wait to recover your investment?**")
            investment_recovery_timeline = st.radio(
                "Recovery Timeline",
                ["Less than 1 year", "1-2 years", "2-3 years", "I can wait longer"],
                label_visibility="collapsed"
            )
            
            st.markdown("**What is your attitude toward losses in the first year?**")
            loss_attitude = st.radio(
                "Loss Attitude",
                ["I understand initial losses are possible", "Small losses acceptable", "I cannot afford losses"],
                label_visibility="collapsed"
            )
            
            st.markdown("**If given two options, what would you choose?**")
            risk_vs_profit = st.radio(
                "Risk vs Profit",
                ["Safe income, lower profit", "Higher profit, higher risk"],
                label_visibility="collapsed"
            )

            st.markdown("---")
            st.info("**IMPORTANT NOTE**: All business ideas and data shown here are research-based and approximate. Actual costs and profits may vary by region, city, market demand, and season.")
            
            acknowledgement = st.checkbox("I have read and understood the above points and acknowledge that the data shown is indicative.")
            
            submitted = st.form_submit_button("Analyze", type="primary")
            
            if submitted:
                if not acknowledgement:
                    st.error("Please acknowledge the important note to proceed.")
                elif not interests:
                     st.error("Please select at least one interest.")
                else:
                    try:
                        profile = FarmerProfile(
                            name="Farmer", # Defaulting name as it wasn't in the design, strictly following visual
                            budget=budget,
                            land_size=land_size,
                            water_source=water_source,
                            experience_years=int(experience_years),
                            interests=interests,
                            market_distance=market_distance,
                            b2c_willingness=b2c_willingness,
                            income_fluctuation_tolerance=income_fluctuation_tolerance,
                            investment_recovery_timeline=investment_recovery_timeline,
                            loss_attitude=loss_attitude,
                            risk_vs_profit=risk_vs_profit
                        )
                        
                        st.session_state.advisor_profile = profile
                        # Initialize advisor
                        st.session_state.advisor_bot = KrishiSahAIAdvisor(profile)
                        
                        # Initial greeting
                        greeting = st.session_state.advisor_bot.chat("Hello! Based on my profile, what do you suggest?")
                        st.session_state.ba_messages = [{"role": "assistant", "content": greeting}]
                        
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error creating profile: {e}")

    else:
        # Profile exists, show chat and options
        
        # Display Profile Summary (Collapsible)
        with st.expander("View Profile"):
            st.text(st.session_state.advisor_profile.to_context())
            if st.button("Reset Profile"):
                del st.session_state.advisor_profile
                del st.session_state.advisor_bot
                del st.session_state.ba_messages
                st.rerun()
                
        # Recommendations Button
        if st.button("Generate Business Recommendations"):
            with st.spinner("Analyzing profile and generating top business ideas..."):
                recs = st.session_state.advisor_bot.generate_recommendations()
                
                # Custom CSS for Cards
                st.markdown("""
                <style>
                .rec-card {
                    border: 1px solid #e0e0e0;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                    background: white;
                    margin-bottom: 15px;
                    height: 100%;
                }
                .rec-header {
                    background-color: #27ae60;
                    color: white;
                    padding: 15px;
                    position: relative;
                }
                .match-badge {
                    background-color: rgba(255,255,255,0.25);
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-size: 0.85em;
                    font-weight: 600;
                    display: inline-block;
                    margin-bottom: 8px;
                }
                .rec-title {
                    font-size: 1.1em;
                    font-weight: 700;
                    line-height: 1.3;
                    margin: 0;
                    text-transform: uppercase;
                }
                .rec-body {
                    padding: 15px;
                    color: #444;
                    font-size: 0.95em;
                }
                .stats-container {
                    display: flex;
                    justify-content: space-between;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    padding: 10px;
                    margin: 15px 0;
                }
                .stat-box {
                    text-align: left;
                }
                .stat-label {
                    font-size: 0.75em;
                    color: #888;
                    text-transform: uppercase;
                    margin-bottom: 2px;
                    font-weight: 600;
                }
                .stat-value {
                    font-size: 0.9em;
                    font-weight: 700;
                    color: #333;
                }
                .req-label {
                    font-size: 0.75em;
                    color: #888;
                    text-transform: uppercase;
                    font-weight: 600;
                    margin-bottom: 5px;
                }
                .tag {
                    display: inline-block;
                    background-color: #edf2f7;
                    color: #4a5568;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.8em;
                    margin-right: 5px;
                    margin-bottom: 5px;
                }
                </style>
                """, unsafe_allow_html=True)
                
                st.subheader("Recommended Businesses")
                
                cols = st.columns(3)
                
                for idx, rec in enumerate(recs):
                    with cols[idx]:
                        # Prepare HTML content
                        match_score = rec.get('match_score', 'N/A')
                        title = rec.get('title', 'Unknown Business')
                        reason = rec.get('reason', 'No description available.')
                        cost = rec.get('estimated_cost', 'N/A')
                        profit = rec.get('profit_potential', 'N/A')
                        requirements = rec.get('requirements', [])
                        tags_html = "".join([f'<span class="tag">{req}</span>' for req in requirements])
                        
                        card_html = f"""
                        <div class="rec-card">
                            <div class="rec-header">
                                <div class="match-badge">{match_score}% Match</div>
                                <h3 class="rec-title">{title}</h3>
                            </div>
                            <div class="rec-body">
                                <p style="margin-bottom: 15px; height: 60px; overflow: hidden;">{reason}</p>
                                
                                <div class="stats-container">
                                    <div class="stat-box">
                                        <div class="stat-label">Investment</div>
                                        <div class="stat-value">{cost}</div>
                                    </div>
                                    <div class="stat-box">
                                        <div class="stat-label">Profit</div>
                                        <div class="stat-value">{profit}</div>
                                    </div>
                                </div>
                                
                                <div class="req-label">Requirements</div>
                                <div style="margin-bottom: 15px; height: 50px; overflow: hidden;">
                                    {tags_html}
                                </div>
                            </div>
                        </div>
                        """
                        st.markdown(card_html, unsafe_allow_html=True)
                        
                        # Buttons inside the card column (below the HTML card)
                        b_col1, b_col2 = st.columns(2)
                        if b_col1.button("Ask Chatbot", key=f"ask_{idx}"):
                            # Pre-fill chat input
                            st.session_state.ba_messages.append({"role": "user", "content": f"Tell me more about {title}"})
                            response = st.session_state.advisor_bot.chat(f"Tell me more about {title}")
                            st.session_state.ba_messages.append({"role": "assistant", "content": response})
                            st.rerun()
                            
                        if b_col2.button("Know More", key=f"more_{idx}"):
                            st.session_state.ba_messages.append({"role": "user", "content": f"What are the detailed requirements for {title}?"})
                            response = st.session_state.advisor_bot.chat(f"What are the detailed requirements and steps for {title}?")
                            st.session_state.ba_messages.append({"role": "assistant", "content": response})
                            st.rerun()

        st.divider()

        # Chat Interface
        if "ba_messages" not in st.session_state:
             st.session_state.ba_messages = []

        for message in st.session_state.ba_messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

        if prompt := st.chat_input("Ask about farming businesses..."):
            with st.chat_message("user"):
                st.markdown(prompt)
            st.session_state.ba_messages.append({"role": "user", "content": prompt})

            with st.chat_message("assistant"):
                message_placeholder = st.empty()
                message_placeholder.markdown("...")
                try:
                    response = st.session_state.advisor_bot.chat(prompt)
                    message_placeholder.markdown(response)
                    st.session_state.ba_messages.append({"role": "assistant", "content": response})
                except Exception as e:
                   message_placeholder.error(f"Error: {e}")


def main():
    st.set_page_config(
        page_title="TechFiesta Agri-Engine",
        page_icon="farm",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    st.sidebar.title("TechFiesta")
    st.sidebar.info("Integrated Agricultural Decision Support System")
    
    if st.sidebar.button("Clear All Data"):
        st.session_state.clear()
        st.rerun()

    current_tab = st.sidebar.radio("Navigate", ["Waste to Value", "Business Advisor"])
    
    # Alternatively, use st.tabs if preferred over sidebar navigation for the main content
    # The user asked for "two different sections", tabs act nicely as sections.
    # Let's use st.tabs for the main view to make it very distinct.
    
    tab1, tab2 = st.tabs(["Waste to Value", "Business Advisor"])
    
    with tab1:
        render_waste_to_value()
        
    with tab2:
        render_business_advisor()

if __name__ == "__main__":
    main()
