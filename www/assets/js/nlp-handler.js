/* 
 * NLP Handler for Waistline
 * Processes voice input for food diary entries
 */

// NLP handler object definition
var nlpHandler = {
  init: function() {
    console.log("NLP Handler initialized");
    this.setupEventListeners();
  },

  setupEventListeners: function() {
    // Add event listeners for chat interactions
    this.currentParsedItems = [];
  },

  processInput: function(text) {
    console.log("Processing input:", text);
    const parsedItems = this.parseNaturalLanguage(text);
    
    if (parsedItems.length > 0) {
      this.currentParsedItems = parsedItems;
      this.showConfirmationDialog(parsedItems);
      return {
        success: true,
        message: `I found ${parsedItems.length} food item${parsedItems.length > 1 ? 's' : ''}: ${parsedItems.map(item => item.displayText).join(', ')}. Please confirm to add to your diary.`,
        originalText: text,
        parsedItems: parsedItems
      };
    } else {
      return {
        success: false,
        message: "I couldn't identify any food items in your message. Try saying something like '100g banana' or '1 cup rice'.",
        originalText: text
      };
    }
  },

  parseNaturalLanguage: function(text) {
    const items = [];
    const input = text.toLowerCase().trim();
    
    // Split by common separators (comma, and, with, plus)
    const segments = input.split(/[,;]\s*|\s+and\s+|\s+with\s+|\s+plus\s+/);
    
    for (let segment of segments) {
      const item = this.parseSegment(segment.trim());
      if (item) {
        items.push(item);
      }
    }
    
    return items;
  },

  parseSegment: function(segment) {
    // Remove common filler words
    segment = segment.replace(/\b(a|an|some|of|the)\b/g, '').trim();
    
    // Quantity patterns
    const patterns = [
      // "100g banana", "2.5 cups rice"
      /^([\d.,]+)\s*(g|grams?|kg|kilograms?|mg|milligrams?|oz|ounces?|lbs?|pounds?|cups?|tbsp|tablespoons?|tsp|teaspoons?|ml|milliliters?|l|liters?)\s+(.+)$/,
      // "1/2 cup of rice", "one third banana"
      /^([\d.,]+\/[\d.,]+|one\s+half|half|one\s+third|third|one\s+quarter|quarter)\s*(cups?|tbsp|tablespoons?|tsp|teaspoons?)?\s*(of\s+)?(.+)$/,
      // "2 bananas", "one apple"
      /^([\d.,]+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(.+)$/,
      // Just food name "banana"
      /^(.+)$/
    ];

    for (let pattern of patterns) {
      const match = segment.match(pattern);
      if (match) {
        return this.createFoodItem(match, segment);
      }
    }
    
    return null;
  },

  createFoodItem: function(match, originalSegment) {
    let quantity = 1;
    let unit = "g";
    let foodName = "";
    let portion = 100;

    if (match.length === 4) {
      // Pattern with quantity, unit, food
      quantity = this.parseQuantity(match[1]);
      unit = this.normalizeUnit(match[2]);
      foodName = this.normalizeFoodName(match[3]);
      portion = quantity;
    } else if (match.length === 5) {
      // Fractional pattern with optional unit
      quantity = this.parseFraction(match[1]);
      unit = match[2] ? this.normalizeUnit(match[2]) : "serving";
      foodName = this.normalizeFoodName(match[4]);
      portion = quantity;
    } else if (match.length === 3) {
      if (match[1].includes('/') || match[1].includes('half') || match[1].includes('third') || match[1].includes('quarter')) {
        // Fractional quantities
        quantity = this.parseFraction(match[1]);
        foodName = this.normalizeFoodName(match[2]);
        unit = "serving";
        portion = quantity;
      } else {
        // Just number + food
        quantity = this.parseQuantity(match[1]);
        foodName = this.normalizeFoodName(match[2]);
        unit = "item";
        portion = quantity;
      }
    } else {
      // Just food name
      foodName = this.normalizeFoodName(match[1]);
      unit = "g";
      portion = 100;
      quantity = 1;
    }

    if (!foodName) return null;

    return {
      name: foodName,
      unit: unit,
      portion: portion,
      quantity: quantity,
      displayText: `${portion}${unit} ${foodName}`,
      originalText: originalSegment,
      type: "food", // Will be used for search
      searchQuery: foodName
    };
  },

  parseQuantity: function(quantityStr) {
    const wordNumbers = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };
    
    if (wordNumbers[quantityStr]) {
      return wordNumbers[quantityStr];
    }
    
    return parseFloat(quantityStr) || 1;
  },

  parseFraction: function(fractionStr) {
    if (fractionStr.includes('half') || fractionStr === 'half') return 0.5;
    if (fractionStr.includes('third') || fractionStr === 'third') return 0.33;
    if (fractionStr.includes('quarter') || fractionStr === 'quarter') return 0.25;
    
    if (fractionStr.includes('/')) {
      const parts = fractionStr.split('/');
      return parseFloat(parts[0]) / parseFloat(parts[1]);
    }
    
    return parseFloat(fractionStr) || 1;
  },

  normalizeUnit: function(unit) {
    const unitMap = {
      'g': 'g', 'gram': 'g', 'grams': 'g',
      'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
      'mg': 'mg', 'milligram': 'mg', 'milligrams': 'mg',
      'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
      'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
      'cup': 'cup', 'cups': 'cup',
      'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
      'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
      'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
      'l': 'l', 'liter': 'l', 'liters': 'l'
    };
    
    return unitMap[unit.toLowerCase()] || unit.toLowerCase();
  },

  normalizeFoodName: function(foodName) {
    // Clean up food name
    return foodName.trim()
      .replace(/\s+/g, ' ')
      .replace(/^(cooked|raw|fresh|frozen)\s+/i, '')
      .toLowerCase();
  },

  showConfirmationDialog: function(parsedItems) {
    const container = document.querySelector('.nlp-messages-container');
    if (!container) return;

    // Create confirmation dialog message
    const confirmationDiv = document.createElement('div');
    confirmationDiv.className = 'message app-message nlp-confirmation';
    
    const itemsList = parsedItems.map(item => 
      `• ${item.displayText}`
    ).join('\n');
    
    confirmationDiv.innerHTML = `
      <div class="confirmation-text">
        I found these food items:
        <pre style="white-space: pre-wrap; font-family: inherit; margin: 8px 0;">${itemsList}</pre>
        <div class="confirmation-buttons" style="margin-top: 12px;">
          <button class="button button-small" onclick="nlpHandler.confirmItems()">Add to Diary</button>
          <button class="button button-small button-outline" onclick="nlpHandler.cancelItems()">Cancel</button>
        </div>
      </div>
    `;
    
    container.appendChild(confirmationDiv);
    container.scrollTop = container.scrollHeight;
  },

  confirmItems: async function() {
    if (!this.currentParsedItems || this.currentParsedItems.length === 0) return;

    this.addMessageToChat("Adding items to diary...", 'app');
    
    try {
      // Search for each food item and add to diary
      const foundItems = [];
      
      for (let parsedItem of this.currentParsedItems) {
        // Search for the food in the database
        const searchResults = await this.searchFoodDatabase(parsedItem.searchQuery);
        
        if (searchResults && searchResults.length > 0) {
          // Use the first result (best match)
          const foodItem = searchResults[0];
          
          // Create diary item with parsed quantity/portion
          const diaryItem = {
            ...foodItem,
            portion: parsedItem.portion,
            quantity: parsedItem.quantity,
            unit: parsedItem.unit
          };
          
          foundItems.push(diaryItem);
        } else {
          this.addMessageToChat(`⚠️ Could not find "${parsedItem.name}" in the food database. You can add it manually later.`, 'app');
        }
      }

      if (foundItems.length > 0) {
        // Add items to diary
        await this.addItemsToDiary(foundItems);
        this.addMessageToChat(`✅ Successfully added ${foundItems.length} item${foundItems.length > 1 ? 's' : ''} to your diary!`, 'app');
      }
      
    } catch (error) {
      console.error('Error adding items to diary:', error);
      this.addMessageToChat("Sorry, there was an error adding items to your diary. Please try again.", 'app');
    }
    
    // Clear current items
    this.currentParsedItems = [];
  },

  cancelItems: function() {
    this.addMessageToChat("Cancelled. No items were added to your diary.", 'app');
    this.currentParsedItems = [];
  },

  searchFoodDatabase: async function(query) {
    try {
      // Use the existing food search functionality
      if (app && app.Foodlist) {
        // Call the search function which updates app.Foodlist.list
        await app.Foodlist.search(query);
        
        // Return the search results
        if (app.Foodlist.list && app.Foodlist.list.length > 0) {
          return app.Foodlist.list.slice(0, 5); // Return top 5 matches
        }
      }
      
      // Fallback: search local database
      const foods = await dbHandler.getIndex("foods");
      const matches = foods.filter(food => 
        food.name && food.name.toLowerCase().includes(query.toLowerCase())
      );
      return matches.slice(0, 5); // Return top 5 matches
      
    } catch (error) {
      console.error('Error searching food database:', error);
      
      // Final fallback: search local database
      try {
        const foods = await dbHandler.getIndex("foods");
        const matches = foods.filter(food => 
          food.name && food.name.toLowerCase().includes(query.toLowerCase())
        );
        return matches.slice(0, 5);
      } catch (dbError) {
        console.error('Error searching local database:', dbError);
        return [];
      }
    }
  },

  addItemsToDiary: async function(items) {
    if (!app.Diary || !app.Diary.addItems) {
      throw new Error('Diary functionality not available');
    }
    
    // Use the existing diary functionality to add items
    const category = "breakfast"; // Default category - could be made configurable
    await app.Diary.addItems(items, category);
  },

  addMessageToChat: function(text, sender = 'user') {
    const container = document.querySelector('.nlp-messages-container');
    if (!container) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'user-message' : 'app-message'}`;
    messageDiv.textContent = text;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  },

  processCompleteStatement: function(text) {
    // This is called by the chat interface
    this.addMessageToChat(text, 'user');
    const response = this.processInput(text);
    setTimeout(() => {
      this.addMessageToChat(response.message, 'app');
    }, 100);
  }
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
  // Wait for app to be initialized
  if (typeof app !== 'undefined') {
    window.nlpHandler = nlpHandler;
    // Expose to app namespace
    app.NLPChat = app.NLPChat || {};
    app.NLPChat.handler = nlpHandler;
    nlpHandler.init();
  } else {
    console.warn("App not initialized, NLP handler initialization delayed");
    // Try again after a delay
    setTimeout(function() {
      if (typeof app !== 'undefined') {
        window.nlpHandler = nlpHandler;
        app.NLPChat = app.NLPChat || {};
        app.NLPChat.handler = nlpHandler;
        nlpHandler.init();
      } else {
        console.error("Could not initialize NLP handler, app not available");
      }
    }, 2000);
  }
});
