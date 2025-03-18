/* 
 * NLP Handler for Waistline
 * Processes voice input for food diary entries
 */

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

processInput: function(text) {
  // Process the text input and return a response
  const lowercaseText = text.toLowerCase();
  
  // Process the text input and return structured data
  // First try to extract food item and portion
  this.processCompleteStatement(text);
  
  // Return a response object to the controller
  return {
    success: true,
    message: "I'm processing your food entry now.",
    originalText: text
  };
}
