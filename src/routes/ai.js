const express = require('express');
const router = express.Router();

// POST /ai/generate-recipes
router.post('/generate-recipes', async (req, res) => {
  console.log('📝 Recipe generation request received:', req.body);
  
  const { ingredient } = req.body;

  if (!ingredient) {
    return res.status(400).json({ error: 'Ingredient is required' });
  }

  const prompt = `Generate exactly 4 creative and practical recipe ideas using "${ingredient}" as a main ingredient.

For each recipe, provide:
- A catchy, specific title
- A brief description (2-3 sentences explaining what makes it special)
- Difficulty level (must be exactly: "Easy", "Medium", or "Hard")
- Cook time in minutes (e.g., "30 min")
- Number of servings (e.g., "4 servings")

Format your response as a JSON array with this exact structure:
[
  {
    "title": "Recipe Name",
    "description": "Brief description of the recipe",
    "difficulty": "Easy",
    "cookTime": "30 min",
    "servings": "4 servings"
  }
]

Return ONLY valid JSON, no additional text.`;

  try {
    console.log('🤖 Calling Gemini API via REST...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    // ✅ Use gemini-2.5-flash (your newest available model)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:', errorData);
      throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log('✅ Received response from Gemini');
    
    const text = data.candidates[0].content.parts[0].text;
    console.log('📄 Raw response:', text.substring(0, 200) + '...');

    // Parse the JSON response
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recipes = JSON.parse(cleanText);
    
    console.log(`✅ Parsed ${recipes.length} recipes`);
    
    if (!Array.isArray(recipes) || recipes.length === 0) {
      throw new Error('No recipes generated');
    }

    res.json({ recipes: recipes.slice(0, 4) });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recipes',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    console.log('🔍 Testing Gemini API key...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Say hello in one word'
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Key Test Failed:', data);
      return res.status(response.status).json({ 
        success: false,
        error: data,
        message: 'API key test failed'
      });
    }

    console.log('✅ API Key Test Successful with gemini-2.5-flash!');
    return res.json({ 
      success: true,
      message: 'API key is working with gemini-2.5-flash!',
      model: 'gemini-2.5-flash',
      response: data.candidates[0].content.parts[0].text
    });
    
  } catch (error) {
    console.error('❌ Test Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// List available models endpoint
router.get('/list-models', async (req, res) => {
  try {
    console.log('🔍 Listing available models...');
    
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Failed to list models:', data);
      return res.status(response.status).json({ 
        success: false,
        error: data
      });
    }

    const contentModels = data.models.filter(model => 
      model.supportedGenerationMethods?.includes('generateContent')
    );

    console.log('✅ Available models:', contentModels.map(m => m.name));
    
    return res.json({ 
      success: true,
      models: contentModels.map(m => ({
        name: m.name,
        displayName: m.displayName,
        description: m.description
      }))
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;