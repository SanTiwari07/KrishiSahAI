export type Language = 'EN' | 'HI' | 'MR';

export interface Farm {
  nickname: string;
  landType: 'Irrigated' | 'Rainfed' | 'Semi-Irrigated' | 'Organic Certified' | 'Greenhouse' | 'Polyhouse' | 'Mixed';
  soilType: string;
  waterResource: string;
  landSize: string;
  unit: 'Acre' | 'Hectare';
  crop: string;
}

export interface UserProfile {
  name: string;
  age: string;
  phone: string;
  email?: string;
  language: Language;
  location: {
    state: string;
    district: string;
    village: string;
  };
  farms: Farm[];
  // Maintain legacy compatibility if needed
  occupation?: string;
  gender?: string;
  experience_years?: string;
}


export interface NavItem {
  id: string;
  label: string;
  path: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface BusinessOption {
  name: string;
  capital: string;
  risk: 'Low' | 'Moderate' | 'High';
  type: 'Safe' | 'Moderate' | 'High-Potential';
}

export interface PlanMilestone {
  period: string;
  label: string;
  description: string;
}
