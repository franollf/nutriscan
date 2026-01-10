'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

// Predefined goal templates
const GOAL_TEMPLATES = {
  cutSugar: {
    name: 'Cut Sugar',
    icon: '🍬',
    description: 'Reduce sugar intake for better health',
    proteinPerKg: 1.6, // g per kg body weight
    fatPerKg: 0.8, // g per kg body weight
    sugarLimit: 25,
    weightGoal: 'lose',
    weeklyTarget: '0.5',
  },
  gainMuscle: {
    name: 'Gain Muscle',
    icon: '💪',
    description: 'Build lean muscle mass with high protein',
    proteinPerKg: 2.2, // High protein for muscle growth
    fatPerKg: 0.8,
    sugarLimit: 50,
    weightGoal: 'gain',
    weeklyTarget: '0.5',
  },
  loseFat: {
    name: 'Lose Fat',
    icon: '🔥',
    description: 'Burn fat while maintaining muscle',
    proteinPerKg: 2.2, // High protein to preserve muscle
    fatPerKg: 0.9,
    sugarLimit: 30,
    weightGoal: 'lose',
    weeklyTarget: '0.5',
  },
  balanced: {
    name: 'Balanced Diet',
    icon: '⚖️',
    description: 'Maintain healthy balanced nutrition',
    proteinPerKg: 1.6,
    fatPerKg: 0.9,
    sugarLimit: 50,
    weightGoal: 'maintain',
    weeklyTarget: '0',
  },
  lowCarb: {
    name: 'Low Carb',
    icon: '🥑',
    description: 'Reduce carbs, increase healthy fats',
    proteinPerKg: 1.8,
    fatPerKg: 1.2, // Higher fat for low carb
    sugarLimit: 20,
    weightGoal: 'lose',
    weeklyTarget: '0.5',
  },
  athletic: {
    name: 'Athletic Performance',
    icon: '🏃',
    description: 'Fuel for high-intensity workouts',
    proteinPerKg: 1.8,
    fatPerKg: 0.8,
    sugarLimit: 60,
    weightGoal: 'maintain',
    weeklyTarget: '0',
  },
};

const validateWeightGoal = (currentWeight, targetWeight, goalType) => {
  const current = parseFloat(currentWeight);
  const target = parseFloat(targetWeight);
  
  if (!current || !target) return { valid: true, message: '' };
  
  if (goalType === 'gain' && target <= current) {
    return { 
      valid: false, 
      message: 'Target weight must be higher than current weight for muscle gain goals' 
    };
  }
  
  if (goalType === 'lose' && target >= current) {
    return { 
      valid: false, 
      message: 'Target weight must be lower than current weight for fat loss goals' 
    };
  }
  
  if (goalType === 'maintain' && target !== current) {
    return { 
      valid: false, 
      message: 'Target weight must equal current weight for maintenance goals' 
    };
  }
  
  return { valid: true, message: '' };
};

export default function Profile() {
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const { user } = useAuth();

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [goals, setGoals] = useState({
    weight: '',
    targetWeight: '',
    height: '',
    age: '',
    gender: 'male',
    activityLevel: 'moderate',
    weeklyTarget: '0.5',
    goalTemplate: null,
  });

  const [calculatedGoals, setCalculatedGoals] = useState({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
    sugar: 50,
  });

  const [showGoalsForm, setShowGoalsForm] = useState(false);
  const [hasGoals, setHasGoals] = useState(false);
  const [step, setStep] = useState(1);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedEmailNotifications = localStorage.getItem('emailNotifications') === 'true';
    const savedGoals = localStorage.getItem('userGoals');
    const savedCalculatedGoals = localStorage.getItem('calculatedGoals');
    
    setDarkMode(savedDarkMode);
    setEmailNotifications(savedEmailNotifications);
    
    if (savedGoals) {
      const parsedGoals = JSON.parse(savedGoals);
      setGoals(parsedGoals);
      setSelectedTemplate(parsedGoals.goalTemplate);
      setHasGoals(true);
    }
    
    if (savedCalculatedGoals) {
      setCalculatedGoals(JSON.parse(savedCalculatedGoals));
    }
    
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleEmailNotificationsToggle = () => {
    const newEmailNotifications = !emailNotifications;
    setEmailNotifications(newEmailNotifications);
    localStorage.setItem('emailNotifications', newEmailNotifications.toString());
  };

  const selectTemplate = (templateKey) => {
    setSelectedTemplate(templateKey);
    const template = GOAL_TEMPLATES[templateKey];
    
    setGoals({
      ...goals,
      goalTemplate: templateKey,
      weeklyTarget: template.weeklyTarget,
    });
  };

  const calculateGoals = () => {
    const weight = parseFloat(goals.weight);
    const targetWeight = parseFloat(goals.targetWeight);
    const height = parseFloat(goals.height);
    const age = parseInt(goals.age);

    if (!weight || !height || !age || !selectedTemplate) {
      showToast('Please fill in all required fields and select a goal', 'error');
      return;
    }

    const template = GOAL_TEMPLATES[selectedTemplate];
    
    const validation = validateWeightGoal(weight, targetWeight, template.weightGoal);
    if (!validation.valid) {
      showToast(validation.message, 'error');
      return;
    }

    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (goals.gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Apply activity multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9,
    };

    let tdee = bmr * activityMultipliers[goals.activityLevel];

    // Adjust for weight goal
    if (template.weightGoal === 'lose') {
      const weeklyDeficit = parseFloat(goals.weeklyTarget) * 7700; // 7700 cal per kg
      tdee -= weeklyDeficit / 7;
    } else if (template.weightGoal === 'gain') {
      const weeklySurplus = parseFloat(goals.weeklyTarget) * 7700;
      tdee += weeklySurplus / 7;
    }

    const calories = Math.round(tdee);

    // Calculate macros based on body weight (more realistic approach)
    const protein = Math.round(weight * template.proteinPerKg);
    const fat = Math.round(weight * template.fatPerKg);
    
    // Calculate remaining calories for carbs
    const proteinCals = protein * 4;
    const fatCals = fat * 9;
    const remainingCals = calories - proteinCals - fatCals;
    const carbs = Math.round(Math.max(remainingCals / 4, 50)); // Minimum 50g carbs
    
    const sugar = template.sugarLimit;

    const newCalculatedGoals = {
      calories,
      protein,
      carbs,
      fat,
      sugar,
      template: selectedTemplate,
    };

    setCalculatedGoals(newCalculatedGoals);
    localStorage.setItem('calculatedGoals', JSON.stringify(newCalculatedGoals));
    localStorage.setItem('userGoals', JSON.stringify(goals));
    localStorage.setItem('calorieGoal', calories.toString());

    setHasGoals(true);
    setShowGoalsForm(false);
    setStep(1);
    showToast('Goals saved successfully! 🎉', 'success');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const getBMI = () => {
    if (!goals.weight || !goals.height) return null;
    const heightInMeters = parseFloat(goals.height) / 100;
    const bmi = parseFloat(goals.weight) / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return '';
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600 dark:text-blue-400' };
    if (bmi < 25) return { label: 'Normal', color: 'text-green-600 dark:text-green-400' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'Obese', color: 'text-red-600 dark:text-red-400' };
  };

  const bmi = getBMI();
  const bmiCategory = getBMICategory(bmi);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 pb-20 transition-colors duration-200">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[320px] ${
            toast.type === 'success' 
              ? 'bg-emerald-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="font-medium">{toast.message}</p>
            <button 
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className="ml-auto hover:opacity-80"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Profile & Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your account, goals, and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 mb-6 transition-colors duration-200">
          <div className="flex items-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {getInitials(user?.name || user?.displayName)}
            </div>
            <div className="ml-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {user?.name || user?.displayName || 'User Name'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
        </div>

        {/* Goals Overview */}
        {hasGoals && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 mb-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{GOAL_TEMPLATES[selectedTemplate]?.icon}</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {GOAL_TEMPLATES[selectedTemplate]?.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {GOAL_TEMPLATES[selectedTemplate]?.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowGoalsForm(true);
                  setStep(1);
                }}
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm"
              >
                Edit Goals
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg">
                <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-1">Daily Calories</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{calculatedGoals.calories}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Protein</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{calculatedGoals.protein}g</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <p className="text-sm text-purple-700 dark:text-purple-400 mb-1">Carbs</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{calculatedGoals.carbs}g</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-lg">
                <p className="text-sm text-rose-700 dark:text-rose-400 mb-1">Fat</p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{calculatedGoals.fat}g</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">Sugar Limit</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{calculatedGoals.sugar}g</p>
              </div>
              {bmi && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-400 mb-1">BMI</p>
                  <p className={`text-2xl font-bold ${bmiCategory.color}`}>{bmi}</p>
                  <p className={`text-xs ${bmiCategory.color}`}>{bmiCategory.label}</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-1">
                    Current: {goals.weight}kg → Target: {goals.targetWeight}kg 
                    {goals.weeklyTarget !== '0' && ` (±${goals.weeklyTarget}kg/week)`}
                  </p>
                  <p>
                    {GOAL_TEMPLATES[selectedTemplate]?.weightGoal === 'lose' && 'Losing weight with a calorie deficit'}
                    {GOAL_TEMPLATES[selectedTemplate]?.weightGoal === 'gain' && 'Gaining weight with a calorie surplus'}
                    {GOAL_TEMPLATES[selectedTemplate]?.weightGoal === 'maintain' && 'Maintaining current weight'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Goals Form */}
        {(!hasGoals || showGoalsForm) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 mb-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {hasGoals ? 'Update Your Goals' : 'Set Your Goals'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Step {step} of 2
                </p>
              </div>
              {hasGoals && (
                <button
                  onClick={() => {
                    setShowGoalsForm(false);
                    setStep(1);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Step 1: Choose Goal Template */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-4">What's your main goal?</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(GOAL_TEMPLATES).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => selectTemplate(key)}
                        className={`p-6 rounded-xl border-2 transition-all text-left ${
                          selectedTemplate === key
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <span className="text-4xl">{template.icon}</span>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-800 dark:text-white mb-1">
                              {template.name}
                            </h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {template.description}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                Protein: {template.proteinPerKg}g/kg
                              </span>
                              <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 px-2 py-1 rounded">
                                Fat: {template.fatPerKg}g/kg
                              </span>
                              <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                                Carbs: Fills rest
                              </span>
                              <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded">
                                Sugar: {template.sugarLimit}g
                              </span>
                            </div>
                          </div>
                          {selectedTemplate === key && (
                            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedTemplate}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Personal Info
                </button>
              </div>
            )}

            {/* Step 2: Personal Information */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Weight (kg) *
                    </label>
                    <input
                      type="number"
                      value={goals.weight}
                      onChange={(e) => setGoals({ ...goals, weight: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="70"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Weight (kg) *
                    </label>
                    <input
                      type="number"
                      value={goals.targetWeight}
                      onChange={(e) => setGoals({ ...goals, targetWeight: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="65"
                    />
                  </div>

                  {/* Real-time validation feedback */}
                  {selectedTemplate && goals.weight && goals.targetWeight && (
                    <div className="md:col-span-2">
                      {(() => {
                        const template = GOAL_TEMPLATES[selectedTemplate];
                        const validation = validateWeightGoal(goals.weight, goals.targetWeight, template.weightGoal);
                        
                        if (!validation.valid) {
                          return (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-sm text-red-800 dark:text-red-300">{validation.message}</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-start gap-2">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-sm text-green-800 dark:text-green-300">Weight goals look good!</p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Height (cm) *
                    </label>
                    <input
                      type="number"
                      value={goals.height}
                      onChange={(e) => setGoals({ ...goals, height: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="175"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Age *
                    </label>
                    <input
                      type="number"
                      value={goals.age}
                      onChange={(e) => setGoals({ ...goals, age: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="25"
                    />
                  </div>
                </div>

                {/* Weekly Target - Only show for lose/gain goals */}
                {selectedTemplate && GOAL_TEMPLATES[selectedTemplate].weightGoal !== 'maintain' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Weekly {GOAL_TEMPLATES[selectedTemplate].weightGoal === 'lose' ? 'Weight Loss' : 'Weight Gain'} Target (kg) *
                    </label>
                    <select
                      value={goals.weeklyTarget}
                      onChange={(e) => setGoals({ ...goals, weeklyTarget: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="0.25">0.25 kg/week (Slow & Steady)</option>
                      <option value="0.5">0.5 kg/week (Moderate)</option>
                      <option value="0.75">0.75 kg/week (Aggressive)</option>
                      <option value="1">1 kg/week (Very Aggressive)</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {GOAL_TEMPLATES[selectedTemplate].weightGoal === 'lose' 
                        ? 'Recommended: 0.5-0.75 kg/week for sustainable fat loss'
                        : 'Recommended: 0.25-0.5 kg/week for lean muscle gain'}
                    </p>
                  </div>
                )}

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender *
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setGoals({ ...goals, gender: 'male' })}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                        goals.gender === 'male'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      onClick={() => setGoals({ ...goals, gender: 'female' })}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                        goals.gender === 'female'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>

                {/* Activity Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activity Level *
                  </label>
                  <select
                    value={goals.activityLevel}
                    onChange={(e) => setGoals({ ...goals, activityLevel: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="sedentary">Sedentary (little or no exercise)</option>
                    <option value="light">Light (exercise 1-3 days/week)</option>
                    <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                    <option value="active">Active (exercise 6-7 days/week)</option>
                    <option value="veryActive">Very Active (hard exercise daily)</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={calculateGoals}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-700 transition shadow-md hover:shadow-lg"
                  >
                    Calculate & Save Goals
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Preferences</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-200">
              <div>
                <p className="font-medium text-gray-800 dark:text-white">Email Notifications</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive daily nutrition summaries</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={emailNotifications}
                  onChange={handleEmailNotificationsToggle}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-600 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-200">
              <div>
                <p className="font-medium text-gray-800 dark:text-white">Dark Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Use dark theme</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={darkMode}
                  onChange={handleDarkModeToggle}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-600 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}