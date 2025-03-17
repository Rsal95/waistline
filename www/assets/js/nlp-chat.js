/* 
 * NLP Chat Controller
 * UI Controller for the voice assistant feature
 */

app.NLPChat = {
  // Initialize the controller
  init: function() {
    this.bindUIActions();
    
    // Show welcome message
    if (window.nlpHandler) {
      nlpHandler.addMessageToChat("Welcome! I can help you add food items to your diary. Try saying something like \"3 cups of spinach\" or \"banana with 105 calories\".", "app");
    }
  },
  
  // Bind UI actions
  bindUIActions: function() {
    // Text input actions
    const textInput = document.getElementById('nlp-text-input');
    const sendButton = document.getElementById('nlp-send-button');
    
    if (sendButton) {
      sendButton.addEventListener('click', () => {
        if (!textInput) return;
        const text = textInput.value.trim();
        if (text && window.nlpHandler) {
          nlpHandler.processCompleteStatement(text);
          textInput.value = '';
        }
      });
    }
    
    if (textInput) {
      textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const text = textInput.value.trim();
          if (text && window.nlpHandler) {
            nlpHandler.processCompleteStatement(text);
            textInput.value = '';
          }
          e.preventDefault();
        }
      });
    }
    
    // Mic button action
    const micButton = document.getElementById('nlp-mic-button');
    if (micButton && window.nlpHandler) {
      micButton.addEventListener('click', () => {
        nlpHandler.startListening();
      });
    }
    
    // Camera button action (placeholder for future implementation)
    const cameraButton = document.getElementById('nlp-camera-button');
    if (cameraButton && window.nlpHandler) {
      cameraButton.addEventListener('click', () => {
        nlpHandler.addMessageToChat('Camera feature coming soon!', 'app');
      });
    }
  }
};

// Initialize when page is loaded
document.addEventListener('page:init', function(e) {
  if (e.detail.name === 'nlp-chat') {
    app.NLPChat.init();
  }
});
