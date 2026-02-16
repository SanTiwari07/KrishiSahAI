
export type Language = 'EN' | 'HI' | 'MR';

export interface UserProfile {
  name: string;
  age: string;
  gender: string;
  occupation: string;
  phone: string;
  email: string;
  state: string;
  district: string;
  village: string;
  landSize: string;
  soilType: string;
  waterAvailability: string;
  mainCrops: string[];
  location: string; // Derived or summary field
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
