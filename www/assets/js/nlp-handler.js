/* 
 * NLP Handler for Waistline
 * Processes voice input for food diary entries
 */

const nlpHandler = {
  currentInput: {
    foodName: null,
    servingSize: null,
    servingUnit: null,
    macronutrients: null,
    inputStep: 0,
    complete: false
  },
  
  // Initialize the NLP handler
  init: function() {
    console.log("NLP Handler initialized");
    this.setupSpeechRecognition();
  },
  
  // Add message to chat interface
  addMessageToChat: function(message, sender) {
    const chatContainer = document.querySelector('.nlp-messages-container');
    if (!chatContainer) return;
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(sender + '-message');
    messageElement.textContent = message;
    
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  },
  
  // Start listening for voice input
  startListening: function() {
    if (!this.recognition) this.setupSpeechRecognition();
    
    // Visual feedback that we're listening
    const micButton = document.getElementById('nlp-mic-button');
    if (micButton) micButton.classList.add('active');
    
    this.addMessageToChat("Listening...", "app");
    this.recognition.start();
  },
  
  // Stop listening
  stopListening: function() {
    if (this.recognition) {
      this.recognition.stop();
    }
    
    const micButton = document.getElementById('nlp-mic-button');
    if (micButton) micButton.classList.remove('active');
  },
  
  // Set up speech recognition
  setupSpeechRecognition: function() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not available in this browser");
      return;
    }
    
    // Set up the recognition object
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    
    // Event handlers
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      
      // Process the complete statement
      this.processCompleteStatement(transcript);
    };
    
    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      this.addMessageToChat("Sorry, I didn't catch that. Please try again or type your response.", 'app');
    };
    
    this.recognition.onend = () => {
      const micButton = document.getElementById('nlp-mic-button');
      if (micButton) micButton.classList.remove('active');
    };
  },
  
  // Process complete food entry statement
  processCompleteStatement: function(text) {
    this.addMessageToChat(text, 'user');
    
    // Try to extract all needed information from a single statement
    
    // 1. Extract food item and quantity pattern
    // Match patterns like "3 cups of spinach" or "spinach 3 cups"
    const quantityFoodPattern1 = /(\d+\.?\d*)\s+(cup|cups|tbsp|tsp|g|gram|grams|oz|ounce|ounces|ml|l|liter|liters|serving|servings|piece|pieces)\s+(?:of\s+)?([\w\s]+)/i;
    const quantityFoodPattern2 = /([\w\s]+)\s+(\d+\.?\d*)\s+(cup|cups|tbsp|tsp|g|gram|grams|oz|ounce|ounces|ml|l|liter|liters|serving|servings|piece|pieces)/i;
    
    let foodName, quantity, unit;
    
    // Try first pattern (quantity first)
    let match = text.match(quantityFoodPattern1);
    if (match) {
      quantity = parseFloat(match[1]);
      unit = match[2].toLowerCase();
      foodName = match[3].trim();
    } else {
      // Try second pattern (food first)
      match = text.match(quantityFoodPattern2);
      if (match) {
        foodName = match[1].trim();
        quantity = parseFloat(match[2]);
        unit = match[3].toLowerCase();
      } else {
        // If no quantity/unit found, assume it's just the food name
        foodName = text.trim();
        quantity = 1; // Default quantity
        unit = "serving"; // Default unit
      }
    }
    
    // Normalize units
    if (unit === "cups") unit = "cup";
    if (unit === "grams") unit = "g";
    if (unit === "gram") unit = "g";
    if (unit === "ounces" || unit === "ounce") unit = "oz";
    if (unit === "liters" || unit === "liter") unit = "l";
    if (unit === "servings") unit = "serving";
    if (unit === "pieces") unit = "piece";
    
    // 2. Try to extract nutrition information if present
    const macros = this.parseMacronutrients(text);
    
    // Create the entry object
    const entry = {
      name: foodName,
      portion: quantity,
      unit: unit,
      dateTime: new Date(),
      nutrition: {}
    };
    
    // Add macronutrient information if available
    if (macros.calories !== null) entry.nutrition.calories = macros.calories;
    if (macros.proteins !== null) entry.nutrition.proteins = macros.proteins;
    if (macros.carbohydrates !== null) entry.nutrition.carbohydrates = macros.carbohydrates;
    if (macros.fats !== null) entry.nutrition.fats = macros.fats;
    
    // Check if nutrition info was provided
    const hasNutritionInfo = macros.calories !== null || 
                           macros.proteins !== null || 
                           macros.carbohydrates !== null || 
                           macros.fats !== null;
    
    // If nutrition info wasn't provided, ask if they want to search online
    if (!hasNutritionInfo) {
      this.currentInput = {
        foodName: foodName,
        servingSize: quantity,
        servingUnit: unit,
        macronutrients: null,
        inputStep: 3, // Set to search confirmation step
        complete: false
      };
      
      this.addMessageToChat(`I'll add "${quantity} ${unit} of ${foodName}". Would you like to search online for nutrition data? (yes/no)`, 'app');
    } else {
      // Save the entry directly
      this.addMessageToChat(`Adding ${quantity} ${unit} of ${foodName} with nutrition information.`, 'app');
      this.saveEntryToDatabase(entry);
    }
  },
  
  // Parse macronutrient information from text
  parseMacronutrients: function(text) {
    const result = {
      calories: null,
      proteins: null,
      carbohydrates: null,
      fats: null
    };
    
    // Calorie patterns
    const caloriePatterns = [
      /(\d+)\s*(?:kcal|calories|calorie|cal)/i,
      /(?:kcal|calories|calorie|cal)\s*(\d+)/i
    ];
    
    // Protein patterns
    const proteinPatterns = [
      /(\d+)(?:\.\d+)?\s*(?:g|grams|gram)?\s*(?:of)?\s*(?:protein|proteins)/i,
      /(?:protein|proteins)\s*(\d+)(?:\.\d+)?\s*(?:g|grams|gram)?/i
    ];
    
    // Carbohydrate patterns
    const carbPatterns = [
      /(\d+)(?:\.\d+)?\s*(?:g|grams|gram)?\s*(?:of)?\s*(?:carbs|carbohydrates|carb)/i,
      /(?:carbs|carbohydrates|carb)\s*(\d+)(?:\.\d+)?\s*(?:g|grams|gram)?/i
    ];
    
    // Fat patterns
    const fatPatterns = [
      /(\d+)(?:\.\d+)?\s*(?:g|grams|gram)?\s*(?:of)?\s*(?:fat|fats)/i,
      /(?:fat|fats)\s*(\d+)(?:\.\d+)?\s*(?:g|grams|gram)?/i
    ];
    
    // Extract calories
    for (const pattern of caloriePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.calories = parseFloat(match[1]);
        break;
      }
    }
    
    // Extract protein
    for (const pattern of proteinPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.proteins = parseFloat(match[1]);
        break;
      }
    }
    
    // Extract carbs
    for (const pattern of carbPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.carbohydrates = parseFloat(match[1]);
        break;
      }
    }
    
    // Extract fat
    for (const pattern of fatPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.fats = parseFloat(match[1]);
        break;
      }
    }
    
    return result;
  },
  
  // Save entry to database
  saveEntryToDatabase: function(entry) {
    // Access app's database methods
    if (app.FoodsMealsRecipes && app.FoodsMealsRecipes.addFood) {
      app.FoodsMealsRecipes.addFood(entry)
        .then(() => {
          this.addMessageToChat("Food has been added to your diary!", "app");
          this.resetInput();
        })
        .catch(error => {
          console.error("Error saving food entry:", error);
          this.addMessageToChat("Sorry, there was an error saving your food entry. Please try again.", "app");
        });
    } else {
      console.warn("FoodsMealsRecipes module not available");
      this.addMessageToChat("I've processed your food entry, but the database module seems unavailable. Please try again later.", "app");
    }
  },
  
  // Reset input state
  resetInput: function() {
    this.currentInput = {
      foodName: null,
      servingSize: null,
      servingUnit: null,
      macronutrients: null,
      inputStep: 0,
      complete: false
    };
  }
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
  // Wait for app to be initialized
  if (typeof app !== 'undefined') {
    window.nlpHandler = nlpHandler;
    nlpHandler.init();
  } else {
    console.warn("App not initialized, NLP handler initialization delayed");
    // Try again after a delay
    setTimeout(function() {
      if (typeof app !== 'undefined') {
        window.nlpHandler = nlpHandler;
        nlpHandler.init();
      } else {
        console.error("Could not initialize NLP handler, app not available");
      }
    }, 2000);
  }
});
