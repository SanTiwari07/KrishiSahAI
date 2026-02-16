import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Chatbot from './pages/Chatbot';
import { CropCare, WasteToValue, Advisory, Hub, News, Login, Signup } from './pages/Placeholders';

// Try to import original components if they exist (uncomment if restored)
// import NewsPage from './pages/NewsPage'; 
// import BusinessDetail from './pages/BusinessDetail';

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <Router>
                <div className="flex flex-col min-h-screen bg-[#FAFAF7] font-inter">
                    <Navbar />
                    <main className="flex-1">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/chat" element={<Chatbot />} />
                            <Route path="/crop-care" element={<CropCare />} />
                            <Route path="/waste-to-value" element={<WasteToValue />} />
                            <Route path="/advisory" element={<Advisory />} />
                            <Route path="/hub" element={<Hub />} />
                            <Route path="/news" element={<News />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />
                        </Routes>
                    </main>
                </div>
            </Router>
        </LanguageProvider>
    );
};

export default App;
