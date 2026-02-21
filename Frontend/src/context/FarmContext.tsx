import React, { createContext, useContext, useState, useEffect } from 'react';
import { Farm } from '../../types';

interface FarmContextType {
    activeFarm: Farm | null;
    setActiveFarm: (farm: Farm | null) => void;
    farms: Farm[];
    setFarms: (farms: Farm[]) => void;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export const FarmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [activeFarm, setActiveFarm] = useState<Farm | null>(null);

    // Persist active farm index to localStorage
    useEffect(() => {
        const savedFarms = localStorage.getItem('userFarms');
        if (savedFarms) {
            try {
                const parsedFarms = JSON.parse(savedFarms);
                setFarms(parsedFarms);

                const savedActiveIndex = localStorage.getItem('activeFarmIndex');
                if (savedActiveIndex !== null && parsedFarms[parseInt(savedActiveIndex)]) {
                    setActiveFarm(parsedFarms[parseInt(savedActiveIndex)]);
                } else if (parsedFarms.length > 0) {
                    setActiveFarm(parsedFarms[0]);
                }
            } catch (e) {
                console.error("Failed to parse farms from storage", e);
            }
        }
    }, []);

    const handleSetActiveFarm = (farm: Farm | null) => {
        setActiveFarm(farm);
        if (farm) {
            const index = farms.findIndex(f => f.nickname === farm.nickname && f.landSize === farm.landSize);
            if (index !== -1) {
                localStorage.setItem('activeFarmIndex', index.toString());
            }
        } else {
            localStorage.removeItem('activeFarmIndex');
        }
    };

    const handleSetFarms = (newFarms: Farm[]) => {
        setFarms(newFarms);
        localStorage.setItem('userFarms', JSON.stringify(newFarms));
        // Reset active farm if common
        if (newFarms.length > 0 && (!activeFarm || !newFarms.find(f => f.nickname === activeFarm.nickname))) {
            handleSetActiveFarm(newFarms[0]);
        } else if (newFarms.length === 0) {
            handleSetActiveFarm(null);
        }
    };

    return (
        <FarmContext.Provider value={{ activeFarm, setActiveFarm: handleSetActiveFarm, farms, setFarms: handleSetFarms }}>
            {children}
        </FarmContext.Provider>
    );
};

export const useFarm = () => {
    const context = useContext(FarmContext);
    if (context === undefined) {
        throw new Error('useFarm must be used within a FarmProvider');
    }
    return context;
};
