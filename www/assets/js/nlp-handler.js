/* 
 * NLP Handler for Waistline
 * Processes voice input for food diary entries
 */
// Modify the end of your existing nlp-handler.js file:

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
