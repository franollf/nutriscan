import { useState, useMemo } from "react";
import { useNutritionData } from "../hooks/useNutritionData";

export default function Summary() {
  const [period, setPeriod] = useState('week'); // Only 'week' and 'month' now

  const dateRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    
    if (period === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (period === 'month') {
      start.setDate(start.getDate() - 30);
    }
    
    return { start, end };
  }, [period]);

  const { logs, totals, loading, error, refetch } = useNutritionData(dateRange.start, dateRange.end);

  // Count actual days with data (more accurate than assuming 7/30 days)
  const daysWithData = new Set(
    logs.map(log => new Date(log.createdAt).toDateString())
  ).size;
  
  const daysInPeriod = period === 'week' ? 7 : 30;
  
  // Calculate averages based on actual logged days
  const averages = daysWithData > 0 ? {
    calories: Math.round(totals.calories / daysWithData),
    sugar: Math.round((totals.sugar / daysWithData) * 10) / 10,
    protein: Math.round((totals.protein / daysWithData) * 10) / 10,
    carbs: Math.round((totals.carbs / daysWithData) * 10) / 10,
    fat: Math.round((totals.fat / daysWithData) * 10) / 10,
  } : {
    calories: 0,
    sugar: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  // Prepare chart data - group by day
const chartData = useMemo(() => {
  const dayMap = new Map();
  
  // Initialize all days in the period INCLUDING today
  const days = period === 'week' ? 7 : 30;
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateString = date.toDateString();
    
    dayMap.set(dateString, {
      date: new Date(date),
      dateString: dateString,
      calories: 0,
      sugar: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  }
  
  // Add actual data
  logs.forEach(log => {
    const logDate = new Date(log.createdAt || log.date);
    logDate.setHours(0, 0, 0, 0);
    const dateString = logDate.toDateString();
    
    if (dayMap.has(dateString)) {
      const dayData = dayMap.get(dateString);
      
      if (log.items && Array.isArray(log.items)) {
        log.items.forEach(item => {
          dayData.calories += item.calories || 0;
          dayData.sugar += item.sugar || 0;
          dayData.protein += item.protein || 0;
          dayData.carbs += item.carbs || 0;
          dayData.fat += item.fat || 0;
        });
      }
    }
  });
  
  const result = Array.from(dayMap.values());
  console.log('Chart data:', result); // Debug log
  return result;
}, [logs, period]);

// Find max calories for scaling
const maxCalories = Math.max(...chartData.map(d => d.calories), 100);
console.log('Max calories:', maxCalories); // Debug log

  // Format day label
  const formatDayLabel = (date) => {
    if (period === 'week') {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Generate insights based on actual data
  const generateInsights = () => {
    const insights = [];
    
    if (daysWithData === 0) {
      return [{
        type: 'info',
        title: 'No data available',
        message: `No nutrition data found for the selected ${period}. Start logging your meals!`,
      }];
    }

    // Tracking consistency insight
    const trackingRate = Math.round((daysWithData / daysInPeriod) * 100);
    if (trackingRate >= 80) {
      insights.push({
        type: 'success',
        title: 'Excellent tracking!',
        message: `You've logged ${daysWithData} out of ${daysInPeriod} days (${trackingRate}%). Keep it up!`,
      });
    } else if (trackingRate >= 50) {
      insights.push({
        type: 'warning',
        title: 'Good tracking, but room for improvement',
        message: `You've logged ${daysWithData} out of ${daysInPeriod} days. Try to log daily for better insights!`,
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'Increase your tracking',
        message: `Only ${daysWithData} days logged. Daily tracking helps you reach your goals!`,
      });
    }
    
    // Protein insight
    if (averages.protein >= 60) {
      insights.push({
        type: 'success',
        title: 'Great protein intake!',
        message: "You're meeting your daily protein goals consistently.",
      });
    } else if (averages.protein > 0) {
      insights.push({
        type: 'warning',
        title: 'Increase your protein',
        message: `Your average protein intake is ${averages.protein}g. Aim for at least 60g daily.`,
      });
    }

    // Sugar insight
    if (averages.sugar > 50) {
      insights.push({
        type: 'warning',
        title: 'Watch your sugar intake',
        message: `Your average sugar is ${averages.sugar}g. Try to stay under 50g daily.`,
      });
    } else if (averages.sugar > 0) {
      insights.push({
        type: 'success',
        title: 'Good sugar control',
        message: "You're keeping your sugar intake within healthy limits.",
      });
    }

    // Calories insight
    if (averages.calories > 0 && averages.calories < 1200) {
      insights.push({
        type: 'warning',
        title: 'Low calorie intake',
        message: 'Consider increasing your daily caloric intake for better energy.',
      });
    } else if (averages.calories > 2500) {
      insights.push({
        type: 'info',
        title: 'High calorie intake',
        message: 'Make sure this aligns with your fitness goals.',
      });
    }

    return insights;
  };

  const insights = generateInsights();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: "calc(100vh - 64px)" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading nutrition summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          <p className="font-semibold mb-2">Error Loading Data</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-20 md:pb-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Nutrition Summary</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {daysWithData > 0 
              ? `Showing averages from ${daysWithData} ${daysWithData === 1 ? 'day' : 'days'} of tracking`
              : 'Start tracking to see your nutrition trends'
            }
          </p>
        </div>

        {/* Time Period Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-6 transition-colors">
          <div className="flex gap-3">
            <button 
              onClick={() => setPeriod('week')}
              className={`px-6 py-2 rounded-lg font-semibold shadow-md transition ${
                period === 'week' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Last 7 Days
            </button>
            <button 
              onClick={() => setPeriod('month')}
              className={`px-6 py-2 rounded-lg font-semibold shadow-md transition ${
                period === 'month' 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Averages */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Avg. Calories</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{averages.calories}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">per tracked day</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Avg. Sugar</p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{averages.sugar}g</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">per tracked day</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Avg. Protein</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{averages.protein}g</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">per tracked day</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Avg. Carbs</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{averages.carbs}g</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">per tracked day</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 transition-colors">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Avg. Fat</p>
            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">{averages.fat}g</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">per tracked day</p>
          </div>
        </div>

        {/* Bar Chart */}
<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 mb-6 transition-colors">
  <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
    Daily Calorie Intake - {period === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
  </h2>
  
  <div className="relative pl-16">
    {/* Y-axis labels */}
    <div className="absolute left-0 top-0 bottom-12 w-14 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
      <span>{Math.round(maxCalories)}</span>
      <span>{Math.round(maxCalories * 0.5)}</span>
      <span>0</span>
    </div>

    {/* Chart */}
    <div className="grid grid-cols-7 gap-3 h-64 items-end mb-8">
      {chartData.map((day, index) => {
        const heightPercent = maxCalories > 0 ? (day.calories / maxCalories) * 100 : 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = day.date.getTime() === today.getTime();
        const hasData = day.calories > 0;
        
        console.log(`Day ${index}:`, {
          date: day.date.toDateString(),
          calories: day.calories,
          heightPercent,
          isToday,
          hasData
        }); // Debug log
        
        return (
          <div key={index} className="flex flex-col items-center h-full group relative">
            {/* Bar container */}
            <div className="w-full flex flex-col justify-end" style={{ height: 'calc(100% - 30px)' }}>
              <div
                className={`w-full rounded-t-lg transition-all duration-300 ${
                  isToday 
                    ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 dark:from-emerald-500 dark:to-emerald-300' 
                    : hasData
                    ? 'bg-gradient-to-t from-emerald-500 to-emerald-300 dark:from-emerald-600 dark:to-emerald-400'
                    : 'bg-gray-200 dark:bg-gray-700'
                } hover:opacity-80 cursor-pointer`}
                style={{ 
                  height: hasData ? `${Math.max(heightPercent, 5)}%` : '8px',
                  minHeight: '4px'
                }}
              />
            </div>
            
            {/* Day Label */}
            <div className={`text-xs mt-2 text-center w-full truncate ${
              isToday 
                ? 'font-bold text-emerald-600 dark:text-emerald-400' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {formatDayLabel(day.date)}
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-lg pointer-events-none">
              <div className="font-semibold mb-1">
                {day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <div>{Math.round(day.calories)} calories</div>
              {hasData && (
                <div className="text-gray-300 dark:text-gray-400 text-[10px] mt-1">
                  P: {Math.round(day.protein)}g | C: {Math.round(day.carbs)}g | F: {Math.round(day.fat)}g
                </div>
              )}
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
            </div>
          </div>
        );
      })}
    </div>
  </div>

  {/* Legend */}
  <div className="flex items-center justify-center gap-6 mt-6 text-sm">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded bg-gradient-to-t from-emerald-600 to-emerald-400"></div>
      <span className="text-gray-600 dark:text-gray-400">Today</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded bg-gradient-to-t from-emerald-500 to-emerald-300"></div>
      <span className="text-gray-600 dark:text-gray-400">Past days</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700"></div>
      <span className="text-gray-600 dark:text-gray-400">No data</span>
    </div>
  </div>
</div>

        {/* Totals Section */}
        {daysWithData > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 mb-6 transition-colors">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
              Total Consumption ({period === 'week' ? 'Last 7 Days' : 'Last 30 Days'})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Calories</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totals.calories.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Sugar</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totals.sugar}g</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Protein</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.protein}g</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Carbs</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totals.carbs}g</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Fat</p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totals.fat}g</p>
              </div>
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 transition-colors">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Insights</h2>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div 
                key={index}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  insight.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                    : insight.type === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-900/20'
                    : 'bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <svg 
                  className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                    insight.type === 'success' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : insight.type === 'warning'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {insight.type === 'success' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : insight.type === 'warning' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{insight.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{insight.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}