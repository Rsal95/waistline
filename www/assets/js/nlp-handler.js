/*
  NLP handler for Waistline voice assistant
*/

(function() {
  'use strict';
  
  var NLPHandler = {
    init: function() {
      this.keywords = {
        add: ['add', 'track', 'log', 'record'],
        get: ['how many', 'what is', 'show me', 'tell me'],
        diary: ['diary', 'journal', 'today', 'yesterday'],
        foods: ['calories', 'food', 'apple', 'bread', 'meal']
      };
      
      console.log("NLP Handler initialized");
    },
    
    processInput: function(text) {
      text = text.toLowerCase().trim();
      console.log("Processing: " + text);
      
      // Simple pattern matching based on keywords
      if (this.containsAny(text, this.keywords.add) && 
          this.containsAny(text, this.keywords.foods)) {
        return this.handleAddFood(text);
      } 
      else if (this.containsAny(text, this.keywords.get) && 
               this.containsAny(text, this.keywords.diary)) {
        return this.handleDiaryQuery(text);
      }
      else {
        return {
          success: false,
          message: "I'm not sure how to help with that. Try asking about adding food or checking your diary."
        };
      }
    },
    
    handleAddFood: function(text) {
      // Extract food item from text
      let foodItem = this.extractFoodItem(text);
      
      if (foodItem) {
        // In a real implementation, this would add the item to the diary
        return {
          success: true,
          action: "add_food",
          foodItem: foodItem,
          message: `I'll add ${foodItem} to your diary. Would you like to specify the amount?`
        };
      } else {
        return {
          success: false,
          message: "What food would you like to add?"
        };
      }
    },
    
    handleDiaryQuery: function(text) {
      // In a real implementation, this would query the diary database
      return {
        success: true,
        action: "diary_query",
        message: "Today you've consumed approximately 1,500 calories so far."
      };
    },
    
    extractFoodItem: function(text) {
      // Very simple extraction - would be more sophisticated in a real app
      for (let food of this.keywords.foods) {
        if (food !== 'calories' && food !== 'food' && text.includes(food)) {
          return food;
        }
      }
      return null;
    },
    
    containsAny: function(text, keywords) {
      return keywords.some(keyword => text.includes(keyword));
    }
  };
  
  // Initialize and expose to app
  NLPHandler.init();
  app.NLPChat.handler = NLPHandler;
})();
